/**
 * Converts a rectangle element to an SVG path string.
 *
 * Supports both sharp-cornered and rounded rectangles. For rounded corners,
 * the function automatically clamps corner radii to prevent invalid geometry
 * (radii cannot exceed half the width or height).
 *
 * @param x - The x-coordinate of the top-left corner
 * @param y - The y-coordinate of the top-left corner
 * @param width - The width of the rectangle
 * @param height - The height of the rectangle
 * @param rx - The horizontal radius for rounded corners (default: 0)
 * @param ry - The vertical radius for rounded corners (default: 0)
 * @returns SVG path string representing the rectangle
 *
 * @example
 * ```typescript
 * // Sharp rectangle
 * const sharpRect = rectToPath(10, 10, 100, 50);
 * // Returns: "M10 10 H110 V60 H10 Z"
 *
 * // Rounded rectangle
 * const roundedRect = rectToPath(10, 10, 100, 50, 5, 5);
 * // Returns complex path with arc commands for rounded corners
 * ```
 */
export function rectToPath(
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0,
  ry = 0
): string {
  if (rx === 0 && ry === 0) {
    return `M${x} ${y} H${x + width} V${y + height} H${x} Z`;
  }

  // Clamp radii to prevent invalid geometry
  const clampedRx = Math.min(rx, width / 2);
  const clampedRy = Math.min(ry, height / 2);

  return `M${x + clampedRx} ${y} H${x + width - clampedRx} A${clampedRx} ${clampedRy} 0 0 1 ${x + width} ${
    y + clampedRy
  } V${y + height - clampedRy} A${clampedRx} ${clampedRy} 0 0 1 ${x + width - clampedRx} ${y + height} H${
    x + clampedRx
  } A${clampedRx} ${clampedRy} 0 0 1 ${x} ${y + height - clampedRy} V${y + clampedRy} A${clampedRx} ${clampedRy} 0 0 1 ${x + clampedRx} ${y} Z`;
}
