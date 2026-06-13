import JSZip from "jszip";
import type { PromptBuildResult } from "../domain/schema";

export async function downloadPromptText(prompt: PromptBuildResult): Promise<void> {
  downloadTextFile(prompt.promptText, prompt.filename);
}

export function downloadTextFile(text: string, filename: string): void {
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

export async function downloadPromptZip(
  prompts: PromptBuildResult[],
  filename: string,
): Promise<void> {
  const zip = new JSZip();

  prompts.forEach((prompt) => {
    zip.file(prompt.filename, prompt.promptText);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, filename);
}

export function buildLibraryZipName(
  styleCount: number,
  typeCount: number,
  ratioCount: number,
): string {
  return `灯具提示词库_${styleCount}风格_${typeCount}类型_${ratioCount}比例.zip`;
}

function saveBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
