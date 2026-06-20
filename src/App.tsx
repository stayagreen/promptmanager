import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Layers3,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  buildChinesePromptReference,
  formatChinesePromptReference,
  translateToChineseReference,
} from "./domain/chineseReference";
import {
  buildAllEmotionalPrompts,
  buildAllPrompts,
  buildPrompt,
  formatRatioForFilename,
  getActiveBotanicalForms,
  getActiveCustomPrompts,
  getActiveEmotionalTones,
  getActiveLightingTypes,
  getActiveOutputModes,
  getActivePhotographyProfiles,
  getActiveRatios,
  getActiveStyles,
  getActiveStructuralMaterialModes,
  getDefaultEmotionalTone,
  getDefaultOutputMode,
  getDefaultPhotographyProfile,
  getDefaultRatio,
} from "./domain/promptAssembler";
import type {
  BotanicalFormModule,
  CatalogData,
  CommonPromptModule,
  CustomPromptModule,
  EmotionalToneModule,
  ElementReferenceAsset,
  ElementReferenceUsageMode,
  HistoryCheckpoint,
  LightingTypeModule,
  ModuleHistoryKind,
  OutputModeModule,
  PhotographyProfileModule,
  ProductElementSelection,
  PromptBuildResult,
  RatioModule,
  StyleModule,
  StructuralMaterialModeModule,
} from "./domain/schema";
import {
  deleteBotanicalForm,
  deleteCustomPrompt,
  deleteEmotionalTone,
  deleteCheckpoint,
  deleteLightingType,
  deleteOutputMode,
  deletePhotographyProfile,
  deleteRatio,
  deleteStyle,
  fetchHistory,
  fetchCatalog,
  fetchElementAssets,
  restoreCheckpoint,
  saveBotanicalForm,
  saveCommonPrompt,
  saveCustomPrompt,
  saveEmotionalTone,
  saveLightingType,
  saveOutputMode,
  savePhotographyProfile,
  saveRatio,
  saveStyle,
  saveStructuralMaterialMode,
  deleteStructuralMaterialMode,
  translateText,
} from "./utils/api";
import {
  buildLibraryZipName,
  downloadPromptText,
  downloadPromptZip,
  downloadTextFile,
} from "./utils/download";
import { ReferenceWorkspace } from "./ReferenceWorkspace";
import { TextElementSelector } from "./TextElementSelector";

type PageMode = "generate" | "manage";
type WorkspaceMode = "text" | "reference";
type ManageSection =
  | "styles"
  | "lightingTypes"
  | "ratios"
  | "emotionalTones"
  | "photographyProfiles"
  | "outputModes"
  | "botanicalForms"
  | "structuralMaterialModes"
  | "customPrompts"
  | "common";
type ExportJob =
  | "single"
  | "styleTypes"
  | "styleRatios"
  | "allCurrentRatio"
  | "all"
  | "allEmotions";
type OutputLanguage = "english" | "chinese";
type TranslationStatus = "idle" | "loading" | "google" | "fallback";

const clientTranslationCache = new Map<string, string>();

const idPattern = /^[a-z0-9_]+$/;
const botanicalStillLifeOutputIds = [
  "botanical_still_life_5",
  "botanical_still_life_5_pure",
];

function isBotanicalStillLifeOutputId(id: string): boolean {
  return botanicalStillLifeOutputIds.includes(id);
}

type BotanicalCategoryId =
  | "large_flower"
  | "small_flower"
  | "leaf_branch"
  | "vine_line"
  | "seed_pod"
  | "fruit"
  | "vegetable"
  | "water_grass";

const botanicalCategoryOptions: Array<{
  id: BotanicalCategoryId;
  label: string;
}> = [
  { id: "large_flower", label: "大花灯罩类" },
  { id: "small_flower", label: "小花/花簇类" },
  { id: "leaf_branch", label: "叶片/枝条类" },
  { id: "vine_line", label: "藤蔓/线条类" },
  { id: "seed_pod", label: "种荚/果序类" },
  { id: "fruit", label: "水果形态类" },
  { id: "vegetable", label: "蔬菜形态类" },
  { id: "water_grass", label: "水生/草本类" },
];

const botanicalMaterialOptions = [
  { label: "杜邦纸", value: "translucent DuPont Tyvek paper diffuser" },
  { label: "羊皮纸", value: "warm parchment paper shade" },
  { label: "宣纸", value: "warm xuan paper diffuser" },
  { label: "和纸", value: "Japanese washi paper diffuser" },
  { label: "米纸", value: "warm rice-paper diffuser" },
  { label: "磨砂玻璃", value: "frosted glass" },
  { label: "乳白玻璃", value: "translucent milky glass" },
  { label: "茶色玻璃", value: "tea-brown glass" },
  { label: "烟灰玻璃", value: "smoky grey glass" },
  { label: "琉璃", value: "hand-cast liuli glass" },
  { label: "彩色树脂", value: "colored translucent resin" },
  { label: "亚克力", value: "thin translucent acrylic" },
  { label: "聚碳酸酯", value: "thin diffused polycarbonate" },
  { label: "白瓷", value: "warm white porcelain" },
  { label: "手工陶", value: "handmade ivory ceramic" },
  { label: "石膏", value: "matte sculptural plaster" },
  { label: "雪花石", value: "thin alabaster stone" },
  { label: "洞石", value: "travertine stone" },
  { label: "黄铜", value: "warm brushed brass" },
  { label: "紫铜", value: "soft patinated copper" },
  { label: "青铜", value: "dark bronze" },
  { label: "不锈钢", value: "brushed stainless steel" },
  { label: "铝", value: "anodized aluminum" },
  { label: "金属网", value: "fine perforated metal mesh" },
  { label: "贝母", value: "thin mother-of-pearl inlay" },
  { label: "绢布", value: "translucent silk fabric" },
  { label: "欧根纱", value: "layered organza diffuser" },
  { label: "藤编", value: "fine rattan weave" },
  { label: "竹皮", value: "thin bamboo veneer" },
  { label: "胡桃木", value: "dark walnut base or accent" },
];

function getBotanicalCategory(form: BotanicalFormModule): BotanicalCategoryId {
  const text = `${form.id} ${form.displayName} ${form.englishName} ${form.family}`.toLowerCase();
  if (
    /fruit|citrus|berry|apple|pear|peach|fig|pomegranate|persimmon|grape|melon|dragon|rambutan|lychee|starfruit/.test(
      text,
    )
  ) {
    return "fruit";
  }
  if (
    /vegetable|cabbage|fennel|onion|garlic|pepper|chili|pumpkin|gourd|okra|eggplant|broccoli|romanesco|lotus root|mushroom|artichoke/.test(
      text,
    )
  ) {
    return "vegetable";
  }
  if (/lotus|water|reed|cattail|papyrus|lily pad|aquatic/.test(text)) {
    return "water_grass";
  }
  if (/leaf|branch|fern|ginkgo|monstera|eucalyptus|olive|acanthus|begonia/.test(text)) {
    return "leaf_branch";
  }
  if (/vine|tendril|line|scape|stem|willow|stalk/.test(text)) {
    return "vine_line";
  }
  if (/pod|seed|cone|grain|plume|allium sphere|banksia|teasel|scabiosa/.test(text)) {
    return "seed_pod";
  }
  if (
    /magnolia|peony|protea|dahlia|lotus blossom|water lily|hibiscus|amaryllis|trumpet|canna|sunflower|hollyhock|rose|large|sculptural|architectural/.test(
      text,
    )
  ) {
    return "large_flower";
  }
  return "small_flower";
}

const metalOptions = [
  { label: "铁", value: "iron" },
  { label: "黑铁", value: "blackened iron" },
  { label: "黄铜", value: "brass" },
  { label: "紫铜", value: "copper" },
  { label: "青铜", value: "bronze" },
  { label: "不锈钢", value: "stainless steel" },
  { label: "铝", value: "aluminum" },
  { label: "锌合金", value: "zinc alloy" },
];

const finishOptions = [
  { label: "拉丝", value: "brushed finish" },
  { label: "镜面抛光", value: "mirror-polished finish" },
  { label: "喷砂", value: "sandblasted finish" },
  { label: "哑光喷涂", value: "matte powder coating" },
  { label: "高光喷涂", value: "gloss powder coating" },
  { label: "氧化", value: "oxidized finish" },
  { label: "做旧", value: "antique patina" },
  { label: "锤纹", value: "hand-hammered finish" },
  { label: "电镀", value: "electroplated finish" },
  { label: "发黑", value: "blackened finish" },
];

const processOptions = [
  { label: "钣金折弯", value: "sheet-metal bending" },
  { label: "金属旋压", value: "metal spinning" },
  { label: "铸造", value: "metal casting" },
  { label: "冲压", value: "metal stamping" },
  { label: "激光切割", value: "laser cutting" },
  { label: "管材弯曲", value: "tube bending" },
  { label: "焊接", value: "welding" },
  { label: "钎焊", value: "brazing" },
  { label: "CNC 加工", value: "CNC machining" },
  { label: "铝型材挤压", value: "aluminum extrusion" },
  { label: "金属穿孔", value: "metal perforation" },
];

const connectionOptions = [
  { label: "隐藏连接", value: "hidden fasteners" },
  { label: "精密外露螺丝", value: "precision exposed screws" },
  { label: "铆钉连接", value: "riveted connections" },
  { label: "外露转轴", value: "exposed pivot hinges" },
  { label: "机械关节", value: "articulated mechanical joints" },
  { label: "无缝套环", value: "seamless collars" },
  { label: "螺纹连接", value: "threaded connections" },
  { label: "焊接一体", value: "seamlessly welded construction" },
];

const shadeOptions = [
  { label: "实体金属罩", value: "solid metal shade" },
  { label: "穿孔金属罩", value: "perforated metal shade" },
  { label: "金属网罩", value: "metal mesh shade" },
  { label: "金属反射罩", value: "metal reflector shade" },
  { label: "叶片遮光", value: "metal louver light control" },
  { label: "间接反射", value: "indirect metal reflector" },
  { label: "镂空投影", value: "laser-cut shadow-casting shade" },
  { label: "双层防眩罩", value: "double-layer anti-glare metal shade" },
];

export function App() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<PageMode>("generate");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("text");
  const [styleId, setStyleId] = useState("");
  const [lightingTypeId, setLightingTypeId] = useState("");
  const [ratioId, setRatioId] = useState("");
  const [outputModeId, setOutputModeId] = useState("four_panel_storyboard");
  const [emotionalToneId, setEmotionalToneId] = useState("none");
  const [photographyProfileId, setPhotographyProfileId] = useState(
    "premium_editorial_home",
  );
  const [customPromptId, setCustomPromptId] = useState("none");
  const [structuralMaterialModeId, setStructuralMaterialModeId] =
    useState("regular");
  const [selectedMetals, setSelectedMetals] = useState("");
  const [selectedFinishes, setSelectedFinishes] = useState("");
  const [selectedProcesses, setSelectedProcesses] = useState("");
  const [connectionLanguage, setConnectionLanguage] = useState("");
  const [shadeStrategy, setShadeStrategy] = useState("");
  const [allowedMaterials, setAllowedMaterials] = useState("");
  const [prohibitedMaterials, setProhibitedMaterials] = useState("");
  const [materialStrictness, setMaterialStrictness] =
    useState<"strict" | "balanced">("strict");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [exporting, setExporting] = useState<ExportJob | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("english");
  const [elementAssets, setElementAssets] = useState<ElementReferenceAsset[]>([]);
  const [elementSelections, setElementSelections] = useState<ProductElementSelection[]>([]);
  const [elementUsageMode, setElementUsageMode] =
    useState<ElementReferenceUsageMode>("text_only");
  const [elementRandomToken, setElementRandomToken] = useState(0);
  const [botanicalFormMode, setBotanicalFormMode] =
    useState<"random" | "specified">("random");
  const [selectedBotanicalFormId, setSelectedBotanicalFormId] = useState("");
  const [excludedBotanicalFormIds, setExcludedBotanicalFormIds] = useState<
    string[]
  >([]);
  const [botanicalRandomToken, setBotanicalRandomToken] = useState(0);
  const [botanicalExcludeCategory, setBotanicalExcludeCategory] =
    useState<BotanicalCategoryId>("large_flower");
  const [botanicalMaterialMode, setBotanicalMaterialMode] =
    useState<"auto" | "specified">("auto");
  const [selectedBotanicalMaterials, setSelectedBotanicalMaterials] =
    useState("");
  const [customBotanicalMaterial, setCustomBotanicalMaterial] = useState("");

  async function reloadCatalog() {
    try {
      const nextCatalog = await fetchCatalog();
      setCatalog(nextCatalog);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "加载数据失败");
    }
  }

  useEffect(() => {
    void reloadCatalog();
    void fetchElementAssets().then(setElementAssets);
  }, []);

  useEffect(() => {
    setElementSelections((current) =>
      current.filter((selection) =>
        elementAssets.some(
          (asset) => asset.id === selection.assetId && asset.enabled,
        ),
      ),
    );
  }, [elementAssets]);

  useEffect(() => {
    if (!catalog) return;

    const activeStyles = getActiveStyles(catalog);
    const activeTypes = getActiveLightingTypes(catalog);
    const activeRatios = getActiveRatios(catalog);
    const activeEmotionalTones = getActiveEmotionalTones(catalog);
    const activePhotographyProfiles = getActivePhotographyProfiles(catalog);
    const activeOutputModes = getActiveOutputModes(catalog);
    const activeCustomPrompts = getActiveCustomPrompts(catalog);
    const activeStructuralMaterialModes =
      getActiveStructuralMaterialModes(catalog);

    if (!activeStyles.some((style) => style.id === styleId)) {
      setStyleId(activeStyles[0]?.id ?? "");
    }
    if (!activeTypes.some((lightingType) => lightingType.id === lightingTypeId)) {
      setLightingTypeId(activeTypes[0]?.id ?? "");
    }
    if (!activeRatios.some((ratio) => ratio.id === ratioId)) {
      setRatioId(getDefaultRatio(catalog).id);
    }
    if (!activeEmotionalTones.some((tone) => tone.id === emotionalToneId)) {
      setEmotionalToneId(getDefaultEmotionalTone(catalog).id);
    }
    if (
      !activePhotographyProfiles.some(
        (profile) => profile.id === photographyProfileId,
      )
    ) {
      setPhotographyProfileId(getDefaultPhotographyProfile(catalog).id);
    }
    if (!activeOutputModes.some((outputMode) => outputMode.id === outputModeId)) {
      setOutputModeId(getDefaultOutputMode(catalog).id);
    }
    if (
      customPromptId !== "none" &&
      !activeCustomPrompts.some((customPrompt) => customPrompt.id === customPromptId)
    ) {
      setCustomPromptId("none");
    }
    if (
      !activeStructuralMaterialModes.some(
        (item) => item.id === structuralMaterialModeId,
      )
    ) {
      setStructuralMaterialModeId(
        activeStructuralMaterialModes.find((item) => item.id === "regular")?.id ??
          activeStructuralMaterialModes[0]?.id ??
          "",
      );
    }
  }, [
    catalog,
    customPromptId,
    emotionalToneId,
    lightingTypeId,
    outputModeId,
    photographyProfileId,
    ratioId,
    styleId,
    structuralMaterialModeId,
  ]);

  useEffect(() => {
    if (!catalog || !isBotanicalStillLifeOutputId(outputModeId)) return;
    const activeRatios = getActiveRatios(catalog);
    const activePhotographyProfiles = getActivePhotographyProfiles(catalog);
    if (activeRatios.some((ratio) => ratio.id === "3_4") && ratioId !== "3_4") {
      setRatioId("3_4");
    }
    if (
      activePhotographyProfiles.some((profile) => profile.id === "mobile_still_life_lamp") &&
      photographyProfileId !== "mobile_still_life_lamp"
    ) {
      setPhotographyProfileId("mobile_still_life_lamp");
    }
  }, [catalog, outputModeId, photographyProfileId, ratioId]);

  const activeStyles = catalog ? getActiveStyles(catalog) : [];
  const activeLightingTypes = catalog ? getActiveLightingTypes(catalog) : [];
  const activeRatios = catalog ? getActiveRatios(catalog) : [];
  const activeEmotionalTones = catalog ? getActiveEmotionalTones(catalog) : [];
  const activePhotographyProfiles = catalog
    ? getActivePhotographyProfiles(catalog)
    : [];
  const activeOutputModes = catalog ? getActiveOutputModes(catalog) : [];
  const activeBotanicalForms = catalog ? getActiveBotanicalForms(catalog) : [];
  const botanicalCategoryCounts = new Map<BotanicalCategoryId, number>();
  activeBotanicalForms.forEach((form) => {
    const category = getBotanicalCategory(form);
    botanicalCategoryCounts.set(
      category,
      (botanicalCategoryCounts.get(category) ?? 0) + 1,
    );
  });
  const visibleExclusionForms = activeBotanicalForms.filter(
    (form) => getBotanicalCategory(form) === botanicalExcludeCategory,
  );
  const activeCustomPrompts = catalog ? getActiveCustomPrompts(catalog) : [];
  const activeStructuralMaterialModes = catalog
    ? getActiveStructuralMaterialModes(catalog)
    : [];

  useEffect(() => {
    if (!catalog) return;
    const activeIds = new Set(getActiveBotanicalForms(catalog).map((form) => form.id));
    if (selectedBotanicalFormId && !activeIds.has(selectedBotanicalFormId)) {
      setSelectedBotanicalFormId("");
    }
    setExcludedBotanicalFormIds((current) =>
      current.filter((id) => activeIds.has(id)),
    );
  }, [catalog, selectedBotanicalFormId]);

  const prompt = useMemo(() => {
    if (
      !catalog ||
      (customPromptId === "none" && (!styleId || !lightingTypeId || !ratioId))
    ) {
      return null;
    }
    return buildPrompt(catalog, {
      styleId,
      lightingTypeId,
      ratioId,
      outputModeId,
      emotionalToneId,
      photographyProfileId,
      customPromptId,
      structuralMaterialModeId,
      selectedMetals,
      selectedFinishes,
      selectedProcesses,
      connectionLanguage,
      shadeStrategy,
      allowedMaterials,
      prohibitedMaterials,
      materialStrictness,
      elementAssets,
      elementSelections,
      elementReferenceUsageMode: elementUsageMode,
      elementRandomToken,
      botanicalFormMode,
      selectedBotanicalFormId,
      excludedBotanicalFormIds,
      botanicalRandomToken,
      botanicalMaterialMode,
      selectedBotanicalMaterials,
      customBotanicalMaterial,
    });
  }, [
    botanicalFormMode,
    botanicalMaterialMode,
    botanicalRandomToken,
    catalog,
    customPromptId,
    customBotanicalMaterial,
    emotionalToneId,
    elementAssets,
    elementRandomToken,
    elementSelections,
    elementUsageMode,
    excludedBotanicalFormIds,
    lightingTypeId,
    outputModeId,
    photographyProfileId,
    ratioId,
    styleId,
    structuralMaterialModeId,
    selectedMetals,
    selectedFinishes,
    selectedProcesses,
    selectedBotanicalFormId,
    selectedBotanicalMaterials,
    connectionLanguage,
    shadeStrategy,
    allowedMaterials,
    prohibitedMaterials,
    materialStrictness,
  ]);

  const selectedStyleForPrompt = activeStyles.find((style) => style.id === styleId);
  const selectedTypeForPrompt = activeLightingTypes.find(
    (lightingType) => lightingType.id === lightingTypeId,
  );
  const selectedRatioForPrompt = activeRatios.find((ratio) => ratio.id === ratioId);
  const selectedEmotionalToneForPrompt = activeEmotionalTones.find(
    (tone) => tone.id === emotionalToneId,
  );
  const selectedPhotographyProfileForPrompt = activePhotographyProfiles.find(
    (profile) => profile.id === photographyProfileId,
  );
  const selectedOutputModeForPrompt = activeOutputModes.find(
    (outputMode) => outputMode.id === outputModeId,
  );
  const selectedCustomPromptForPrompt = activeCustomPrompts.find(
    (customPrompt) => customPrompt.id === customPromptId,
  );
  const selectedStructuralMaterialMode =
    activeStructuralMaterialModes.find(
      (item) => item.id === structuralMaterialModeId,
    ) ?? activeStructuralMaterialModes[0]!;
  const promptFallbackTranslation =
    prompt && selectedCustomPromptForPrompt
      ? translateToChineseReference(prompt.promptText)
      : prompt &&
    selectedStyleForPrompt &&
    selectedTypeForPrompt &&
    selectedRatioForPrompt &&
    selectedOutputModeForPrompt &&
    selectedEmotionalToneForPrompt &&
    selectedPhotographyProfileForPrompt
      ? buildChinesePromptReference(
          prompt,
          selectedStyleForPrompt,
          selectedTypeForPrompt,
          selectedRatioForPrompt,
          selectedOutputModeForPrompt,
          selectedEmotionalToneForPrompt,
          selectedPhotographyProfileForPrompt,
        )
      : "";
  const promptTranslation = useTranslatedText(
    prompt?.promptText ?? "",
    promptFallbackTranslation.replace(/^【中文参考稿】\n说明：.*?\n\n/s, ""),
  );

  if (loadError) {
    return (
      <div className="empty-state">
        <AlertTriangle aria-hidden="true" />
        <h1>数据加载失败</h1>
        <p>{loadError}</p>
        <button type="button" onClick={() => void reloadCatalog()}>
          重新加载
        </button>
      </div>
    );
  }

  if (!catalog || !prompt) {
    return (
      <div className="empty-state">
        <Loader2 className="spin" aria-hidden="true" />
        <h1>正在加载本地数据</h1>
      </div>
    );
  }

  if (workspaceMode === "reference") {
    return (
      <ReferenceWorkspace
        catalog={catalog}
        onWorkspaceMode={(nextMode) => {
          setWorkspaceMode(nextMode);
          if (nextMode === "text") {
            void fetchElementAssets().then(setElementAssets);
          }
        }}
      />
    );
  }

  const currentPrompt = prompt;
  const selectedStyle = selectedStyleForPrompt ?? activeStyles[0]!;
  const selectedType =
    selectedTypeForPrompt ?? activeLightingTypes[0]!;
  const selectedRatio = selectedRatioForPrompt ?? activeRatios[0]!;
  const selectedEmotionalTone =
    selectedEmotionalToneForPrompt ?? getDefaultEmotionalTone(catalog);
  const selectedPhotographyProfile =
    selectedPhotographyProfileForPrompt ??
    getDefaultPhotographyProfile(catalog);
  const selectedOutputMode =
    selectedOutputModeForPrompt ?? getDefaultOutputMode(catalog);
  const selectedCustomPrompt = selectedCustomPromptForPrompt ?? null;
  const materialRequest = {
    structuralMaterialModeId,
    selectedMetals,
    selectedFinishes,
    selectedProcesses,
    connectionLanguage,
    shadeStrategy,
    allowedMaterials,
    prohibitedMaterials,
    materialStrictness,
  };
  const isCustomMode = selectedCustomPrompt !== null;
  const isTechnicalOutput = selectedOutputMode.category === "technical";
  const chinesePromptText = formatChinesePromptReference(promptTranslation.text);
  const selectedOutputText =
    outputLanguage === "chinese" ? chinesePromptText : currentPrompt.promptText;
  const selectedOutputFilename =
    outputLanguage === "chinese"
      ? addFilenameSuffix(currentPrompt.filename, "_中文参考")
      : currentPrompt.filename;

  async function handleCopy() {
    try {
      await copyText(selectedOutputText);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  }

  async function handleSingleDownload() {
    setExporting("single");
    if (outputLanguage === "chinese") {
      downloadTextFile(selectedOutputText, selectedOutputFilename);
    } else {
      await downloadPromptText(currentPrompt);
    }
    setExporting(null);
  }

  async function handleZipExport(job: ExportJob, prompts: PromptBuildResult[], filename: string) {
    const invalid = prompts.filter((item) => !item.validation.valid);
    if (invalid.length > 0) {
      window.alert(`有 ${invalid.length} 个提示词未通过校验，已停止导出。`);
      return;
    }

    setExporting(job);
    await downloadPromptZip(prompts, filename);
    setExporting(null);
  }

  const ratioFileLabel = formatRatioForFilename(selectedRatio);
  const styleAllTypes = () =>
    activeLightingTypes.map((lightingType) =>
      buildPrompt(catalog, {
        styleId: selectedStyle.id,
        lightingTypeId: lightingType.id,
        ratioId: selectedRatio.id,
        outputModeId: "four_panel_storyboard",
        emotionalToneId: selectedEmotionalTone.id,
        ...materialRequest,
        elementAssets,
        elementSelections,
        elementReferenceUsageMode: elementUsageMode,
        elementRandomToken,
      }),
    );
  const styleAllRatios = () =>
    activeRatios.map((ratio) =>
      buildPrompt(catalog, {
        styleId: selectedStyle.id,
        lightingTypeId: selectedType.id,
        ratioId: ratio.id,
        outputModeId: "four_panel_storyboard",
        emotionalToneId: selectedEmotionalTone.id,
        ...materialRequest,
        elementAssets,
        elementSelections,
        elementReferenceUsageMode: elementUsageMode,
        elementRandomToken,
      }),
    );
  const allStylesAllTypesCurrentRatio = () =>
    activeStyles.flatMap((style) =>
      activeLightingTypes.map((lightingType) =>
        buildPrompt(catalog, {
          styleId: style.id,
          lightingTypeId: lightingType.id,
          ratioId: selectedRatio.id,
          outputModeId: "four_panel_storyboard",
          emotionalToneId: selectedEmotionalTone.id,
          ...materialRequest,
          elementAssets,
          elementSelections,
          elementReferenceUsageMode: elementUsageMode,
          elementRandomToken,
        }),
      ),
    );
  const emotionalZipSuffix =
    selectedEmotionalTone.id === "none" ? "" : `_${selectedEmotionalTone.displayName}`;

  return (
    <>
      <header className="export-dock">
        <div className="export-dock-single">
          <strong>单个导出</strong>
          <select
            aria-label="复制 / 下载语言"
            value={outputLanguage}
            onChange={(event) =>
              setOutputLanguage(event.target.value as OutputLanguage)
            }
          >
            <option value="english">英文原文</option>
            <option value="chinese">中文参考</option>
          </select>
          <button type="button" onClick={handleCopy} title="复制提示词">
            <Clipboard aria-hidden="true" />
            {copyStatus === "copied"
              ? "已复制"
              : copyStatus === "failed"
                ? "复制失败"
                : "复制"}
          </button>
          <button
            type="button"
            onClick={handleSingleDownload}
            disabled={exporting === "single"}
            title="下载当前 TXT"
          >
            {exporting === "single" ? (
              <Loader2 className="spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            下载 TXT
          </button>
        </div>

        <details className="batch-export-menu">
          <summary>
            <Archive aria-hidden="true" />
            批量 ZIP
          </summary>
          <div className="batch-export-popover">
            <p>
              {isCustomMode
                ? "用户自定义模式不产生组合维度，批量导出不可用。"
                : "批量导出固定使用 2×2 四宫格产品摄影。"}
            </p>
            <button
              type="button"
              onClick={() =>
                handleZipExport(
                  "styleTypes",
                  styleAllTypes(),
                  `灯具提示词库_${selectedStyle.displayName}_${activeLightingTypes.length}类型_${ratioFileLabel}${emotionalZipSuffix}.zip`,
                )
              }
              disabled={isCustomMode || exporting === "styleTypes"}
            >
              <DownloadOrSpinner active={exporting === "styleTypes"} />
              当前风格全部类型
            </button>
            <button
              type="button"
              onClick={() =>
                handleZipExport(
                  "styleRatios",
                  styleAllRatios(),
                  `灯具提示词库_${selectedStyle.displayName}_${selectedType.displayName}_${activeRatios.length}比例${emotionalZipSuffix}.zip`,
                )
              }
              disabled={isCustomMode || exporting === "styleRatios"}
            >
              <DownloadOrSpinner active={exporting === "styleRatios"} />
              当前组合全部比例
            </button>
            <button
              type="button"
              onClick={() =>
                handleZipExport(
                  "allCurrentRatio",
                  allStylesAllTypesCurrentRatio(),
                  `灯具提示词库_${activeStyles.length}风格_${activeLightingTypes.length}类型_${ratioFileLabel}${emotionalZipSuffix}.zip`,
                )
              }
              disabled={isCustomMode || exporting === "allCurrentRatio"}
            >
              <DownloadOrSpinner active={exporting === "allCurrentRatio"} />
              全部风格类型
            </button>
            <button
              type="button"
              className="primary"
              onClick={() =>
                handleZipExport(
                  "all",
                  buildAllPrompts(
                    catalog,
                    selectedEmotionalTone.id,
                    "four_panel_storyboard",
                    {
                      elementAssets,
                      elementSelections,
                      elementReferenceUsageMode: elementUsageMode,
                      elementRandomToken,
                      ...materialRequest,
                    },
                  ),
                  buildLibraryZipName(
                    activeStyles.length,
                    activeLightingTypes.length,
                    activeRatios.length,
                  ).replace(/\.zip$/, `${emotionalZipSuffix}.zip`),
                )
              }
              disabled={isCustomMode || exporting === "all"}
            >
              {exporting === "all" ? (
                <Loader2 className="spin" aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              全部 {activeStyles.length * activeLightingTypes.length * activeRatios.length} 份
            </button>
            <button
              type="button"
              onClick={() =>
                handleZipExport(
                  "allEmotions",
                  buildAllEmotionalPrompts(catalog, {
                    elementAssets,
                    elementSelections,
                    elementReferenceUsageMode: elementUsageMode,
                    elementRandomToken,
                    ...materialRequest,
                  }),
                  `灯具提示词库_全部情绪_${activeEmotionalTones.length}版本.zip`,
                )
              }
              disabled={isCustomMode || exporting === "allEmotions"}
            >
              <DownloadOrSpinner active={exporting === "allEmotions"} />
              全部情绪版本
            </button>
          </div>
        </details>
      </header>

      <div className="app-shell export-dock-layout">
      <aside className="control-pane">
        <header className="app-header">
          <div>
            <p className="eyebrow">Prompt Library</p>
            <h1>灯具提示词组合系统</h1>
          </div>
          <PackageCheck aria-hidden="true" />
        </header>

        <div className="workspace-tabs" role="tablist" aria-label="提示词工作区">
          <button type="button" className="active">
            文生图
          </button>
          <button type="button" onClick={() => setWorkspaceMode("reference")}>
            参考图任务
          </button>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="页面模式">
          <button
            type="button"
            className={mode === "generate" ? "active" : ""}
            onClick={() => setMode("generate")}
          >
            <FileText aria-hidden="true" />
            生成
          </button>
          <button
            type="button"
            className={mode === "manage" ? "active" : ""}
            onClick={() => setMode("manage")}
          >
            <Pencil aria-hidden="true" />
            管理
          </button>
        </div>

        {mode === "generate" ? (
          <>
            <section className="panel">
              <div className="panel-title">
                <Layers3 aria-hidden="true" />
                <h2>组合</h2>
              </div>

              <SelectField
                label="用户自定义"
                value={customPromptId}
                onChange={setCustomPromptId}
              >
                <option value="none">无</option>
                {activeCustomPrompts.map((customPrompt) => (
                  <option key={customPrompt.id} value={customPrompt.id}>
                    {customPrompt.displayName}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="风格"
                value={styleId}
                onChange={setStyleId}
                disabled={isCustomMode}
              >
                {activeStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.displayName}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="灯具类型"
                value={lightingTypeId}
                onChange={setLightingTypeId}
                disabled={isCustomMode}
              >
                {activeLightingTypes.map((lightingType) => (
                  <option key={lightingType.id} value={lightingType.id}>
                    {lightingType.displayName}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="结构材质模式"
                value={structuralMaterialModeId}
                onChange={setStructuralMaterialModeId}
                disabled={isCustomMode}
              >
                {activeStructuralMaterialModes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </SelectField>

              {!isCustomMode &&
                selectedStructuralMaterialMode.mode !== "regular" && (
                  <div className="material-strategy-fields">
                    <MultiSelectField
                      label="金属选择"
                      value={selectedMetals}
                      options={metalOptions}
                      onChange={setSelectedMetals}
                    />
                    <MultiSelectField
                      label="表面处理"
                      value={selectedFinishes}
                      options={finishOptions}
                      onChange={setSelectedFinishes}
                    />
                    <MultiSelectField
                      label="制造工艺"
                      value={selectedProcesses}
                      options={processOptions}
                      onChange={setSelectedProcesses}
                    />
                    <MultiSelectField
                      label="连接方式"
                      value={connectionLanguage}
                      options={connectionOptions}
                      onChange={setConnectionLanguage}
                    />
                    <MultiSelectField
                      label="灯罩与控光方式"
                      value={shadeStrategy}
                      options={shadeOptions}
                      onChange={setShadeStrategy}
                    />
                    <SelectField
                      label="材质锁定程度"
                      value={materialStrictness}
                      onChange={(value) =>
                        setMaterialStrictness(value as "strict" | "balanced")
                      }
                    >
                      <option value="strict">严格锁定</option>
                      <option value="balanced">安全与光学需要时可放宽</option>
                    </SelectField>
                    {selectedStructuralMaterialMode.mode === "custom" && (
                      <>
                        <TextField
                          label="允许的可见材质"
                          value={allowedMaterials}
                          placeholder="例如：铁、黄铜、不锈钢"
                          onChange={setAllowedMaterials}
                        />
                        <TextField
                          label="禁止的可见材质"
                          value={prohibitedMaterials}
                          placeholder="例如：玻璃、木材、石材、塑料"
                          onChange={setProhibitedMaterials}
                        />
                      </>
                    )}
                  </div>
                )}

              <SelectField
                label="比例"
                value={ratioId}
                onChange={setRatioId}
                disabled={isCustomMode}
              >
                {activeRatios.map((ratio) => (
                  <option key={ratio.id} value={ratio.id}>
                    {ratio.displayName}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="输出方式"
                value={outputModeId}
                onChange={setOutputModeId}
                disabled={isCustomMode}
              >
                {activeOutputModes.map((outputMode) => (
                  <option key={outputMode.id} value={outputMode.id}>
                    {outputMode.displayName}
                  </option>
                ))}
              </SelectField>

              {!isCustomMode && isBotanicalStillLifeOutputId(outputModeId) && (
                <div className="botanical-controls">
                  {outputModeId === "botanical_still_life_5_pure" && (
                    <p className="technical-mode-note">
                      原MD纯净版会忽略当前风格、情绪增强、摄影风格和结构材质，只保留灯具类型与植物灵感库。
                    </p>
                  )}
                  <SelectField
                    label="植物模式"
                    value={botanicalFormMode}
                    onChange={(value) =>
                      setBotanicalFormMode(value as "random" | "specified")
                    }
                  >
                    <option value="random">随机植物形态</option>
                    <option value="specified">指定植物形态</option>
                  </SelectField>
                  <SelectField
                    label="指定植物形态"
                    value={selectedBotanicalFormId}
                    onChange={setSelectedBotanicalFormId}
                    disabled={botanicalFormMode !== "specified"}
                  >
                    <option value="">自动选择</option>
                    {activeBotanicalForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.displayName} / {form.englishName}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={`排除分类（已排除 ${excludedBotanicalFormIds.length} 项）`}
                    value={botanicalExcludeCategory}
                    onChange={(value) =>
                      setBotanicalExcludeCategory(value as BotanicalCategoryId)
                    }
                    disabled={botanicalFormMode !== "random"}
                  >
                    {botanicalCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}（{botanicalCategoryCounts.get(category.id) ?? 0}）
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="材质模式"
                    value={botanicalMaterialMode}
                    onChange={(value) =>
                      setBotanicalMaterialMode(value as "auto" | "specified")
                    }
                  >
                    <option value="auto">系统随机材质</option>
                    <option value="specified">指定材质</option>
                  </SelectField>
                  <div className="botanical-exclusions">
                    <div className="botanical-exclusion-head">
                      <span>当前分类可排除</span>
                      {excludedBotanicalFormIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExcludedBotanicalFormIds([])}
                        >
                          清空排除
                        </button>
                      )}
                    </div>
                    <div className="botanical-chip-grid">
                      {visibleExclusionForms.map((form) => (
                        <label key={form.id} className="mini-check">
                          <input
                            type="checkbox"
                            checked={excludedBotanicalFormIds.includes(form.id)}
                            disabled={botanicalFormMode !== "random"}
                            onChange={(event) =>
                              setExcludedBotanicalFormIds((current) =>
                                event.target.checked
                                  ? [...current, form.id]
                                  : current.filter((id) => id !== form.id),
                              )
                            }
                          />
                          <span>{form.displayName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {botanicalMaterialMode === "specified" && (
                    <div className="botanical-material-controls">
                      <MultiSelectField
                        label="指定材质"
                        value={selectedBotanicalMaterials}
                        options={botanicalMaterialOptions}
                        onChange={setSelectedBotanicalMaterials}
                      />
                      <TextField
                        label="自定义材质"
                        value={customBotanicalMaterial}
                        placeholder="例如：手揉杜邦纸、半透明贝母片、做旧紫铜网"
                        onChange={setCustomBotanicalMaterial}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    disabled={botanicalFormMode !== "random"}
                    onClick={() => setBotanicalRandomToken((value) => value + 1)}
                  >
                    重新随机植物
                  </button>
                </div>
              )}

              <SelectField
                label="情绪增强"
                value={emotionalToneId}
                onChange={setEmotionalToneId}
                disabled={isCustomMode || isTechnicalOutput}
              >
                {activeEmotionalTones.map((tone) => (
                  <option key={tone.id} value={tone.id}>
                    {tone.displayName}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="摄影风格模式"
                value={photographyProfileId}
                onChange={setPhotographyProfileId}
                disabled={isCustomMode || isTechnicalOutput}
              >
                {activePhotographyProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName}
                  </option>
                ))}
              </SelectField>

              {isCustomMode && (
                <p className="custom-mode-note">
                  已启用“{selectedCustomPrompt.displayName}”，当前输出只使用该条自定义提示词，其他组合项暂不参与。
                </p>
              )}

              {!isCustomMode && isTechnicalOutput && (
                <p className="technical-mode-note">
                  当前为技术类输出，情绪增强和摄影风格模式不参与本次组合。
                </p>
              )}
            </section>

            <TextElementSelector
              assets={elementAssets}
              selections={elementSelections}
              usageMode={elementUsageMode}
              disabled={isCustomMode}
              onSelectionsChange={setElementSelections}
              onUsageModeChange={setElementUsageMode}
              onReroll={() => setElementRandomToken((value) => value + 1)}
              onManage={() => setWorkspaceMode("reference")}
            />

          </>
        ) : (
          <ManagementNav />
        )}
      </aside>

      {mode === "generate" ? (
        <PromptPreview
          prompt={currentPrompt}
          chinesePromptText={chinesePromptText}
          chinesePromptStatus={promptTranslation.status}
          selectedStyle={selectedStyle}
          selectedType={selectedType}
          selectedRatio={selectedRatio}
          selectedOutputMode={selectedOutputMode}
          selectedEmotionalTone={selectedEmotionalTone}
          selectedPhotographyProfile={selectedPhotographyProfile}
          selectedStructuralMaterialMode={selectedStructuralMaterialMode}
          selectedCustomPrompt={selectedCustomPrompt}
        />
      ) : (
        <ManagementView catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      </div>
    </>
  );
}

function PromptPreview({
  prompt,
  chinesePromptText,
  chinesePromptStatus,
  selectedStyle,
  selectedType,
  selectedRatio,
  selectedOutputMode,
  selectedEmotionalTone,
  selectedPhotographyProfile,
  selectedCustomPrompt,
  selectedStructuralMaterialMode,
}: {
  prompt: PromptBuildResult;
  chinesePromptText: string;
  chinesePromptStatus: TranslationStatus;
  selectedStyle: StyleModule;
  selectedType: LightingTypeModule;
  selectedRatio: RatioModule;
  selectedOutputMode: OutputModeModule;
  selectedEmotionalTone: EmotionalToneModule;
  selectedPhotographyProfile: PhotographyProfileModule;
  selectedCustomPrompt: CustomPromptModule | null;
  selectedStructuralMaterialMode: StructuralMaterialModeModule;
}) {
  const [previewLanguage, setPreviewLanguage] = useState<"bilingual" | OutputLanguage>(
    "bilingual",
  );
  const activePreviewText =
    previewLanguage === "chinese" ? chinesePromptText : prompt.promptText;
  const previewLength =
    previewLanguage === "bilingual"
      ? prompt.promptText.length + chinesePromptText.length
      : activePreviewText.length;

  return (
    <main className="preview-pane">
      <section className="summary-bar">
        <div>
          <p className="eyebrow">当前文件</p>
          <h2>{prompt.filename}</h2>
        </div>
        <ValidationBadge prompt={prompt} />
      </section>

      <section
        className={`metrics-strip${selectedCustomPrompt ? " custom" : ""}`}
      >
        {selectedCustomPrompt ? (
          <>
            <Metric label="用户自定义" value={selectedCustomPrompt.displayName} />
            <Metric label="字数" value={prompt.wordCount.toLocaleString("zh-CN")} />
          </>
        ) : (
          <>
            <Metric label="风格" value={selectedStyle.displayName} />
            <Metric label="类型" value={selectedType.displayName} />
            <Metric
              label="结构材质"
              value={selectedStructuralMaterialMode.displayName}
            />
            <Metric label="比例" value={selectedRatio.ratioValue} />
            <Metric label="输出" value={selectedOutputMode.displayName} />
            <Metric
              label="情绪"
              value={
                selectedOutputMode.category === "technical"
                  ? "不参与"
                  : selectedEmotionalTone.displayName
              }
            />
            <Metric
              label="摄影"
              value={
                selectedOutputMode.category === "technical"
                  ? "不参与"
                  : selectedPhotographyProfile.displayName
              }
            />
            <Metric label="字数" value={prompt.wordCount.toLocaleString("zh-CN")} />
          </>
        )}
      </section>

      <section className="preview-layout">
        <div className="prompt-preview">
          <div className="preview-header">
            <div>
              <h2>完整提示词</h2>
              <p>中文为本地词库即时参考稿，不会保存到模块数据。</p>
            </div>
            <span>{previewLength.toLocaleString("zh-CN")} 字符</span>
          </div>

          <div className="preview-mode-tabs" role="tablist" aria-label="预览语言">
            <button
              type="button"
              className={previewLanguage === "bilingual" ? "active" : ""}
              onClick={() => setPreviewLanguage("bilingual")}
            >
              中英对照
            </button>
            <button
              type="button"
              className={previewLanguage === "english" ? "active" : ""}
              onClick={() => setPreviewLanguage("english")}
            >
              英文
            </button>
            <button
              type="button"
              className={previewLanguage === "chinese" ? "active" : ""}
              onClick={() => setPreviewLanguage("chinese")}
            >
              中文参考
            </button>
          </div>

          {previewLanguage === "bilingual" ? (
            <SyncedTextareaPair
              containerClassName="bilingual-preview"
              columnClassName="prompt-column"
              labelClassName="column-title"
              leftLabel="英文原文"
              rightLabel={`中文参考${formatTranslationStatus(chinesePromptStatus)}`}
              leftValue={prompt.promptText}
              rightValue={chinesePromptText}
              leftReadOnly
              rightReadOnly
            />
          ) : (
            <textarea readOnly value={activePreviewText} spellCheck={false} />
          )}
        </div>

        <div className="module-panel">
          <h2>模块来源</h2>
          <ul>
            {prompt.moduleSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>

          {!prompt.validation.valid && (
            <div className="validation-detail">
              <h3>校验问题</h3>
              {prompt.validation.forbiddenTokens.length > 0 && (
                <p>禁用内容：{prompt.validation.forbiddenTokens.join("、")}</p>
              )}
              {prompt.validation.missingKeywords.length > 0 && (
                <p>缺少关键词：{prompt.validation.missingKeywords.join("、")}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ManagementNav() {
  return (
    <section className="panel subtle-panel">
      <div className="panel-title">
        <Save aria-hidden="true" />
        <h2>本地文件管理</h2>
      </div>
      <p className="helper-text">
        保存会直接写入项目下的 JSON/MD 文件，刷新页面后仍然生效。
      </p>
    </section>
  );
}

function ManagementView({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const [section, setSection] = useState<ManageSection>("styles");

  return (
    <main className="preview-pane">
      <section className="summary-bar">
        <div>
          <p className="eyebrow">模块管理</p>
          <h2>编辑本地 JSON / MD 数据</h2>
        </div>
        <button type="button" onClick={() => void reloadCatalog()}>
          <Layers3 aria-hidden="true" />
          重新载入文件
        </button>
      </section>

      <div className="manager-tabs" role="tablist" aria-label="管理模块">
        <button
          type="button"
          className={section === "styles" ? "active" : ""}
          onClick={() => setSection("styles")}
        >
          风格
        </button>
        <button
          type="button"
          className={section === "lightingTypes" ? "active" : ""}
          onClick={() => setSection("lightingTypes")}
        >
          灯具类型
        </button>
        <button
          type="button"
          className={section === "ratios" ? "active" : ""}
          onClick={() => setSection("ratios")}
        >
          比例
        </button>
        <button
          type="button"
          className={section === "emotionalTones" ? "active" : ""}
          onClick={() => setSection("emotionalTones")}
        >
          情绪增强
        </button>
        <button
          type="button"
          className={section === "photographyProfiles" ? "active" : ""}
          onClick={() => setSection("photographyProfiles")}
        >
          摄影模式
        </button>
        <button
          type="button"
          className={section === "outputModes" ? "active" : ""}
          onClick={() => setSection("outputModes")}
        >
          输出方式
        </button>
        <button
          type="button"
          className={section === "botanicalForms" ? "active" : ""}
          onClick={() => setSection("botanicalForms")}
        >
          植物灵感库
        </button>
        <button
          type="button"
          className={section === "structuralMaterialModes" ? "active" : ""}
          onClick={() => setSection("structuralMaterialModes")}
        >
          结构材质
        </button>
        <button
          type="button"
          className={section === "customPrompts" ? "active" : ""}
          onClick={() => setSection("customPrompts")}
        >
          用户自定义
        </button>
        <button
          type="button"
          className={section === "common" ? "active" : ""}
          onClick={() => setSection("common")}
        >
          固定提示词
        </button>
      </div>

      {section === "styles" && (
        <StyleManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      {section === "lightingTypes" && (
        <LightingTypeManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      {section === "ratios" && <RatioManager catalog={catalog} reloadCatalog={reloadCatalog} />}
      {section === "emotionalTones" && (
        <EmotionalToneManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      {section === "photographyProfiles" && (
        <PhotographyProfileManager
          catalog={catalog}
          reloadCatalog={reloadCatalog}
        />
      )}
      {section === "outputModes" && (
        <OutputModeManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      {section === "botanicalForms" && (
        <BotanicalFormManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      {section === "structuralMaterialModes" && (
        <StructuralMaterialModeManager
          catalog={catalog}
          reloadCatalog={reloadCatalog}
        />
      )}
      {section === "customPrompts" && (
        <CustomPromptManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
      {section === "common" && (
        <CommonPromptManager catalog={catalog} reloadCatalog={reloadCatalog} />
      )}
    </main>
  );
}

function StyleManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const firstId = catalog.styles[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(firstId);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<StyleModule>(() => catalog.styles[0] ?? createEmptyStyle());
  const [listDraft, setListDraft] = useState(() =>
    styleListsToText(catalog.styles[0] ?? createEmptyStyle()),
  );
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected = catalog.styles.find((style) => style.id === selectedId) ?? catalog.styles[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
      setListDraft(styleListsToText(selected));
    }
  }, [catalog.styles, isNew, selectedId]);

  async function handleSave() {
    const styleToSave = {
      ...draft,
      inspirationSources: linesToArray(listDraft.inspirationSources),
      specificElements: linesToArray(listDraft.specificElements),
      materials: linesToArray(listDraft.materials),
      colors: linesToArray(listDraft.colors),
      avoid: linesToArray(listDraft.avoid),
    };

    if (!validateId(styleToSave.id)) return;
    if (isNew && catalog.styles.some((style) => style.id === styleToSave.id)) {
      window.alert("这个风格 ID 已存在，请换一个 ID。");
      return;
    }
    await saveStyle(styleToSave);
    await reloadCatalog();
    setSelectedId(styleToSave.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/styles/${styleToSave.id}.json`);
  }

  async function handleDelete() {
    if (isNew) return;
    if (!window.confirm(`确定删除风格：${draft.displayName}？`)) return;
    await deleteStyle(draft.id);
    await reloadCatalog();
    setSelectedId("");
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/styles/${draft.id}.json`);
  }

  const styleTranslationPairs = buildModuleTranslationPairs(draft.displayName, draft.englishName);

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="风格模块"
        selectLabel="选择风格"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.styles.map((style) => ({ id: style.id, label: style.displayName }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyStyle());
          setListDraft(styleListsToText(createEmptyStyle()));
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="风格名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <CheckboxField
        label="启用"
        checked={draft.enabled !== false}
        onChange={(checked) => setDraft({ ...draft, enabled: checked })}
      />

      <TextareaField
        label="风格描述"
        value={draft.stylePrompt}
        onChange={(value) => setDraft({ ...draft, stylePrompt: value })}
        translationText={translateToChineseReference(draft.stylePrompt, styleTranslationPairs)}
      />
      <TextareaField
        label="全五金造型转译"
        value={draft.metalTranslationPrompt ?? ""}
        onChange={(value) =>
          setDraft({ ...draft, metalTranslationPrompt: value })
        }
        translationText={translateToChineseReference(
          draft.metalTranslationPrompt ?? "",
          styleTranslationPairs,
        )}
        tall
      />
      <TextareaField
        label="灵感来源，每行一个"
        value={listDraft.inspirationSources}
        onChange={(value) => setListDraft({ ...listDraft, inspirationSources: value })}
        translationText={translateToChineseReference(
          listDraft.inspirationSources,
          styleTranslationPairs,
        )}
      />
      <TextareaField
        label="具体元素，每行一个"
        value={listDraft.specificElements}
        onChange={(value) => setListDraft({ ...listDraft, specificElements: value })}
        translationText={translateToChineseReference(
          listDraft.specificElements,
          styleTranslationPairs,
        )}
      />
      <TextareaField
        label="材料体系，每行一个"
        value={listDraft.materials}
        onChange={(value) => setListDraft({ ...listDraft, materials: value })}
        translationText={translateToChineseReference(listDraft.materials, styleTranslationPairs)}
      />
      <TextareaField
        label="色彩体系，每行一个"
        value={listDraft.colors}
        onChange={(value) => setListDraft({ ...listDraft, colors: value })}
        translationText={translateToChineseReference(listDraft.colors, styleTranslationPairs)}
      />
      <TextareaField
        label="避免事项，每行一个"
        value={listDraft.avoid}
        onChange={(value) => setListDraft({ ...listDraft, avoid: value })}
        translationText={translateToChineseReference(listDraft.avoid, styleTranslationPairs)}
      />

      <EditorActions
        isNew={isNew}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="styles"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function LightingTypeManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(catalog.lightingTypes[0]?.id ?? "");
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<LightingTypeModule>(
    () => catalog.lightingTypes[0] ?? createEmptyLightingType(),
  );
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.lightingTypes.find((lightingType) => lightingType.id === selectedId) ??
      catalog.lightingTypes[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
    }
  }, [catalog.lightingTypes, isNew, selectedId]);

  async function handleSave() {
    if (!validateId(draft.id)) return;
    if (isNew && catalog.lightingTypes.some((lightingType) => lightingType.id === draft.id)) {
      window.alert("这个灯具类型 ID 已存在，请换一个 ID。");
      return;
    }
    await saveLightingType(draft);
    await reloadCatalog();
    setSelectedId(draft.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/lighting_types/${draft.id}.json`);
  }

  async function handleDelete() {
    if (isNew) return;
    if (!window.confirm(`确定删除灯具类型：${draft.displayName}？`)) return;
    await deleteLightingType(draft.id);
    await reloadCatalog();
    setSelectedId("");
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/lighting_types/${draft.id}.json`);
  }

  const lightingTypeTranslationPairs = buildModuleTranslationPairs(
    draft.displayName,
    draft.englishName,
  );

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="灯具类型模块"
        selectLabel="选择类型"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.lightingTypes.map((lightingType) => ({
          id: lightingType.id,
          label: lightingType.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyLightingType());
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="中文名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <CheckboxField
        label="启用"
        checked={draft.enabled !== false}
        onChange={(checked) => setDraft({ ...draft, enabled: checked })}
      />

      <TextareaField
        label="类型提示词"
        value={draft.typePrompt}
        onChange={(value) => setDraft({ ...draft, typePrompt: value })}
        translationText={translateToChineseReference(
          draft.typePrompt,
          lightingTypeTranslationPairs,
        )}
      />

      <EditorActions
        isNew={isNew}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="lighting_types"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function RatioManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(catalog.ratios[0]?.id ?? "");
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<RatioModule>(() => catalog.ratios[0] ?? createEmptyRatio());
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected = catalog.ratios.find((ratio) => ratio.id === selectedId) ?? catalog.ratios[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
    }
  }, [catalog.ratios, isNew, selectedId]);

  async function handleSave() {
    if (!validateId(draft.id)) return;
    if (isNew && catalog.ratios.some((ratio) => ratio.id === draft.id)) {
      window.alert("这个比例 ID 已存在，请换一个 ID。");
      return;
    }
    await saveRatio(draft);
    await reloadCatalog();
    setSelectedId(draft.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/ratios/${draft.id}.json`);
  }

  async function handleDelete() {
    if (isNew) return;
    if (catalog.ratios.length <= 1) {
      window.alert("至少需要保留一个比例。");
      return;
    }
    if (!window.confirm(`确定删除比例：${draft.displayName}？`)) return;
    await deleteRatio(draft.id);
    await reloadCatalog();
    setSelectedId("");
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/ratios/${draft.id}.json`);
  }

  const ratioTranslationPairs = buildModuleTranslationPairs(draft.displayName, draft.ratioValue);

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="比例模块"
        selectLabel="选择比例"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.ratios.map((ratio) => ({ id: ratio.id, label: ratio.displayName }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyRatio());
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="比例名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="比例值"
          value={draft.ratioValue}
          onChange={(value) => setDraft({ ...draft, ratioValue: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <div className="checkbox-row">
        <CheckboxField
          label="启用"
          checked={draft.enabled !== false}
          onChange={(checked) => setDraft({ ...draft, enabled: checked })}
        />
        <CheckboxField
          label="设为默认比例"
          checked={draft.isDefault}
          onChange={(checked) => setDraft({ ...draft, isDefault: checked })}
        />
      </div>

      <TextareaField
        label="比例提示词"
        value={draft.ratioPrompt}
        onChange={(value) => setDraft({ ...draft, ratioPrompt: value })}
        translationText={translateToChineseReference(draft.ratioPrompt, ratioTranslationPairs)}
      />

      <EditorActions
        isNew={isNew}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="ratios"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function EmotionalToneManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const firstTone =
    catalog.emotionalTones.find((tone) => tone.id === "none") ??
    catalog.emotionalTones[0] ??
    createEmptyEmotionalTone();
  const [selectedId, setSelectedId] = useState(firstTone.id);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<EmotionalToneModule>(() => ({ ...firstTone }));
  const [avoidDraft, setAvoidDraft] = useState(() =>
    (firstTone.avoidAddOn ?? []).join("\n"),
  );
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.emotionalTones.find((tone) => tone.id === selectedId) ??
      catalog.emotionalTones.find((tone) => tone.id === "none") ??
      catalog.emotionalTones[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
      setAvoidDraft((selected.avoidAddOn ?? []).join("\n"));
    }
  }, [catalog.emotionalTones, isNew, selectedId]);

  const isProtectedNone = !isNew && draft.id === "none";
  const translationPairs = buildModuleTranslationPairs(
    draft.displayName,
    draft.englishName,
  );

  async function handleSave() {
    const toneToSave: EmotionalToneModule = {
      ...draft,
      avoidAddOn: linesToArray(avoidDraft),
    };

    if (!validateId(toneToSave.id)) return;
    if (
      isNew &&
      catalog.emotionalTones.some((tone) => tone.id === toneToSave.id)
    ) {
      window.alert("这个情绪增强 ID 已存在，请换一个 ID。");
      return;
    }

    const saved = await saveEmotionalTone(toneToSave);
    await reloadCatalog();
    setSelectedId(saved.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/emotional_tones/${saved.id}.json`);
  }

  async function handleDelete() {
    if (isNew || isProtectedNone) return;
    if (!window.confirm(`确定删除情绪增强：${draft.displayName}？`)) return;
    await deleteEmotionalTone(draft.id);
    await reloadCatalog();
    setSelectedId("none");
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/emotional_tones/${draft.id}.json`);
  }

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="情绪增强模块"
        selectLabel="选择情绪"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.emotionalTones.map((tone) => ({
          id: tone.id,
          label: tone.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyEmotionalTone());
          setAvoidDraft("");
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="中文名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          disabled={isProtectedNone}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          disabled={isProtectedNone}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      {isProtectedNone ? (
        <p className="helper-text protected-note">
          “不启用”是系统默认兜底选项，只能修改中文名称，不能停用或删除。
        </p>
      ) : (
        <CheckboxField
          label="启用"
          checked={draft.enabled !== false}
          onChange={(checked) => setDraft({ ...draft, enabled: checked })}
        />
      )}

      <TextareaField
        label="核心情绪提示词"
        value={draft.tonePrompt}
        disabled={isProtectedNone}
        onChange={(value) => setDraft({ ...draft, tonePrompt: value })}
        translationText={translateToChineseReference(draft.tonePrompt, translationPairs)}
        tall
      />
      <TextareaField
        label="色彩情绪增强"
        value={draft.colorAddOn ?? ""}
        disabled={isProtectedNone}
        onChange={(value) => setDraft({ ...draft, colorAddOn: value })}
        translationText={translateToChineseReference(draft.colorAddOn ?? "", translationPairs)}
      />
      <TextareaField
        label="Panel 1 情绪增强"
        value={draft.panel1AddOn ?? ""}
        disabled={isProtectedNone}
        onChange={(value) => setDraft({ ...draft, panel1AddOn: value })}
        translationText={translateToChineseReference(draft.panel1AddOn ?? "", translationPairs)}
      />
      <TextareaField
        label="Panel 4 情绪增强"
        value={draft.panel4AddOn ?? ""}
        disabled={isProtectedNone}
        onChange={(value) => setDraft({ ...draft, panel4AddOn: value })}
        translationText={translateToChineseReference(draft.panel4AddOn ?? "", translationPairs)}
      />
      <TextareaField
        label="摄影情绪增强"
        value={draft.photographyAddOn ?? ""}
        disabled={isProtectedNone}
        onChange={(value) => setDraft({ ...draft, photographyAddOn: value })}
        translationText={translateToChineseReference(
          draft.photographyAddOn ?? "",
          translationPairs,
        )}
      />
      <TextareaField
        label="情绪避免事项，每行一个"
        value={avoidDraft}
        disabled={isProtectedNone}
        onChange={setAvoidDraft}
        translationText={translateToChineseReference(avoidDraft, translationPairs)}
      />

      <EditorActions
        isNew={isNew}
        canDelete={!isProtectedNone}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="emotional_tones"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function PhotographyProfileManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const firstProfile =
    catalog.photographyProfiles.find((profile) => profile.isDefault) ??
    catalog.photographyProfiles[0] ??
    createEmptyPhotographyProfile();
  const [selectedId, setSelectedId] = useState(firstProfile.id);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<PhotographyProfileModule>(() => ({
    ...firstProfile,
  }));
  const [avoidDraft, setAvoidDraft] = useState(() =>
    (firstProfile.avoidPrompt ?? []).join("\n"),
  );
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.photographyProfiles.find((profile) => profile.id === selectedId) ??
      catalog.photographyProfiles.find((profile) => profile.isDefault) ??
      catalog.photographyProfiles[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
      setAvoidDraft((selected.avoidPrompt ?? []).join("\n"));
    }
  }, [catalog.photographyProfiles, isNew, selectedId]);

  const isCurrentDefault = !isNew && Boolean(draft.isDefault);
  const translationPairs = buildModuleTranslationPairs(
    draft.displayName,
    draft.englishName,
  );

  async function handleSave() {
    const profileToSave: PhotographyProfileModule = {
      ...draft,
      avoidPrompt: linesToArray(avoidDraft),
    };

    if (!validateId(profileToSave.id)) return;
    if (
      isNew &&
      catalog.photographyProfiles.some(
        (profile) => profile.id === profileToSave.id,
      )
    ) {
      window.alert("这个摄影模式 ID 已存在，请换一个 ID。");
      return;
    }

    const saved = await savePhotographyProfile(profileToSave);
    await reloadCatalog();
    setSelectedId(saved.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/photography_profiles/${saved.id}.json`);
  }

  async function handleDelete() {
    if (isNew || isCurrentDefault) return;
    if (!window.confirm(`确定删除摄影模式：${draft.displayName}？`)) return;
    await deletePhotographyProfile(draft.id);
    await reloadCatalog();
    setSelectedId(
      catalog.photographyProfiles.find((profile) => profile.isDefault)?.id ?? "",
    );
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/photography_profiles/${draft.id}.json`);
  }

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="摄影风格模式模块"
        selectLabel="选择摄影模式"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.photographyProfiles.map((profile) => ({
          id: profile.id,
          label: profile.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyPhotographyProfile());
          setAvoidDraft("");
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="中文名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <div className="checkbox-row">
        <CheckboxField
          label="启用"
          checked={draft.enabled !== false}
          disabled={isCurrentDefault}
          onChange={(checked) => setDraft({ ...draft, enabled: checked })}
        />
        <CheckboxField
          label="设为默认摄影模式"
          checked={Boolean(draft.isDefault)}
          disabled={isCurrentDefault}
          onChange={(checked) =>
            setDraft({
              ...draft,
              isDefault: checked,
              enabled: checked ? true : draft.enabled,
            })
          }
        />
      </div>

      {isCurrentDefault && (
        <p className="helper-text protected-note">
          当前默认摄影模式不能停用、取消默认或删除。请先把其他模式设为默认。
        </p>
      )}

      <TextareaField
        label="整体摄影风格"
        value={draft.profilePrompt}
        onChange={(value) => setDraft({ ...draft, profilePrompt: value })}
        translationText={translateToChineseReference(
          draft.profilePrompt,
          translationPairs,
        )}
        tall
      />
      <TextareaField
        label="构图方式"
        value={draft.compositionPrompt}
        onChange={(value) => setDraft({ ...draft, compositionPrompt: value })}
        translationText={translateToChineseReference(
          draft.compositionPrompt,
          translationPairs,
        )}
      />
      <TextareaField
        label="光线与照明"
        value={draft.lightingPrompt}
        onChange={(value) => setDraft({ ...draft, lightingPrompt: value })}
        translationText={translateToChineseReference(
          draft.lightingPrompt,
          translationPairs,
        )}
      />
      <TextareaField
        label="镜头与手机拍摄"
        value={draft.cameraPrompt}
        onChange={(value) => setDraft({ ...draft, cameraPrompt: value })}
        translationText={translateToChineseReference(
          draft.cameraPrompt,
          translationPairs,
        )}
      />
      <TextareaField
        label="画面情绪与氛围"
        value={draft.moodPrompt}
        onChange={(value) => setDraft({ ...draft, moodPrompt: value })}
        translationText={translateToChineseReference(
          draft.moodPrompt,
          translationPairs,
        )}
      />
      <TextareaField
        label="摄影避免事项，每行一个"
        value={avoidDraft}
        onChange={setAvoidDraft}
        translationText={translateToChineseReference(
          avoidDraft,
          translationPairs,
        )}
      />

      <EditorActions
        isNew={isNew}
        canDelete={!isCurrentDefault}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="photography_profiles"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function OutputModeManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const firstMode =
    catalog.outputModes.find((outputMode) => outputMode.isDefault) ??
    catalog.outputModes[0] ??
    createEmptyOutputMode();
  const [selectedId, setSelectedId] = useState(firstMode.id);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<OutputModeModule>(() => ({ ...firstMode }));
  const [avoidDraft, setAvoidDraft] = useState(() =>
    (firstMode.avoidPrompt ?? []).join("\n"),
  );
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.outputModes.find((outputMode) => outputMode.id === selectedId) ??
      catalog.outputModes.find((outputMode) => outputMode.isDefault) ??
      catalog.outputModes[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
      setAvoidDraft((selected.avoidPrompt ?? []).join("\n"));
    }
  }, [catalog.outputModes, isNew, selectedId]);

  const isCurrentDefault = !isNew && Boolean(draft.isDefault);
  const translationPairs = buildModuleTranslationPairs(
    draft.displayName,
    draft.englishName,
  );

  async function handleSave() {
    const outputModeToSave: OutputModeModule = {
      ...draft,
      avoidPrompt: linesToArray(avoidDraft),
    };

    if (!validateId(outputModeToSave.id)) return;
    if (
      isNew &&
      catalog.outputModes.some(
        (outputMode) => outputMode.id === outputModeToSave.id,
      )
    ) {
      window.alert("这个输出方式 ID 已存在，请换一个 ID。");
      return;
    }

    const saved = await saveOutputMode(outputModeToSave);
    await reloadCatalog();
    setSelectedId(saved.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/output_modes/${saved.id}.json`);
  }

  async function handleDelete() {
    if (isNew || isCurrentDefault) return;
    if (!window.confirm(`确定删除输出方式：${draft.displayName}？`)) return;
    await deleteOutputMode(draft.id);
    await reloadCatalog();
    setSelectedId(
      catalog.outputModes.find((outputMode) => outputMode.isDefault)?.id ?? "",
    );
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/output_modes/${draft.id}.json`);
  }

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="输出方式模块"
        selectLabel="选择输出方式"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.outputModes.map((outputMode) => ({
          id: outputMode.id,
          label: outputMode.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyOutputMode());
          setAvoidDraft("");
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="中文名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <SelectField
          label="输出分类"
          value={draft.category}
          onChange={(value) =>
            setDraft({
              ...draft,
              category: value as OutputModeModule["category"],
            })
          }
        >
          <option value="photographic">摄影类 photographic</option>
          <option value="technical">技术类 technical</option>
        </SelectField>
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <div className="checkbox-row">
        <CheckboxField
          label="启用"
          checked={draft.enabled !== false}
          disabled={isCurrentDefault}
          onChange={(checked) => setDraft({ ...draft, enabled: checked })}
        />
        <CheckboxField
          label="设为默认输出方式"
          checked={Boolean(draft.isDefault)}
          disabled={isCurrentDefault}
          onChange={(checked) =>
            setDraft({
              ...draft,
              isDefault: checked,
              enabled: checked ? true : draft.enabled,
            })
          }
        />
      </div>

      {isCurrentDefault && (
        <p className="helper-text protected-note">
          当前默认输出方式不能停用、取消默认或删除。请先把其他方式设为默认。
        </p>
      )}

      <TextareaField
        label="核心输出提示词"
        value={draft.outputPrompt}
        onChange={(value) => setDraft({ ...draft, outputPrompt: value })}
        translationText={translateToChineseReference(
          draft.outputPrompt,
          translationPairs,
        )}
        tall
      />
      <TextareaField
        label="一致性要求"
        value={draft.consistencyPrompt ?? ""}
        onChange={(value) => setDraft({ ...draft, consistencyPrompt: value })}
        translationText={translateToChineseReference(
          draft.consistencyPrompt ?? "",
          translationPairs,
        )}
      />
      <TextareaField
        label="布局要求"
        value={draft.layoutPrompt ?? ""}
        onChange={(value) => setDraft({ ...draft, layoutPrompt: value })}
        translationText={translateToChineseReference(
          draft.layoutPrompt ?? "",
          translationPairs,
        )}
      />
      <TextareaField
        label="输出避免事项，每行一个"
        value={avoidDraft}
        onChange={setAvoidDraft}
        translationText={translateToChineseReference(
          avoidDraft,
          translationPairs,
        )}
      />

      <EditorActions
        isNew={isNew}
        canDelete={!isCurrentDefault}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="output_modes"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function BotanicalFormManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const first = catalog.botanicalForms[0] ?? createEmptyBotanicalForm();
  const [selectedId, setSelectedId] = useState(first.id);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<BotanicalFormModule>(() => ({ ...first }));
  const [avoidDraft, setAvoidDraft] = useState(first.avoidPrompt.join("\n"));
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.botanicalForms.find((form) => form.id === selectedId) ??
      catalog.botanicalForms[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
      setAvoidDraft(selected.avoidPrompt.join("\n"));
    }
  }, [catalog.botanicalForms, isNew, selectedId]);

  async function handleSave() {
    const formToSave: BotanicalFormModule = {
      ...draft,
      avoidPrompt: linesToArray(avoidDraft),
    };
    if (!validateId(formToSave.id)) return;
    if (
      isNew &&
      catalog.botanicalForms.some((form) => form.id === formToSave.id)
    ) {
      window.alert("这个植物形态 ID 已存在，请换一个 ID。");
      return;
    }
    const saved = await saveBotanicalForm(formToSave);
    await reloadCatalog();
    setSelectedId(saved.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/botanical_forms/${saved.id}.json`);
  }

  async function handleDelete() {
    if (isNew) return;
    if (!window.confirm(`确定删除植物形态：${draft.displayName}？`)) return;
    await deleteBotanicalForm(draft.id);
    await reloadCatalog();
    setSelectedId(catalog.botanicalForms[0]?.id ?? "");
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已删除 data/botanical_forms/${draft.id}.json`);
  }

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="植物灵感库"
        selectLabel="选择植物形态"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.botanicalForms.map((form) => ({
          id: form.id,
          label: form.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setDraft(createEmptyBotanicalForm());
          setAvoidDraft("");
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="中文名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <TextField
          label="植物家族/分类"
          value={draft.family}
          onChange={(value) => setDraft({ ...draft, family: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <div className="checkbox-row">
        <CheckboxField
          label="启用"
          checked={draft.enabled !== false}
          onChange={(checked) => setDraft({ ...draft, enabled: checked })}
        />
      </div>

      <TextareaField
        label="植物形态特征（英文）"
        value={draft.formPrompt}
        onChange={(value) => setDraft({ ...draft, formPrompt: value })}
        translationText={translateToChineseReference(draft.formPrompt)}
        tall
      />
      <TextareaField
        label="灯具转译方式（英文）"
        value={draft.translationPrompt}
        onChange={(value) => setDraft({ ...draft, translationPrompt: value })}
        translationText={translateToChineseReference(draft.translationPrompt)}
        tall
      />
      <TextareaField
        label="适合应用位置（英文）"
        value={draft.placementPrompt}
        onChange={(value) => setDraft({ ...draft, placementPrompt: value })}
        translationText={translateToChineseReference(draft.placementPrompt)}
      />
      <TextareaField
        label="避免项（每行一个）"
        value={avoidDraft}
        onChange={setAvoidDraft}
        translationText={translateToChineseReference(avoidDraft)}
      />

      <EditorActions
        isNew={isNew}
        canDelete
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="botanical_forms"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function StructuralMaterialModeManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const first = catalog.structuralMaterialModes[0] ?? createEmptyStructuralMaterialMode();
  const [selectedId, setSelectedId] = useState(first.id);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<StructuralMaterialModeModule>(() => ({
    ...first,
  }));
  const [avoidDraft, setAvoidDraft] = useState(first.avoidPrompt.join("\n"));
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.structuralMaterialModes.find((item) => item.id === selectedId) ??
      catalog.structuralMaterialModes[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
      setAvoidDraft(selected.avoidPrompt.join("\n"));
    }
  }, [catalog.structuralMaterialModes, isNew, selectedId]);

  async function handleSave() {
    if (!validateId(draft.id)) return;
    if (
      isNew &&
      catalog.structuralMaterialModes.some((item) => item.id === draft.id)
    ) {
      window.alert("这个结构材质模式 ID 已存在。");
      return;
    }
    const saved = await saveStructuralMaterialMode({
      ...draft,
      avoidPrompt: linesToArray(avoidDraft),
    });
    await reloadCatalog();
    setSelectedId(saved.id);
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/structural_material_modes/${saved.id}.json`);
  }

  async function handleDelete() {
    if (isNew || draft.id === "regular") return;
    if (!window.confirm(`确定删除结构材质模式：${draft.displayName}？`)) return;
    await deleteStructuralMaterialMode(draft.id);
    await reloadCatalog();
    setSelectedId("regular");
    setStatus("结构材质模式已删除。");
  }

  const translationPairs = buildModuleTranslationPairs(
    draft.displayName,
    draft.englishName,
  );

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="结构材质模式"
        selectLabel="选择模式"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.structuralMaterialModes.map((item) => ({
          id: item.id,
          label: item.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          const empty = createEmptyStructuralMaterialMode();
          setIsNew(true);
          setDraft(empty);
          setAvoidDraft("");
          setStatus("");
        }}
      />
      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="中文名称"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <TextField
          label="英文名称"
          value={draft.englishName}
          onChange={(value) => setDraft({ ...draft, englishName: value })}
        />
        <SelectField
          label="模式类型"
          value={draft.mode}
          onChange={(value) =>
            setDraft({
              ...draft,
              mode: value as StructuralMaterialModeModule["mode"],
            })
          }
        >
          <option value="regular">常规</option>
          <option value="all_metal">全五金</option>
          <option value="metal_dominant">金属主导</option>
          <option value="custom">自定义锁定</option>
        </SelectField>
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>
      <CheckboxField
        label="启用"
        checked={draft.enabled}
        disabled={draft.id === "regular"}
        onChange={(enabled) => setDraft({ ...draft, enabled })}
      />
      <TextareaField
        label="结构材质约束"
        value={draft.structurePrompt}
        onChange={(value) => setDraft({ ...draft, structurePrompt: value })}
        translationText={translateToChineseReference(
          draft.structurePrompt,
          translationPairs,
        )}
        tall
      />
      <TextareaField
        label="制造工艺约束"
        value={draft.manufacturingPrompt}
        onChange={(value) => setDraft({ ...draft, manufacturingPrompt: value })}
        translationText={translateToChineseReference(
          draft.manufacturingPrompt,
          translationPairs,
        )}
      />
      <TextareaField
        label="避免事项，每行一个"
        value={avoidDraft}
        onChange={setAvoidDraft}
        translationText={translateToChineseReference(
          avoidDraft,
          translationPairs,
        )}
      />
      <EditorActions
        isNew={isNew}
        canDelete={draft.id !== "regular"}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />
      {draft.id && (
        <HistoryPanel
          kind="structural_material_modes"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function CustomPromptManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const firstPrompt = catalog.customPrompts[0] ?? createEmptyCustomPrompt();
  const [selectedId, setSelectedId] = useState(firstPrompt.id);
  const [isNew, setIsNew] = useState(catalog.customPrompts.length === 0);
  const [draft, setDraft] = useState<CustomPromptModule>(() => ({
    ...firstPrompt,
  }));
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const selected =
      catalog.customPrompts.find((customPrompt) => customPrompt.id === selectedId) ??
      catalog.customPrompts[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft({ ...selected });
    }
  }, [catalog.customPrompts, isNew, selectedId]);

  async function handleSave() {
    if (!validateId(draft.id)) return;
    if (!draft.displayName.trim()) {
      window.alert("请填写自定义提示词标题。");
      return;
    }
    if (!draft.promptText.trim()) {
      window.alert("请填写自定义提示词内容。");
      return;
    }
    if (
      isNew &&
      catalog.customPrompts.some(
        (customPrompt) => customPrompt.id === draft.id,
      )
    ) {
      window.alert("这个用户自定义 ID 已存在，请换一个 ID。");
      return;
    }

    const saved = await saveCustomPrompt(draft);
    await reloadCatalog();
    setSelectedId(saved.id);
    setDraft({ ...saved });
    setIsNew(false);
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/custom_prompts/${saved.id}.json`);
  }

  async function handleDelete() {
    if (isNew) return;
    if (!window.confirm(`确定删除用户自定义提示词“${draft.displayName}”吗？`)) {
      return;
    }
    await deleteCustomPrompt(draft.id);
    await reloadCatalog();
    setHistoryRefreshKey((value) => value + 1);
    setStatus(
      `已删除 data/custom_prompts/${draft.id}.json；删除前版本仍保留在历史检查点中`,
    );
  }

  return (
    <section className="editor-panel">
      <EditorToolbar
        title="用户自定义提示词"
        selectLabel="选择自定义标题"
        selectedId={selectedId}
        onSelectedId={setSelectedId}
        items={catalog.customPrompts.map((customPrompt) => ({
          id: customPrompt.id,
          label: customPrompt.displayName,
        }))}
        isNew={isNew}
        onNew={() => {
          setIsNew(true);
          setSelectedId("");
          setDraft(createEmptyCustomPrompt());
          setStatus("");
        }}
      />

      <div className="editor-grid">
        <TextField
          label="ID"
          value={draft.id}
          disabled={!isNew}
          onChange={(value) => setDraft({ ...draft, id: value })}
        />
        <TextField
          label="标题"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <NumberField
          label="排序"
          value={draft.sortOrder}
          onChange={(value) => setDraft({ ...draft, sortOrder: value })}
        />
      </div>

      <CheckboxField
        label="启用"
        checked={draft.enabled !== false}
        onChange={(checked) => setDraft({ ...draft, enabled: checked })}
      />

      <TextareaField
        label="自定义提示词"
        value={draft.promptText}
        onChange={(value) => setDraft({ ...draft, promptText: value })}
        translationText={translateToChineseReference(draft.promptText)}
        tall
      />

      <EditorActions
        isNew={isNew}
        status={status}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
      />

      {draft.id && (
        <HistoryPanel
          kind="custom_prompts"
          moduleId={draft.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setIsNew(false);
            setSelectedId(draft.id);
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function CommonPromptManager({
  catalog,
  reloadCatalog,
}: {
  catalog: CatalogData;
  reloadCatalog: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(catalog.commonPrompts[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const selectedPrompt =
    catalog.commonPrompts.find((prompt) => prompt.id === selectedId) ?? catalog.commonPrompts[0];

  useEffect(() => {
    if (selectedPrompt) {
      setSelectedId(selectedPrompt.id);
      setDraft(selectedPrompt.content);
    }
  }, [selectedPrompt]);

  async function handleSave() {
    if (!selectedPrompt) return;
    await saveCommonPrompt(selectedPrompt.id, draft);
    await reloadCatalog();
    setHistoryRefreshKey((value) => value + 1);
    setStatus(`已保存到 data/common/${selectedPrompt.filename}`);
  }

  return (
    <section className="editor-panel">
      <div className="editor-toolbar">
        <div>
          <p className="eyebrow">Common Prompts</p>
          <h2>固定提示词模块</h2>
        </div>
        <SelectField label="选择固定模块" value={selectedId} onChange={setSelectedId}>
          {catalog.commonPrompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.displayName}
            </option>
          ))}
        </SelectField>
      </div>

      <TextareaField
        label={selectedPrompt ? selectedPrompt.filename : "固定提示词"}
        value={draft}
        onChange={setDraft}
        tall
        translationText={translateToChineseReference(draft)}
      />

      {selectedPrompt?.deprecated && (
        <p className="technical-mode-note">
          这是旧版四宫格规则备份，当前组合器不再使用；对应规则已迁移到“输出方式”模块。
        </p>
      )}

      <div className="editor-actions">
        <button type="button" className="primary" onClick={() => void handleSave()}>
          <Save aria-hidden="true" />
          保存固定提示词
        </button>
        {status && <span className="save-status">{status}</span>}
      </div>

      {selectedPrompt && (
        <HistoryPanel
          kind="common"
          moduleId={selectedPrompt.id}
          refreshKey={historyRefreshKey}
          onRestore={async () => {
            await reloadCatalog();
            setHistoryRefreshKey((value) => value + 1);
            setStatus("已恢复到选中的历史检查点");
          }}
        />
      )}
    </section>
  );
}

function HistoryPanel({
  kind,
  moduleId,
  refreshKey,
  onRestore,
}: {
  kind: ModuleHistoryKind;
  moduleId: string;
  refreshKey: number;
  onRestore: () => Promise<void>;
}) {
  const [checkpoints, setCheckpoints] = useState<HistoryCheckpoint[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function reloadHistory() {
    if (!moduleId) return;
    setLoading(true);
    try {
      const nextCheckpoints = await fetchHistory(kind, moduleId);
      setCheckpoints(nextCheckpoints);
      setSelectedId((currentId) =>
        nextCheckpoints.some((checkpoint) => checkpoint.id === currentId)
          ? currentId
          : (nextCheckpoints[0]?.id ?? ""),
      );
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "历史检查点读取失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadHistory();
  }, [kind, moduleId, refreshKey]);

  const selectedCheckpoint =
    checkpoints.find((checkpoint) => checkpoint.id === selectedId) ?? checkpoints[0];

  async function handleRestore() {
    if (!selectedCheckpoint) return;
    if (!window.confirm("确定恢复到这个历史检查点？当前版本会先自动保存为新的检查点。")) {
      return;
    }

    await restoreCheckpoint(kind, moduleId, selectedCheckpoint.id);
    await onRestore();
    await reloadHistory();
    setStatus("恢复完成");
  }

  async function handleDelete() {
    if (!selectedCheckpoint) return;
    if (!window.confirm("确定删除这个历史检查点？")) return;

    await deleteCheckpoint(kind, moduleId, selectedCheckpoint.id);
    await reloadHistory();
    setStatus("检查点已删除");
  }

  return (
    <section className="history-panel">
      <div className="history-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>历史检查点</h2>
        </div>
        <button type="button" onClick={() => void reloadHistory()}>
          {loading ? <Loader2 className="spin" aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
          刷新
        </button>
      </div>

      {checkpoints.length === 0 ? (
        <p className="history-empty">还没有检查点。第一次修改并保存后，会自动记录保存前版本。</p>
      ) : (
        <>
          <div className="history-list">
            {checkpoints.map((checkpoint) => (
              <button
                key={checkpoint.id}
                type="button"
                className={checkpoint.id === selectedCheckpoint?.id ? "active" : ""}
                onClick={() => setSelectedId(checkpoint.id)}
              >
                <span>{formatDateTime(checkpoint.createdAt)}</span>
                <strong>{checkpoint.label}</strong>
              </button>
            ))}
          </div>

          {selectedCheckpoint && (
            <div className="history-preview">
              <div className="history-actions">
                <button type="button" className="primary" onClick={() => void handleRestore()}>
                  <Save aria-hidden="true" />
                  恢复此检查点
                </button>
                <button type="button" className="danger" onClick={() => void handleDelete()}>
                  <Trash2 aria-hidden="true" />
                  删除检查点
                </button>
              </div>
              <textarea
                readOnly
                className="editor-textarea tall"
                value={formatCheckpointSnapshot(selectedCheckpoint)}
                spellCheck={false}
              />
            </div>
          )}
        </>
      )}

      {status && <p className="history-status">{status}</p>}
    </section>
  );
}

function EditorToolbar({
  title,
  selectLabel,
  selectedId,
  onSelectedId,
  items,
  isNew,
  onNew,
}: {
  title: string;
  selectLabel: string;
  selectedId: string;
  onSelectedId: (id: string) => void;
  items: Array<{ id: string; label: string }>;
  isNew: boolean;
  onNew: () => void;
}) {
  return (
    <div className="editor-toolbar">
      <div>
        <p className="eyebrow">{isNew ? "New Module" : "Edit Module"}</p>
        <h2>{title}</h2>
      </div>
      <div className="toolbar-actions">
        {!isNew && (
          <SelectField label={selectLabel} value={selectedId} onChange={onSelectedId}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectField>
        )}
        <button type="button" onClick={onNew}>
          <Plus aria-hidden="true" />
          新增
        </button>
      </div>
    </div>
  );
}

function EditorActions({
  isNew,
  canDelete = true,
  status,
  onSave,
  onDelete,
}: {
  isNew: boolean;
  canDelete?: boolean;
  status: string;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="editor-actions">
      <button type="button" className="primary" onClick={onSave}>
        <Save aria-hidden="true" />
        保存
      </button>
      {!isNew && canDelete && (
        <button type="button" className="danger" onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          删除
        </button>
      )}
      {status && <span className="save-status">{status}</span>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ValidationBadge({ prompt }: { prompt: PromptBuildResult }) {
  if (prompt.validation.valid) {
    return (
      <div className="status-pill valid">
        <CheckCircle2 aria-hidden="true" />
        校验通过
      </div>
    );
  }

  return (
    <div className="status-pill invalid">
      <AlertTriangle aria-hidden="true" />
      校验未通过
    </div>
  );
}

function DownloadOrSpinner({ active }: { active: boolean }) {
  return active ? (
    <Loader2 className="spin" aria-hidden="true" />
  ) : (
    <Download aria-hidden="true" />
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MultiSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  const selectedValues = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedSet = new Set(selectedValues);
  const selectedOptions = options.filter((option) =>
    selectedSet.has(option.value),
  );

  function toggle(optionValue: string) {
    const next = selectedSet.has(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];
    onChange(next.join(", "));
  }

  return (
    <div className="field multi-select-field">
      <span>{label}（可多选）</span>
      <details>
        <summary>
          {selectedOptions.length > 0
            ? `已选 ${selectedOptions.length} 项`
            : "点击选择"}
        </summary>
        <div className="multi-select-options">
          {options.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={selectedSet.has(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </details>
      {selectedOptions.length > 0 && (
        <div className="multi-select-chips">
          {selectedOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              title={`移除 ${option.label}`}
              onClick={() => toggle(option.value)}
            >
              {option.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button
            type="button"
            className="multi-select-clear"
            onClick={() => onChange("")}
          >
            清空
          </button>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : undefined)
        }
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function SyncedTextareaPair({
  containerClassName,
  columnClassName,
  labelClassName,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  onLeftChange,
  textareaClassName,
  leftReadOnly,
  rightReadOnly,
}: {
  containerClassName: string;
  columnClassName: string;
  labelClassName?: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: string;
  rightValue: string;
  onLeftChange?: (value: string) => void;
  textareaClassName?: string;
  leftReadOnly?: boolean;
  rightReadOnly?: boolean;
}) {
  const leftRef = useRef<HTMLTextAreaElement | null>(null);
  const rightRef = useRef<HTMLTextAreaElement | null>(null);
  const syncingRef = useRef(false);

  function syncScroll(source: HTMLTextAreaElement, target: HTMLTextAreaElement | null) {
    if (!target || syncingRef.current) return;

    const sourceScrollable = source.scrollHeight - source.clientHeight;
    const targetScrollable = target.scrollHeight - target.clientHeight;
    const ratio = sourceScrollable > 0 ? source.scrollTop / sourceScrollable : 0;

    syncingRef.current = true;
    target.scrollTop = targetScrollable > 0 ? ratio * targetScrollable : 0;
    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    syncScroll(left, right);
  }, [leftValue, rightValue]);

  return (
    <div className={containerClassName}>
      <label className={columnClassName}>
        <span className={labelClassName}>{leftLabel}</span>
        <textarea
          ref={leftRef}
          readOnly={leftReadOnly}
          className={textareaClassName}
          value={leftValue}
          onChange={(event) => onLeftChange?.(event.target.value)}
          onScroll={(event) => syncScroll(event.currentTarget, rightRef.current)}
          spellCheck={false}
        />
      </label>
      <label className={columnClassName}>
        <span className={labelClassName}>{rightLabel}</span>
        <textarea
          ref={rightRef}
          readOnly={rightReadOnly}
          className={textareaClassName}
          value={rightValue}
          onScroll={(event) => syncScroll(event.currentTarget, leftRef.current)}
          spellCheck={false}
        />
      </label>
    </div>
  );
}

function useTranslatedText(sourceText: string, fallbackText: string) {
  const [state, setState] = useState<{
    text: string;
    status: TranslationStatus;
  }>({
    text: fallbackText,
    status: sourceText.trim() ? "loading" : "idle",
  });

  useEffect(() => {
    const normalizedText = sourceText.replace(/\r\n/g, "\n").trim();
    if (!normalizedText) {
      setState({ text: "", status: "idle" });
      return;
    }

    const cached = clientTranslationCache.get(normalizedText);
    if (cached !== undefined) {
      setState({ text: cached, status: "google" });
      return;
    }

    let cancelled = false;
    setState({ text: fallbackText, status: "loading" });

    const timeoutId = window.setTimeout(() => {
      translateText(normalizedText)
        .then((translatedText) => {
          if (cancelled) return;
          clientTranslationCache.set(normalizedText, translatedText);
          setState({ text: translatedText, status: "google" });
        })
        .catch(() => {
          if (cancelled) return;
          setState({ text: fallbackText, status: "fallback" });
        });
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [fallbackText, sourceText]);

  return state;
}

function TextareaField({
  label,
  value,
  onChange,
  tall,
  translationText,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  tall?: boolean;
  translationText?: string;
  disabled?: boolean;
}) {
  const textareaClassName = tall ? "editor-textarea tall" : "editor-textarea";
  const translatedText = useTranslatedText(
    translationText !== undefined ? value : "",
    translationText ?? "",
  );

  if (translationText !== undefined) {
    return (
      <div className="field">
        <span>{label}</span>
          <SyncedTextareaPair
            containerClassName="editor-translation-grid"
            columnClassName="translation-column"
            leftLabel={disabled ? "英文（系统锁定）" : "英文（可编辑）"}
            rightLabel={`中文参考（只读，不保存）${formatTranslationStatus(translatedText.status)}`}
            leftValue={value}
            rightValue={translatedText.text}
            onLeftChange={disabled ? undefined : onChange}
            textareaClassName={textareaClassName}
            leftReadOnly={disabled}
            rightReadOnly
        />
      </div>
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className={textareaClassName}
        value={value}
        readOnly={disabled}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </label>
  );
}

function formatTranslationStatus(status: TranslationStatus): string {
  if (status === "loading") return " · 翻译中";
  if (status === "google") return " · Google";
  if (status === "fallback") return " · 本地回退";
  return "";
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function createEmptyStyle(): StyleModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    stylePrompt: "",
    inspirationSources: [],
    specificElements: [],
    materials: [],
    colors: [],
    avoid: [],
    metalTranslationPrompt: "",
    enabled: true,
  };
}

function createEmptyLightingType(): LightingTypeModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    typePrompt: "",
    enabled: true,
  };
}

function createEmptyRatio(): RatioModule {
  return {
    id: "",
    displayName: "",
    ratioValue: "",
    isDefault: false,
    ratioPrompt: "",
    enabled: true,
  };
}

function createEmptyEmotionalTone(): EmotionalToneModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    isDefault: false,
    enabled: true,
    tonePrompt: "",
    colorAddOn: "",
    panel1AddOn: "",
    panel4AddOn: "",
    photographyAddOn: "",
    avoidAddOn: [],
  };
}

function createEmptyPhotographyProfile(): PhotographyProfileModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    isDefault: false,
    enabled: true,
    profilePrompt: "",
    compositionPrompt: "",
    lightingPrompt: "",
    cameraPrompt: "",
    moodPrompt: "",
    avoidPrompt: [],
  };
}

function createEmptyOutputMode(): OutputModeModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    category: "photographic",
    isDefault: false,
    enabled: true,
    outputPrompt: "",
    consistencyPrompt: "",
    layoutPrompt: "",
    avoidPrompt: [],
  };
}

function createEmptyBotanicalForm(): BotanicalFormModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    family: "",
    formPrompt: "",
    translationPrompt: "",
    placementPrompt: "",
    avoidPrompt: [],
    enabled: true,
  };
}

function createEmptyStructuralMaterialMode(): StructuralMaterialModeModule {
  return {
    id: "",
    displayName: "",
    englishName: "",
    mode: "all_metal",
    structurePrompt: "",
    manufacturingPrompt: "",
    avoidPrompt: [],
    enabled: true,
  };
}

function createEmptyCustomPrompt(): CustomPromptModule {
  return {
    id: "",
    displayName: "",
    promptText: "",
    enabled: true,
  };
}

function styleListsToText(style: StyleModule) {
  return {
    inspirationSources: style.inspirationSources.join("\n"),
    specificElements: style.specificElements.join("\n"),
    materials: style.materials.join("\n"),
    colors: style.colors.join("\n"),
    avoid: style.avoid.join("\n"),
  };
}

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function validateId(id: string): boolean {
  if (!idPattern.test(id)) {
    window.alert("ID 只能使用小写英文字母、数字和下划线，例如 art_deco。");
    return false;
  }
  return true;
}

function addFilenameSuffix(filename: string, suffix: string): string {
  return filename.endsWith(".txt")
    ? filename.replace(/\.txt$/, `${suffix}.txt`)
    : `${filename}${suffix}`;
}

function buildModuleTranslationPairs(
  displayName: string,
  englishName?: string,
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  if (englishName?.trim() && displayName.trim()) {
    pairs.push([englishName.trim(), displayName.trim()]);
  }
  return pairs;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatCheckpointSnapshot(checkpoint: HistoryCheckpoint): string {
  if (
    typeof checkpoint.snapshot === "object" &&
    checkpoint.snapshot !== null &&
    "content" in checkpoint.snapshot
  ) {
    const snapshot = checkpoint.snapshot as CommonPromptModule;
    return snapshot.content;
  }

  return JSON.stringify(checkpoint.snapshot, null, 2);
}
