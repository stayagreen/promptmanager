import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  Clipboard,
  Download,
  FileImage,
  History,
  ImagePlus,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { ElementReferencePanel } from "./ElementReferencePanel";
import {
  formatChinesePromptReference,
  translateToChineseReference,
} from "./domain/chineseReference";
import {
  buildReferencePrompt,
  referenceTasks,
  type ReferenceTaskId,
} from "./domain/referencePromptAssembler";
import {
  getActivePhotographyProfiles,
  getActiveRatios,
  getActiveStyles,
  getDefaultPhotographyProfile,
  getDefaultRatio,
} from "./domain/promptAssembler";
import type {
  CatalogData,
  ElementReferenceAsset,
  HistoryCheckpoint,
  ReferenceConsistencyLevel,
  ReferenceProductProject,
} from "./domain/schema";
import {
  deleteCheckpoint,
  deleteProductImage,
  deleteProductProject,
  fetchHistory,
  fetchElementAssets,
  fetchProductProjects,
  restoreCheckpoint,
  saveProductProject,
  translateText,
  uploadProductImage,
} from "./utils/api";
import { downloadTextFile } from "./utils/download";

type WorkspaceMode = "text" | "reference";

export function ReferenceWorkspace({
  catalog,
  onWorkspaceMode,
}: {
  catalog: CatalogData;
  onWorkspaceMode: (mode: WorkspaceMode) => void;
}) {
  const [projects, setProjects] = useState<ReferenceProductProject[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ReferenceProductProject | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<ReferenceTaskId>("ecommerce_white");
  const [consistency, setConsistency] =
    useState<ReferenceConsistencyLevel>("strict");
  const [ratioId, setRatioId] = useState(
    getActiveRatios(catalog).find((ratio) => ratio.id === "3_4")?.id ??
      getDefaultRatio(catalog).id,
  );
  const [sceneStyleId, setSceneStyleId] = useState("none");
  const [photographyProfileId, setPhotographyProfileId] = useState(
    getDefaultPhotographyProfile(catalog).id,
  );
  const [allowBackgroundChange, setAllowBackgroundChange] = useState(true);
  const [allowAngleChange, setAllowAngleChange] = useState(true);
  const [allowLightingOptimization, setAllowLightingOptimization] = useState(true);
  const [allowProps, setAllowProps] = useState(false);
  const [allowCableCleanup, setAllowCableCleanup] = useState(false);
  const [additionalRequirements, setAdditionalRequirements] = useState("");
  const [translation, setTranslation] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translationSource, setTranslationSource] = useState<"google" | "fallback">(
    "fallback",
  );
  const [history, setHistory] = useState<HistoryCheckpoint[]>([]);
  const [elementAssets, setElementAssets] = useState<ElementReferenceAsset[]>([]);
  const [elementRandomToken, setElementRandomToken] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const styles = getActiveStyles(catalog);
  const ratios = getActiveRatios(catalog);
  const photographyProfiles = getActivePhotographyProfiles(catalog);
  const selectedTask = referenceTasks.find((task) => task.id === taskId);

  async function reloadProjects(preferredId?: string) {
    const next = await fetchProductProjects();
    setProjects(next);
    const nextId =
      preferredId && next.some((project) => project.id === preferredId)
        ? preferredId
        : selectedId && next.some((project) => project.id === selectedId)
          ? selectedId
          : (next[0]?.id ?? "");
    setSelectedId(nextId);
    setDraft(next.find((project) => project.id === nextId) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void reloadProjects();
    void fetchElementAssets().then(setElementAssets);
  }, []);

  useEffect(() => {
    if (isNew) return;
    const selected = projects.find((project) => project.id === selectedId);
    setDraft(selected ? structuredClone(selected) : null);
  }, [isNew, projects, selectedId]);

  useEffect(() => {
    if (!selectedId || isNew) {
      setHistory([]);
      return;
    }
    void fetchHistory("product_projects", selectedId).then(setHistory);
  }, [isNew, selectedId, projects]);

  const promptResult = useMemo(() => {
    if (!draft || !draft.title.trim()) return null;
    return buildReferencePrompt(draft, {
      taskId,
      consistency,
      ratio: ratios.find((ratio) => ratio.id === ratioId) ?? getDefaultRatio(catalog),
      sceneStyle:
        sceneStyleId === "none"
          ? undefined
          : styles.find((style) => style.id === sceneStyleId),
      photographyProfile:
        photographyProfiles.find(
          (profile) => profile.id === photographyProfileId,
        ) ?? getDefaultPhotographyProfile(catalog),
      allowBackgroundChange,
      allowAngleChange,
      allowLightingOptimization,
      allowProps,
      allowCableCleanup,
      additionalRequirements,
      elementAssets,
      elementRandomToken,
    });
  }, [
    additionalRequirements,
    allowAngleChange,
    allowBackgroundChange,
    allowCableCleanup,
    allowLightingOptimization,
    allowProps,
    catalog,
    consistency,
    draft,
    elementAssets,
    elementRandomToken,
    photographyProfileId,
    photographyProfiles,
    ratioId,
    ratios,
    sceneStyleId,
    styles,
    taskId,
  ]);

  useEffect(() => {
    const text = promptResult?.promptText.trim() ?? "";
    if (!text) {
      setTranslation("");
      setTranslationSource("fallback");
      return;
    }
    const fallbackTranslation = formatChinesePromptReference(
      translateToChineseReference(text),
    );
    let cancelled = false;
    setTranslation(fallbackTranslation);
    setTranslationSource("fallback");
    setTranslating(true);
    const timeout = window.setTimeout(() => {
      translateText(text)
        .then((value) => {
          if (!cancelled) {
            setTranslation(formatChinesePromptReference(value));
            setTranslationSource("google");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTranslation(fallbackTranslation);
            setTranslationSource("fallback");
          }
        })
        .finally(() => {
          if (!cancelled) setTranslating(false);
        });
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [promptResult?.promptText]);

  useEffect(() => {
    const preferredRatioId =
      taskId === "xiaohongshu_cover" || taskId === "xiaohongshu_note_set"
        ? "9_16"
        : "3_4";
    if (ratios.some((ratio) => ratio.id === preferredRatioId)) {
      setRatioId(preferredRatioId);
    }
  }, [ratios, taskId]);

  useEffect(() => {
    if (
      taskId === "hoikei_ecommerce_10" &&
      draft &&
      draft.dimensionMode === "none"
    ) {
      setDraft({ ...draft, dimensionMode: "estimated" });
    }
  }, [draft, taskId]);

  async function handleSaveProject() {
    if (!draft) return;
    if (!/^[a-z0-9_]+$/.test(draft.id)) {
      window.alert("档案 ID 只能使用小写英文字母、数字和下划线。");
      return;
    }
    if (!draft.title.trim()) {
      window.alert("请填写产品标题。");
      return;
    }
    if (isNew && projects.some((project) => project.id === draft.id)) {
      window.alert("这个产品档案 ID 已存在。");
      return;
    }
    const saved = await saveProductProject(draft);
    setIsNew(false);
    await reloadProjects(saved.id);
    setStatus(`已保存产品档案：${saved.title}`);
  }

  async function handleDeleteProject() {
    if (!draft || isNew) return;
    if (!window.confirm(`确定删除产品档案“${draft.title}”吗？`)) return;
    await deleteProductProject(draft.id);
    setSelectedId("");
    setDraft(null);
    await reloadProjects();
    setStatus("产品档案已删除，删除前数据保留在历史检查点中。");
  }

  async function handleFiles(files: FileList | null) {
    if (!draft || isNew || !files?.length) {
      if (isNew) window.alert("请先保存产品档案，再上传参考图。");
      return;
    }
    setUploading(true);
    try {
      const nextImages = [...draft.images];
      for (const file of Array.from(files)) {
        const role = nextImages.length === 0 ? "primary" : "supplementary";
        const image = await uploadProductImage(draft.id, file, role);
        nextImages.push(image);
      }
      const nextDraft = { ...draft, images: nextImages };
      const saved = await saveProductProject(nextDraft);
      await reloadProjects(saved.id);
      setStatus(`已保存 ${files.length} 张参考图`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSetPrimary(imageId: string) {
    if (!draft) return;
    const saved = await saveProductProject({
      ...draft,
      images: draft.images.map((image) => ({
        ...image,
        role: image.id === imageId ? "primary" : "supplementary",
      })),
    });
    await reloadProjects(saved.id);
  }

  async function handleDeleteImage(imageId: string) {
    if (!draft) return;
    const image = draft.images.find((item) => item.id === imageId);
    if (!image || !window.confirm(`删除参考图“${image.originalName}”？`)) return;
    await deleteProductImage(draft.id, image.filename);
    const remaining = draft.images
      .filter((item) => item.id !== imageId)
      .map((item, index) => ({
        ...item,
        role:
          item.role === "primary" || index === 0
            ? ("primary" as const)
            : ("supplementary" as const),
      }));
    const saved = await saveProductProject({ ...draft, images: remaining });
    await reloadProjects(saved.id);
  }

  async function handleSavePrompt() {
    if (!draft || !promptResult || isNew) return;
    const savedPrompt = {
      id: `prompt_${Date.now()}`,
      taskId,
      taskName: promptResult.task.displayName,
      title: promptResult.title,
      promptText: promptResult.promptText,
      createdAt: new Date().toISOString(),
    };
    const saved = await saveProductProject({
      ...draft,
      savedPrompts: [savedPrompt, ...draft.savedPrompts],
    });
    await reloadProjects(saved.id);
    setStatus("当前提示词已保存到产品档案。");
  }

  async function handleRestore(checkpointId: string) {
    if (!draft || !window.confirm("恢复这个产品档案检查点？")) return;
    await restoreCheckpoint("product_projects", draft.id, checkpointId);
    await reloadProjects(draft.id);
    setStatus("产品档案已恢复。");
  }

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 className="spin" />
        <h1>正在加载产品档案</h1>
      </div>
    );
  }

  return (
    <div className="app-shell reference-shell">
      <aside className="control-pane reference-controls">
        <header className="app-header">
          <div>
            <p className="eyebrow">Prompt Library</p>
            <h1>参考图产品任务</h1>
          </div>
          <PackageCheck aria-hidden="true" />
        </header>

        <WorkspaceTabs active="reference" onChange={onWorkspaceMode} />

        <section className="panel">
          <div className="panel-title">
            <Archive aria-hidden="true" />
            <h2>产品档案</h2>
          </div>
          {projects.length > 0 && !isNew && (
            <Select
              label="选择产品"
              value={selectedId}
              onChange={setSelectedId}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </Select>
          )}
          <div className="button-grid reference-create-actions">
            <button
              type="button"
              onClick={() => {
                setIsNew(true);
                setSelectedId("");
                setDraft(createEmptyProject());
                setStatus("");
              }}
            >
              <Plus aria-hidden="true" />
              新建档案
            </button>
            {draft && !isNew && (
              <button type="button" className="danger" onClick={handleDeleteProject}>
                <Trash2 aria-hidden="true" />
                删除档案
              </button>
            )}
          </div>
        </section>

        {draft && (
          <>
            <section className="panel">
              <div className="panel-title">
                <FileImage aria-hidden="true" />
                <h2>档案信息</h2>
              </div>
              <Input
                label="档案 ID"
                value={draft.id}
                disabled={!isNew}
                onChange={(value) => setDraft({ ...draft, id: value })}
              />
              <Input
                label="产品标题"
                value={draft.title}
                onChange={(value) => setDraft({ ...draft, title: value })}
              />
              <Input
                label="产品编号"
                value={draft.productCode}
                onChange={(value) => setDraft({ ...draft, productCode: value })}
              />
              <Select
                label="灯具类型"
                value={draft.lightingTypeId}
                onChange={(value) => setDraft({ ...draft, lightingTypeId: value })}
              >
                <option value="">未指定</option>
                {catalog.lightingTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.displayName}
                  </option>
                ))}
              </Select>
              <label className="field">
                <span>备注</span>
                <textarea
                  className="compact-textarea"
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                />
              </label>
              <button type="button" className="primary full-button" onClick={handleSaveProject}>
                <Save aria-hidden="true" />
                保存产品档案
              </button>
              {status && <p className="save-status reference-status">{status}</p>}
            </section>

            <section className="panel">
              <div className="panel-title">
                <FileImage aria-hidden="true" />
                <h2>任务设置</h2>
              </div>
              <Select
                label="任务类型"
                value={taskId}
                onChange={(value) => setTaskId(value as ReferenceTaskId)}
              >
                {referenceTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.displayName}
                  </option>
                ))}
              </Select>
              <Select
                label="产品保持程度"
                value={consistency}
                onChange={(value) =>
                  setConsistency(value as ReferenceConsistencyLevel)
                }
              >
                <option value="strict">严格保持</option>
                <option value="high">高度保持</option>
                <option value="optimized">适度优化</option>
                <option value="creative">创意演绎</option>
              </Select>
              <Select label="场景风格" value={sceneStyleId} onChange={setSceneStyleId}>
                <option value="none">不指定</option>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.displayName}
                  </option>
                ))}
              </Select>
              <Select
                label="摄影方式"
                value={photographyProfileId}
                onChange={setPhotographyProfileId}
              >
                {photographyProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName}
                  </option>
                ))}
              </Select>
              <Select
                label="画面比例"
                value={ratioId}
                onChange={setRatioId}
                disabled={Boolean(selectedTask?.mixedRatios)}
              >
                {ratios.map((ratio) => (
                  <option key={ratio.id} value={ratio.id}>
                    {ratio.displayName}
                  </option>
                ))}
              </Select>
              {selectedTask?.mixedRatios && (
                <p className="technical-mode-note">
                  此任务固定使用混合比例：第 1-5 张为 1:1，第 6-10 张为 3:4；上方单一比例不会写入最终提示词。
                </p>
              )}
              <div className="reference-checkboxes">
                <Check label="允许更换背景" value={allowBackgroundChange} onChange={setAllowBackgroundChange} />
                <Check label="允许改变角度" value={allowAngleChange} onChange={setAllowAngleChange} />
                <Check label="允许优化光线" value={allowLightingOptimization} onChange={setAllowLightingOptimization} />
                <Check label="允许增加道具" value={allowProps} onChange={setAllowProps} />
                <Check label="允许整理电线" value={allowCableCleanup} onChange={setAllowCableCleanup} />
              </div>
              <label className="field">
                <span>
                  {taskId === "hoikei_ecommerce_10"
                    ? "SKU规格与附加要求"
                    : "附加要求"}
                </span>
                <textarea
                  className="compact-textarea"
                  placeholder={
                    taskId === "hoikei_ecommerce_10"
                      ? "例如：材质：黑色金属 / 奶白玻璃；灯泡：G9；瓦数：5W × 5；数量：5头"
                      : undefined
                  }
                  value={additionalRequirements}
                  onChange={(event) => setAdditionalRequirements(event.target.value)}
                />
              </label>
            </section>
          </>
        )}
      </aside>

      <main className="preview-pane reference-main">
        {!draft ? (
          <section className="reference-empty">
            <FileImage aria-hidden="true" />
            <h2>创建一个产品档案开始</h2>
            <p>参考图、尺寸和历史提示词都会绑定到产品档案，方便后续查找和复用。</p>
          </section>
        ) : (
          <>
            <section className="summary-bar">
              <div>
                <p className="eyebrow">Product Archive</p>
                <h2>{draft.title || "未命名产品"}</h2>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isNew || uploading}
              >
                {uploading ? <Loader2 className="spin" /> : <ImagePlus />}
                上传参考图
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(event) => void handleFiles(event.target.files)}
              />
            </section>

            <section className="reference-images">
              {draft.images.length === 0 ? (
                <div className="reference-upload-placeholder">
                  <ImagePlus aria-hidden="true" />
                  <strong>尚未上传参考图</strong>
                  <span>先保存档案，再上传主图或补充角度图。</span>
                </div>
              ) : (
                draft.images.map((image) => (
                  <article className="reference-image-card" key={image.id}>
                    <img src={image.url} alt={image.originalName} />
                    <div>
                      <strong>{image.role === "primary" ? "主参考图" : "补充图"}</strong>
                      <span>{image.originalName}</span>
                    </div>
                    <div className="reference-image-actions">
                      {image.role !== "primary" && (
                        <button type="button" onClick={() => void handleSetPrimary(image.id)}>
                          设为主图
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger"
                        title="删除图片"
                        onClick={() => void handleDeleteImage(image.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <DimensionEditor draft={draft} onChange={setDraft} />

            <ElementReferencePanel
              project={draft}
              assets={elementAssets}
              onProjectChange={setDraft}
              onAssetsChange={setElementAssets}
            />

            {promptResult && (
              <section className="reference-prompt-section">
                <div className="reference-prompt-toolbar">
                  <div>
                    <p className="eyebrow">Generated Prompt</p>
                    <h2>{promptResult.title}</h2>
                  </div>
                  <div className="reference-prompt-actions">
                    {(draft.elementSelections ?? []).some(
                      (selection) => selection.selectionMode === "random",
                    ) && (
                      <button
                        type="button"
                        onClick={() => setElementRandomToken((value) => value + 1)}
                      >
                        <RefreshCw aria-hidden="true" />
                        重选随机元素
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(promptResult.promptText)}
                    >
                      <Clipboard aria-hidden="true" />
                      复制英文
                    </button>
                    <button
                      type="button"
                      disabled={!translation}
                      onClick={() => void navigator.clipboard.writeText(translation)}
                    >
                      <Clipboard aria-hidden="true" />
                      复制中文
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(promptResult.promptText, promptResult.filename)
                      }
                    >
                      <Download aria-hidden="true" />
                      下载 TXT
                    </button>
                    <button
                      type="button"
                      disabled={!translation}
                      onClick={() =>
                        downloadTextFile(
                          translation,
                          promptResult.filename.replace(/\.txt$/, "_中文参考.txt"),
                        )
                      }
                    >
                      <Download aria-hidden="true" />
                      下载中文
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={isNew}
                      onClick={() => void handleSavePrompt()}
                    >
                      <Save aria-hidden="true" />
                      保存到档案
                    </button>
                  </div>
                </div>
                <p className="reference-warning">
                  系统不会把图片自动发送到生图平台。使用提示词时，请同时上传产品参考图
                  {promptResult.resolvedElements.length > 0
                    ? `和当前选中的元素图（${promptResult.resolvedElements.map((asset) => asset.displayName).join("、")}）`
                    : ""}
                  ，并将产品主图设为最高优先级参考。
                </p>
                <SyncedPromptPair
                  english={promptResult.promptText}
                  chinese={translation}
                  translating={translating}
                  translationSource={translationSource}
                />
              </section>
            )}

            <ArchivePanel
              project={draft}
              history={history}
              onRestore={handleRestore}
              onDeleteCheckpoint={async (checkpointId) => {
                await deleteCheckpoint("product_projects", draft.id, checkpointId);
                setHistory(await fetchHistory("product_projects", draft.id));
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}

function DimensionEditor({
  draft,
  onChange,
}: {
  draft: ReferenceProductProject;
  onChange: (project: ReferenceProductProject) => void;
}) {
  const text = draft.dimensions
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n");
  return (
    <section className="reference-settings-band">
      <div>
        <p className="eyebrow">Dimensions</p>
        <h2>尺寸来源</h2>
      </div>
      <div className="reference-dimension-grid">
        <Select
          label="尺寸模式"
          value={draft.dimensionMode}
          onChange={(value) =>
            onChange({
              ...draft,
              dimensionMode: value as ReferenceProductProject["dimensionMode"],
            })
          }
        >
          <option value="verified">用户填写真实尺寸</option>
          <option value="estimated">AI 视觉估算</option>
          <option value="none">不显示尺寸</option>
        </Select>
        {draft.dimensionMode !== "none" && (
          <label className="field">
            <span>尺寸数据，每行“名称: 数值”</span>
            <textarea
              className="compact-textarea"
              placeholder={"总高度: 约 360 mm\n最大宽度: 约 240 mm"}
              value={text}
              onChange={(event) =>
                onChange({
                  ...draft,
                  dimensions: parseDimensionLines(event.target.value),
                })
              }
            />
          </label>
        )}
        {draft.dimensionMode === "estimated" && (
          <label className="field">
            <span>估算依据或已知参照物</span>
            <textarea
              className="compact-textarea"
              placeholder="例如：旁边书本宽约 210 mm；也可以留空，让视觉 AI 按常见产品比例估算。"
              value={draft.estimationBasis}
              onChange={(event) =>
                onChange({ ...draft, estimationBasis: event.target.value })
              }
            />
          </label>
        )}
      </div>
      {draft.dimensionMode === "estimated" && (
        <p className="reference-warning">
          AI 估算仅用于概念展示，不能用于生产、安装、报价、包装或安全判断。提示词会强制要求标注“约 / Approx.”。
        </p>
      )}
    </section>
  );
}

function ArchivePanel({
  project,
  history,
  onRestore,
  onDeleteCheckpoint,
}: {
  project: ReferenceProductProject;
  history: HistoryCheckpoint[];
  onRestore: (id: string) => Promise<void>;
  onDeleteCheckpoint: (id: string) => Promise<void>;
}) {
  return (
    <section className="reference-archive-grid">
      <div className="reference-archive-panel">
        <div className="panel-title">
          <Save aria-hidden="true" />
          <h2>已保存提示词</h2>
        </div>
        {project.savedPrompts.length === 0 ? (
          <p className="helper-text">还没有保存过提示词版本。</p>
        ) : (
          <div className="reference-version-list">
            {project.savedPrompts.map((prompt) => (
              <details key={prompt.id}>
                <summary>
                  <strong>{prompt.taskName}</strong>
                  <span>{new Date(prompt.createdAt).toLocaleString("zh-CN")}</span>
                </summary>
                <textarea readOnly className="compact-textarea" value={prompt.promptText} />
              </details>
            ))}
          </div>
        )}
      </div>
      <div className="reference-archive-panel">
        <div className="panel-title">
          <History aria-hidden="true" />
          <h2>档案检查点</h2>
        </div>
        {history.length === 0 ? (
          <p className="helper-text">修改并保存后会自动保留旧版本。</p>
        ) : (
          <div className="reference-history-list">
            {history.slice(0, 12).map((checkpoint) => (
              <div key={checkpoint.id}>
                <span>{new Date(checkpoint.createdAt).toLocaleString("zh-CN")}</span>
                <div>
                  <button type="button" onClick={() => void onRestore(checkpoint.id)}>
                    恢复
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void onDeleteCheckpoint(checkpoint.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SyncedPromptPair({
  english,
  chinese,
  translating,
  translationSource,
}: {
  english: string;
  chinese: string;
  translating: boolean;
  translationSource: "google" | "fallback";
}) {
  const leftRef = useRef<HTMLTextAreaElement | null>(null);
  const rightRef = useRef<HTMLTextAreaElement | null>(null);
  const lock = useRef(false);
  function sync(source: HTMLTextAreaElement, target: HTMLTextAreaElement | null) {
    if (!target || lock.current) return;
    const sourceRange = source.scrollHeight - source.clientHeight;
    const targetRange = target.scrollHeight - target.clientHeight;
    lock.current = true;
    target.scrollTop =
      sourceRange > 0 ? (source.scrollTop / sourceRange) * targetRange : 0;
    requestAnimationFrame(() => {
      lock.current = false;
    });
  }
  return (
    <div className="reference-bilingual">
      <label>
        <span>英文提示词</span>
        <textarea
          ref={leftRef}
          readOnly
          value={english}
          onScroll={(event) => sync(event.currentTarget, rightRef.current)}
        />
      </label>
      <label>
        <span>
          {translating
            ? "中文参考 · 翻译中"
            : translationSource === "google"
              ? "中文参考 · Google · 不保存"
              : "中文参考 · 本地回退 · 不保存"}
        </span>
        <textarea
          ref={rightRef}
          readOnly
          value={chinese}
          onScroll={(event) => sync(event.currentTarget, leftRef.current)}
        />
      </label>
    </div>
  );
}

function WorkspaceTabs({
  active,
  onChange,
}: {
  active: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}) {
  return (
    <div className="workspace-tabs">
      <button
        type="button"
        className={active === "text" ? "active" : ""}
        onClick={() => onChange("text")}
      >
        文生图
      </button>
      <button
        type="button"
        className={active === "reference" ? "active" : ""}
        onClick={() => onChange("reference")}
      >
        参考图任务
      </button>
    </div>
  );
}

function Select({
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

function Input({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function createEmptyProject(): ReferenceProductProject {
  const now = new Date().toISOString();
  return {
    id: "",
    title: "",
    productCode: "",
    lightingTypeId: "",
    notes: "",
    images: [],
    dimensionMode: "none",
    dimensions: [],
    estimationBasis: "",
    elementSelections: [],
    savedPrompts: [],
    createdAt: now,
    updatedAt: now,
  };
}

function parseDimensionLines(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) return { label: line.trim(), value: "" };
      return {
        label: line.slice(0, separator).trim(),
        value: line.slice(separator + 1).trim(),
      };
    })
    .filter((item) => item.label || item.value);
}
