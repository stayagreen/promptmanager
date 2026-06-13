import type {
  PhotographyProfileModule,
  RatioModule,
  ReferenceConsistencyLevel,
  ReferenceProductProject,
  StyleModule,
} from "./schema";

export type ReferenceTaskId =
  | "ecommerce_white"
  | "ecommerce_scene"
  | "detail_set"
  | "dimension_diagram"
  | "selling_points"
  | "material_closeup"
  | "hoikei_ecommerce_10"
  | "xiaohongshu_cover"
  | "xiaohongshu_note_set";

export type ReferenceTask = {
  id: ReferenceTaskId;
  displayName: string;
  prompt: string;
  mixedRatios?: boolean;
};

export type ReferencePromptOptions = {
  taskId: ReferenceTaskId;
  consistency: ReferenceConsistencyLevel;
  ratio: RatioModule;
  sceneStyle?: StyleModule;
  photographyProfile?: PhotographyProfileModule;
  allowBackgroundChange: boolean;
  allowAngleChange: boolean;
  allowLightingOptimization: boolean;
  allowProps: boolean;
  allowCableCleanup: boolean;
  additionalRequirements: string;
};

export type ReferencePromptResult = {
  title: string;
  filename: string;
  promptText: string;
  task: ReferenceTask;
};

export const referenceTasks: ReferenceTask[] = [
  {
    id: "ecommerce_white",
    displayName: "电商白底主图",
    prompt:
      "Create a premium e-commerce hero image on a clean pure-white or near-white background. Center the product, preserve generous margins, show the complete product, and use a soft physically plausible contact shadow. The product should occupy approximately 70-82% of the frame.",
  },
  {
    id: "ecommerce_scene",
    displayName: "电商场景主图",
    prompt:
      "Create a premium lifestyle e-commerce hero image. Place the exact reference product in a commercially realistic interior, keep it as the dominant subject, and maintain a clean composition suitable for a product listing.",
  },
  {
    id: "detail_set",
    displayName: "电商详情组图",
    prompt:
      "Create a coherent product detail image set covering: complete product view, shade or diffuser detail, material texture, connection and joint detail, light-on effect, light-off appearance, installation or placement context, and one practical use scene. Each image must show the same product identity.",
  },
  {
    id: "dimension_diagram",
    displayName: "产品尺寸图",
    prompt:
      "Create a clean orthographic product dimension diagram with front and side views when useful. Use clear measurement arrows and restrained technical labels. Do not invent verified manufacturing information.",
  },
  {
    id: "selling_points",
    displayName: "结构卖点图",
    prompt:
      "Create a clean product selling-point image that visually explains the real structure, light distribution, controls, mounting method, and useful construction details visible in the reference images. Do not fabricate hidden functions.",
  },
  {
    id: "material_closeup",
    displayName: "材质工艺特写",
    prompt:
      "Create premium macro and close-up product photography emphasizing the actual materials, surface finish, edge treatment, joints, and diffuser texture visible in the reference images.",
  },
  {
    id: "hoikei_ecommerce_10",
    displayName: "HOIKEI 电商上架10图",
    mixedRatios: true,
    prompt:
      "Create a complete HOIKEI 海奇家居 e-commerce listing package as 10 independent images generated sequentially from image 1 through image 10. Never combine them into one canvas, collage, grid, contact sheet, long image, nine-grid, or ten-grid. After completing each independent image, continue automatically to the next until all 10 are complete.",
  },
  {
    id: "xiaohongshu_cover",
    displayName: "小红书封面图",
    prompt:
      "Create a vertical Xiaohongshu-style cover image with an authentic aspirational home-photography feeling. Keep the exact reference lamp as the primary subject, use an inviting lived-in scene, and reserve clean negative space for later text layout. Do not render text inside the image.",
  },
  {
    id: "xiaohongshu_note_set",
    displayName: "小红书笔记组图",
    prompt:
      "Create a coherent vertical Xiaohongshu note image set: cover, complete product, light-on atmosphere, light-off appearance, material detail, use experience scene, scale reference, and closing lifestyle image. All images must depict the same reference product. Do not render Chinese text inside the images.",
  },
];

const consistencyPrompts: Record<ReferenceConsistencyLevel, string> = {
  strict:
    "STRICT PRODUCT IDENTITY LOCK. Preserve the exact silhouette, proportions, component count, shade shape, support structure, mounting method, joints, colors, materials, controls, cable positions, and construction details visible in the reference images. Do not redesign, beautify, simplify, or add parts.",
  high:
    "HIGH PRODUCT IDENTITY LOCK. Keep the product design, proportions, structure, colors, and materials unchanged. Only presentation variables explicitly allowed below may change.",
  optimized:
    "CONTROLLED PRESENTATION OPTIMIZATION. Preserve the recognizable product design and all structural logic. Minor cleanup of surface appearance, seams, reflections, and photographic presentation is allowed, but do not change component count, proportions, mounting method, or core materials.",
  creative:
    "CREATIVE INTERPRETATION WITH IDENTITY RETENTION. Preserve the product's primary silhouette and defining components, while allowing restrained scene-led presentation changes. The result must still be clearly identifiable as the same product family.",
};

export function buildReferencePrompt(
  project: ReferenceProductProject,
  options: ReferencePromptOptions,
): ReferencePromptResult {
  const task =
    referenceTasks.find((item) => item.id === options.taskId) ??
    referenceTasks[0];
  const permissions = [
    options.allowBackgroundChange
      ? "Background replacement is allowed."
      : "Keep the original background character when possible.",
    options.allowAngleChange
      ? "A different camera angle is allowed, but product geometry must remain accurate."
      : "Keep a camera angle close to the primary reference image.",
    options.allowLightingOptimization
      ? "Lighting and exposure optimization are allowed."
      : "Do not materially change the original illumination behavior.",
    options.allowProps
      ? "A small number of relevant props may be added without obscuring the product."
      : "Do not add decorative props.",
    options.allowCableCleanup
      ? "The visible power cable may be tidied or routed more cleanly, but must not imply a wireless product."
      : "Preserve visible cables and power connections.",
  ];

  const environment =
    options.sceneStyle &&
    options.taskId !== "ecommerce_white" &&
    options.taskId !== "hoikei_ecommerce_10"
      ? `SCENE STYLE\n\nUse ${options.sceneStyle.englishName} only for the surrounding environment, furniture, palette, and atmosphere. Do not redesign the lamp into this style.`
      : "";
  const photographyAllowed = ![
    "ecommerce_white",
    "dimension_diagram",
    "selling_points",
  ].includes(options.taskId);
  const photography = options.photographyProfile && photographyAllowed
    ? `PHOTOGRAPHY DIRECTION\n\n${options.photographyProfile.profilePrompt}\n\n${options.photographyProfile.compositionPrompt}\n\n${options.photographyProfile.lightingPrompt}\n\n${options.photographyProfile.cameraPrompt}`
    : "";

  const promptText =
    options.taskId === "hoikei_ecommerce_10"
      ? buildHoikeiEcommerce10Prompt(
          project,
          options,
          task,
          permissions,
          photography,
        )
      : [
    "REFERENCE-IMAGE PRODUCT TASK",
    `Product archive: ${project.title}${project.productCode ? ` (${project.productCode})` : ""}.`,
    "Use every supplied product reference image as visual evidence. The primary reference image defines overall identity; supplementary images clarify angles, materials, joints, and construction.",
    consistencyPrompts[options.consistency],
    `TASK\n\n${task.prompt}`,
    `ALLOWED PRESENTATION CHANGES\n\n${permissions.join("\n")}`,
    environment,
    photography,
    buildDimensionSection(project),
    `OUTPUT FORMAT\n\nAspect Ratio ${options.ratio.ratioValue}. Fill the complete canvas. Produce physically realistic product photography or technical presentation appropriate to the selected task.`,
    `GLOBAL RESTRICTIONS\n\nDo not add or remove lamp components. Do not change the number of shades, arms, bulbs, supports, switches, mounting points, or visible joints. Do not alter product color or material unless explicitly requested. No logos, watermark, brand marks, fake certification labels, gibberish, or decorative text. Do not copy unrelated products from the scene.`,
    options.additionalRequirements.trim()
      ? `ADDITIONAL REQUIREMENTS\n\n${options.additionalRequirements.trim()}`
      : "",
    `USAGE NOTE\n\nThe reference images are not embedded in this text prompt. Upload the corresponding product images to the image-generation platform together with this prompt and set the primary image as the main product reference.`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const title = task.mixedRatios
    ? `${project.title}_${task.displayName}`
    : `${project.title}_${task.displayName}_${options.ratio.ratioValue.replace(":", "比")}`;
  return {
    title,
    filename: `${title.replace(/[<>:"/\\|?*]/g, "_")}.txt`,
    promptText,
    task,
  };
}

function buildHoikeiEcommerce10Prompt(
  project: ReferenceProductProject,
  options: ReferencePromptOptions,
  task: ReferenceTask,
  permissions: string[],
  photography: string,
): string {
  const skuSource = options.additionalRequirements.trim()
    ? `USER-PROVIDED SKU AND PRODUCT INFORMATION\n\n${options.additionalRequirements.trim()}`
    : "SKU INFORMATION RULE\n\nUse only specifications visible in the reference images or recorded in the product archive. If size, material, bulb base, wattage, or head quantity is unknown, leave a clean editable placeholder or mark it as pending confirmation. Never fabricate an unverified specification.";

  return [
    "HIGHEST-PRIORITY EXECUTION INSTRUCTION",
    "Start from image 1 and generate one independent image at a time in this exact order: image 1, image 2, image 3, image 4, image 5, image 6, image 7, image 8, image 9, image 10. After each image is complete, automatically continue to the next image until all 10 independent files are complete.",
    "Do not create a collection image, long image, collage, contact sheet, nine-grid, ten-grid, storyboard, or multiple panels on one canvas. Every numbered screen must be a separate output image.",
    "REFERENCE-IMAGE PRODUCT IDENTITY LOCK",
    `Product archive: ${project.title}${project.productCode ? ` (${project.productCode})` : ""}.`,
    "Use all supplied reference images as the product truth source. Preserve the exact same lamp across all 10 outputs: silhouette, structure, proportions, lamp-head count, shade shape, materials, finishes, colors, canopy, connectors, mounting logic, hardware language, controls, and visible cables. Do not redesign, beautify into another product, simplify, add parts, remove parts, or substitute a similar lamp.",
    consistencyPrompts.strict,
    `TASK\n\n${task.prompt}`,
    "BRAND AND ART DIRECTION",
    "Brand: HOIKEI 海奇家居.",
    "Use a restrained minimal-luxury brand style: clean composition, generous negative space, precise alignment, premium material rendering, white, warm off-white, light warm grey, and soft neutral backgrounds. Avoid cheap marketplace styling, promotional clutter, loud icons, red-yellow sale graphics, and excessive copy. A small restrained HOIKEI 海奇家居 brand mark is allowed only where specified below and must never overpower the lamp.",
    options.sceneStyle
      ? `SCENE DIRECTION\n\nFor lifestyle and atmosphere images only, use ${options.sceneStyle.englishName} for the surrounding interior, furniture, palette, and mood. Never restyle or redesign the lamp itself. White-background, SKU, and dimension pages must remain neutral and brand-consistent.`
      : "",
    "10-INDEPENDENT-IMAGE SEQUENCE",
    `IMAGE 1 — MAIN HERO 1 — 1:1
One independent square image. Complete product hero view on pure white, warm off-white, or a minimal neutral background. Centered or refined asymmetrical composition, clear complete silhouette, premium soft contact shadow. A small HOIKEI 海奇家居 mark is optional. No long marketing copy.

IMAGE 2 — MAIN HERO 2 — 1:1
One independent square lifestyle hero image. Extend a realistic premium interior from the reference context while keeping the exact lamp sharply dominant. Clean, restrained, high-end atmosphere. A small HOIKEI 海奇家居 mark is optional. No long marketing copy.

IMAGE 3 — MAIN HERO 3 — 1:1
One independent square detail hero image. Show truthful material, hardware, glass, wood, canopy, and connection details that are actually supported by the references. Premium commercial close-up photography. A small HOIKEI 海奇家居 mark is optional.

IMAGE 4 — MAIN HERO 4 — 1:1
One independent square hero-angle image. Use an accurate 45-degree or similarly dynamic product view to emphasize hierarchy, silhouette, structure, proportion, and design character. A small HOIKEI 海奇家居 mark is optional.

IMAGE 5 — REUSABLE SKU PAGE — 1:1
One independent square reusable SKU layout. Preserve a large clear product display area and a structured specification area that can support additional variants later. Include only necessary fields: 品牌 HOIKEI 海奇家居, 尺寸, 材质, 灯泡规格, 瓦数, 数量. Use verified or explicitly estimated information according to the dimension rules below. Keep typography clean, sparse, aligned, and premium.

IMAGE 6 — DETAIL COVER — 3:4
One independent vertical detail-page cover based on a front or complete scene view. Minimal-luxury layout, little or no text, optional small HOIKEI 海奇家居 mark.

IMAGE 7 — CRAFT DETAIL — 3:4
One independent vertical macro detail page emphasizing real craftsmanship, materials, glass, hardware, joints, and finishes. The product must remain recognizable. Little or no text, optional small brand mark.

IMAGE 8 — STRUCTURE AND ANGLE — 3:4
One independent vertical angle view emphasizing accurate construction, form, proportion, mounting logic, and design language. Little or no text, optional small brand mark.

IMAGE 9 — ILLUMINATED ATMOSPHERE — 3:4
One independent vertical light-on atmosphere page. Show realistic light behavior, premium spatial mood, and truthful interaction between light and material. Keep the exact product sharply identifiable. Little or no text, optional small brand mark.

IMAGE 10 — DIMENSION DETAIL PAGE — 3:4
One independent vertical e-commerce dimension page on a white or light minimal background. Show a clear front view and side view when appropriate, with professional readable measurement relationships. Necessary dimension labels and a small HOIKEI 海奇家居 mark are allowed. This is an e-commerce size explanation page, not a dense engineering drawing.`,
    `ALLOWED PRESENTATION CHANGES\n\n${permissions.join("\n")}`,
    photography,
    buildDimensionSection(project),
    skuSource,
    "PHOTOGRAPHY AND QUALITY",
    "Ultra-realistic premium lighting product photography, realistic optical behavior, clean exposure, sharp product focus, highly detailed materials, luxury e-commerce visual quality, and social-media-ready presentation. Scene backgrounds may be slightly defocused but must remain believable and secondary. No CGI render look, no cheap marketplace feel, no fantasy glow, no fake materials, and no unrelated product design.",
    "TEXT CONTROL",
    "Images 1, 2, 3, 4, 6, 7, 8, and 9: use no long marketing copy; only a small restrained HOIKEI 海奇家居 mark is optionally allowed. Image 5 may contain the required SKU fields. Image 10 may contain necessary dimension labels. Do not create fake brand names, fake certifications, gibberish, watermarks, or dense promotional text.",
    "FINAL EXECUTION CHECK",
    "Generate exactly 10 separate image files in order. Images 1-5 are 1:1. Images 6-10 are 3:4. Image 5 is the reusable SKU page. Image 10 is the dimension page. Never place multiple numbered images on one canvas. The reference images define the single unchanged product identity for every output.",
    "USAGE NOTE",
    "The reference images are not embedded in this text prompt. Upload the corresponding product images to the image-generation platform together with this prompt and set the primary image as the main product reference.",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildDimensionSection(project: ReferenceProductProject): string {
  if (project.dimensionMode === "none") {
    return "DIMENSIONS\n\nDo not display dimensions or numeric measurements.";
  }

  const values = project.dimensions
    .filter((item) => item.label.trim() || item.value.trim())
    .map(
      (item) =>
        `${item.label.trim() || "Dimension"}: ${item.value.trim() || "not provided"}`,
    );

  if (project.dimensionMode === "verified") {
    return `VERIFIED DIMENSIONS\n\nUse only the following user-provided measurements:\n${values.join("\n") || "No verified values have been entered. Do not invent missing measurements."}\nNever estimate or invent a missing value.`;
  }

  return `ESTIMATED DIMENSIONS\n\n${
    values.length > 0
      ? `Use these user-reviewed approximate values:\n${values.join("\n")}`
      : "Visually estimate plausible dimensions from the supplied reference images, the selected lighting type, common product proportions, and any visible scale references."
  }\n${project.estimationBasis ? `Estimation basis: ${project.estimationBasis}\n` : ""}Every estimated value must be labeled with “Approx.” or “约”. Present estimates as a plausible range when confidence is low. These values are for concept display only and must not be presented as verified manufacturing, installation, quotation, packaging, or safety data.`;
}
