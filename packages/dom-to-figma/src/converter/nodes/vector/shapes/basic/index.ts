/**
 * @fileoverview Basic SVG shape to path conversion functions.
 *
 * This module provides utilities to convert basic SVG shapes (circle, ellipse,
 * rectangle, line, polyline, polygon) into equivalent SVG path strings. This is
 * useful for:
 * - Normalizing different SVG shape representations
 * - Converting shapes before vector network processing
 * - Ensuring consistent path-based handling of all shapes
 */

export { circleToPath } from "./circle";
export { ellipseToPath } from "./ellipse";
export { lineToPath } from "./line";
export { polygonToPath, polylineToPath } from "./polygon";
export { rectToPath } from "./rect";
