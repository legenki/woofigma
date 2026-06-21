import type { FigmaEffect } from "../types";
import { cssColorToFigmaColor } from "./color";

/**
 * Parse a CSS box-shadow value and convert it to Figma effects
 * Supports multiple shadows separated by commas
 * Format: [inset] <offset-x> <offset-y> [blur-radius] [spread-radius] [color]
 *
 * @param boxShadow - The CSS box-shadow value to parse.
 * @returns An array of Figma effects.
 */
export function cssBoxShadowToFigmaEffects(
  boxShadow: string
): Array<FigmaEffect> {
  if (!boxShadow || boxShadow === "none") {
    return [];
  }

  const effects: Array<FigmaEffect> = [];

  // Properly split by comma, respecting parentheses
  const shadows: Array<string> = [];
  let currentShadow = "";
  let parenDepth = 0;

  for (const char of boxShadow) {
    if (char === "(") {
      parenDepth += 1;
      currentShadow += char;
    } else if (char === ")") {
      parenDepth -= 1;
      currentShadow += char;
    } else if (char === "," && parenDepth === 0) {
      if (currentShadow.trim()) {
        shadows.push(currentShadow.trim());
      }
      currentShadow = "";
    } else {
      currentShadow += char;
    }
  }
  if (currentShadow.trim()) {
    shadows.push(currentShadow.trim());
  }

  for (const shadow of shadows) {
    const effect = parseSingleBoxShadow(shadow);

    if (effect) {
      effects.push(effect);
    }
  }

  return effects;
}

/**
 * Parses a single box shadow string and converts it to a Figma effect.
 * @param shadow - The box shadow string to parse.
 * @returns A Figma effect, or null if the string is invalid.
 */
function parseSingleBoxShadow(shadow: string): FigmaEffect | null {
  // Check if it's an inset shadow
  const isInset = shadow.includes("inset");
  const cleanShadow = shadow.replace(/inset/gi, "").trim();

  // Regular expression to match shadow values
  // Matches: offset-x offset-y [blur] [spread] [color]
  const parts: Array<string> = [];
  let currentPart = "";
  let inFunction = 0;

  for (const char of cleanShadow) {
    if (char === "(") {
      inFunction += 1;
      currentPart += char;
    } else if (char === ")") {
      inFunction -= 1;
      currentPart += char;
    } else if (char === " " && inFunction === 0 && currentPart) {
      parts.push(currentPart);
      currentPart = "";
    } else {
      currentPart += char;
    }
  }
  // biome-ignore lint/nursery/noUnnecessaryConditions: false positive
  if (currentPart) {
    parts.push(currentPart);
  }

  // Parse the parts
  const values: Array<number> = [];
  let colorString = "";

  for (const part of parts) {
    // Try to parse as number with unit
    const numMatch = /^(-?\d*\.?\d+)(px|em|rem)?$/.exec(part);
    if (numMatch?.[1] && values.length < 4) {
      values.push(Number.parseFloat(numMatch[1]));
    } else {
      // Assume it's a color
      // biome-ignore lint/nursery/noUnnecessaryConditions: false positive
      colorString = colorString ? `${colorString} ${part}` : part;
    }
  }

  if (values.length < 2) {
    return null; // Need at least offset-x and offset-y
  }

  const offsetX = values[0] ?? 0;
  const offsetY = values[1] ?? 0;
  const blurRadius = values[2] ?? 0;
  const spreadRadius = values[3] ?? 0;
  const color = cssColorToFigmaColor(colorString);

  // Skip shadows with no visual effect (0 offset, 0 blur, 0 spread, and transparent)
  if (
    offsetX === 0 &&
    offsetY === 0 &&
    blurRadius === 0 &&
    spreadRadius === 0 &&
    !color
  ) {
    return null;
  }

  return {
    type: isInset ? "INNER_SHADOW" : "DROP_SHADOW",
    visible: true,
    blendMode: "NORMAL",
    color: {
      r: color?.color.r ?? 0,
      g: color?.color.g ?? 0,
      b: color?.color.b ?? 0,
      a: color?.opacity ?? 1,
    },
    offset: {
      x: offsetX,
      y: offsetY,
    },
    radius: Math.max(0, blurRadius),
    spread: spreadRadius,
    showShadowBehindNode: false,
  };
}
