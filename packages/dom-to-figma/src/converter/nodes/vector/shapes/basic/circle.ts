/**
 * Converts a circle element to an SVG path string.
 *
 * The circle is represented using two semicircular arc commands (A) that together
 * form a complete circle. This approach ensures proper handling of stroke caps
 * and other path-specific properties.
 *
 * @param cx - The x-coordinate of the circle's center
 * @param cy - The y-coordinate of the circle's center
 * @param r - The radius of the circle
 * @returns SVG path string representing the circle
 *
 * @example
 * ```typescript
 * const path = circleToPath(50, 50, 25);
 * // Returns: "M25 50 A25 25 0 0 1 75 50 A25 25 0 0 1 25 50"
 * ```
 */
export function circleToPath(cx: number, cy: number, r: number): string {
  const left = cx - r;
  const right = cx + r;
  return `M${left} ${cy} A${r} ${r} 0 0 1 ${right} ${cy} A${r} ${r} 0 0 1 ${left} ${cy}`;
}
