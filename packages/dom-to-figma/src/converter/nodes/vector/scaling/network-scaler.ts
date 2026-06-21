import type { VectorNetwork } from "../vector-networks/types";
import type { ScaleFactors } from "./scale-factors";

/**
 * Applies scale factors to a vector network
 */
export function scaleVectorNetwork(
  network: VectorNetwork,
  scaleFactors: ScaleFactors
): VectorNetwork {
  const { x: scaleX, y: scaleY } = scaleFactors;

  // Scale vertices
  const scaledVertices = network.vertices.map((vertex) => ({
    ...vertex,
    x: vertex.x * scaleX,
    y: vertex.y * scaleY,
  }));

  // Scale segments (including control point deltas)
  const scaledSegments = network.segments.map((segment) => ({
    ...segment,
    start: {
      ...segment.start,
      dx: segment.start.dx * scaleX,
      dy: segment.start.dy * scaleY,
    },
    end: {
      ...segment.end,
      dx: segment.end.dx * scaleX,
      dy: segment.end.dy * scaleY,
    },
  }));

  // Regions don't need coordinate scaling
  const scaledRegions = [...network.regions];

  return {
    vertices: scaledVertices,
    segments: scaledSegments,
    regions: scaledRegions,
  };
}

/**
 * Creates a deep copy of a vector network
 */
export function copyVectorNetwork(network: VectorNetwork): VectorNetwork {
  return JSON.parse(JSON.stringify(network)) as VectorNetwork;
}
