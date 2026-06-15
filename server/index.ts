import express from "express";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  deleteCustomPrompt,
  deleteElementAsset,
  deleteElementAssetImage,
  deleteEmotionalTone,
  deleteLightingType,
  deleteHistoryCheckpoint,
  deleteOutputMode,
  deleteStructuralMaterialMode,
  deletePhotographyProfile,
  deleteRatio,
  deleteStyle,
  deleteProductImage,
  deleteProductProject,
  getProductImagePath,
  getElementAssetImagePath,
  listHistory,
  loadCatalog,
  loadElementAssets,
  loadProductProjects,
  restoreHistoryCheckpoint,
  saveCommonPrompt,
  saveElementAsset,
  saveElementAssetImage,
  saveCustomPrompt,
  saveEmotionalTone,
  saveLightingType,
  saveOutputMode,
  saveStructuralMaterialMode,
  savePhotographyProfile,
  saveRatio,
  saveStyle,
  saveProductImage,
  saveProductProject,
} from "./dataStore";
import { translateToChinese } from "./translator";
import type {
  CustomPromptModule,
  ElementAssetCategory,
  ElementFusionMode,
  ElementInfluenceStrength,
  ElementReferenceAsset,
  ElementReferenceImage,
  EmotionalToneModule,
  LightingTypeModule,
  ModuleHistoryKind,
  OutputModeCategory,
  OutputModeModule,
  PhotographyProfileModule,
  RatioModule,
  ReferenceDimension,
  ReferenceDimensionMode,
  ReferenceProductImage,
  ReferenceProductProject,
  ProductElementSelection,
  SavedReferencePrompt,
  StyleModule,
  StructuralMaterialModeModule,
  StructuralMaterialModeType,
} from "../src/domain/schema";

const app = express();
const port = Number(process.env.PORT ?? 7000);
const host = process.env.HOST ?? "127.0.0.1";
const root = process.cwd();
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "40mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get(
  "/api/catalog",
  asyncHandler(async (_request, response) => {
    response.json(await loadCatalog());
  }),
);

app.post(
  "/api/translate",
  asyncHandler(async (request, response) => {
    const text = String(request.body.text ?? "");
    response.json({
      translatedText: await translateToChinese(text),
    });
  }),
);

app.post(
  "/api/styles",
  asyncHandler(async (request, response) => {
    const style = normalizeStyle(request.body);
    response.json(await saveStyle(style));
  }),
);

app.put(
  "/api/styles/:id",
  asyncHandler(async (request, response) => {
    const style = normalizeStyle({ ...request.body, id: request.params.id });
    response.json(await saveStyle(style));
  }),
);

app.delete(
  "/api/styles/:id",
  asyncHandler(async (request, response) => {
    await deleteStyle(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/lighting-types",
  asyncHandler(async (request, response) => {
    const lightingType = normalizeLightingType(request.body);
    response.json(await saveLightingType(lightingType));
  }),
);

app.put(
  "/api/lighting-types/:id",
  asyncHandler(async (request, response) => {
    const lightingType = normalizeLightingType({ ...request.body, id: request.params.id });
    response.json(await saveLightingType(lightingType));
  }),
);

app.delete(
  "/api/lighting-types/:id",
  asyncHandler(async (request, response) => {
    await deleteLightingType(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/ratios",
  asyncHandler(async (request, response) => {
    const ratio = normalizeRatio(request.body);
    response.json(await saveRatio(ratio));
  }),
);

app.put(
  "/api/ratios/:id",
  asyncHandler(async (request, response) => {
    const ratio = normalizeRatio({ ...request.body, id: request.params.id });
    response.json(await saveRatio(ratio));
  }),
);

app.delete(
  "/api/ratios/:id",
  asyncHandler(async (request, response) => {
    await deleteRatio(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/emotional-tones",
  asyncHandler(async (request, response) => {
    const emotionalTone = normalizeEmotionalTone(request.body);
    response.json(await saveEmotionalTone(emotionalTone));
  }),
);

app.put(
  "/api/emotional-tones/:id",
  asyncHandler(async (request, response) => {
    const emotionalTone = normalizeEmotionalTone({
      ...request.body,
      id: request.params.id,
    });
    response.json(await saveEmotionalTone(emotionalTone));
  }),
);

app.delete(
  "/api/emotional-tones/:id",
  asyncHandler(async (request, response) => {
    await deleteEmotionalTone(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/photography-profiles",
  asyncHandler(async (request, response) => {
    const profile = normalizePhotographyProfile(request.body);
    response.json(await savePhotographyProfile(profile));
  }),
);

app.put(
  "/api/photography-profiles/:id",
  asyncHandler(async (request, response) => {
    const profile = normalizePhotographyProfile({
      ...request.body,
      id: request.params.id,
    });
    response.json(await savePhotographyProfile(profile));
  }),
);

app.delete(
  "/api/photography-profiles/:id",
  asyncHandler(async (request, response) => {
    await deletePhotographyProfile(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/output-modes",
  asyncHandler(async (request, response) => {
    const outputMode = normalizeOutputMode(request.body);
    response.json(await saveOutputMode(outputMode));
  }),
);

app.put(
  "/api/output-modes/:id",
  asyncHandler(async (request, response) => {
    const outputMode = normalizeOutputMode({
      ...request.body,
      id: request.params.id,
    });
    response.json(await saveOutputMode(outputMode));
  }),
);

app.delete(
  "/api/output-modes/:id",
  asyncHandler(async (request, response) => {
    await deleteOutputMode(request.params.id);
    response.json({ ok: true });
  }),
);

app.put(
  "/api/structural-material-modes/:id",
  asyncHandler(async (request, response) => {
    response.json(
      await saveStructuralMaterialMode(
        normalizeStructuralMaterialMode({
          ...request.body,
          id: request.params.id,
        }),
      ),
    );
  }),
);

app.delete(
  "/api/structural-material-modes/:id",
  asyncHandler(async (request, response) => {
    await deleteStructuralMaterialMode(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/custom-prompts",
  asyncHandler(async (request, response) => {
    const customPrompt = normalizeCustomPrompt(request.body);
    response.json(await saveCustomPrompt(customPrompt));
  }),
);

app.put(
  "/api/custom-prompts/:id",
  asyncHandler(async (request, response) => {
    const customPrompt = normalizeCustomPrompt({
      ...request.body,
      id: request.params.id,
    });
    response.json(await saveCustomPrompt(customPrompt));
  }),
);

app.delete(
  "/api/custom-prompts/:id",
  asyncHandler(async (request, response) => {
    await deleteCustomPrompt(request.params.id);
    response.json({ ok: true });
  }),
);

app.get(
  "/api/product-projects",
  asyncHandler(async (_request, response) => {
    response.json(await loadProductProjects());
  }),
);

app.put(
  "/api/product-projects/:id",
  asyncHandler(async (request, response) => {
    const project = normalizeProductProject({
      ...request.body,
      id: request.params.id,
    });
    response.json(await saveProductProject(project));
  }),
);

app.delete(
  "/api/product-projects/:id",
  asyncHandler(async (request, response) => {
    await deleteProductProject(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/product-projects/:id/images",
  asyncHandler(async (request, response) => {
    const originalName = String(request.body.originalName ?? "");
    const dataUrl = String(request.body.dataUrl ?? "");
    const role = normalizeImageRole(request.body.role);
    response.json(
      await saveProductImage(request.params.id, originalName, dataUrl, role),
    );
  }),
);

app.get("/api/product-projects/:id/images/:filename", (request, response, next) => {
  try {
    response.sendFile(
      getProductImagePath(request.params.id, request.params.filename),
    );
  } catch (error) {
    next(error);
  }
});

app.delete(
  "/api/product-projects/:id/images/:filename",
  asyncHandler(async (request, response) => {
    await deleteProductImage(request.params.id, request.params.filename);
    response.json({ ok: true });
  }),
);

app.get(
  "/api/element-assets",
  asyncHandler(async (_request, response) => {
    response.json(await loadElementAssets());
  }),
);

app.put(
  "/api/element-assets/:id",
  asyncHandler(async (request, response) => {
    const asset = normalizeElementAsset({
      ...request.body,
      id: request.params.id,
    });
    response.json(await saveElementAsset(asset));
  }),
);

app.delete(
  "/api/element-assets/:id",
  asyncHandler(async (request, response) => {
    await deleteElementAsset(request.params.id);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/element-assets/:id/images",
  asyncHandler(async (request, response) => {
    response.json(
      await saveElementAssetImage(
        request.params.id,
        String(request.body.originalName ?? ""),
        String(request.body.dataUrl ?? ""),
      ),
    );
  }),
);

app.get("/api/element-assets/:id/images/:filename", (request, response, next) => {
  try {
    response.sendFile(
      getElementAssetImagePath(request.params.id, request.params.filename),
    );
  } catch (error) {
    next(error);
  }
});

app.delete(
  "/api/element-assets/:id/images/:filename",
  asyncHandler(async (request, response) => {
    await deleteElementAssetImage(request.params.id, request.params.filename);
    response.json({ ok: true });
  }),
);

app.put(
  "/api/common-prompts/:id",
  asyncHandler(async (request, response) => {
    response.json(await saveCommonPrompt(request.params.id, String(request.body.content ?? "")));
  }),
);

app.get(
  "/api/history/:kind/:id",
  asyncHandler(async (request, response) => {
    response.json(await listHistory(parseHistoryKind(request.params.kind), request.params.id));
  }),
);

app.post(
  "/api/history/:kind/:id/:checkpointId/restore",
  asyncHandler(async (request, response) => {
    await restoreHistoryCheckpoint(
      parseHistoryKind(request.params.kind),
      request.params.id,
      request.params.checkpointId,
    );
    response.json({ ok: true });
  }),
);

app.delete(
  "/api/history/:kind/:id/:checkpointId",
  asyncHandler(async (request, response) => {
    await deleteHistoryCheckpoint(
      parseHistoryKind(request.params.kind),
      request.params.id,
      request.params.checkpointId,
    );
    response.json({ ok: true });
  }),
);

if (isProduction) {
  app.use(express.static(join(root, "dist")));
  app.use(async (_request, response) => {
    response.sendFile(join(root, "dist", "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    appType: "custom",
    server: {
      middlewareMode: true,
    },
  });

  app.use(vite.middlewares);
  app.use(async (request, response, next) => {
    try {
      const templatePath = join(root, "index.html");
      const template = await readFile(templatePath, "utf8");
      const html = await vite.transformIndexHtml(request.originalUrl, template);
      response.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    response.status(400).json({ error: message });
  },
);

app.listen(port, host, () => {
  console.log(`Prompt Library running at http://${host}:${port}/`);
});

function asyncHandler(
  handler: (request: express.Request, response: express.Response) => Promise<void>,
) {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    handler(request, response).catch(next);
  };
}

function normalizeStyle(input: Partial<StyleModule>): StyleModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.englishName, "englishName");
  requireText(input.stylePrompt, "stylePrompt");

  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    englishName: input.englishName.trim(),
    stylePrompt: input.stylePrompt.trim(),
    inspirationSources: normalizeTextArray(input.inspirationSources),
    specificElements: normalizeTextArray(input.specificElements),
    materials: normalizeTextArray(input.materials),
    colors: normalizeTextArray(input.colors),
    avoid: normalizeTextArray(input.avoid),
    metalTranslationPrompt: normalizeOptionalText(input.metalTranslationPrompt),
    enabled: input.enabled ?? true,
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeLightingType(input: Partial<LightingTypeModule>): LightingTypeModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.englishName, "englishName");
  requireText(input.typePrompt, "typePrompt");

  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    englishName: input.englishName.trim(),
    typePrompt: input.typePrompt.trim(),
    enabled: input.enabled ?? true,
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeRatio(input: Partial<RatioModule>): RatioModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.ratioValue, "ratioValue");
  requireText(input.ratioPrompt, "ratioPrompt");

  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    ratioValue: input.ratioValue.trim(),
    isDefault: Boolean(input.isDefault),
    ratioPrompt: input.ratioPrompt.trim(),
    enabled: input.enabled ?? true,
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeStructuralMaterialMode(
  input: Partial<StructuralMaterialModeModule>,
): StructuralMaterialModeModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.englishName, "englishName");
  const isRegular = input.id.trim() === "regular";
  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    englishName: input.englishName.trim(),
    mode: isRegular ? "regular" : normalizeStructuralMaterialModeType(input.mode),
    structurePrompt: normalizeOptionalText(input.structurePrompt),
    manufacturingPrompt: normalizeOptionalText(input.manufacturingPrompt),
    avoidPrompt: normalizeTextArray(input.avoidPrompt),
    enabled: isRegular ? true : (input.enabled ?? true),
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeStructuralMaterialModeType(
  value: unknown,
): StructuralMaterialModeType {
  if (
    value === "regular" ||
    value === "all_metal" ||
    value === "metal_dominant" ||
    value === "custom"
  ) {
    return value;
  }
  throw new Error("Unknown structural material mode.");
}

function normalizeEmotionalTone(
  input: Partial<EmotionalToneModule>,
): EmotionalToneModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");

  if (input.id === "none") {
    return {
      id: "none",
      displayName: input.displayName.trim(),
      englishName: "None",
      isDefault: true,
      enabled: false,
      tonePrompt: "",
      colorAddOn: "",
      panel1AddOn: "",
      panel4AddOn: "",
      photographyAddOn: "",
      avoidAddOn: [],
      sortOrder: 0,
    };
  }

  requireText(input.englishName, "englishName");
  requireText(input.tonePrompt, "tonePrompt");

  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    englishName: input.englishName.trim(),
    isDefault: false,
    enabled: input.enabled ?? true,
    tonePrompt: input.tonePrompt.trim(),
    colorAddOn: normalizeOptionalText(input.colorAddOn),
    panel1AddOn: normalizeOptionalText(input.panel1AddOn),
    panel4AddOn: normalizeOptionalText(input.panel4AddOn),
    photographyAddOn: normalizeOptionalText(input.photographyAddOn),
    avoidAddOn: normalizeTextArray(input.avoidAddOn),
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizePhotographyProfile(
  input: Partial<PhotographyProfileModule>,
): PhotographyProfileModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.englishName, "englishName");
  requireText(input.profilePrompt, "profilePrompt");
  requireText(input.compositionPrompt, "compositionPrompt");
  requireText(input.lightingPrompt, "lightingPrompt");
  requireText(input.cameraPrompt, "cameraPrompt");
  requireText(input.moodPrompt, "moodPrompt");

  const isDefault = Boolean(input.isDefault);
  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    englishName: input.englishName.trim(),
    isDefault,
    enabled: isDefault ? true : (input.enabled ?? true),
    profilePrompt: input.profilePrompt.trim(),
    compositionPrompt: input.compositionPrompt.trim(),
    lightingPrompt: input.lightingPrompt.trim(),
    cameraPrompt: input.cameraPrompt.trim(),
    moodPrompt: input.moodPrompt.trim(),
    avoidPrompt: normalizeTextArray(input.avoidPrompt),
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeOutputMode(input: Partial<OutputModeModule>): OutputModeModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.englishName, "englishName");
  requireText(input.outputPrompt, "outputPrompt");

  const category = normalizeOutputModeCategory(input.category);
  const isDefault = Boolean(input.isDefault);
  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    englishName: input.englishName.trim(),
    category,
    isDefault,
    enabled: isDefault ? true : (input.enabled ?? true),
    outputPrompt: input.outputPrompt.trim(),
    consistencyPrompt: normalizeOptionalText(input.consistencyPrompt),
    layoutPrompt: normalizeOptionalText(input.layoutPrompt),
    avoidPrompt: normalizeTextArray(input.avoidPrompt),
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeCustomPrompt(
  input: Partial<CustomPromptModule>,
): CustomPromptModule {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.promptText, "promptText");

  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    promptText: input.promptText.trim(),
    enabled: input.enabled ?? true,
    sortOrder: normalizeOptionalNumber(input.sortOrder),
  };
}

function normalizeProductProject(
  input: Partial<ReferenceProductProject>,
): ReferenceProductProject {
  requireText(input.id, "id");
  requireText(input.title, "title");
  const now = new Date().toISOString();

  return {
    id: input.id.trim(),
    title: input.title.trim(),
    productCode: normalizeOptionalText(input.productCode),
    lightingTypeId: normalizeOptionalText(input.lightingTypeId),
    notes: normalizeOptionalText(input.notes),
    images: normalizeProductImages(input.images),
    dimensionMode: normalizeDimensionMode(input.dimensionMode),
    dimensions: normalizeDimensions(input.dimensions),
    estimationBasis: normalizeOptionalText(input.estimationBasis),
    elementSelections: normalizeElementSelections(input.elementSelections),
    savedPrompts: normalizeSavedPrompts(input.savedPrompts),
    createdAt: normalizeOptionalText(input.createdAt) || now,
    updatedAt: now,
  };
}

function normalizeElementAsset(
  input: Partial<ElementReferenceAsset>,
): ElementReferenceAsset {
  requireText(input.id, "id");
  requireText(input.displayName, "displayName");
  requireText(input.description, "description");
  const now = new Date().toISOString();

  return {
    id: input.id.trim(),
    displayName: input.displayName.trim(),
    category: normalizeElementCategory(input.category),
    description: input.description.trim(),
    defaultFusionMode: normalizeFusionMode(input.defaultFusionMode),
    defaultPlacement: normalizeOptionalText(input.defaultPlacement),
    defaultStrength: normalizeInfluenceStrength(input.defaultStrength),
    defaultQuantity: normalizeOptionalText(input.defaultQuantity),
    avoidPrompt: normalizeOptionalText(input.avoidPrompt),
    images: normalizeElementImages(input.images),
    enabled: input.enabled ?? true,
    createdAt: normalizeOptionalText(input.createdAt) || now,
    updatedAt: now,
  };
}

function normalizeElementImages(value: unknown): ElementReferenceImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<ElementReferenceImage>)
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.filename === "string" &&
        typeof item.url === "string",
    )
    .map((item) => ({
      id: item.id!.trim(),
      filename: item.filename!.trim(),
      originalName: normalizeOptionalText(item.originalName),
      url: item.url!.trim(),
      createdAt: normalizeOptionalText(item.createdAt) || new Date().toISOString(),
    }));
}

function normalizeElementSelections(value: unknown): ProductElementSelection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<ProductElementSelection>)
    .filter((item) => typeof item.assetId === "string" && item.assetId.trim())
    .map((item) => ({
      assetId: item.assetId!.trim(),
      selectionMode: item.selectionMode === "random" ? "random" : "required",
      fusionMode: normalizeFusionMode(item.fusionMode),
      placement: normalizeOptionalText(item.placement),
      strength: normalizeInfluenceStrength(item.strength),
      quantity: normalizeOptionalText(item.quantity),
    }));
}

function normalizeElementCategory(value: unknown): ElementAssetCategory {
  if (
    value === "flower" ||
    value === "animal" ||
    value === "carving" ||
    value === "texture" ||
    value === "hardware" ||
    value === "structure" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
}

function normalizeFusionMode(value: unknown): ElementFusionMode {
  if (value === "abstract" || value === "texture") return value;
  return "direct";
}

function normalizeInfluenceStrength(value: unknown): ElementInfluenceStrength {
  if (value === "subtle" || value === "strong") return value;
  return "medium";
}

function normalizeProductImages(value: unknown): ReferenceProductImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<ReferenceProductImage>)
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.filename === "string" &&
        typeof item.url === "string",
    )
    .map((item) => ({
      id: item.id!.trim(),
      filename: item.filename!.trim(),
      originalName: normalizeOptionalText(item.originalName),
      url: item.url!.trim(),
      role: normalizeImageRole(item.role),
      createdAt: normalizeOptionalText(item.createdAt) || new Date().toISOString(),
    }));
}

function normalizeImageRole(value: unknown): ReferenceProductImage["role"] {
  return value === "primary" ? "primary" : "supplementary";
}

function normalizeDimensionMode(value: unknown): ReferenceDimensionMode {
  if (value === "verified" || value === "estimated" || value === "none") {
    return value;
  }
  return "none";
}

function normalizeDimensions(value: unknown): ReferenceDimension[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<ReferenceDimension>)
    .map((item) => ({
      label: normalizeOptionalText(item.label),
      value: normalizeOptionalText(item.value),
    }))
    .filter((item) => item.label || item.value);
}

function normalizeSavedPrompts(value: unknown): SavedReferencePrompt[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<SavedReferencePrompt>)
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.promptText === "string" &&
        item.promptText.trim().length > 0,
    )
    .map((item) => ({
      id: item.id!.trim(),
      taskId: normalizeOptionalText(item.taskId),
      taskName: normalizeOptionalText(item.taskName),
      title: normalizeOptionalText(item.title),
      promptText: item.promptText!.trim(),
      createdAt: normalizeOptionalText(item.createdAt) || new Date().toISOString(),
    }));
}

function normalizeOutputModeCategory(value: unknown): OutputModeCategory {
  if (value === "photographic" || value === "technical") {
    return value;
  }
  throw new Error("category must be photographic or technical.");
}

function requireText(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function normalizeOptionalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseHistoryKind(kind: string): ModuleHistoryKind {
  if (kind === "styles") return "styles";
  if (kind === "lighting-types") return "lighting_types";
  if (kind === "ratios") return "ratios";
  if (kind === "emotional-tones") return "emotional_tones";
  if (kind === "photography-profiles") return "photography_profiles";
  if (kind === "output-modes") return "output_modes";
  if (kind === "structural-material-modes") return "structural_material_modes";
  if (kind === "custom-prompts") return "custom_prompts";
  if (kind === "product-projects") return "product_projects";
  if (kind === "element-assets") return "element_assets";
  if (kind === "common-prompts") return "common";
  throw new Error(`Unknown history kind: ${kind}`);
}
