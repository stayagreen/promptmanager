import { useMemo, useState } from "react";
import { ChevronDown, Library, Search, X } from "lucide-react";
import type {
  ElementAssetCategory,
  ElementReferenceAsset,
} from "./domain/schema";

const categoryLabels: Record<ElementAssetCategory, string> = {
  flower: "花卉植物",
  animal: "动物形象",
  carving: "雕刻装饰",
  texture: "纹理材质",
  hardware: "五金构件",
  structure: "结构造型",
  other: "其他",
};

export function ElementAssetPicker({
  assets,
  selectedIds,
  disabled = false,
  onToggle,
}: {
  assets: ElementReferenceAsset[];
  selectedIds: Set<string>;
  disabled?: boolean;
  onToggle: (asset: ElementReferenceAsset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ElementAssetCategory>("all");
  const enabledAssets = assets.filter((asset) => asset.enabled);
  const selectedAssets = enabledAssets.filter((asset) => selectedIds.has(asset.id));
  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return enabledAssets.filter(
      (asset) =>
        (category === "all" || asset.category === category) &&
        (!normalizedQuery ||
          asset.displayName.toLowerCase().includes(normalizedQuery) ||
          asset.id.toLowerCase().includes(normalizedQuery) ||
          asset.description.toLowerCase().includes(normalizedQuery)),
    );
  }, [category, enabledAssets, query]);

  if (enabledAssets.length === 0) {
    return <p className="helper-text">素材库为空，请先新增元素素材。</p>;
  }

  return (
    <div className="element-asset-picker">
      <button
        type="button"
        className="element-picker-trigger"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Library aria-hidden="true" />
        <span>
          {selectedAssets.length > 0
            ? `已选 ${selectedAssets.length} 个元素`
            : `选择元素（共 ${enabledAssets.length} 个）`}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>

      {selectedAssets.length > 0 && (
        <div className="element-selected-chips">
          {selectedAssets.map((asset) => (
            <button
              type="button"
              key={asset.id}
              disabled={disabled}
              title={`移除 ${asset.displayName}`}
              onClick={() => onToggle(asset)}
            >
              {asset.displayName}
              <X aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="element-picker-drawer">
          <div className="element-picker-filters">
            <label>
              <Search aria-hidden="true" />
              <input
                value={query}
                placeholder="搜索名称或描述"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="元素分类"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as "all" | ElementAssetCategory)
              }
            >
              <option value="all">全部分类</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="element-picker-results">
            {filteredAssets.length === 0 ? (
              <p className="helper-text">没有匹配的元素。</p>
            ) : (
              filteredAssets.map((asset) => (
                <label key={asset.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(asset.id)}
                    onChange={() => onToggle(asset)}
                  />
                  {asset.images[0] ? (
                    <img src={asset.images[0].url} alt="" />
                  ) : (
                    <span className="element-placeholder"><Library /></span>
                  )}
                  <span>
                    <strong>{asset.displayName}</strong>
                    <small>{categoryLabels[asset.category]}</small>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
