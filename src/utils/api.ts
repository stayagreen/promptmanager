import type {
  CatalogData,
  BotanicalFormModule,
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
  ReferenceBrandModule,
  ReferenceProductImage,
  ReferenceProductProject,
  StyleModule,
  StructuralMaterialModeModule,
} from "../domain/schema";

export async function fetchCatalog(): Promise<CatalogData> {
  return request<CatalogData>("/api/catalog");
}

export async function translateText(text: string): Promise<string> {
  const response = await request<{ translatedText: string }>("/api/translate", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return response.translatedText;
}

export async function saveStyle(style: StyleModule): Promise<StyleModule> {
  return request<StyleModule>(`/api/styles/${style.id}`, {
    method: "PUT",
    body: JSON.stringify(style),
  });
}

export async function deleteStyle(id: string): Promise<void> {
  await request(`/api/styles/${id}`, { method: "DELETE" });
}

export async function saveLightingType(
  lightingType: LightingTypeModule,
): Promise<LightingTypeModule> {
  return request<LightingTypeModule>(`/api/lighting-types/${lightingType.id}`, {
    method: "PUT",
    body: JSON.stringify(lightingType),
  });
}

export async function deleteLightingType(id: string): Promise<void> {
  await request(`/api/lighting-types/${id}`, { method: "DELETE" });
}

export async function saveRatio(ratio: RatioModule): Promise<RatioModule> {
  return request<RatioModule>(`/api/ratios/${ratio.id}`, {
    method: "PUT",
    body: JSON.stringify(ratio),
  });
}

export async function deleteRatio(id: string): Promise<void> {
  await request(`/api/ratios/${id}`, { method: "DELETE" });
}

export async function saveEmotionalTone(
  emotionalTone: EmotionalToneModule,
): Promise<EmotionalToneModule> {
  return request<EmotionalToneModule>(`/api/emotional-tones/${emotionalTone.id}`, {
    method: "PUT",
    body: JSON.stringify(emotionalTone),
  });
}

export async function deleteEmotionalTone(id: string): Promise<void> {
  await request(`/api/emotional-tones/${id}`, { method: "DELETE" });
}

export async function savePhotographyProfile(
  profile: PhotographyProfileModule,
): Promise<PhotographyProfileModule> {
  return request<PhotographyProfileModule>(
    `/api/photography-profiles/${profile.id}`,
    {
      method: "PUT",
      body: JSON.stringify(profile),
    },
  );
}

export async function deletePhotographyProfile(id: string): Promise<void> {
  await request(`/api/photography-profiles/${id}`, { method: "DELETE" });
}

export async function saveOutputMode(
  outputMode: OutputModeModule,
): Promise<OutputModeModule> {
  return request<OutputModeModule>(`/api/output-modes/${outputMode.id}`, {
    method: "PUT",
    body: JSON.stringify(outputMode),
  });
}

export async function deleteOutputMode(id: string): Promise<void> {
  await request(`/api/output-modes/${id}`, { method: "DELETE" });
}

export async function saveBotanicalForm(
  form: BotanicalFormModule,
): Promise<BotanicalFormModule> {
  return request<BotanicalFormModule>(`/api/botanical-forms/${form.id}`, {
    method: "PUT",
    body: JSON.stringify(form),
  });
}

export async function deleteBotanicalForm(id: string): Promise<void> {
  await request(`/api/botanical-forms/${id}`, { method: "DELETE" });
}

export async function saveStructuralMaterialMode(
  mode: StructuralMaterialModeModule,
): Promise<StructuralMaterialModeModule> {
  return request<StructuralMaterialModeModule>(
    `/api/structural-material-modes/${mode.id}`,
    { method: "PUT", body: JSON.stringify(mode) },
  );
}

export async function deleteStructuralMaterialMode(id: string): Promise<void> {
  await request(`/api/structural-material-modes/${id}`, { method: "DELETE" });
}

export async function saveCustomPrompt(
  customPrompt: CustomPromptModule,
): Promise<CustomPromptModule> {
  return request<CustomPromptModule>(`/api/custom-prompts/${customPrompt.id}`, {
    method: "PUT",
    body: JSON.stringify(customPrompt),
  });
}

export async function deleteCustomPrompt(id: string): Promise<void> {
  await request(`/api/custom-prompts/${id}`, { method: "DELETE" });
}

export async function fetchReferenceBrands(): Promise<ReferenceBrandModule[]> {
  return request<ReferenceBrandModule[]>("/api/reference-brands");
}

export async function saveReferenceBrand(
  brand: ReferenceBrandModule,
): Promise<ReferenceBrandModule> {
  return request<ReferenceBrandModule>(`/api/reference-brands/${brand.id}`, {
    method: "PUT",
    body: JSON.stringify(brand),
  });
}

export async function deleteReferenceBrand(id: string): Promise<void> {
  await request(`/api/reference-brands/${id}`, { method: "DELETE" });
}

export async function fetchProductProjects(): Promise<ReferenceProductProject[]> {
  return request<ReferenceProductProject[]>("/api/product-projects");
}

export async function saveProductProject(
  project: ReferenceProductProject,
): Promise<ReferenceProductProject> {
  return request<ReferenceProductProject>(`/api/product-projects/${project.id}`, {
    method: "PUT",
    body: JSON.stringify(project),
  });
}

export async function deleteProductProject(id: string): Promise<void> {
  await request(`/api/product-projects/${id}`, { method: "DELETE" });
}

export async function uploadProductImage(
  projectId: string,
  file: File,
  role: ReferenceProductImage["role"],
): Promise<ReferenceProductImage> {
  return request<ReferenceProductImage>(
    `/api/product-projects/${projectId}/images`,
    {
      method: "POST",
      body: JSON.stringify({
        originalName: file.name,
        dataUrl: await fileToDataUrl(file),
        role,
      }),
    },
  );
}

export async function deleteProductImage(
  projectId: string,
  filename: string,
): Promise<void> {
  await request(`/api/product-projects/${projectId}/images/${filename}`, {
    method: "DELETE",
  });
}

export async function fetchElementAssets(): Promise<ElementReferenceAsset[]> {
  return request<ElementReferenceAsset[]>("/api/element-assets");
}

export async function saveElementAsset(
  asset: ElementReferenceAsset,
): Promise<ElementReferenceAsset> {
  return request<ElementReferenceAsset>(`/api/element-assets/${asset.id}`, {
    method: "PUT",
    body: JSON.stringify(asset),
  });
}

export async function deleteElementAsset(id: string): Promise<void> {
  await request(`/api/element-assets/${id}`, { method: "DELETE" });
}

export async function uploadElementAssetImage(
  assetId: string,
  file: File,
): Promise<ElementReferenceImage> {
  return request<ElementReferenceImage>(`/api/element-assets/${assetId}/images`, {
    method: "POST",
    body: JSON.stringify({
      originalName: file.name,
      dataUrl: await fileToDataUrl(file),
    }),
  });
}

export async function deleteElementAssetImage(
  assetId: string,
  filename: string,
): Promise<void> {
  await request(`/api/element-assets/${assetId}/images/${filename}`, {
    method: "DELETE",
  });
}

export async function saveCommonPrompt(
  id: string,
  content: string,
): Promise<CommonPromptModule> {
  return request<CommonPromptModule>(`/api/common-prompts/${id}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function fetchHistory(
  kind: ModuleHistoryKind,
  id: string,
): Promise<HistoryCheckpoint[]> {
  return request<HistoryCheckpoint[]>(`/api/history/${historyPath(kind)}/${id}`);
}

export async function restoreCheckpoint(
  kind: ModuleHistoryKind,
  id: string,
  checkpointId: string,
): Promise<void> {
  await request(`/api/history/${historyPath(kind)}/${id}/${checkpointId}/restore`, {
    method: "POST",
  });
}

export async function deleteCheckpoint(
  kind: ModuleHistoryKind,
  id: string,
  checkpointId: string,
): Promise<void> {
  await request(`/api/history/${historyPath(kind)}/${id}/${checkpointId}`, {
    method: "DELETE",
  });
}

async function request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function historyPath(kind: ModuleHistoryKind): string {
  if (kind === "lighting_types") return "lighting-types";
  if (kind === "emotional_tones") return "emotional-tones";
  if (kind === "photography_profiles") return "photography-profiles";
  if (kind === "output_modes") return "output-modes";
  if (kind === "botanical_forms") return "botanical-forms";
  if (kind === "structural_material_modes") return "structural-material-modes";
  if (kind === "custom_prompts") return "custom-prompts";
  if (kind === "product_projects") return "product-projects";
  if (kind === "reference_brands") return "reference-brands";
  if (kind === "element_assets") return "element-assets";
  if (kind === "common") return "common-prompts";
  return kind;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}
