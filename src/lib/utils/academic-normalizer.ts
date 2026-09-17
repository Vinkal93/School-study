/**
 * ACADEMIC NORMALIZER UTILITY
 * 
 * Provides canonical normalization and deterministic matching for:
 * 1. Class Names (e.g., "class 1", "Class 1", "GRADE 1", "Std 1", "1st" -> "Class 1")
 * 2. Section Names (e.g., "A", "Section A", "sec-a", "a" -> "Section A")
 * 3. Gender (e.g., "M", "male", "Boy" -> "male")
 * 4. Deterministic academic sorting order
 */

export interface NormalizedClassInfo {
  canonicalName: string;
  canonicalKey: string;
  order: number;
}

export interface NormalizedSectionInfo {
  canonicalName: string;
  canonicalKey: string;
  shortCode: string;
}

/**
 * Standard class hierarchy ordering map
 */
const CANONICAL_ORDER_MAP: Record<string, number> = {
  playgroup: 1,
  nursery: 2,
  lkg: 3,
  ukg: 4,
  prep: 5,
  class_1: 10,
  class_2: 20,
  class_3: 30,
  class_4: 40,
  class_5: 50,
  class_6: 60,
  class_7: 70,
  class_8: 80,
  class_9: 90,
  class_10: 100,
  class_11: 110,
  class_12: 120,
};

/**
 * Normalizes any class string into a canonical, human-friendly display name.
 * Examples:
 * - "class 1", "CLASS 1", "Grade 1", "1st", "std 1", "01" -> "Class 1"
 * - "lkg", "L.K.G.", "lower kg" -> "LKG"
 * - "ukg", "U.K.G.", "upper kg" -> "UKG"
 * - "nursery" -> "Nursery"
 */
export function normalizeClassName(rawName: string | undefined | null): string {
  if (!rawName) return "Class 1";

  const clean = String(rawName).trim();
  if (!clean) return "Class 1";

  const lower = clean.toLowerCase();

  // 1. Check Kindergarten / Pre-primary
  if (lower.match(/^(nur|nursery)/)) return "Nursery";
  if (lower.match(/^(lkg|l\.k\.g|lower\s*kg)/)) return "LKG";
  if (lower.match(/^(ukg|u\.k\.g|upper\s*kg)/)) return "UKG";
  if (lower.match(/^(prep|pre-primary|pre\s*primary)/)) return "Prep";
  if (lower.match(/^(play|playgroup|play\s*group)/)) return "Playgroup";

  // 2. Extract numeric grade if present (e.g. "Class 1", "Grade 2", "3rd", "Std 4", "05", "Class-6")
  const numericMatch = lower.match(/(?:class|grade|std|standard|\b)?[\s\-_]*0*([1-9]|1[0-2])(?:\s*(?:st|nd|rd|th))?\b/);
  if (numericMatch && numericMatch[1]) {
    const gradeNum = parseInt(numericMatch[1], 10);
    if (gradeNum >= 1 && gradeNum <= 12) {
      return `Class ${gradeNum}`;
    }
  }

  // 3. Fallback: Title Case capitalization
  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Returns a unique, stable canonical key for class grouping & deduplication.
 * E.g., "Class 1", "class 1", "grade 1", "1st" -> "class_1"
 */
export function getCanonicalClassKey(rawName: string | undefined | null): string {
  if (!rawName) return "class_1";

  const normalized = normalizeClassName(rawName);
  const lower = normalized.toLowerCase();

  if (lower === "nursery") return "nursery";
  if (lower === "lkg") return "lkg";
  if (lower === "ukg") return "ukg";
  if (lower === "prep") return "prep";
  if (lower === "playgroup") return "playgroup";

  const match = lower.match(/class\s+(\d+)/);
  if (match && match[1]) {
    return `class_${match[1]}`;
  }

  return lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/**
 * Returns a logical sorting order index for the class.
 */
export function getCanonicalClassOrder(rawName: string | undefined | null): number {
  const key = getCanonicalClassKey(rawName);
  if (CANONICAL_ORDER_MAP[key] !== undefined) {
    return CANONICAL_ORDER_MAP[key];
  }
  return 999;
}

/**
 * Returns short section code: "A", "B", "C", etc.
 */
export function getCanonicalSectionCode(rawSection: string | undefined | null): string {
  if (!rawSection) return "A";
  let clean = String(rawSection).trim();
  if (!clean) return "A";

  // Strip leading "Section", "Sec", "Sec." or "Sec-"
  clean = clean.replace(/^(?:section|sec\.?)\s*[-_:]*\s*/i, "").trim();

  // If remaining starts with alphanumeric identifier, return that code
  const match = clean.match(/^[a-zA-Z0-9]+/);
  if (match) {
    return match[0].toUpperCase();
  }

  return clean.toUpperCase() || "A";
}

/**
 * Normalizes section input into canonical full name ("Section A").
 */
export function normalizeSectionName(rawSection: string | undefined | null): string {
  const code = getCanonicalSectionCode(rawSection);
  return `Section ${code}`;
}

/**
 * Returns canonical section key for deduplication.
 */
export function getCanonicalSectionKey(rawSection: string | undefined | null): string {
  return getCanonicalSectionCode(rawSection).toLowerCase();
}

/**
 * Normalizes gender values from spreadsheets or forms into "male" | "female" | "other".
 */
export function normalizeGender(rawGender: any): "male" | "female" | "other" {
  if (!rawGender) return "male";
  const str = String(rawGender).trim().toLowerCase();
  if (str === "m" || str === "male" || str === "boy") return "male";
  if (str === "f" || str === "female" || str === "girl") return "female";
  return "other";
}

/**
 * Checks if two class names represent the exact same canonical class.
 */
export function isMatchingClass(nameA: string | undefined | null, nameB: string | undefined | null): boolean {
  if (!nameA || !nameB) return false;
  return getCanonicalClassKey(nameA) === getCanonicalClassKey(nameB);
}

/**
 * Checks if two section names represent the exact same canonical section.
 */
export function isMatchingSection(secA: string | undefined | null, secB: string | undefined | null): boolean {
  if (!secA || !secB) return false;
  return getCanonicalSectionKey(secA) === getCanonicalSectionKey(secB);
}
