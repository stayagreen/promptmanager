# 灯具 Prompt Library 组合系统

本项目是一个本地运行的灯具设计提示词生成器。

## 功能

- 支持风格、灯具类型、图片比例、输出方式、情绪增强和摄影风格模式组合
- 默认比例为 `9:16`
- 单个组合生成完整提示词
- 复制提示词
- 下载单个 `.txt`
- 批量导出 ZIP
- 一键批量导出当前数据组合
- 导出前校验禁用变量和必填关键词
- 模块编辑历史检查点
- 英文 / 中文参考对照预览

## 运行

最简单的方式是直接双击项目根目录中的 BAT：

```text
启动程序.bat
停止程序.bat
重启程序.bat
```

- `启动程序.bat`：后台启动服务，并自动打开浏览器
- `停止程序.bat`：停止本项目服务
- `重启程序.bat`：停止后重新启动，并自动打开浏览器

默认访问地址：

```text
http://127.0.0.1:7000/
```

也可以使用命令行启动：

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 数据位置

- 风格：`data/styles/*.json`
- 灯具类型：`data/lighting_types/*.json`
- 比例：`data/ratios/*.json`
- 情绪增强：`data/emotional_tones/*.json`
- 摄影风格模式：`data/photography_profiles/*.json`
- 输出方式：`data/output_modes/*.json`
- 通用固定模块：`data/common/*.md`
- 组合和校验逻辑：`src/domain/promptAssembler.ts`
- 本地读写 API：`server/index.ts`

页面里的“管理”视图会直接保存到这些 JSON / MD 文件。

## 中文参考

中文参考通过本地 Node 服务调用 `google-translate-ts` 即时翻译。

- 不需要 API Key
- 中文不会保存到 JSON / MD 数据文件
- 管理页只能编辑英文，中文栏只读
- 如果 Google 公共翻译接口不可用，页面会回退到本地词库翻译
- 翻译结果会在服务运行期间做内存缓存，减少重复请求

## 历史检查点

每次保存已有模块时，系统会先把保存前版本自动写入历史检查点。

历史文件位置：

```text
data/history/styles/{style_id}/*.json
data/history/lighting_types/{type_id}/*.json
data/history/ratios/{ratio_id}/*.json
data/history/emotional_tones/{tone_id}/*.json
data/history/photography_profiles/{profile_id}/*.json
data/history/output_modes/{output_mode_id}/*.json
data/history/common/{prompt_id}/*.json
```

管理页面可以查看、预览、恢复、删除指定检查点。

恢复历史时，系统会先把当前版本保存成新的检查点，再恢复选中的历史版本。

删除模块时，系统也会先保存删除前检查点。

## 文件命名

单个 TXT 使用中文命名：

```text
{风格名称}_{灯具类型}_{比例}_{输出方式}_{可选情绪}_{可选非默认摄影模式}.txt
```

示例：

```text
MCM风格_壁灯_9比16_2×2四宫格产品摄影.txt
轻美式_岛台吊灯_9比16_单张产品主图_清新空气感_小红书家居博主模式.txt
新中式_吊灯_9比16_尺寸图.txt
```

技术类输出会自动忽略情绪增强和摄影风格模式，并改用技术清晰度与标注规则。

现有批量导出固定使用 `four_panel_storyboard`，不会自动扩展全部输出方式。

`storyboard.md`、`panel_1_focus.md`、`grid_layout.md` 和
`final_quality_reminder.md` 保留为旧版备份，不再参与提示词组合。
