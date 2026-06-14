import { useEffect, useRef, useState } from "react";
import {
  History,
  ImagePlus,
  Library,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type {
  ElementAssetCategory,
  ElementFusionMode,
  ElementInfluenceStrength,
  ElementReferenceAsset,
  HistoryCheckpoint,
  ProductElementSelection,
  ReferenceProductProject,
} from "./domain/schema";
import {
  deleteCheckpoint,
  deleteElementAsset,
  deleteElementAssetImage,
  fetchElementAssets,
  fetchHistory,
  restoreCheckpoint,
  saveElementAsset,
  uploadElementAssetImage,
} from "./utils/api";
import { ElementAssetPicker } from "./ElementAssetPicker";

const categoryLabels: Record<ElementAssetCategory, string> = {
  flower: "花卉植物",
  animal: "动物形象",
  carving: "雕刻装饰",
  texture: "纹理材质",
  hardware: "五金构件",
  structure: "结构造型",
  other: "其他",
};

const fusionLabels: Record<ElementFusionMode, string> = {
  direct: "直接融入元素",
  abstract: "抽象借形",
  texture: "只取纹理材质",
};

const strengthLabels: Record<ElementInfluenceStrength, string> = {
  subtle: "轻微点缀",
  medium: "适度体现",
  strong: "明显体现",
};

export function ElementReferencePanel({
  project,
  assets,
  onProjectChange,
  onAssetsChange,
}: {
  project: ReferenceProductProject;
  assets: ElementReferenceAsset[];
  onProjectChange: (project: ReferenceProductProject) => void;
  onAssetsChange: (assets: ElementReferenceAsset[]) => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assetDraft, setAssetDraft] = useState<ElementReferenceAsset | null>(null);
  const [assetIsNew, setAssetIsNew] = useState(false);
  const [history, setHistory] = useState<HistoryCheckpoint[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const selectedIds = new Set(
    (project.elementSelections ?? []).map((selection) => selection.assetId),
  );
  const enabledAssets = assets.filter((asset) => asset.enabled);

  async function reloadAssets(preferredId?: string) {
    const next = await fetchElementAssets();
    onAssetsChange(next);
    if (preferredId) {
      const selected = next.find((asset) => asset.id === preferredId);
      if (selected) {
        setAssetDraft(structuredClone(selected));
        setAssetIsNew(false);
      }
    }
  }

  useEffect(() => {
    if (!assetDraft?.id || assetIsNew) {
      setHistory([]);
      return;
    }
    void fetchHistory("element_assets", assetDraft.id).then(setHistory);
  }, [assetDraft?.id, assetIsNew, assets]);

  function toggleAsset(asset: ElementReferenceAsset) {
    if (selectedIds.has(asset.id)) {
      onProjectChange({
        ...project,
        elementSelections: (project.elementSelections ?? []).filter(
          (selection) => selection.assetId !== asset.id,
        ),
      });
      return;
    }
    const selection: ProductElementSelection = {
      assetId: asset.id,
      selectionMode: "required",
      fusionMode: asset.defaultFusionMode,
      placement: asset.defaultPlacement,
      strength: asset.defaultStrength,
      quantity: asset.defaultQuantity,
    };
    onProjectChange({
      ...project,
      elementSelections: [...(project.elementSelections ?? []), selection],
    });
  }

  function updateSelection(
    assetId: string,
    patch: Partial<ProductElementSelection>,
  ) {
    onProjectChange({
      ...project,
      elementSelections: (project.elementSelections ?? []).map((selection) =>
        selection.assetId === assetId ? { ...selection, ...patch } : selection,
      ),
    });
  }

  async function handleSaveAsset() {
    if (!assetDraft) return;
    if (!/^[a-z0-9_]+$/.test(assetDraft.id)) {
      window.alert("素材 ID 只能使用小写英文字母、数字和下划线。");
      return;
    }
    if (!assetDraft.displayName.trim() || !assetDraft.description.trim()) {
      window.alert("请填写素材标题和英文元素描述。");
      return;
    }
    if (assetIsNew && assets.some((asset) => asset.id === assetDraft.id)) {
      window.alert("这个素材 ID 已存在。");
      return;
    }
    const saved = await saveElementAsset(assetDraft);
    await reloadAssets(saved.id);
    setStatus(`已保存素材：${saved.displayName}`);
  }

  async function handleDeleteAsset() {
    if (!assetDraft || assetIsNew) return;
    if (!window.confirm(`确定删除元素素材“${assetDraft.displayName}”吗？`)) return;
    await deleteElementAsset(assetDraft.id);
    onProjectChange({
      ...project,
      elementSelections: (project.elementSelections ?? []).filter(
        (selection) => selection.assetId !== assetDraft.id,
      ),
    });
    setAssetDraft(null);
    await reloadAssets();
    setStatus("素材已删除，删除前版本保留在检查点中。");
  }

  async function handleFiles(files: FileList | null) {
    if (!assetDraft || assetIsNew || !files?.length) {
      if (assetIsNew) window.alert("请先保存素材，再上传元素参考图。");
      return;
    }
    setUploading(true);
    try {
      const nextImages = [...assetDraft.images];
      for (const file of Array.from(files)) {
        nextImages.push(await uploadElementAssetImage(assetDraft.id, file));
      }
      const saved = await saveElementAsset({ ...assetDraft, images: nextImages });
      await reloadAssets(saved.id);
      setStatus(`已上传 ${files.length} 张元素参考图`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDeleteImage(filename: string) {
    if (!assetDraft) return;
    await deleteElementAssetImage(assetDraft.id, filename);
    const saved = await saveElementAsset({
      ...assetDraft,
      images: assetDraft.images.filter((image) => image.filename !== filename),
    });
    await reloadAssets(saved.id);
  }

  return (
    <section className="reference-settings-band element-reference-band">
      <div className="element-reference-heading">
        <div>
          <p className="eyebrow">Element References</p>
          <h2>附加元素参考</h2>
        </div>
        <button type="button" onClick={() => setLibraryOpen((value) => !value)}>
          <Library aria-hidden="true" />
          {libraryOpen ? "收起素材库" : "管理素材库"}
        </button>
      </div>

      <p className="helper-text">
        元素图只提供花卉、雕刻、纹理或结构灵感，产品主参考图始终拥有最高优先级。
      </p>

      {enabledAssets.length === 0 ? (
        <div className="element-empty">
          还没有元素素材。打开素材库，先建立一份可复用素材。
        </div>
      ) : (
        <ElementAssetPicker
          assets={assets}
          selectedIds={selectedIds}
          onToggle={toggleAsset}
        />
      )}

      {(project.elementSelections ?? []).length > 0 && (
        <div className="element-selection-list">
          {(project.elementSelections ?? []).map((selection) => {
            const asset = assets.find((item) => item.id === selection.assetId);
            if (!asset) return null;
            return (
              <details className="element-selection-card" key={selection.assetId}>
                <summary className="element-selection-title">
                  <strong>{asset.displayName}</strong>
                  <button
                    type="button"
                    className="danger icon-button"
                    title="从本产品移除"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleAsset(asset);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </summary>
                <div className="element-control-grid">
                  <label className="field">
                    <span>使用方式</span>
                    <select
                      value={selection.selectionMode}
                      onChange={(event) =>
                        updateSelection(asset.id, {
                          selectionMode: event.target.value as "required" | "random",
                        })
                      }
                    >
                      <option value="required">每次必选</option>
                      <option value="random">随机候选</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>融合方式</span>
                    <select
                      value={selection.fusionMode}
                      onChange={(event) =>
                        updateSelection(asset.id, {
                          fusionMode: event.target.value as ElementFusionMode,
                        })
                      }
                    >
                      {Object.entries(fusionLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>影响强度</span>
                    <select
                      value={selection.strength}
                      onChange={(event) =>
                        updateSelection(asset.id, {
                          strength: event.target.value as ElementInfluenceStrength,
                        })
                      }
                    >
                      {Object.entries(strengthLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>位置</span>
                    <input
                      value={selection.placement}
                      onChange={(event) =>
                        updateSelection(asset.id, { placement: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>数量</span>
                    <input
                      value={selection.quantity}
                      onChange={(event) =>
                        updateSelection(asset.id, { quantity: event.target.value })
                      }
                    />
                  </label>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {libraryOpen && (
        <div className="element-library">
          <div className="element-library-sidebar">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setAssetDraft(createEmptyAsset());
                setAssetIsNew(true);
                setStatus("");
              }}
            >
              <Plus aria-hidden="true" />
              新建素材
            </button>
            {assets.map((asset) => (
              <button
                type="button"
                key={asset.id}
                className={assetDraft?.id === asset.id ? "active" : ""}
                onClick={() => {
                  setAssetDraft(structuredClone(asset));
                  setAssetIsNew(false);
                  setStatus("");
                }}
              >
                {asset.displayName}
              </button>
            ))}
          </div>

          <div className="element-library-editor">
            {!assetDraft ? (
              <div className="element-empty">选择一个素材编辑，或新建素材。</div>
            ) : (
              <>
                <div className="element-editor-grid">
                  <label className="field">
                    <span>素材 ID</span>
                    <input
                      value={assetDraft.id}
                      disabled={!assetIsNew}
                      onChange={(event) =>
                        setAssetDraft({ ...assetDraft, id: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>素材标题</span>
                    <input
                      value={assetDraft.displayName}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          displayName: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>类别</span>
                    <select
                      value={assetDraft.category}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          category: event.target.value as ElementAssetCategory,
                        })
                      }
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>默认融合</span>
                    <select
                      value={assetDraft.defaultFusionMode}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          defaultFusionMode: event.target.value as ElementFusionMode,
                        })
                      }
                    >
                      {Object.entries(fusionLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>默认强度</span>
                    <select
                      value={assetDraft.defaultStrength}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          defaultStrength:
                            event.target.value as ElementInfluenceStrength,
                        })
                      }
                    >
                      {Object.entries(strengthLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>默认位置</span>
                    <input
                      value={assetDraft.defaultPlacement}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          defaultPlacement: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>默认数量</span>
                    <input
                      value={assetDraft.defaultQuantity}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          defaultQuantity: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={assetDraft.enabled}
                      onChange={(event) =>
                        setAssetDraft({
                          ...assetDraft,
                          enabled: event.target.checked,
                        })
                      }
                    />
                    <span>启用素材</span>
                  </label>
                </div>

                <label className="field">
                  <span>英文元素描述（写入提示词）</span>
                  <textarea
                    className="compact-textarea"
                    value={assetDraft.description}
                    placeholder="Example: a small sculpted magnolia blossom with softly layered petals..."
                    onChange={(event) =>
                      setAssetDraft({
                        ...assetDraft,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>避免内容（英文）</span>
                  <textarea
                    className="compact-textarea"
                    value={assetDraft.avoidPrompt}
                    onChange={(event) =>
                      setAssetDraft({
                        ...assetDraft,
                        avoidPrompt: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="element-editor-actions">
                  <button type="button" className="primary" onClick={() => void handleSaveAsset()}>
                    <Save aria-hidden="true" />
                    保存素材
                  </button>
                  {!assetIsNew && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        <ImagePlus aria-hidden="true" />
                        {uploading ? "上传中" : "上传元素图"}
                      </button>
                      <button type="button" className="danger" onClick={() => void handleDeleteAsset()}>
                        <Trash2 aria-hidden="true" />
                        删除素材
                      </button>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    hidden
                    onChange={(event) => void handleFiles(event.target.files)}
                  />
                </div>
                {status && <p className="save-status">{status}</p>}

                {assetDraft.images.length > 0 && (
                  <div className="element-image-grid">
                    {assetDraft.images.map((image) => (
                      <figure key={image.id}>
                        <img src={image.url} alt={image.originalName} />
                        <figcaption>{image.originalName}</figcaption>
                        <button
                          type="button"
                          className="danger icon-button"
                          title="删除图片"
                          onClick={() => void handleDeleteImage(image.filename)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}

                {!assetIsNew && (
                  <div className="element-history">
                    <div className="panel-title">
                      <History aria-hidden="true" />
                      <h3>素材检查点</h3>
                    </div>
                    {history.length === 0 ? (
                      <p className="helper-text">修改并保存后会自动保留旧版本。</p>
                    ) : (
                      history.slice(0, 8).map((checkpoint) => (
                        <div key={checkpoint.id}>
                          <span>{new Date(checkpoint.createdAt).toLocaleString("zh-CN")}</span>
                          <div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm("恢复这个素材检查点？")) return;
                                await restoreCheckpoint(
                                  "element_assets",
                                  assetDraft.id,
                                  checkpoint.id,
                                );
                                await reloadAssets(assetDraft.id);
                              }}
                            >
                              恢复
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={async () => {
                                await deleteCheckpoint(
                                  "element_assets",
                                  assetDraft.id,
                                  checkpoint.id,
                                );
                                setHistory(
                                  await fetchHistory("element_assets", assetDraft.id),
                                );
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function createEmptyAsset(): ElementReferenceAsset {
  const now = new Date().toISOString();
  return {
    id: "",
    displayName: "",
    category: "other",
    description: "",
    defaultFusionMode: "direct",
    defaultPlacement: "",
    defaultStrength: "medium",
    defaultQuantity: "one restrained element",
    avoidPrompt: "",
    images: [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}
