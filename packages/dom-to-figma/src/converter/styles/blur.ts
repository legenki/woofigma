import type { FigmaBlurEffect } from "../types/effects";

/**
 * Parse CSS filter property and convert blur effects to Figma effects
 * @param filter - The CSS filter value to parse.
 * @returns An array of Figma effects.
 */
export function cssFilterToFigmaEffects(
  filter: string
): Array<FigmaBlurEffect> {
  if (!filter || filter === "none") {
    return [];
  }

  const effects: Array<FigmaBlurEffect> = [];

  // Match blur() functions in the filter
  const blurMatches = filter.match(/blur\(([^)]+)\)/g);

  if (blurMatches) {
    for (const blurMatch of blurMatches) {
      const blurValueMatch = /blur\(([^)]+)\)/.exec(blurMatch);
      if (blurValueMatch?.[1]) {
        const blurValueStr = blurValueMatch[1];
        // Parse value and remove 'px' unit if present
        const blurValue = Number.parseFloat(blurValueStr);

        if (!Number.isNaN(blurValue) && blurValue > 0) {
          const effect: FigmaBlurEffect = {
            type: "FOREGROUND_BLUR",
            visible: true,
            radius: blurValue,
          };
          effects.push(effect);
        }
      }
    }
  }

  return effects;
}

/**
 * Parse CSS backdrop-filter property and convert blur effects to Figma effects
 * @param backdropFilter - The CSS backdrop-filter value to parse.
 * @returns An array of Figma effects.
 */
export function cssBackdropFilterToFigmaEffects(
  backdropFilter: string
): Array<FigmaBlurEffect> {
  if (!backdropFilter || backdropFilter === "none") {
    return [];
  }

  const effects: Array<FigmaBlurEffect> = [];

  // Match blur() functions in the backdrop-filter
  const blurMatches = backdropFilter.match(/blur\(([^)]+)\)/g);

  if (blurMatches) {
    for (const blurMatch of blurMatches) {
      const blurValueMatch = /blur\(([^)]+)\)/.exec(blurMatch);
      if (blurValueMatch?.[1]) {
        const blurValueStr = blurValueMatch[1];
        // Parse value and remove 'px' unit if present
        const blurValue = Number.parseFloat(blurValueStr);

        if (!Number.isNaN(blurValue) && blurValue > 0) {
          const effect: FigmaBlurEffect = {
            type: "BACKGROUND_BLUR",
            visible: true,
            radius: blurValue,
          };
          effects.push(effect);
        }
      }
    }
  }

  return effects;
}
