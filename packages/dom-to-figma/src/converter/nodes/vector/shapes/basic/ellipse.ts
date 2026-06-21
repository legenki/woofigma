/**
 * Converts an ellipse element to an SVG path string.
 *
 * The ellipse is represented using two elliptical arc commands (A) with different
 * x and y radii. When rx equals ry, this produces a circle.
 *
 * @param cx - The x-coordinate of the ellipse's center
 * @param cy - The y-coordinate of the ellipse's center
 * @param rx - The horizontal radius (semi-major/minor axis)
 * @param ry - The vertical radius (semi-major/minor axis)
 * @returns SVG path string representing the ellipse
 *
 * @example
 * ```typescript
 * const path = ellipseToPath(50, 50, 30, 20);
 * // Returns: "M20 50 A30 20 0 0 1 80 50 A30 20 0 0 1 20 50"
 * ```
 */
export function ellipseToPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number
): string {
  const left = cx - rx;
  const right = cx + rx;
  return `M${left} ${cy} A${rx} ${ry} 0 0 1 ${right} ${cy} A${rx} ${ry} 0 0 1 ${left} ${cy}`;
}
