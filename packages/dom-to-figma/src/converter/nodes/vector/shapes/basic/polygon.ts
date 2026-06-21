/**
 * Converts a polyline element to an SVG path string.
 *
 * Parses a points string (space or comma-separated coordinates) and creates
 * a path with line segments connecting all points. The polyline remains open
 * (does not automatically close back to the starting point).
 *
 * @param points - String containing coordinate pairs, e.g., "10,20 30,40 50,60"
 * @returns SVG path string representing the polyline, or empty string if insufficient points
 *
 * @example
 * ```typescript
 * const path = polylineToPath("10,20 30,40 50,60");
 * // Returns: "M10 20 L30 40 L50 60"
 *
 * const emptyPath = polylineToPath("10,20"); // Only one point
 * // Returns: ""
 * ```
 */
export function polylineToPath(points: string): string {
  const coords = points
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  // Need at least 2 points (4 coordinates) for a valid polyline
  if (coords.length < 4) {
    return "";
  }

  let path = `M${coords[0]} ${coords[1]}`;
  for (let i = 2; i < coords.length; i += 2) {
    path += ` L${coords[i]} ${coords[i + 1]}`;
  }
  return path;
}

/**
 * Converts a polygon element to an SVG path string.
 *
 * Similar to polylineToPath but automatically closes the shape by adding
 * a closepath (Z) command, creating a closed polygon.
 *
 * @param points - String containing coordinate pairs, e.g., "10,20 30,40 50,60"
 * @returns SVG path string representing the closed polygon
 *
 * @example
 * ```typescript
 * const path = polygonToPath("10,20 30,40 50,60");
 * // Returns: "M10 20 L30 40 L50 60 Z"
 * ```
 */
export function polygonToPath(points: string): string {
  return `${polylineToPath(points)} Z`;
}
