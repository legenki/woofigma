/**
 * Scales a stroke weight based on the average scale factor
 */
export function scaleStrokeWeight(
  originalWeight: number,
  avgScaleFactor: number
): number {
  // Ensure minimum stroke weight of 0.1
  return Math.max(0.1, originalWeight * avgScaleFactor);
}

/**
 * Scales a dash array pattern based on the average scale factor
 */
export function scaleDashArray(
  originalDashArray: string,
  avgScaleFactor: number
): string | undefined {
  if (!originalDashArray || originalDashArray === "none") {
    return;
  }

  // Parse the dash array values
  const dashValues = parseDashArray(originalDashArray);

  if (dashValues.length === 0) {
    return;
  }

  // Scale each dash value
  const scaledValues = dashValues.map((value) =>
    (value * avgScaleFactor).toFixed(2)
  );

  return scaledValues.join(",");
}

/**
 * Parses a dash array string into numeric values
 */
function parseDashArray(dashArray: string): Array<number> {
  return dashArray
    .trim()
    .split(/[\s,]+/)
    .map((v) => Number.parseFloat(v.trim()))
    .filter((v) => !Number.isNaN(v) && v >= 0);
}
