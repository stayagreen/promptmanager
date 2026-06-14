import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { commonPromptMeta } from "../src/domain/commonPromptMeta";
import type {
  CatalogData,
  CommonPromptModule,
  CustomPromptModule,
  ElementReferenceAsset,
  ElementReferenceImage,
  EmotionalToneModule,
  HistoryCheckpoint,
  LightingTypeModule,
  ModuleHistoryKind,
  OutputModeModule,
  PhotographyProfileModule,
  RatioModule,
  ReferenceProductImage,
  ReferenceProductProject,
  StyleModule,
} from "../src/domain/schema";

const rootDir = process.cwd();
const dataDir = join(rootDir, "data");
const stylesDir = join(dataDir, "styles");
const lightingTypesDir = join(dataDir, "lighting_types");
const ratiosDir = join(dataDir, "ratios");
const emotionalTonesDir = join(dataDir, "emotional_tones");
const photographyProfilesDir = join(dataDir, "photography_profiles");
const outputModesDir = join(dataDir, "output_modes");
const customPromptsDir = join(dataDir, "custom_prompts");
const productProjectsDir = join(dataDir, "product_projects");
const elementAssetsDir = join(dataDir, "element_assets");
const commonDir = join(dataDir, "common");
const historyDir = join(dataDir, "history");

const safeIdPattern = /^[a-z0-9_]+$/;

export async function loadCatalog(): Promise<CatalogData> {
  await ensureDataDirectories();

  const [
    styles,
    lightingTypes,
    ratios,
    emotionalTones,
    photographyProfiles,
    outputModes,
    customPrompts,
    commonPrompts,
  ] = await Promise.all([
      readJsonDirectory<StyleModule>(stylesDir),
      readJsonDirectory<LightingTypeModule>(lightingTypesDir),
      readJsonDirectory<RatioModule>(ratiosDir),
      readJsonDirectory<EmotionalToneModule>(emotionalTonesDir),
      readJsonDirectory<PhotographyProfileModule>(photographyProfilesDir),
      readJsonDirectory<OutputModeModule>(outputModesDir),
      readJsonDirectory<CustomPromptModule>(customPromptsDir),
      readCommonPrompts(),
    ]);

  return {
    styles: sortModules(styles),
    lightingTypes: sortModules(lightingTypes),
    ratios: sortModules(ratios),
    emotionalTones: sortModules(emotionalTones),
    photographyProfiles: sortModules(photographyProfiles),
    outputModes: sortModules(outputModes),
    customPrompts: sortModules(customPrompts),
    commonPrompts,
  };
}

export async function saveStyle(style: StyleModule): Promise<StyleModule> {
  assertSafeId(style.id);
  await writeJsonFileWithCheckpoint("styles", style.id, join(stylesDir, `${style.id}.json`), style);
  return style;
}

export async function deleteStyle(id: string): Promise<void> {
  assertSafeId(id);
  await deleteJsonFileWithCheckpoint("styles", id, join(stylesDir, `${id}.json`));
}

export async function saveLightingType(
  lightingType: LightingTypeModule,
): Promise<LightingTypeModule> {
  assertSafeId(lightingType.id);
  await writeJsonFileWithCheckpoint(
    "lighting_types",
    lightingType.id,
    join(lightingTypesDir, `${lightingType.id}.json`),
    lightingType,
  );
  return lightingType;
}

export async function deleteLightingType(id: string): Promise<void> {
  assertSafeId(id);
  await deleteJsonFileWithCheckpoint("lighting_types", id, join(lightingTypesDir, `${id}.json`));
}

export async function saveRatio(ratio: RatioModule): Promise<RatioModule> {
  assertSafeId(ratio.id);

  if (ratio.isDefault) {
    const ratios = await readJsonDirectory<RatioModule>(ratiosDir);
    await Promise.all(
      ratios
        .filter((item) => item.id !== ratio.id && item.isDefault)
        .map((item) =>
          writeJsonFileWithCheckpoint(
            "ratios",
            item.id,
            join(ratiosDir, `${item.id}.json`),
            { ...item, isDefault: false },
          ),
        ),
    );
  }

  await writeJsonFileWithCheckpoint("ratios", ratio.id, join(ratiosDir, `${ratio.id}.json`), ratio);
  return ratio;
}

export async function deleteRatio(id: string): Promise<void> {
  assertSafeId(id);
  await deleteJsonFileWithCheckpoint("ratios", id, join(ratiosDir, `${id}.json`));
}

export async function saveEmotionalTone(
  emotionalTone: EmotionalToneModule,
): Promise<EmotionalToneModule> {
  assertSafeId(emotionalTone.id);
  const next =
    emotionalTone.id === "none"
      ? createProtectedNoneTone(emotionalTone.displayName)
      : { ...emotionalTone, isDefault: false };

  await writeJsonFileWithCheckpoint(
    "emotional_tones",
    next.id,
    join(emotionalTonesDir, `${next.id}.json`),
    next,
  );
  return next;
}

export async function deleteEmotionalTone(id: string): Promise<void> {
  assertSafeId(id);
  if (id === "none") {
    throw new Error("The default emotional tone cannot be deleted.");
  }
  await deleteJsonFileWithCheckpoint(
    "emotional_tones",
    id,
    join(emotionalTonesDir, `${id}.json`),
  );
}

export async function savePhotographyProfile(
  profile: PhotographyProfileModule,
): Promise<PhotographyProfileModule> {
  assertSafeId(profile.id);
  const filePath = join(photographyProfilesDir, `${profile.id}.json`);
  const current = await readJsonFileIfExists<PhotographyProfileModule>(filePath);

  if (current?.isDefault && !profile.isDefault) {
    throw new Error("Set another photography profile as default before changing this one.");
  }

  const next: PhotographyProfileModule = {
    ...profile,
    isDefault: Boolean(profile.isDefault),
    enabled: profile.isDefault ? true : profile.enabled,
  };

  if (next.isDefault) {
    const profiles =
      await readJsonDirectory<PhotographyProfileModule>(photographyProfilesDir);
    await Promise.all(
      profiles
        .filter((item) => item.id !== next.id && item.isDefault)
        .map((item) =>
          writeJsonFileWithCheckpoint(
            "photography_profiles",
            item.id,
            join(photographyProfilesDir, `${item.id}.json`),
            { ...item, isDefault: false },
          ),
        ),
    );
  }

  await writeJsonFileWithCheckpoint(
    "photography_profiles",
    next.id,
    filePath,
    next,
  );
  return next;
}

export async function deletePhotographyProfile(id: string): Promise<void> {
  assertSafeId(id);
  const filePath = join(photographyProfilesDir, `${id}.json`);
  const current = await readJsonFileIfExists<PhotographyProfileModule>(filePath);
  if (current?.isDefault) {
    throw new Error("The default photography profile cannot be deleted.");
  }
  await deleteJsonFileWithCheckpoint("photography_profiles", id, filePath);
}

export async function saveOutputMode(
  outputMode: OutputModeModule,
): Promise<OutputModeModule> {
  assertSafeId(outputMode.id);
  const filePath = join(outputModesDir, `${outputMode.id}.json`);
  const current = await readJsonFileIfExists<OutputModeModule>(filePath);

  if (current?.isDefault && !outputMode.isDefault) {
    throw new Error("Set another output mode as default before changing this one.");
  }

  const next: OutputModeModule = {
    ...outputMode,
    isDefault: Boolean(outputMode.isDefault),
    enabled: outputMode.isDefault ? true : outputMode.enabled,
  };

  if (next.isDefault) {
    const outputModes = await readJsonDirectory<OutputModeModule>(outputModesDir);
    await Promise.all(
      outputModes
        .filter((item) => item.id !== next.id && item.isDefault)
        .map((item) =>
          writeJsonFileWithCheckpoint(
            "output_modes",
            item.id,
            join(outputModesDir, `${item.id}.json`),
            { ...item, isDefault: false },
          ),
        ),
    );
  }

  await writeJsonFileWithCheckpoint("output_modes", next.id, filePath, next);
  return next;
}

export async function deleteOutputMode(id: string): Promise<void> {
  assertSafeId(id);
  const filePath = join(outputModesDir, `${id}.json`);
  const current = await readJsonFileIfExists<OutputModeModule>(filePath);
  if (current?.isDefault) {
    throw new Error("The default output mode cannot be deleted.");
  }
  await deleteJsonFileWithCheckpoint("output_modes", id, filePath);
}

export async function saveCustomPrompt(
  customPrompt: CustomPromptModule,
): Promise<CustomPromptModule> {
  assertSafeId(customPrompt.id);
  await writeJsonFileWithCheckpoint(
    "custom_prompts",
    customPrompt.id,
    join(customPromptsDir, `${customPrompt.id}.json`),
    customPrompt,
  );
  return customPrompt;
}

export async function deleteCustomPrompt(id: string): Promise<void> {
  assertSafeId(id);
  await deleteJsonFileWithCheckpoint(
    "custom_prompts",
    id,
    join(customPromptsDir, `${id}.json`),
  );
}

export async function loadProductProjects(): Promise<ReferenceProductProject[]> {
  await mkdir(productProjectsDir, { recursive: true });
  const entries = await readdir(productProjectsDir, { withFileTypes: true });
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && safeIdPattern.test(entry.name))
      .map((entry) =>
        readJsonFileIfExists<ReferenceProductProject>(
          join(productProjectsDir, entry.name, "project.json"),
        ),
      ),
  );

  return projects
    .filter((project): project is ReferenceProductProject => project !== null)
    .map((project) => ({
      ...project,
      elementSelections: project.elementSelections ?? [],
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadElementAssets(): Promise<ElementReferenceAsset[]> {
  await mkdir(elementAssetsDir, { recursive: true });
  const entries = await readdir(elementAssetsDir, { withFileTypes: true });
  const assets = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && safeIdPattern.test(entry.name))
      .map((entry) =>
        readJsonFileIfExists<ElementReferenceAsset>(
          join(elementAssetsDir, entry.name, "asset.json"),
        ),
      ),
  );

  return assets
    .filter((asset): asset is ElementReferenceAsset => asset !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveElementAsset(
  asset: ElementReferenceAsset,
): Promise<ElementReferenceAsset> {
  assertSafeId(asset.id);
  await writeJsonFileWithCheckpoint(
    "element_assets",
    asset.id,
    join(elementAssetsDir, asset.id, "asset.json"),
    asset,
  );
  return asset;
}

export async function deleteElementAsset(id: string): Promise<void> {
  assertSafeId(id);
  await deleteJsonFileWithCheckpoint(
    "element_assets",
    id,
    join(elementAssetsDir, id, "asset.json"),
  );
}

export async function saveProductProject(
  project: ReferenceProductProject,
): Promise<ReferenceProductProject> {
  assertSafeId(project.id);
  await writeJsonFileWithCheckpoint(
    "product_projects",
    project.id,
    join(productProjectsDir, project.id, "project.json"),
    project,
  );
  return project;
}

export async function deleteProductProject(id: string): Promise<void> {
  assertSafeId(id);
  await deleteJsonFileWithCheckpoint(
    "product_projects",
    id,
    join(productProjectsDir, id, "project.json"),
  );
}

export async function saveProductImage(
  projectId: string,
  originalName: string,
  dataUrl: string,
  role: ReferenceProductImage["role"],
): Promise<ReferenceProductImage> {
  assertSafeId(projectId);
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);
  if (!match) {
    throw new Error("Only PNG, JPEG, and WebP images are supported.");
  }

  const extension =
    match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  const createdAt = new Date().toISOString();
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.${extension}`;
  const imageDir = join(productProjectsDir, projectId, "images");
  await mkdir(imageDir, { recursive: true });
  await writeFile(join(imageDir, filename), Buffer.from(match[2], "base64"));

  return {
    id,
    filename,
    originalName: originalName.trim() || filename,
    url: `/api/product-projects/${projectId}/images/${filename}`,
    role,
    createdAt,
  };
}

export async function deleteProductImage(
  projectId: string,
  filename: string,
): Promise<void> {
  assertSafeId(projectId);
  assertSafeImageFilename(filename);
  await rm(join(productProjectsDir, projectId, "images", filename), {
    force: true,
  });
}

export function getProductImagePath(projectId: string, filename: string): string {
  assertSafeId(projectId);
  assertSafeImageFilename(filename);
  return join(productProjectsDir, projectId, "images", filename);
}

export async function saveElementAssetImage(
  assetId: string,
  originalName: string,
  dataUrl: string,
): Promise<ElementReferenceImage> {
  assertSafeId(assetId);
  const stored = await saveImageFile(
    join(elementAssetsDir, assetId, "images"),
    originalName,
    dataUrl,
  );
  return {
    ...stored,
    url: `/api/element-assets/${assetId}/images/${stored.filename}`,
  };
}

export async function deleteElementAssetImage(
  assetId: string,
  filename: string,
): Promise<void> {
  assertSafeId(assetId);
  assertSafeImageFilename(filename);
  await rm(join(elementAssetsDir, assetId, "images", filename), { force: true });
}

export function getElementAssetImagePath(
  assetId: string,
  filename: string,
): string {
  assertSafeId(assetId);
  assertSafeImageFilename(filename);
  return join(elementAssetsDir, assetId, "images", filename);
}

export async function saveCommonPrompt(
  id: string,
  content: string,
): Promise<CommonPromptModule> {
  const meta = findCommonMeta(id);
  const normalizedContent = `${content.replace(/\r\n/g, "\n").trim()}\n`;
  const current = await readCommonPromptById(id);
  const next: CommonPromptModule = {
    ...meta,
    content: normalizedContent.trim(),
  };

  if (current && !isSameSnapshot(current, next)) {
    await createHistoryCheckpoint("common", id, current, "保存前自动检查点");
  }

  await writeTextFile(join(commonDir, meta.filename), normalizedContent);

  return next;
}

export async function listHistory(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
): Promise<HistoryCheckpoint[]> {
  assertSafeId(moduleId);
  const directory = getHistoryDirectory(moduleKind, moduleId);
  await mkdir(directory, { recursive: true });
  const filenames = await readdir(directory);
  const checkpoints = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".json"))
      .map(async (filename) => {
        const content = await readFile(join(directory, filename), "utf8");
        return JSON.parse(content) as HistoryCheckpoint;
      }),
  );

  return checkpoints.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteHistoryCheckpoint(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  checkpointId: string,
): Promise<void> {
  assertSafeId(moduleId);
  assertSafeId(checkpointId);
  await rm(join(getHistoryDirectory(moduleKind, moduleId), `${checkpointId}.json`), {
    force: true,
  });
}

export async function restoreHistoryCheckpoint(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  checkpointId: string,
): Promise<void> {
  assertSafeId(moduleId);
  assertSafeId(checkpointId);
  const checkpoint = await readHistoryCheckpoint(moduleKind, moduleId, checkpointId);

  if (checkpoint.moduleKind !== moduleKind || checkpoint.moduleId !== moduleId) {
    throw new Error("Checkpoint does not belong to this module.");
  }

  if (moduleKind === "styles") {
    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(stylesDir, `${moduleId}.json`),
      checkpoint.snapshot as StyleModule,
    );
    return;
  }

  if (moduleKind === "lighting_types") {
    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(lightingTypesDir, `${moduleId}.json`),
      checkpoint.snapshot as LightingTypeModule,
    );
    return;
  }

  if (moduleKind === "ratios") {
    const snapshot = checkpoint.snapshot as RatioModule;
    if (snapshot.isDefault) {
      const ratios = await readJsonDirectory<RatioModule>(ratiosDir);
      await Promise.all(
        ratios
          .filter((item) => item.id !== moduleId && item.isDefault)
          .map((item) =>
            writeJsonFileWithCheckpoint(
              "ratios",
              item.id,
              join(ratiosDir, `${item.id}.json`),
              { ...item, isDefault: false },
            ),
          ),
      );
    }

    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(ratiosDir, `${moduleId}.json`),
      snapshot,
    );
    return;
  }

  if (moduleKind === "emotional_tones") {
    const snapshot = checkpoint.snapshot as EmotionalToneModule;
    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(emotionalTonesDir, `${moduleId}.json`),
      moduleId === "none"
        ? createProtectedNoneTone(snapshot.displayName)
        : { ...snapshot, isDefault: false },
    );
    return;
  }

  if (moduleKind === "photography_profiles") {
    const snapshot = checkpoint.snapshot as PhotographyProfileModule;
    const filePath = join(photographyProfilesDir, `${moduleId}.json`);
    const current = await readJsonFileIfExists<PhotographyProfileModule>(filePath);

    if (snapshot.isDefault) {
      const profiles =
        await readJsonDirectory<PhotographyProfileModule>(photographyProfilesDir);
      await Promise.all(
        profiles
          .filter((item) => item.id !== moduleId && item.isDefault)
          .map((item) =>
            writeJsonFileWithCheckpoint(
              "photography_profiles",
              item.id,
              join(photographyProfilesDir, `${item.id}.json`),
              { ...item, isDefault: false },
            ),
          ),
      );
    }

    const restoredSnapshot =
      current?.isDefault && !snapshot.isDefault
        ? { ...snapshot, isDefault: true, enabled: true }
        : { ...snapshot, enabled: snapshot.isDefault ? true : snapshot.enabled };

    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      filePath,
      restoredSnapshot,
    );
    return;
  }

  if (moduleKind === "output_modes") {
    const snapshot = checkpoint.snapshot as OutputModeModule;
    const filePath = join(outputModesDir, `${moduleId}.json`);
    const current = await readJsonFileIfExists<OutputModeModule>(filePath);

    if (snapshot.isDefault) {
      const outputModes = await readJsonDirectory<OutputModeModule>(outputModesDir);
      await Promise.all(
        outputModes
          .filter((item) => item.id !== moduleId && item.isDefault)
          .map((item) =>
            writeJsonFileWithCheckpoint(
              "output_modes",
              item.id,
              join(outputModesDir, `${item.id}.json`),
              { ...item, isDefault: false },
            ),
          ),
      );
    }

    const restoredSnapshot =
      current?.isDefault && !snapshot.isDefault
        ? { ...snapshot, isDefault: true, enabled: true }
        : { ...snapshot, enabled: snapshot.isDefault ? true : snapshot.enabled };

    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      filePath,
      restoredSnapshot,
    );
    return;
  }

  if (moduleKind === "custom_prompts") {
    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(customPromptsDir, `${moduleId}.json`),
      checkpoint.snapshot as CustomPromptModule,
    );
    return;
  }

  if (moduleKind === "product_projects") {
    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(productProjectsDir, moduleId, "project.json"),
      checkpoint.snapshot as ReferenceProductProject,
    );
    return;
  }

  if (moduleKind === "element_assets") {
    await restoreJsonSnapshot(
      moduleKind,
      moduleId,
      join(elementAssetsDir, moduleId, "asset.json"),
      checkpoint.snapshot as ElementReferenceAsset,
    );
    return;
  }

  const current = await readCommonPromptById(moduleId);
  const snapshot = checkpoint.snapshot as CommonPromptModule;
  const meta = findCommonMeta(moduleId);
  if (current && !isSameSnapshot(current, snapshot)) {
    await createHistoryCheckpoint(moduleKind, moduleId, current, "恢复前自动检查点");
  }
  await writeTextFile(join(commonDir, meta.filename), `${snapshot.content.trim()}\n`);
}

async function ensureDataDirectories(): Promise<void> {
  await Promise.all([
    mkdir(stylesDir, { recursive: true }),
    mkdir(lightingTypesDir, { recursive: true }),
    mkdir(ratiosDir, { recursive: true }),
    mkdir(emotionalTonesDir, { recursive: true }),
    mkdir(photographyProfilesDir, { recursive: true }),
    mkdir(outputModesDir, { recursive: true }),
    mkdir(customPromptsDir, { recursive: true }),
    mkdir(productProjectsDir, { recursive: true }),
    mkdir(elementAssetsDir, { recursive: true }),
    mkdir(commonDir, { recursive: true }),
    mkdir(historyDir, { recursive: true }),
  ]);
}

async function readJsonDirectory<T extends { id: string }>(directory: string): Promise<T[]> {
  await mkdir(directory, { recursive: true });
  const filenames = await readdir(directory);
  const jsonFilenames = filenames.filter((filename) => filename.endsWith(".json"));

  return Promise.all(
    jsonFilenames.map(async (filename) => {
      const content = await readFile(join(directory, filename), "utf8");
      return JSON.parse(content) as T;
    }),
  );
}

async function readCommonPrompts(): Promise<CommonPromptModule[]> {
  await mkdir(commonDir, { recursive: true });

  return Promise.all(
    commonPromptMeta.map(async (meta) => {
      const filePath = join(commonDir, meta.filename);
      let content = "";

      try {
        content = await readFile(filePath, "utf8");
      } catch {
        await writeTextFile(filePath, "");
      }

      return {
        ...meta,
        content: content.trim(),
      };
    }),
  );
}

async function readCommonPromptById(id: string): Promise<CommonPromptModule | null> {
  const meta = findCommonMeta(id);
  const filePath = join(commonDir, meta.filename);

  try {
    const content = await readFile(filePath, "utf8");
    return {
      ...meta,
      content: content.trim(),
    };
  } catch {
    return null;
  }
}

async function readJsonFileIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function writeJsonFileWithCheckpoint(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  filePath: string,
  next: unknown,
): Promise<void> {
  const current = await readJsonFileIfExists(filePath);

  if (current && !isSameSnapshot(current, next)) {
    await createHistoryCheckpoint(moduleKind, moduleId, current, "保存前自动检查点");
  }

  await writeJsonFile(filePath, next);
}

async function deleteJsonFileWithCheckpoint(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  filePath: string,
): Promise<void> {
  const current = await readJsonFileIfExists(filePath);
  if (current) {
    await createHistoryCheckpoint(moduleKind, moduleId, current, "删除前自动检查点");
  }
  await rm(filePath, { force: true });
}

async function restoreJsonSnapshot(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  filePath: string,
  snapshot: unknown,
): Promise<void> {
  const current = await readJsonFileIfExists(filePath);
  if (current && !isSameSnapshot(current, snapshot)) {
    await createHistoryCheckpoint(moduleKind, moduleId, current, "恢复前自动检查点");
  }
  await writeJsonFile(filePath, snapshot);
}

async function createHistoryCheckpoint(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  snapshot: unknown,
  label: string,
): Promise<void> {
  const createdAt = new Date().toISOString();
  const id = createCheckpointId(createdAt);
  const checkpoint: HistoryCheckpoint = {
    id,
    createdAt,
    moduleKind,
    moduleId,
    label,
    snapshot,
  };

  await writeJsonFile(join(getHistoryDirectory(moduleKind, moduleId), `${id}.json`), checkpoint);
}

async function readHistoryCheckpoint(
  moduleKind: ModuleHistoryKind,
  moduleId: string,
  checkpointId: string,
): Promise<HistoryCheckpoint> {
  const content = await readFile(
    join(getHistoryDirectory(moduleKind, moduleId), `${checkpointId}.json`),
    "utf8",
  );
  return JSON.parse(content) as HistoryCheckpoint;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeTextFile(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function findCommonMeta(id: string) {
  assertSafeId(id);
  const meta = commonPromptMeta.find((item) => item.id === id);
  if (!meta) {
    throw new Error(`Unknown common prompt id: ${id}`);
  }
  return meta;
}

function getHistoryDirectory(moduleKind: ModuleHistoryKind, moduleId: string): string {
  return join(historyDir, moduleKind, moduleId);
}

function createCheckpointId(createdAt: string): string {
  const timestamp = createdAt
    .replace(/[-:TZ.]/g, "")
    .slice(0, 17);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${timestamp}_${suffix}`;
}

function isSameSnapshot(current: unknown, next: unknown): boolean {
  return JSON.stringify(current) === JSON.stringify(next);
}

function assertSafeId(id: string): void {
  if (!safeIdPattern.test(id)) {
    throw new Error(`Invalid id: ${id}. Use lowercase letters, numbers, and underscores only.`);
  }
}

function assertSafeImageFilename(filename: string): void {
  if (!/^img_[a-z0-9_]+\.(?:png|jpg|webp)$/.test(filename)) {
    throw new Error("Invalid image filename.");
  }
}

async function saveImageFile(
  imageDir: string,
  originalName: string,
  dataUrl: string,
): Promise<Omit<ElementReferenceImage, "url">> {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);
  if (!match) {
    throw new Error("Only PNG, JPEG, and WebP images are supported.");
  }

  const extension =
    match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  const createdAt = new Date().toISOString();
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.${extension}`;
  await mkdir(imageDir, { recursive: true });
  await writeFile(join(imageDir, filename), Buffer.from(match[2], "base64"));
  return {
    id,
    filename,
    originalName: originalName.trim() || filename,
    createdAt,
  };
}

function createProtectedNoneTone(displayName: string): EmotionalToneModule {
  return {
    id: "none",
    displayName: displayName.trim() || "不启用",
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

function sortModules<T extends { displayName: string; sortOrder?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.displayName.localeCompare(b.displayName, "zh-CN");
  });
}
