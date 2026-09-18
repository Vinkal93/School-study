import type { FeatureRegistryItem } from "@/types";
import {
  CENTRAL_FEATURE_REGISTRY,
  toFeatureRegistryItem,
  getAllCentralFeatures,
  getCentralFeature,
  CentralFeatureDefinition,
  FeatureStatus,
  FeatureVisibility,
  FeatureCategory,
} from "./centralRegistry";

export {
  CENTRAL_FEATURE_REGISTRY,
  getAllCentralFeatures,
  getCentralFeature,
};
export type { CentralFeatureDefinition, FeatureStatus, FeatureVisibility, FeatureCategory };

/**
 * Standard Feature Registry Catalog
 * Authoritative system capabilities definition derived directly from CENTRAL_FEATURE_REGISTRY
 * Single Source of Truth across Plan Editor, Feature Control, and Sidebar.
 */
export const FEATURE_REGISTRY: FeatureRegistryItem[] = CENTRAL_FEATURE_REGISTRY.map(toFeatureRegistryItem);


/**
 * Returns all active feature registry items sorted by sortOrder.
 */
export function getAllFeatureRegistry(): FeatureRegistryItem[] {
  return [...FEATURE_REGISTRY].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Returns features grouped by category.
 */
export function getFeatureRegistryByCategory(): Record<string, FeatureRegistryItem[]> {
  const grouped: Record<string, FeatureRegistryItem[]> = {};
  for (const item of FEATURE_REGISTRY) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  return grouped;
}

/**
 * Validates feature keys against known registry.
 * Returns valid sanitized keys.
 */
export function sanitizeFeatureKeys(keys: string[]): string[] {
  const validKeys = new Set(FEATURE_REGISTRY.map((f) => f.key));
  return Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
}

/**
 * Resolves a feature key to its human-readable display name.
 */
export function getFeatureDisplayName(key: string): string {
  const item = FEATURE_REGISTRY.find((f) => f.key === key);
  if (item) return item.displayName;
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
