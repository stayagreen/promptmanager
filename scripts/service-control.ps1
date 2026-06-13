param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("start", "stop", "restart")]
  [string]$Action
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".promptmanager.pid"
$stdoutLog = Join-Path $projectRoot "local-server.log"
$stderrLog = Join-Path $projectRoot "local-server.err.log"
$port = 7000
$appUrl = "http://127.0.0.1:$port/"
$healthUrl = "http://127.0.0.1:$port/api/health"

function Test-AppHealth {
  try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $response.ok -eq $true
  } catch {
    return $false
  }
}

function Get-RecordedPid {
  if (-not (Test-Path -LiteralPath $pidFile)) {
    return $null
  }

  $rawPid = (Get-Content -Raw -LiteralPath $pidFile).Trim()
  $parsedPid = 0
  if (-not [int]::TryParse($rawPid, [ref]$parsedPid)) {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    return $null
  }

  return $parsedPid
}

function Stop-ProcessTree {
  param([int]$ProcessId)

  if ($ProcessId -le 0) {
    return
  }

  & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
}

function Stop-App {
  $recordedPid = Get-RecordedPid

  if ($recordedPid) {
    Stop-ProcessTree -ProcessId $recordedPid
  }

  $projectProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine.Contains($projectRoot) -and
      $_.CommandLine.Contains("server/index.ts")
    }

  foreach ($projectProcess in $projectProcesses) {
    Stop-ProcessTree -ProcessId $projectProcess.ProcessId
  }

  if (Test-AppHealth) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1

    if ($listener) {
      Stop-ProcessTree -ProcessId $listener.OwningProcess
    }
  }

  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if (-not (Test-AppHealth)) {
      Write-Host "Prompt Manager stopped." -ForegroundColor Green
      return
    }
    Start-Sleep -Milliseconds 250
  }

  throw "Prompt Manager did not stop in time."
}

function Start-App {
  if (Test-AppHealth) {
    $existingListener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($existingListener) {
      Set-Content -LiteralPath $pidFile -Value $existingListener.OwningProcess -Encoding ASCII
    }
    Write-Host "Prompt Manager is already running: $appUrl" -ForegroundColor Yellow
    Start-Process $appUrl
    return
  }

  $recordedPid = Get-RecordedPid
  if ($recordedPid -and (Get-Process -Id $recordedPid -ErrorAction SilentlyContinue)) {
    Stop-ProcessTree -ProcessId $recordedPid
  }

  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  Set-Location -LiteralPath $projectRoot

  $previousPort = $env:PORT
  $previousHost = $env:HOST
  $env:PORT = [string]$port
  $env:HOST = "127.0.0.1"

  try {
    $process = Start-Process `
      -FilePath "npm.cmd" `
      -ArgumentList @("run", "dev") `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog `
      -PassThru
  } finally {
    $env:PORT = $previousPort
    $env:HOST = $previousHost
  }

  Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ASCII

  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (Test-AppHealth) {
      $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($listener) {
        Set-Content -LiteralPath $pidFile -Value $listener.OwningProcess -Encoding ASCII
      }
      Write-Host "Prompt Manager started: $appUrl" -ForegroundColor Green
      Start-Process $appUrl
      return
    }

    if ($process.HasExited) {
      break
    }

    Start-Sleep -Milliseconds 500
  }

  Stop-ProcessTree -ProcessId $process.Id
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue

  Write-Host "Prompt Manager failed to start." -ForegroundColor Red
  if (Test-Path -LiteralPath $stderrLog) {
    Get-Content -LiteralPath $stderrLog -Tail 30
  }
  throw "Check local-server.err.log for details."
}

switch ($Action) {
  "start" {
    Start-App
  }
  "stop" {
    Stop-App
  }
  "restart" {
    Stop-App
    Start-App
  }
}
