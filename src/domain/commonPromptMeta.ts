export const commonPromptMeta = [
  {
    id: "base_role",
    displayName: "角色定位",
    filename: "base_role.md",
  },
  {
    id: "storyboard",
    displayName: "四宫格分镜（旧版备份）",
    filename: "storyboard.md",
    deprecated: true,
  },
  {
    id: "panel_1_focus",
    displayName: "Panel 1 主体突出（旧版备份）",
    filename: "panel_1_focus.md",
    deprecated: true,
  },
  {
    id: "subject_priority",
    displayName: "主体优先级",
    filename: "subject_priority.md",
  },
  {
    id: "photography",
    displayName: "iPhone 真实摄影",
    filename: "photography.md",
  },
  {
    id: "grid_layout",
    displayName: "四宫格无缝拼接（旧版备份）",
    filename: "grid_layout.md",
    deprecated: true,
  },
  {
    id: "manufacturing",
    displayName: "商业量产要求",
    filename: "manufacturing.md",
  },
  {
    id: "no_text_logo_watermark",
    displayName: "无文字 / Logo / 水印",
    filename: "no_text_logo_watermark.md",
  },
  {
    id: "final_quality_reminder",
    displayName: "四宫格最终提醒（旧版备份）",
    filename: "final_quality_reminder.md",
    deprecated: true,
  },
] as const;

export type CommonPromptId = (typeof commonPromptMeta)[number]["id"];
