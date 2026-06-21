/**
 * @fileoverview SVG shape conversion utilities.
 *
 * This module provides a unified interface for converting various SVG shape elements
 * (circle, ellipse, rect, line, polyline, polygon, path) into standardized SVG path strings.
 * It serves as the main entry point for shape-to-path conversion in the vector graphics
 * processing pipeline.
 */

/** biome-ignore-all lint/style/noExportedImports: kept when migrating to biome */

import {
  circleToPath,
  ellipseToPath,
  lineToPath,
  polygonToPath,
  polylineToPath,
  rectToPath,
} from "./basic";
// Re-export all basic shape conversion functions

/**
 * Converts any supported SVG shape element to an SVG path string.
 *
 * This is the main dispatcher function that examines the SVG element's tag name
 * and delegates to the appropriate shape-specific conversion function. It extracts
 * the necessary geometric properties from the DOM element and converts them to
 * a standardized path representation.
 *
 * @param element - The SVG shape element to convert
 * @returns SVG path string representing the shape
 * @throws {Error} If the element type is not supported
 *
 * @example
 * ```typescript
 * // Convert a circle element
 * const circleElement = document.querySelector('circle');
 * const path = shapeToPath(circleElement);
 * // Returns: "M25 50 A25 25 0 0 1 75 50 A25 25 0 0 1 25 50"
 *
 * // Convert a rectangle element
 * const rectElement = document.querySelector('rect');
 * const path = shapeToPath(rectElement);
 * // Returns appropriate path with lines and optional arcs for rounded corners
 * ```
 *
 * @remarks
 * Supported SVG elements:
 * - `<circle>` - Converted using two semicircular arcs
 * - `<ellipse>` - Converted using two elliptical arcs
 * - `<rect>` - Converted to lines/arcs (supports rounded corners)
 * - `<line>` - Converted to a simple move + line command
 * - `<polyline>` - Converted to move + multiple line commands
 * - `<polygon>` - Same as polyline but with automatic closure (Z command)
 * - `<path>` - Returns the existing path data unchanged
 */
export function shapeToPath(element: SVGElement): string {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case "circle": {
      const circle = element as SVGCircleElement;
      const cx = circle.cx.baseVal.value;
      const cy = circle.cy.baseVal.value;
      const r = circle.r.baseVal.value;
      return circleToPath(cx, cy, r);
    }

    case "ellipse": {
      const ellipse = element as SVGEllipseElement;
      const cx = ellipse.cx.baseVal.value;
      const cy = ellipse.cy.baseVal.value;
      const rx = ellipse.rx.baseVal.value;
      const ry = ellipse.ry.baseVal.value;
      return ellipseToPath(cx, cy, rx, ry);
    }

    case "rect": {
      const rect = element as SVGRectElement;
      const x = rect.x.baseVal.value;
      const y = rect.y.baseVal.value;
      const width = rect.width.baseVal.value;
      const height = rect.height.baseVal.value;
      const rx = rect.rx.baseVal.value;
      const ry = rect.ry.baseVal.value;
      return rectToPath(x, y, width, height, rx, ry);
    }

    case "line": {
      const line = element as SVGLineElement;
      const x1 = line.x1.baseVal.value;
      const y1 = line.y1.baseVal.value;
      const x2 = line.x2.baseVal.value;
      const y2 = line.y2.baseVal.value;
      return lineToPath(x1, y1, x2, y2);
    }

    case "polyline": {
      const polyline = element as SVGPolylineElement;
      return polylineToPath(polyline.getAttribute("points") ?? "");
    }

    case "polygon": {
      const polygon = element as SVGPolygonElement;
      return polygonToPath(polygon.getAttribute("points") ?? "");
    }

    case "path": {
      const path = element as SVGPathElement;
      return path.getAttribute("d") ?? "";
    }

    default:
      throw new Error(`Unsupported SVG shape: ${tagName}`);
  }
}
