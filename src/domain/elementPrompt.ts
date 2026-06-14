import type {
  ElementReferenceAsset,
  ProductElementSelection,
} from "./schema";

export function resolveElementAssets(
  selections: ProductElementSelection[],
  assets: ElementReferenceAsset[],
  seed: string,
): ElementReferenceAsset[] {
  const activeAssets = new Map(
    assets.filter((asset) => asset.enabled).map((asset) => [asset.id, asset]),
  );
  const required = selections
    .filter((selection) => selection.selectionMode === "required")
    .map((selection) => activeAssets.get(selection.assetId))
    .filter((asset): asset is ElementReferenceAsset => Boolean(asset));
  const randomCandidates = selections
    .filter((selection) => selection.selectionMode === "random")
    .map((selection) => activeAssets.get(selection.assetId))
    .filter((asset): asset is ElementReferenceAsset => Boolean(asset));

  if (randomCandidates.length === 0) return required;
  const selected = randomCandidates[stableHash(seed) % randomCandidates.length];
  return [...required, selected];
}

export function buildElementItems(
  selections: ProductElementSelection[],
  resolvedAssets: ElementReferenceAsset[],
): string {
  const selectionMap = new Map(
    selections.map((selection) => [selection.assetId, selection]),
  );
  return resolvedAssets
    .map((asset, index) => {
      const selection = selectionMap.get(asset.id);
      if (!selection) return "";
      const fusionRule =
        selection.fusionMode === "abstract"
          ? "ABSTRACT INSPIRATION: extract only its geometry, rhythm, contour language, or visual motif. Do not literally attach or copy the donor object."
          : selection.fusionMode === "texture"
            ? "TEXTURE ONLY: borrow only surface texture, material feeling, color variation, or finish. Do not reproduce the literal flower, animal, carving, or donor object."
            : "DIRECT ELEMENT: integrate the recognizable element itself as a restrained product detail, ornament, or scene accessory. Do not copy the entire donor object.";
      return `ELEMENT E${index + 1} — ${asset.displayName}
Reference images: ${asset.images.length > 0 ? asset.images.map((image) => image.originalName).join(", ") : "no image stored; follow the written description"}
Description: ${asset.description}
Fusion: ${fusionRule}
Placement: ${selection.placement || asset.defaultPlacement || "choose a structurally plausible secondary location"}
Influence strength: ${selection.strength}
Quantity: ${selection.quantity || asset.defaultQuantity || "use sparingly"}
Avoid: ${asset.avoidPrompt || "avoid visual clutter, pasted-on decoration, and damage to functional structure"}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
