/**
 * @fileoverview Main entry point for SVG path to vector network conversion.
 *
 * This module orchestrates the complete pipeline from SVG path strings to
 * Figma-compatible vector network structures. It combines path parsing,
 * normalization, and vector network construction into a single convenient API.
 */

import { parseAndNormalizePath } from "../path-parser";
import { convertPathToVectorNetwork } from "../path-to-network";
import type { ScaledVectorResult } from "../scaling";
import { scaleVectorNetwork } from "../scaling";
import { adjustTargetDimensions } from "../scaling/scale-factors";
import type { VectorNetwork, WindingRule } from "./types";

/**
 * Converts an SVG path data string to a Figma vector network structure.
 *
 * This is the main function that orchestrates the complete conversion pipeline:
 * 1. Parse the SVG path string into command objects
 * 2. Normalize relative commands to absolute coordinates
 * 3. Convert path commands to vector network vertices, segments, and regions
 * 4. Optionally normalize coordinates to start from (0,0)
 *
 * @param pathData - The SVG path data string (value of the 'd' attribute)
 * @param params - Configuration options for the conversion
 * @param params.normalize - Whether to normalize coordinates to start from (0,0)
 * @returns VectorNetwork structure compatible with Figma's format
 *
 * @example
 * ```typescript
 * // Convert a simple path
 * const network = svgPathToVectorNetwork("M10,20 L30,40 Z");
 *
 * // Convert without coordinate normalization
 * const network = svgPathToVectorNetwork("M100,200 L300,400 Z", { normalize: false });
 * ```
 *
 * @remarks
 * The resulting vector network contains:
 * - vertices: Point coordinates for path endpoints and control points
 * - segments: Curve definitions connecting vertices (lines, Bézier curves)
 * - regions: Closed areas defined by collections of segments
 */
function svgPathToVectorNetwork(
  pathData: string,
  params: { normalize: boolean; fillRule?: WindingRule } = { normalize: true }
): VectorNetwork {
  const normalizedCommands = parseAndNormalizePath(pathData);
  const result = convertPathToVectorNetwork(normalizedCommands, params);
  return result.vectorNetwork;
}

/**
 * Convenience function that handles SVG-style scaling
 * Converts SVG path with viewBox-like behavior to scaled Figma vector
 */
export function svgPathToVectorNetworkWithScaling(
  pathData: string,
  options: {
    /** Original SVG viewBox width (if known) */
    viewBoxWidth?: number;
    /** Original SVG viewBox height (if known) */
    viewBoxHeight?: number;
    /** Target width in Figma */
    targetWidth?: number;
    /** Target height in Figma */
    targetHeight?: number;
    /** Whether to normalize coordinates first */
    normalize?: boolean;
    /** Preserve aspect ratio when scaling */
    preserveAspectRatio?: boolean;
    /** Original stroke weight to scale (if provided) */
    originalStrokeWeight?: number;
    /** Original stroke dash array to scale (if provided) */
    originalStrokeDashArray?: string;
    /** Fill rule for the path ("NONZERO" or "ODD") */
    fillRule?: WindingRule;
  }
): ScaledVectorResult {
  const {
    viewBoxWidth,
    viewBoxHeight,
    targetWidth,
    targetHeight,
    normalize = true,
    preserveAspectRatio = true,
    originalStrokeWeight,
    originalStrokeDashArray,
    fillRule = "NONZERO",
  } = options;

  // First convert SVG path to vector network
  const vectorNetwork = svgPathToVectorNetwork(pathData, {
    normalize,
    fillRule,
  });

  // Adjust target dimensions based on viewBox if available
  const { width: adjustedWidth, height: adjustedHeight } =
    adjustTargetDimensions(
      targetWidth,
      targetHeight,
      viewBoxWidth,
      viewBoxHeight
    );

  // Scale the vector network
  return scaleVectorNetwork(vectorNetwork, {
    targetWidth: adjustedWidth,
    targetHeight: adjustedHeight,
    preserveAspectRatio,
    originalStrokeWeight,
    originalStrokeDashArray,
  });
}
