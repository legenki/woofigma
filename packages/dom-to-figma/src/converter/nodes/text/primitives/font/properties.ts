/**
 * Font Properties Primitives
 *
 * Low-level CSS font property parsing and normalization utilities.
 * Handles conversion of CSS font values to standardized font properties.
 *
 * @module FontPropertiesPrimitives
 */

export type { FontProperties } from "./loader";

/**
 * CSS font weight keyword mappings
 *
 * Maps CSS font-weight keywords to their numeric equivalents
 * according to CSS specifications.
 *
 * @internal
 */
const CSS_WEIGHT_KEYWORDS: Record<string, number> = {
  normal: 400,
  bold: 700,
  lighter: 300,
  bolder: 600,
  thin: 100,
  light: 300,
  medium: 500,
  semibold: 600,
  heavy: 800,
  black: 900,
  // Additional weight variations
  ultralight: 100,
  extralight: 200,
  semilight: 350,
  demibold: 600,
  semiheavy: 750,
  extrabold: 800,
  ultrabold: 900,
};

/**
 * Parse CSS font properties from computed styles
 *
 * Converts CSS font property values to normalized FontProperties object.
 * Handles all CSS font-weight formats (keywords and numeric values),
 * font-family lists, and font-style variations.
 *
 * @param fontFamily - CSS font-family value (comma-separated list)
 * @param fontWeight - CSS font-weight value (keyword or number)
 * @param fontStyle - CSS font-style value (defaults to "normal")
 * @returns Normalized font properties ready for font loading
 *
 * @example
 * ```typescript
 * // Parse from computed styles
 * const props1 = parseFontProperties('Nunito, sans-serif', '700', 'italic');
 * // Returns: { family: 'Nunito', weight: 700, italic: true }
 *
 * // Handle keyword weights
 * const props2 = parseFontProperties('Arial', 'bold', 'normal');
 * // Returns: { family: 'Arial', weight: 700, italic: false }
 *
 * // Handle numeric weights
 * const props3 = parseFontProperties('"Times New Roman"', 600);
 * // Returns: { family: 'Times New Roman', weight: 600, italic: false }
 * ```
 */
export function parseFontProperties(
  fontFamily: string,
  fontWeight: string | number,
  fontStyle: string
) {
  return {
    family: parseFontFamily(fontFamily),
    weight: parseFontWeight(fontWeight),
    italic: parseFontStyle(fontStyle),
  };
}

/**
 * Parse CSS font-family value
 *
 * Extracts the first font family from a CSS font-family list,
 * handling quoted names and fallback families correctly.
 *
 * @param fontFamily - CSS font-family value
 * @returns Primary font family name, cleaned of quotes
 *
 * @example
 * ```typescript
 * parseFontFamily('Nunito, sans-serif'); // 'Nunito'
 * parseFontFamily('"Times New Roman", serif'); // 'Times New Roman'
 * parseFontFamily('Arial'); // 'Arial'
 * parseFontFamily(''); // 'Nunito' (fallback)
 * ```
 */
function parseFontFamily(fontFamily: string): string {
  if (!fontFamily || fontFamily.trim() === "") {
    return "Nunito"; // Default fallback
  }

  // Split by comma to handle font stacks
  const families = fontFamily.split(",");

  // Take the first family and clean it up
  const primaryFamily = families[0]?.trim() ?? "Nunito";

  // Remove quotes (single or double) and extra whitespace
  return primaryFamily.replace(/^["']|["']$/g, "").trim() || "Nunito";
}

/**
 * Parse CSS font-weight value
 *
 * Converts CSS font-weight values (both keywords and numbers) to
 * normalized numeric weight values. Handles all CSS font-weight
 * keywords and validates numeric ranges.
 *
 * @param fontWeight - CSS font-weight value (keyword, number, or string number)
 * @returns Numeric font weight (100-900)
 *
 * @example
 * ```typescript
 * parseFontWeight('normal'); // 400
 * parseFontWeight('bold'); // 700
 * parseFontWeight('600'); // 600
 * parseFontWeight(500); // 500
 * parseFontWeight('invalid'); // 400 (fallback)
 * ```
 */
function parseFontWeight(fontWeight: string | number): number {
  // Handle numeric input
  if (typeof fontWeight === "number") {
    return clampFontWeight(fontWeight);
  }

  // Handle string input
  if (typeof fontWeight === "string") {
    // Try to parse as number first
    const numericWeight = Number.parseInt(fontWeight.trim(), 10);
    if (!Number.isNaN(numericWeight)) {
      return clampFontWeight(numericWeight);
    }

    // Handle keyword weights
    const keyword = fontWeight.toLowerCase().trim();
    const keywordWeight = CSS_WEIGHT_KEYWORDS[keyword];

    if (keywordWeight !== undefined) {
      return keywordWeight;
    }
  }

  // Fallback to normal weight
  return 400;
}

/**
 * Parse CSS font-style value
 *
 * Determines if font style indicates italic rendering.
 * Handles all CSS font-style values including italic and oblique.
 *
 * @param fontStyle - CSS font-style value
 * @returns True if font should be rendered in italic
 *
 * @example
 * ```typescript
 * parseFontStyle('normal'); // false
 * parseFontStyle('italic'); // true
 * parseFontStyle('oblique'); // true
 * parseFontStyle('oblique 15deg'); // true
 * ```
 */
function parseFontStyle(fontStyle: string): boolean {
  if (!fontStyle || typeof fontStyle !== "string") {
    return false;
  }

  const style = fontStyle.toLowerCase().trim();

  // Handle italic variations
  return style.includes("italic") || style.includes("oblique");
}

/**
 * Clamp font weight to valid CSS range
 *
 * Ensures font weight values are within the valid CSS range (100-900)
 * and rounds to the nearest valid weight step.
 *
 * @param weight - Raw numeric weight value
 * @returns Clamped and rounded weight value
 *
 * @internal
 */
function clampFontWeight(weight: number): number {
  // Clamp to valid range
  const clamped = Math.max(100, Math.min(900, weight));

  // Round to nearest 100 for standard weights
  return Math.round(clamped / 100) * 100;
}
