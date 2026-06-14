import { Library, RefreshCw } from "lucide-react";
import { ElementAssetPicker } from "./ElementAssetPicker";
import type {
  ElementFusionMode,
  ElementInfluenceStrength,
  ElementReferenceAsset,
  ElementReferenceUsageMode,
  ProductElementSelection,
} from "./domain/schema";

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

export function TextElementSelector({
  assets,
  selections,
  usageMode,
  disabled,
  onSelectionsChange,
  onUsageModeChange,
  onReroll,
  onManage,
}: {
  assets: ElementReferenceAsset[];
  selections: ProductElementSelection[];
  usageMode: ElementReferenceUsageMode;
  disabled: boolean;
  onSelectionsChange: (selections: ProductElementSelection[]) => void;
  onUsageModeChange: (mode: ElementReferenceUsageMode) => void;
  onReroll: () => void;
  onManage: () => void;
}) {
  const selectedIds = new Set(selections.map((selection) => selection.assetId));

  function toggle(asset: ElementReferenceAsset) {
    if (selectedIds.has(asset.id)) {
      onSelectionsChange(
        selections.filter((selection) => selection.assetId !== asset.id),
      );
      return;
    }
    onSelectionsChange([
      ...selections,
      {
        assetId: asset.id,
        selectionMode: "required",
        fusionMode: asset.defaultFusionMode,
        placement: asset.defaultPlacement,
        strength: asset.defaultStrength,
        quantity: asset.defaultQuantity,
      },
    ]);
  }

  function update(
    assetId: string,
    patch: Partial<ProductElementSelection>,
  ) {
    onSelectionsChange(
      selections.map((selection) =>
        selection.assetId === assetId ? { ...selection, ...patch } : selection,
      ),
    );
  }

  return (
    <section className={`panel text-element-panel${disabled ? " disabled" : ""}`}>
      <div className="panel-title">
        <Library aria-hidden="true" />
        <h2>附加元素</h2>
      </div>

      <label className="field">
        <span>素材图使用方式</span>
        <select
          value={usageMode}
          disabled={disabled}
          onChange={(event) =>
            onUsageModeChange(event.target.value as ElementReferenceUsageMode)
          }
        >
          <option value="text_only">仅使用文字描述</option>
          <option value="upload_images">文字 + 同时上传素材图</option>
        </select>
      </label>

      <ElementAssetPicker
        assets={assets}
        selectedIds={selectedIds}
        disabled={disabled}
        onToggle={toggle}
      />

      {selections.map((selection) => {
        const asset = assets.find((item) => item.id === selection.assetId);
        if (!asset) return null;
        return (
          <details className="text-element-detail" key={selection.assetId}>
            <summary>{asset.displayName}</summary>
            <div className="text-element-controls">
              <label className="field">
                <span>使用方式</span>
                <select
                  value={selection.selectionMode}
                  disabled={disabled}
                  onChange={(event) =>
                    update(asset.id, {
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
                  disabled={disabled}
                  onChange={(event) =>
                    update(asset.id, {
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
                  disabled={disabled}
                  onChange={(event) =>
                    update(asset.id, {
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
                  disabled={disabled}
                  onChange={(event) =>
                    update(asset.id, { placement: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>数量</span>
                <input
                  value={selection.quantity}
                  disabled={disabled}
                  onChange={(event) =>
                    update(asset.id, { quantity: event.target.value })
                  }
                />
              </label>
            </div>
          </details>
        );
      })}

      {usageMode === "upload_images" && selections.length > 0 && (
        <p className="technical-mode-note">
          复制提示词后，还需在生图平台上传本次实际选中的元素图片。
        </p>
      )}

      <div className="text-element-actions">
        <button type="button" onClick={onManage}>
          <Library aria-hidden="true" />
          管理素材库
        </button>
        {selections.some((selection) => selection.selectionMode === "random") && (
          <button type="button" disabled={disabled} onClick={onReroll}>
            <RefreshCw aria-hidden="true" />
            重选随机元素
          </button>
        )}
      </div>
    </section>
  );
}
