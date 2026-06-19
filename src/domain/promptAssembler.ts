import type { CommonPromptId } from "./commonPromptMeta";
import type {
  CatalogData,
  CustomPromptModule,
  EmotionalToneModule,
  LightingTypeModule,
  OutputModeModule,
  PhotographyProfileModule,
  PromptBuildRequest,
  PromptBuildResult,
  PromptValidationResult,
  RatioModule,
  StyleModule,
  StructuralMaterialModeModule,
} from "./schema";
import { buildElementItems, resolveElementAssets } from "./elementPrompt";

const forbiddenChecks = [
  { label: "[STYLE]", pattern: /\[STYLE\]/ },
  { label: "[LIGHTING_TYPE]", pattern: /\[LIGHTING_TYPE\]/ },
  { label: "[ASPECT_RATIO]", pattern: /\[ASPECT_RATIO\]/ },
  { label: "{{style}}", pattern: /\{\{style\}\}/ },
  { label: "{{lighting_type}}", pattern: /\{\{lighting_type\}\}/ },
  { label: "{{ratio}}", pattern: /\{\{ratio\}\}/ },
  { label: "TODO", pattern: /\bTODO\b/i },
  { label: "undefined", pattern: /\bundefined\b/i },
  { label: "null", pattern: /\bnull\b/i },
];

const commonRequiredKeywords = [
  "No logos",
  "No watermark",
  "Aspect Ratio",
  "Create one original",
  "Avoid copying existing products",
  "Avoid unrealistic fantasy objects",
  "Manufacturing realism priority: Maximum",
];

const photographicRequiredKeywords = [
  "Shot on iPhone 17 Pro Max",
  "ABSOLUTELY NO CGI RENDER LOOK",
  "ABSOLUTELY NO 3D VISUALIZATION LOOK",
  "No text",
  "The lamp must appear physically real",
  "The lighting fixture is always the primary visual subject.",
];

const technicalRequiredKeywords = [
  "TECHNICAL OUTPUT CLARITY REQUIREMENTS",
  "No decorative text",
  "Technical annotations",
];

const emotionalSectionHeaders = [
  "EMOTIONAL IMPACT REQUIREMENTS",
  "COLOR EMOTION ADD-ON",
  "PANEL 1 EMOTION ADD-ON",
  "PANEL 4 EMOTION ADD-ON",
  "PHOTOGRAPHY EMOTION ADD-ON",
  "EMOTIONAL AVOID LIST",
];

const emotionalValidationKeywords = [
  "fresh",
  "uplifting",
  "luminous",
  "breathable",
  "emotionally",
  "wow",
  "premium",
];

const photographyProfileHeaders = [
  "PHOTOGRAPHY PROFILE",
  "COMPOSITION STYLE",
  "LIGHTING STYLE",
  "CAMERA STYLE",
  "PHOTOGRAPHIC MOOD",
];

const technicalClarityPrompt = `TECHNICAL OUTPUT CLARITY REQUIREMENTS

The output should be clean, clear, structured, and suitable for product development communication.

Prioritize:

Accurate proportions
Clear silhouette
Readable structure
Consistent product logic
Manufacturing feasibility
Supplier communication
Sample production reference
Professional presentation

Avoid:

Lifestyle photography
Messy backgrounds
Emotional atmosphere
Overly decorative styling
Unrealistic assembly
Unclear outlines
Random fantasy details`;

export function getDefaultRatio(catalog: CatalogData): RatioModule {
  const activeRatios = getActiveRatios(catalog);
  const defaultRatio = activeRatios.find((ratio) => ratio.isDefault) ?? activeRatios[0];
  if (!defaultRatio) {
    throw new Error("No ratio configured.");
  }
  return defaultRatio;
}

export function getStyle(catalog: CatalogData, styleId: string): StyleModule {
  const style = getActiveStyles(catalog).find((item) => item.id === styleId);
  if (!style) {
    throw new Error(`Unknown styleId: ${styleId}`);
  }
  return style;
}

export function getLightingType(
  catalog: CatalogData,
  lightingTypeId: string,
): LightingTypeModule {
  const lightingType = getActiveLightingTypes(catalog).find(
    (item) => item.id === lightingTypeId,
  );
  if (!lightingType) {
    throw new Error(`Unknown lightingTypeId: ${lightingTypeId}`);
  }
  return lightingType;
}

export function getRatio(catalog: CatalogData, ratioId?: string): RatioModule {
  const id = ratioId ?? getDefaultRatio(catalog).id;
  const ratio = getActiveRatios(catalog).find((item) => item.id === id);
  if (!ratio) {
    throw new Error(`Unknown ratioId: ${id}`);
  }
  return ratio;
}

export function getDefaultEmotionalTone(catalog: CatalogData): EmotionalToneModule {
  const defaultTone =
    catalog.emotionalTones.find((tone) => tone.id === "none") ??
    catalog.emotionalTones.find((tone) => tone.isDefault);
  if (!defaultTone) {
    throw new Error("No default emotional tone configured.");
  }
  return defaultTone;
}

export function getEmotionalTone(
  catalog: CatalogData,
  emotionalToneId?: string,
): EmotionalToneModule {
  const toneId = emotionalToneId ?? "none";
  return (
    catalog.emotionalTones.find((tone) => tone.id === toneId) ??
    getDefaultEmotionalTone(catalog)
  );
}

export function getDefaultPhotographyProfile(
  catalog: CatalogData,
): PhotographyProfileModule {
  const defaultProfile =
    catalog.photographyProfiles.find(
      (profile) => profile.isDefault && profile.enabled !== false,
    ) ??
    catalog.photographyProfiles.find(
      (profile) =>
        profile.id === "premium_editorial_home" && profile.enabled !== false,
    ) ??
    getActivePhotographyProfiles(catalog)[0];

  if (!defaultProfile) {
    throw new Error("No photography profile configured.");
  }
  return defaultProfile;
}

export function getPhotographyProfile(
  catalog: CatalogData,
  photographyProfileId?: string,
): PhotographyProfileModule {
  const profileId =
    photographyProfileId ?? getDefaultPhotographyProfile(catalog).id;
  return (
    getActivePhotographyProfiles(catalog).find(
      (profile) => profile.id === profileId,
    ) ?? getDefaultPhotographyProfile(catalog)
  );
}

export function getDefaultOutputMode(catalog: CatalogData): OutputModeModule {
  const defaultMode =
    catalog.outputModes.find(
      (mode) => mode.isDefault && mode.enabled !== false,
    ) ??
    catalog.outputModes.find(
      (mode) => mode.id === "four_panel_storyboard" && mode.enabled !== false,
    ) ??
    getActiveOutputModes(catalog)[0];

  if (!defaultMode) {
    throw new Error("No output mode configured.");
  }
  return defaultMode;
}

export function getOutputMode(
  catalog: CatalogData,
  outputModeId?: string,
): OutputModeModule {
  const modeId = outputModeId ?? getDefaultOutputMode(catalog).id;
  return (
    getActiveOutputModes(catalog).find((mode) => mode.id === modeId) ??
    getDefaultOutputMode(catalog)
  );
}

export function getCustomPrompt(
  catalog: CatalogData,
  customPromptId?: string,
): CustomPromptModule | null {
  if (!customPromptId || customPromptId === "none") {
    return null;
  }

  const customPrompt = getActiveCustomPrompts(catalog).find(
    (item) => item.id === customPromptId,
  );
  if (!customPrompt) {
    throw new Error(`Unknown customPromptId: ${customPromptId}`);
  }
  return customPrompt;
}

export function getDefaultStructuralMaterialMode(
  catalog: CatalogData,
): StructuralMaterialModeModule {
  const mode =
    catalog.structuralMaterialModes.find(
      (item) => item.id === "regular" && item.enabled,
    ) ?? getActiveStructuralMaterialModes(catalog)[0];
  if (!mode) throw new Error("No structural material mode configured.");
  return mode;
}

export function getStructuralMaterialMode(
  catalog: CatalogData,
  id?: string,
): StructuralMaterialModeModule {
  return (
    getActiveStructuralMaterialModes(catalog).find((item) => item.id === id) ??
    getDefaultStructuralMaterialMode(catalog)
  );
}

export function buildPrompt(
  catalog: CatalogData,
  request: PromptBuildRequest,
): PromptBuildResult {
  const customPrompt = getCustomPrompt(catalog, request.customPromptId);
  if (customPrompt) {
    return buildCustomPrompt(customPrompt);
  }

  const style = getStyle(catalog, request.styleId);
  const lightingType = getLightingType(catalog, request.lightingTypeId);
  const ratio = getRatio(catalog, request.ratioId);
  const outputMode = getOutputMode(catalog, request.outputModeId);
  const emotionalTone = getEmotionalTone(catalog, request.emotionalToneId);
  const photographyProfile = getPhotographyProfile(
    catalog,
    request.photographyProfileId,
  );
  const structuralMaterialMode = getStructuralMaterialMode(
    catalog,
    request.structuralMaterialModeId,
  );
  const emotionalToneEnabled =
    outputMode.category === "photographic" &&
    emotionalTone.id !== "none" &&
    emotionalTone.enabled !== false;
  const photographyProfileEnabled = outputMode.category === "photographic";
  const ratioLabel = formatRatioForFilename(ratio);
  const materialSuffix =
    structuralMaterialMode.mode === "regular"
      ? ""
      : `_${structuralMaterialMode.displayName}`;
  const baseTitle = `${style.displayName}_${lightingType.displayName}_${ratioLabel}_${outputMode.displayName}${materialSuffix}`;
  const title = emotionalToneEnabled
    ? `${baseTitle}_${emotionalTone.displayName}`
    : baseTitle;
  const titleWithPhotographyProfile =
    !photographyProfileEnabled || photographyProfile.isDefault
    ? title
    : `${title}_${photographyProfile.displayName}`;
  const isTechnicalOutput = outputMode.category === "technical";
  const elementSelections = request.elementSelections ?? [];
  const resolvedElements = resolveElementAssets(
    elementSelections,
    request.elementAssets ?? [],
    `${style.id}:${lightingType.id}:${outputMode.id}:${request.elementRandomToken ?? 0}`,
  );
  const elementSection = buildTextToImageElementSection(
    elementSelections,
    resolvedElements,
    request.elementReferenceUsageMode ?? "text_only",
    isTechnicalOutput,
  );

  const promptText = finalizePromptText(
    [
      `Act as a world-class Luxury Lighting Designer specializing in ${style.englishName}.`,
      buildRatioSection(ratio, outputMode),
      buildOutputModeSection(outputMode),
      getCommonPrompt(catalog, "base_role"),
      lightingType.typePrompt,
      style.stylePrompt,
      buildBotanicalStillLifeSection(outputMode, lightingType),
      buildStructuralMaterialSection(style, structuralMaterialMode, request),
      elementSection,
      buildInspirationSection(style),
      structuralMaterialMode.mode === "regular" ||
      structuralMaterialMode.mode === "metal_dominant"
        ? buildMaterialSection(style)
        : "",
      buildColorSection(style, outputMode),
      buildAvoidSection(style),
      isTechnicalOutput ? "" : buildEmotionalToneSection(emotionalTone),
      isTechnicalOutput ? "" : buildPhotographyProfileSection(photographyProfile),
      buildSubjectPrioritySection(catalog, outputMode),
      getCommonPrompt(catalog, "manufacturing"),
      isTechnicalOutput
        ? technicalClarityPrompt
        : getCommonPrompt(catalog, "photography"),
      buildGlobalProhibitionSection(catalog, outputMode),
      buildFinalQualitySection(outputMode),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  const validation = validatePrompt(
    promptText,
    emotionalTone,
    photographyProfile,
    outputMode,
  );

  return {
    title: titleWithPhotographyProfile,
    filename: `${sanitizeFilename(titleWithPhotographyProfile)}.txt`,
    promptText,
    wordCount: countWords(promptText),
    moduleSources: [
      `风格：${style.displayName}`,
      `灯具类型：${lightingType.displayName}`,
      `比例：${ratio.displayName}`,
      `输出方式：${outputMode.displayName}`,
      `结构材质：${structuralMaterialMode.displayName}`,
      isTechnicalOutput
        ? `情绪增强：${emotionalTone.displayName}（技术类不参与）`
        : `情绪增强：${emotionalTone.displayName}`,
      isTechnicalOutput
        ? `摄影风格：${photographyProfile.displayName}（技术类不参与）`
        : `摄影风格：${photographyProfile.displayName}`,
      ...resolvedElements.map((asset) => `附加元素：${asset.displayName}`),
      "通用：角色定位",
      "通用：主体优先",
      isTechnicalOutput ? "通用：技术清晰度与量产要求" : "通用：摄影与量产要求",
      "通用：无文字/Logo/水印",
    ],
    validation,
    metadata: {
      styleId: style.id,
      lightingTypeId: lightingType.id,
      ratioId: ratio.id,
      outputModeId: outputMode.id,
      emotionalToneId: emotionalTone.id,
      photographyProfileId: photographyProfile.id,
      customPromptId: "none",
      structuralMaterialModeId: structuralMaterialMode.id,
      createdAt: new Date().toISOString(),
    },
  };
}

function buildTextToImageElementSection(
  selections: NonNullable<PromptBuildRequest["elementSelections"]>,
  resolvedElements: NonNullable<PromptBuildRequest["elementAssets"]>,
  usageMode: NonNullable<PromptBuildRequest["elementReferenceUsageMode"]>,
  isTechnicalOutput: boolean,
): string {
  if (resolvedElements.length === 0) return "";
  const usageRule =
    usageMode === "upload_images"
      ? "REFERENCE IMAGE WORKFLOW: upload the stored images for E1, E2, and so on to the image-generation platform together with this prompt. Use them only as supplemental element references, never as complete lamp designs or scene references."
      : "TEXT-ONLY WORKFLOW: no element image upload is required. Interpret the written element descriptions below as controlled design instructions.";
  const outputRule = isTechnicalOutput
    ? "Integrate the selected element language into a technically clear, structurally coherent, and manufacturable lamp design. The element may influence form, detail, surface, or ornament, but must remain legible in technical presentation."
    : "The selected element may influence the lampshade, arm, support, base, joint, finial, decorative detail, surface finish, or restrained scene accessory when appropriate.";

  return `SUPPLEMENTAL ELEMENT DESIGN DIRECTION

${usageRule}

${outputRule}

${buildElementItems(selections, resolvedElements)}

Design priority: preserve the selected lighting type, practical lighting function, structural stability, material logic, assembly feasibility, and commercial manufacturability. Translate the element into the lamp's design language instead of pasting it on mechanically. Do not let supplemental elements overwhelm the lamp's primary silhouette or turn it into a nonfunctional sculpture.`;
}

export function buildCustomPrompt(
  customPrompt: CustomPromptModule,
): PromptBuildResult {
  const promptText = finalizePromptText(customPrompt.promptText);
  const forbiddenTokens = forbiddenChecks
    .filter((check) => check.pattern.test(promptText))
    .map((check) => check.label);

  return {
    title: customPrompt.displayName,
    filename: `${sanitizeFilename(customPrompt.displayName)}.txt`,
    promptText,
    wordCount: countWords(promptText),
    moduleSources: [`用户自定义：${customPrompt.displayName}`],
    validation: {
      valid: forbiddenTokens.length === 0,
      missingKeywords: [],
      forbiddenTokens,
    },
    metadata: {
      styleId: "",
      lightingTypeId: "",
      ratioId: "",
      outputModeId: "",
      emotionalToneId: "none",
      photographyProfileId: "",
      customPromptId: customPrompt.id,
      structuralMaterialModeId: "regular",
      createdAt: new Date().toISOString(),
    },
  };
}

function buildStructuralMaterialSection(
  style: StyleModule,
  mode: StructuralMaterialModeModule,
  request: PromptBuildRequest,
): string {
  if (mode.mode === "regular") return "";
  const userParts = [
    request.selectedMetals?.trim()
      ? `Selected metals: ${request.selectedMetals.trim()}`
      : "",
    request.selectedFinishes?.trim()
      ? `Selected finishes: ${request.selectedFinishes.trim()}`
      : "",
    request.selectedProcesses?.trim()
      ? `Preferred manufacturing processes: ${request.selectedProcesses.trim()}`
      : "",
    request.connectionLanguage?.trim()
      ? `Connection language: ${request.connectionLanguage.trim()}`
      : "",
    request.shadeStrategy?.trim()
      ? `Metal shade and light-control strategy: ${request.shadeStrategy.trim()}`
      : "",
    request.allowedMaterials?.trim()
      ? `Allowed visible materials: ${request.allowedMaterials.trim()}`
      : "",
    request.prohibitedMaterials?.trim()
      ? `Prohibited visible materials: ${request.prohibitedMaterials.trim()}`
      : "",
  ].filter(Boolean);
  const strictness =
    request.materialStrictness === "balanced"
      ? "Apply the material boundary with balanced flexibility only where safety and lighting performance require it."
      : "Apply the material boundary strictly. Do not silently substitute or introduce other visible materials.";

  return `STRUCTURAL MATERIAL STRATEGY — ${mode.englishName}

${mode.structurePrompt}

STYLE-SPECIFIC METAL FORM TRANSLATION

${style.metalTranslationPrompt || `Translate ${style.englishName} into a distinctive manufacturable metal form.`}

USER MATERIAL DIRECTION

${userParts.join("\n") || "Use a coherent metal palette, finish, process, connection language, and shade strategy appropriate to the selected style."}

${strictness}

METAL MANUFACTURING DIRECTION

${mode.manufacturingPrompt}

MATERIAL STRATEGY AVOID LIST

${mode.avoidPrompt.join("\n")}`;
}

function buildBotanicalStillLifeSection(
  outputMode: OutputModeModule,
  lightingType: LightingTypeModule,
): string {
  if (outputMode.id !== "botanical_still_life_5") return "";

  return `BOTANICAL INSPIRATION LAB LOCK

This output mode is a controlled botanical-form lighting experiment for the selected lighting type: ${lightingType.englishName}.

Keep the selected lighting type explicit. If the selected type is not a table lamp, translate the botanical language into that exact lighting category's shade, diffuser, arm, canopy, wall mount, pendant body, chandelier cluster, or base logic. Do not accidentally change it into a table lamp, pendant lamp, wall lamp, floor lamp, ceiling lamp, or another type that was not selected.

HIGHEST-PRIORITY EXECUTION

Generate exactly five independent images in this order:

Image 1 - Single Lamp Cover
Image 2 - Daylight Off
Image 3 - Daylight On
Image 4 - Flower Form Detail
Image 5 - Quiet Home Scene

Each image must be 3:4 vertical. Generate one image at a time and continue automatically until all five independent images are complete.

BOTANICAL DESIGN FAMILY SELECTION

Before generation, internally choose one clear Botanical Design Family for this run. Keep the same family across all five images. For a new generation run, choose a visibly different family whenever possible.

Choose one uncommon family from this list:

A. Bell Shade Family: fritillaria, snake's head fritillary, lily of the valley, snowdrop, campanula, downward hellebore bloom, foxglove bell. Translate as downward frosted glass bell shade, small warm core, thin brass bend, compact stone or ceramic grounding.
B. Star / Clematis Family: clematis, astrantia, nigella flower, scabiosa, Japanese anemone, windflower. Translate as star-shaped translucent petal diffuser, visible brass vein ribs, asymmetric petal spacing, one petal slightly lower or rotated.
C. Folded Iris Family: bearded iris, Japanese iris, Siberian iris, gloriosa, cymbidium, folded hellebore petal. Translate as folded glass or porcelain shade, curled petal edge, warm light grazing along folds, patinated brass support.
D. Layered Petal Family: butterfly ranunculus, Japanese ranunculus, tree peony, anemone, camellia, magnolia bud. Translate as restrained layered frosted glass petals, handmade uneven rim, warm core visible through petal layers.
E. Pod / Seed Family: lotus pod, nigella pod, scabiosa pod, poppy seed pod, allium seed head, papaver pod. Translate as pod-like light core, small perforated warm highlights, ceramic or brass seed detail, simple translucent shade around it.
F. Cluster Diffuser Family: snowball viburnum, hydrangea, muscari, Queen Anne's lace, feverfew, tiny white filler flowers. Translate as small clustered frosted glass beads, restrained glowing units, compact branch-like support, not chandelier-like unless the selected lighting type is a chandelier.
G. Line Botanical Family: garlic scapes, allium stems, horsetail reed, papyrus, curly willow, clematis vine, jasmine vine, miscanthus. Translate as curved brass line, asymmetrical but stable silhouette, one small flower shade or diffuser endpoint, clear structural weight.
H. Orchid Variant Family: peach orange phalaenopsis, small phalaenopsis, vanda, cymbidium, paphiopedilum-like slipper form. Use only as a low-frequency specific variant, never a generic orchid lamp.
I. Lily Variant Family: white wine lily, speckled lily, tiger lily, Minjiang lily, orange speckled lily, fritillaria-like lily bell. Use only as a low-frequency specific variant, never a generic white lily lamp.
J. Lotus / Water Plant Family: lotus bud, lotus seed pod, water lily, papyrus, water iris. Use only as a low-frequency specific variant, never a generic white lotus lamp or blue vase lamp.

ANTI-REPETITION LOCK

Choose an uncommon botanical form for this run.
Avoid defaulting to lily, lotus, orchid, rose, tulip, or generic white flower silhouettes.
Avoid repeating the same flower silhouette as the previous generation.
Do not default to a blue glass base or blue vase-base language.
Botanical inspiration must be recognizable through lamp structure, not through real flowers attached to the lamp.
Across different runs, vary at least three of these: primary botanical family, shade outline, support line, base or mounting material, pod or petal detail, color temperature, light behavior, and still-life prop.

SAME LAMP IDENTITY CARD

Internally define one identity card before generation and reuse it across all five images:

Selected lighting type: ${lightingType.englishName}
Botanical Design Family
Primary flower form
Secondary line botanical
Overall scale
Base, canopy, mounting, or grounding shape appropriate to ${lightingType.englishName}
Base, canopy, mounting, or grounding material
Support / stem / arm / suspension / bracket material
Support curve or structural rhythm
Shade / petal / diffuser material
Number of glowing cores
Switch, dimmer, or control position when visible
Cable visibility or wiring logic when relevant
Glow behavior
Signature handmade detail

MATERIAL AND COLOR SYSTEM

Choose three to five materials and keep them consistent:

warm brushed brass
dark patinated brass
frosted glass petals
translucent milky glass
pale champagne glass
tea-brown glass
smoky grey glass
warm white porcelain
handmade ivory ceramic
alabaster stone
travertine
dark walnut
blackened wood plinth
matte off-white paper shade
warm rice-paper diffuser
pale celadon ceramic, low saturation only
dark bronze joint detail

Avoid always using white flower plus yellow brass plus white wall. Allow one or two low-saturation details such as warm ivory, pale champagne, smoky grey, tea brown, pale apricot, soft celadon, muted plum, dusty pink, pale butter yellow, or very light green.

BLUE LIMITATION

Blue glass, cobalt blue vase, and bright blue bases must not appear by default. If blue appears, it may only be a tiny cool reflection and never the main body.

MOBILE STILL-LIFE NATURALNESS

Make the image feel like iPhone 15 Pro or iPhone 16 Pro smartphone photography: natural side daylight, realistic phone sharpness, slight handheld framing, clean phone HDR, subtle indoor noise, real contact shadow, readable material thickness, and small handmade irregularity.

Avoid CGI, 3D render, fantasy concept art, impossible flower-lamp structure, over-perfect symmetry, over-smooth plastic petals, floating glow without weight, fake studio bokeh, cinematic orange-blue lighting, too much bloom, overexposed core, hotel render, showroom catalog look, and ultra glossy material everywhere.

ANTI-GREY CLARITY

Allow clean grey-white wall, soft neutral grey shadow, and natural indoor grey. Avoid grey veil, hazy matte filter, dirty grey cast, muddy beige shadows, washed-out beige cast, flat grey lighting, dusty overlay, underexposed room, weak black point, and no white highlight.

Every image should include at least one real black point from tabletop, base, furniture, wall bracket, canopy, shadow, or grounding structure and at least one clean highlight on glass, metal, ceramic, paper, diffuser edge, or shade edge.

STILL-LIFE DETAILS

Use only one or two quiet details when appropriate: unreadable open book, old paperback with no readable title, folded pale cloth, cream paper sheet, one fallen petal, ceramic cup without logo, small dark bowl, subtle curtain shadow, small window-frame shadow, or barely visible power cord.

Never let props steal attention. Avoid readable book text, brand logos, coffee-shop clutter, big labels, tags, and decorative overload.

NO TEXT RULE

The image content must contain zero text: no Chinese, no English, no pinyin, no brand name, no platform name, no account name, no watermark, no poster typography, no tutorial text, no readable book title, and no AI-related words inside the image.`;
}

export function buildAllPrompts(
  catalog: CatalogData,
  emotionalToneId = "none",
  outputModeId = "four_panel_storyboard",
  elementOptions: Pick<
    PromptBuildRequest,
    | "elementAssets"
    | "elementSelections"
    | "elementReferenceUsageMode"
    | "elementRandomToken"
    | "structuralMaterialModeId"
    | "selectedMetals"
    | "selectedFinishes"
    | "selectedProcesses"
    | "connectionLanguage"
    | "shadeStrategy"
    | "allowedMaterials"
    | "prohibitedMaterials"
    | "materialStrictness"
  > = {},
): PromptBuildResult[] {
  return getActiveStyles(catalog).flatMap((style) =>
    getActiveLightingTypes(catalog).flatMap((lightingType) =>
      getActiveRatios(catalog).map((ratio) =>
        buildPrompt(catalog, {
          styleId: style.id,
          lightingTypeId: lightingType.id,
          ratioId: ratio.id,
          outputModeId,
          emotionalToneId,
          ...elementOptions,
        }),
      ),
    ),
  );
}

export function buildAllEmotionalPrompts(
  catalog: CatalogData,
  elementOptions: Pick<
    PromptBuildRequest,
    | "elementAssets"
    | "elementSelections"
    | "elementReferenceUsageMode"
    | "elementRandomToken"
    | "structuralMaterialModeId"
    | "selectedMetals"
    | "selectedFinishes"
    | "selectedProcesses"
    | "connectionLanguage"
    | "shadeStrategy"
    | "allowedMaterials"
    | "prohibitedMaterials"
    | "materialStrictness"
  > = {},
): PromptBuildResult[] {
  return getActiveEmotionalTones(catalog).flatMap((emotionalTone) =>
    buildAllPrompts(
      catalog,
      emotionalTone.id,
      "four_panel_storyboard",
      elementOptions,
    ),
  );
}

export function validatePrompt(
  promptText: string,
  emotionalTone?: EmotionalToneModule,
  photographyProfile?: PhotographyProfileModule,
  outputMode?: OutputModeModule,
): PromptValidationResult {
  const forbiddenTokens = forbiddenChecks
    .filter((check) => check.pattern.test(promptText))
    .map((check) => check.label);

  const isTechnicalOutput = outputMode?.category === "technical";
  const requiredKeywords = [
    ...commonRequiredKeywords,
    ...(isTechnicalOutput
      ? technicalRequiredKeywords
      : photographicRequiredKeywords),
  ];
  const missingKeywords = requiredKeywords.filter(
    (keyword) => !promptText.includes(keyword),
  );

  if (
    isTechnicalOutput ||
    !emotionalTone ||
    emotionalTone.id === "none" ||
    !emotionalTone.enabled
  ) {
    forbiddenTokens.push(
      ...emotionalSectionHeaders.filter((header) => promptText.includes(header)),
    );
  } else {
    if (!promptText.includes("EMOTIONAL IMPACT REQUIREMENTS")) {
      missingKeywords.push("EMOTIONAL IMPACT REQUIREMENTS");
    }

    const normalizedPrompt = promptText.toLowerCase();
    const emotionalKeywordCount = emotionalValidationKeywords.filter((keyword) =>
      normalizedPrompt.includes(keyword),
    ).length;
    if (emotionalKeywordCount < 2) {
      missingKeywords.push("At least two emotional validation keywords");
    }
  }

  if (photographyProfile && !isTechnicalOutput) {
    const photographyHeaderCount = photographyProfileHeaders.filter((header) =>
      promptText.includes(header),
    ).length;
    if (photographyHeaderCount < 3) {
      missingKeywords.push("At least three photography profile sections");
    }
  }

  if (outputMode) {
    validateOutputMode(promptText, outputMode, missingKeywords, forbiddenTokens);
  }

  return {
    valid: forbiddenTokens.length === 0 && missingKeywords.length === 0,
    missingKeywords,
    forbiddenTokens,
  };
}

export function buildOutputModeSection(mode: OutputModeModule): string {
  if (!mode || !mode.enabled) {
    return "";
  }

  return [
    `OUTPUT MODE\n\n${mode.outputPrompt}`,
    mode.consistencyPrompt
      ? `OUTPUT CONSISTENCY REQUIREMENTS\n\n${mode.consistencyPrompt}`
      : "",
    mode.layoutPrompt
      ? `OUTPUT LAYOUT REQUIREMENTS\n\n${mode.layoutPrompt}`
      : "",
    mode.avoidPrompt && mode.avoidPrompt.length > 0
      ? `OUTPUT MODE AVOID LIST\n\n${mode.avoidPrompt.join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildPhotographyProfileSection(
  profile: PhotographyProfileModule,
): string {
  if (!profile || !profile.enabled) {
    return "";
  }

  const sections = [
    profile.profilePrompt
      ? `PHOTOGRAPHY PROFILE\n\n${profile.profilePrompt}`
      : "",
    profile.compositionPrompt
      ? `COMPOSITION STYLE\n\n${profile.compositionPrompt}`
      : "",
    profile.lightingPrompt
      ? `LIGHTING STYLE\n\n${profile.lightingPrompt}`
      : "",
    profile.cameraPrompt ? `CAMERA STYLE\n\n${profile.cameraPrompt}` : "",
    profile.moodPrompt
      ? `PHOTOGRAPHIC MOOD\n\n${profile.moodPrompt}`
      : "",
    profile.avoidPrompt && profile.avoidPrompt.length > 0
      ? `PHOTOGRAPHY AVOID LIST\n\n${profile.avoidPrompt.join("\n")}`
      : "",
  ];

  return sections.filter(Boolean).join("\n\n");
}

export function buildEmotionalToneSection(tone: EmotionalToneModule): string {
  if (!tone || tone.id === "none" || !tone.enabled) {
    return "";
  }

  const sections: string[] = [];

  if (tone.tonePrompt) {
    sections.push(tone.tonePrompt);
  }
  if (tone.colorAddOn) {
    sections.push(`COLOR EMOTION ADD-ON\n\n${tone.colorAddOn}`);
  }
  if (tone.panel1AddOn) {
    sections.push(`PANEL 1 EMOTION ADD-ON\n\n${tone.panel1AddOn}`);
  }
  if (tone.panel4AddOn) {
    sections.push(`PANEL 4 EMOTION ADD-ON\n\n${tone.panel4AddOn}`);
  }
  if (tone.photographyAddOn) {
    sections.push(`PHOTOGRAPHY EMOTION ADD-ON\n\n${tone.photographyAddOn}`);
  }
  if (tone.avoidAddOn && tone.avoidAddOn.length > 0) {
    sections.push(`EMOTIONAL AVOID LIST\n\n${tone.avoidAddOn.join("\n")}`);
  }

  return sections.join("\n\n");
}

export function buildInspirationSection(style: StyleModule): string {
  return `INSPIRATION SOURCES

Randomly choose one inspiration source from:

${style.inspirationSources.join("\n")}

Then select one highly specific structure, rhythm, geometry, texture, movement, proportion, or visual detail from that source.

Examples:

${style.specificElements.join("\n")}

The inspiration should be translated into the lamp's form language, not pasted on as decoration.`;
}

export function buildMaterialSection(style: StyleModule): string {
  return `MATERIAL TRANSLATION

Select premium materials suitable for this style.

Possible materials include:

${style.materials.join("\n")}

Material combinations should feel intentional, commercially realistic, and suitable for actual lighting production.

Every material must look physically real.`;
}

export function buildColorSection(
  style: StyleModule,
  outputMode?: OutputModeModule,
): string {
  const finalRequirement =
    outputMode?.category === "technical"
      ? "The intended color and material separation should remain clear, coherent, and suitable for professional product development communication."
      : "The final color composition should feel coherent, premium, and suitable for luxury interior photography.";

  return `COLOR STRATEGY

Use a sophisticated color palette suitable for this style.

Possible colors include:

${style.colors.join("\n")}

Avoid random colors.

${finalRequirement}`;
}

export function buildAvoidSection(style: StyleModule): string {
  return `AVOID

${style.avoid.join("\n")}

Do not copy existing products.

Do not create generic online marketplace lamp designs.`;
}

export function formatRatioForFilename(ratio: RatioModule): string {
  return ratio.ratioValue.replace(":", "比");
}

export function getActiveStyles(catalog: CatalogData): StyleModule[] {
  return catalog.styles.filter((style) => style.enabled !== false);
}

export function getActiveLightingTypes(catalog: CatalogData): LightingTypeModule[] {
  return catalog.lightingTypes.filter((lightingType) => lightingType.enabled !== false);
}

export function getActiveRatios(catalog: CatalogData): RatioModule[] {
  return catalog.ratios.filter((ratio) => ratio.enabled !== false);
}

export function getActiveEmotionalTones(catalog: CatalogData): EmotionalToneModule[] {
  return catalog.emotionalTones.filter(
    (tone) => tone.id === "none" || tone.enabled !== false,
  );
}

export function getActivePhotographyProfiles(
  catalog: CatalogData,
): PhotographyProfileModule[] {
  return catalog.photographyProfiles.filter(
    (profile) => profile.enabled !== false,
  );
}

export function getActiveOutputModes(catalog: CatalogData): OutputModeModule[] {
  return catalog.outputModes.filter((mode) => mode.enabled !== false);
}

export function getActiveStructuralMaterialModes(
  catalog: CatalogData,
): StructuralMaterialModeModule[] {
  return catalog.structuralMaterialModes.filter((mode) => mode.enabled);
}

export function getActiveCustomPrompts(
  catalog: CatalogData,
): CustomPromptModule[] {
  return catalog.customPrompts.filter(
    (customPrompt) => customPrompt.enabled !== false,
  );
}

export function getCommonPrompt(catalog: CatalogData, id: CommonPromptId): string {
  const prompt = catalog.commonPrompts.find((item) => item.id === id);
  if (!prompt) {
    throw new Error(`Missing common prompt: ${id}`);
  }
  return prompt.content;
}

function finalizePromptText(promptText: string): string {
  return promptText
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildRatioSection(
  ratio: RatioModule,
  outputMode: OutputModeModule,
): string {
  if (outputMode.id === "four_panel_storyboard") {
    return ratio.ratioPrompt;
  }

  if (outputMode.id === "four_separate_photos") {
    return `Generate four separate images. Aspect Ratio ${ratio.ratioValue} for each image. Each image must fill its entire canvas.`;
  }

  if (outputMode.id === "botanical_still_life_5") {
    return "Generate five separate images. Aspect Ratio 3:4 for each image. Each image must fill its entire vertical canvas. Do not combine the five images into one canvas.";
  }

  const orientation = ratio.ratioValue === "9:16" ? " vertical" : "";
  return `Generate a single${orientation} image. Aspect Ratio ${ratio.ratioValue}. The output must fill the entire canvas.`;
}

function buildSubjectPrioritySection(
  catalog: CatalogData,
  outputMode: OutputModeModule,
): string {
  if (outputMode.category === "technical") {
    return `PRODUCT IDENTITY PRIORITY

The selected lamp must remain the clear and coherent subject of the technical output.

Preserve accurate proportions, recognizable silhouette, structural logic, mounting method, material separation, and manufacturable product identity.`;
  }

  const subjectPriority = getCommonPrompt(catalog, "subject_priority");
  if (outputMode.id === "four_panel_storyboard") {
    return subjectPriority;
  }
  if (outputMode.id === "four_separate_photos") {
    return subjectPriority.replace("In every panel:", "In every image:");
  }
  if (outputMode.id === "botanical_still_life_5") {
    return subjectPriority.replace("In every panel:", "In every image:");
  }
  return subjectPriority.replace("In every panel:", "In the image:");
}

function buildGlobalProhibitionSection(
  catalog: CatalogData,
  outputMode: OutputModeModule,
): string {
  if (outputMode.category === "technical") {
    return `GLOBAL TECHNICAL OUTPUT RESTRICTIONS

No decorative text.
No marketing captions.
No logos.
No watermark.
No brand marks.

Technical annotations, dimension labels, measurement arrows, and view labels are allowed only when required by the selected output mode.`;
  }

  return getCommonPrompt(catalog, "no_text_logo_watermark");
}

function buildFinalQualitySection(outputMode: OutputModeModule): string {
  if (outputMode.category === "technical") {
    return `FINAL QUALITY REMINDER

The final output must clearly represent one complete, original, manufacturable lighting product.

The selected lighting type must be explicit, structurally coherent, and suitable for professional product development communication.

Manufacturing realism priority: Maximum.`;
  }

  return `FINAL QUALITY REMINDER

The final output must present one complete, finished, commercially realistic lighting product.

The selected lighting type must be explicit and physically accurate.

The design must feel original, premium, manufacturable, and ready for market testing.

Manufacturing realism priority: Maximum.`;
}

function validateOutputMode(
  promptText: string,
  outputMode: OutputModeModule,
  missingKeywords: string[],
  forbiddenTokens: string[],
): void {
  if (!promptText.includes("OUTPUT MODE")) {
    missingKeywords.push("OUTPUT MODE");
  }

  if (outputMode.id === "four_panel_storyboard") {
    [
      "seamless 2×2 product storyboard grid",
      "Panel 1",
      "Panel 2",
      "Panel 3",
      "Panel 4",
      "No spacing between panels",
      "No white borders",
      "No black borders",
    ].forEach((keyword) => {
      if (!promptText.includes(keyword)) missingKeywords.push(keyword);
    });
  }

  if (outputMode.id === "four_separate_photos") {
    [
      "four separate product photography images",
      "not a 2×2 grid",
      "not a collage",
    ].forEach((keyword) => {
      if (!promptText.includes(keyword)) missingKeywords.push(keyword);
    });
  }

  if (outputMode.id === "botanical_still_life_5") {
    [
      "Generate five separate images",
      "BOTANICAL INSPIRATION LAB LOCK",
      "Botanical Design Family",
      "Image 1 - Single Lamp Cover",
      "Image 2 - Daylight Off",
      "Image 3 - Daylight On",
      "Image 4 - Flower Form Detail",
      "Image 5 - Quiet Home Scene",
      "No 2×2 grid",
      "No collage",
    ].forEach((keyword) => {
      if (!promptText.includes(keyword)) missingKeywords.push(keyword);
    });
  }

  if (outputMode.category === "technical") {
    [
      "EMOTIONAL IMPACT REQUIREMENTS",
      "PHOTOGRAPHY PROFILE",
      "Shot on iPhone 17 Pro Max",
      "No spacing between panels",
      "Slightly blurred background",
    ].forEach((keyword) => {
      if (promptText.includes(keyword)) forbiddenTokens.push(keyword);
    });
  }
}

function countWords(text: string): number {
  const matches = text.match(/[A-Za-z0-9'×:-]+|[\u4e00-\u9fa5]/g);
  return matches ? matches.length : 0;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, "_");
}
