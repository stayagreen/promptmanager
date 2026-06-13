export type StyleModule = {
  id: string;
  displayName: string;
  englishName: string;
  stylePrompt: string;
  inspirationSources: string[];
  specificElements: string[];
  materials: string[];
  colors: string[];
  avoid: string[];
  enabled?: boolean;
  sortOrder?: number;
};

export type LightingTypeModule = {
  id: string;
  displayName: string;
  englishName: string;
  typePrompt: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type RatioModule = {
  id: string;
  displayName: string;
  ratioValue: string;
  isDefault: boolean;
  ratioPrompt: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type EmotionalToneModule = {
  id: string;
  displayName: string;
  englishName: string;
  isDefault?: boolean;
  enabled: boolean;
  tonePrompt: string;
  colorAddOn?: string;
  panel1AddOn?: string;
  panel4AddOn?: string;
  photographyAddOn?: string;
  avoidAddOn?: string[];
  sortOrder?: number;
};

export type PhotographyProfileModule = {
  id: string;
  displayName: string;
  englishName: string;
  isDefault?: boolean;
  enabled: boolean;
  profilePrompt: string;
  compositionPrompt: string;
  lightingPrompt: string;
  cameraPrompt: string;
  moodPrompt: string;
  avoidPrompt?: string[];
  sortOrder?: number;
};

export type OutputModeCategory = "photographic" | "technical";

export type OutputModeModule = {
  id: string;
  displayName: string;
  englishName: string;
  category: OutputModeCategory;
  isDefault?: boolean;
  enabled: boolean;
  outputPrompt: string;
  consistencyPrompt?: string;
  layoutPrompt?: string;
  avoidPrompt?: string[];
  sortOrder?: number;
};

export type CustomPromptModule = {
  id: string;
  displayName: string;
  promptText: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type ReferenceDimensionMode = "verified" | "estimated" | "none";
export type ReferenceConsistencyLevel =
  | "strict"
  | "high"
  | "optimized"
  | "creative";

export type ReferenceProductImage = {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  role: "primary" | "supplementary";
  createdAt: string;
};

export type ReferenceDimension = {
  label: string;
  value: string;
};

export type SavedReferencePrompt = {
  id: string;
  taskId: string;
  taskName: string;
  title: string;
  promptText: string;
  createdAt: string;
};

export type ReferenceProductProject = {
  id: string;
  title: string;
  productCode: string;
  lightingTypeId: string;
  notes: string;
  images: ReferenceProductImage[];
  dimensionMode: ReferenceDimensionMode;
  dimensions: ReferenceDimension[];
  estimationBasis: string;
  savedPrompts: SavedReferencePrompt[];
  createdAt: string;
  updatedAt: string;
};

export type CommonPromptModule = {
  id: string;
  displayName: string;
  filename: string;
  content: string;
  deprecated?: boolean;
};

export type CatalogData = {
  styles: StyleModule[];
  lightingTypes: LightingTypeModule[];
  ratios: RatioModule[];
  emotionalTones: EmotionalToneModule[];
  photographyProfiles: PhotographyProfileModule[];
  outputModes: OutputModeModule[];
  customPrompts: CustomPromptModule[];
  commonPrompts: CommonPromptModule[];
};

export type ModuleHistoryKind =
  | "styles"
  | "lighting_types"
  | "ratios"
  | "emotional_tones"
  | "photography_profiles"
  | "output_modes"
  | "custom_prompts"
  | "product_projects"
  | "common";

export type HistoryCheckpoint<T = unknown> = {
  id: string;
  createdAt: string;
  moduleKind: ModuleHistoryKind;
  moduleId: string;
  label: string;
  snapshot: T;
};

export type PromptBuildRequest = {
  styleId: string;
  lightingTypeId: string;
  ratioId?: string;
  outputModeId?: string;
  emotionalToneId?: string;
  photographyProfileId?: string;
  customPromptId?: string;
};

export type PromptValidationResult = {
  valid: boolean;
  missingKeywords: string[];
  forbiddenTokens: string[];
};

export type PromptBuildResult = {
  title: string;
  filename: string;
  promptText: string;
  wordCount: number;
  moduleSources: string[];
  validation: PromptValidationResult;
  metadata: {
    styleId: string;
    lightingTypeId: string;
    ratioId: string;
    outputModeId: string;
    emotionalToneId: string;
    photographyProfileId: string;
    customPromptId: string;
    createdAt: string;
  };
};
