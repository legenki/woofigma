/**
 * Represents a cubic Bézier curve with start point, end point, and two control points.
 */
export type BezierCurve = {
  /** Starting x-coordinate of the curve */
  x1: number;
  /** Starting y-coordinate of the curve */
  y1: number;
  /** First control point x-coordinate */
  cp1x: number;
  /** First control point y-coordinate */
  cp1y: number;
  /** Second control point x-coordinate */
  cp2x: number;
  /** Second control point y-coordinate */
  cp2y: number;
  /** Ending x-coordinate of the curve */
  x2: number;
  /** Ending y-coordinate of the curve */
  y2: number;
};

/**
 * Converts an SVG elliptical arc to one or more cubic Bézier curves.
 *
 * SVG arc commands (A/a) define elliptical arc segments, but many graphics systems
 * (including Figma's vector networks) work with cubic Bézier curves. This function
 * implements the standard algorithm for converting arc segments to mathematically
 * equivalent Bézier approximations.
 *
 * The conversion follows the SVG specification's arc-to-Bézier algorithm, handling
 * complex cases like large arcs that need to be split into multiple segments.
 *
 * @param x1 - Starting x-coordinate of the arc
 * @param y1 - Starting y-coordinate of the arc
 * @param x2 - Ending x-coordinate of the arc
 * @param y2 - Ending y-coordinate of the arc
 * @param rx - X-radius of the ellipse
 * @param ry - Y-radius of the ellipse
 * @param angle - Rotation angle of the ellipse in degrees
 * @param largeArcFlag - 0 for small arc, 1 for large arc
 * @param sweepFlag - 0 for negative direction, 1 for positive direction
 * @returns Array of BezierCurve objects approximating the arc
 *
 * @example
 * ```typescript
 * // Convert a quarter-circle arc
 * const curves = arcToBezier(0, 0, 100, 100, 50, 50, 0, 0, 1);
 * // Returns array of Bézier curves that approximate the arc
 * ```
 *
 * @remarks
 * - Large arcs (>90°) are automatically split into multiple Bézier segments for accuracy
 * - Degenerate arcs (rx=0 or ry=0) return straight line segments
 * - The algorithm ensures C1 continuity between multiple segments
 * - Follows the SVG 1.1 specification for arc parameterization
 */
export function arcToBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  angle: number,
  largeArcFlag: number,
  sweepFlag: number
): Array<BezierCurve> {
  // Handle edge cases
  if (rx === 0 || ry === 0) {
    return [
      {
        x1,
        y1,
        x2,
        y2,
        cp1x: x1,
        cp1y: y1,
        cp2x: x2,
        cp2y: y2,
      },
    ];
  }

  // Convert angle to radians
  const phi = (angle * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1')
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1Prime = cosPhi * dx + sinPhi * dy;
  const y1Prime = -sinPhi * dx + cosPhi * dy;

  // Ensure radii are large enough
  let localRx = rx;
  let localRy = ry;
  const lambda =
    (x1Prime * x1Prime) / (localRx * localRx) +
    (y1Prime * y1Prime) / (localRy * localRy);
  if (lambda > 1) {
    localRx *= Math.sqrt(lambda);
    localRy *= Math.sqrt(lambda);
  }

  // Step 2: Compute (cx', cy')
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const sq = Math.max(
    0,
    (localRx * localRx * localRy * localRy -
      localRx * localRx * y1Prime * y1Prime -
      localRy * localRy * x1Prime * x1Prime) /
      (localRx * localRx * y1Prime * y1Prime +
        localRy * localRy * x1Prime * x1Prime)
  );
  const coeff = sign * Math.sqrt(sq);
  const cxPrime = coeff * ((localRx * y1Prime) / localRy);
  const cyPrime = coeff * (-(localRy * x1Prime) / localRx);

  // Step 3: Compute (cx, cy)
  const cx = cosPhi * cxPrime - sinPhi * cyPrime + (x1 + x2) / 2;
  const cy = sinPhi * cxPrime + cosPhi * cyPrime + (y1 + y2) / 2;

  // Step 4: Compute angles
  const theta1 = Math.atan2(
    (y1Prime - cyPrime) / localRy,
    (x1Prime - cxPrime) / localRx
  );
  const dtheta =
    Math.atan2((-y1Prime - cyPrime) / localRy, (-x1Prime - cxPrime) / localRx) -
    theta1;

  let deltaTheta = dtheta;
  if (sweepFlag === 0 && deltaTheta > 0) {
    deltaTheta -= 2 * Math.PI;
  } else if (sweepFlag === 1 && deltaTheta < 0) {
    deltaTheta += 2 * Math.PI;
  }

  // Convert arc to bezier curves (split if needed)
  const segments = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
  const delta = deltaTheta / segments;
  const t =
    ((8 / 3) * Math.sin(delta / 4) * Math.sin(delta / 4)) / Math.sin(delta / 2);

  const curves: Array<BezierCurve> = [];
  let currentTheta = theta1;

  for (let i = 0; i < segments; i += 1) {
    const startTheta = currentTheta;
    const endTheta = currentTheta + delta;

    const cosStart = Math.cos(startTheta);
    const sinStart = Math.sin(startTheta);
    const cosEnd = Math.cos(endTheta);
    const sinEnd = Math.sin(endTheta);

    const ex = cosPhi * localRx * cosStart - sinPhi * localRy * sinStart + cx;
    const ey = sinPhi * localRx * cosStart + cosPhi * localRy * sinStart + cy;
    const ex2 = cosPhi * localRx * cosEnd - sinPhi * localRy * sinEnd + cx;
    const ey2 = sinPhi * localRx * cosEnd + cosPhi * localRy * sinEnd + cy;

    const q1x = -cosPhi * localRx * sinStart - sinPhi * localRy * cosStart;
    const q1y = -sinPhi * localRx * sinStart + cosPhi * localRy * cosStart;
    const q2x = -cosPhi * localRx * sinEnd - sinPhi * localRy * cosEnd;
    const q2y = -sinPhi * localRx * sinEnd + cosPhi * localRy * cosEnd;

    curves.push({
      x1: ex,
      y1: ey,
      cp1x: ex + t * q1x,
      cp1y: ey + t * q1y,
      cp2x: ex2 - t * q2x,
      cp2y: ey2 - t * q2y,
      x2: ex2,
      y2: ey2,
    });

    currentTheta = endTheta;
  }

  return curves;
}
