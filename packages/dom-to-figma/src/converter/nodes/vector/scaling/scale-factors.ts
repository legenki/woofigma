import type { Bounds } from "./bounds";

export type ScaleFactors = {
  x: number;
  y: number;
};

export type ScalingDimensions = {
  targetWidth?: number;
  targetHeight?: number;
  preserveAspectRatio?: boolean;
};

/**
 * Calculates scale factors based on original bounds and target dimensions
 */
export function calculateScaleFactors(
  originalBounds: Bounds,
  options: ScalingDimensions
): ScaleFactors {
  const { targetWidth, targetHeight, preserveAspectRatio = true } = options;

  // If no scaling needed, return identity scale
  if (!(targetWidth || targetHeight)) {
    return { x: 1, y: 1 };
  }

  // Calculate initial scale factors
  let scaleX = 1;
  let scaleY = 1;

  if (targetWidth && originalBounds.width > 0) {
    scaleX = targetWidth / originalBounds.width;
  }
  if (targetHeight && originalBounds.height > 0) {
    scaleY = targetHeight / originalBounds.height;
  }

  // Handle aspect ratio preservation
  if (preserveAspectRatio) {
    if (targetWidth && targetHeight) {
      // Use the smaller scale to fit within both dimensions
      const scale = Math.min(scaleX, scaleY);
      scaleX = scale;
      scaleY = scale;
    } else if (targetWidth && !targetHeight) {
      // Only width specified - use same scale for height
      scaleY = scaleX;
    } else if (targetHeight && !targetWidth) {
      // Only height specified - use same scale for width
      scaleX = scaleY;
    }
  }

  return { x: scaleX, y: scaleY };
}

/**
 * Calculates the average scale factor (used for stroke weights and dash arrays)
 */
export function getAverageScaleFactor(scaleFactors: ScaleFactors): number {
  return (scaleFactors.x + scaleFactors.y) / 2;
}

/**
 * Adjusts target dimensions based on viewBox information
 * Ensures the aspect ratio from viewBox is preserved
 */
export function adjustTargetDimensions(
  targetWidth: number | undefined,
  targetHeight: number | undefined,
  viewBoxWidth: number | undefined,
  viewBoxHeight: number | undefined
): { width: number | undefined; height: number | undefined } {
  let adjustedWidth = targetWidth;
  let adjustedHeight = targetHeight;

  if (viewBoxWidth && viewBoxHeight && (targetWidth || targetHeight)) {
    const viewBoxAspect = viewBoxWidth / viewBoxHeight;

    if (targetWidth && !targetHeight) {
      // Calculate height based on viewBox aspect ratio
      adjustedHeight = targetWidth / viewBoxAspect;
    } else if (targetHeight && !targetWidth) {
      // Calculate width based on viewBox aspect ratio
      adjustedWidth = targetHeight * viewBoxAspect;
    } else if (targetWidth && targetHeight) {
      // Both dimensions provided - adjust to match viewBox aspect ratio
      // Use the smaller dimension to ensure the shape fits
      const targetAspect = targetWidth / targetHeight;

      if (targetAspect > viewBoxAspect) {
        // Target is wider than viewBox - constrain by height
        adjustedWidth = targetHeight * viewBoxAspect;
      } else {
        // Target is taller than viewBox - constrain by width
        adjustedHeight = targetWidth / viewBoxAspect;
      }
    }
  }

  return { width: adjustedWidth, height: adjustedHeight };
}
