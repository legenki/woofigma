import type { VectorVertex } from "../vector-networks/types";

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

/**
 * Calculates the bounding box of a set of vertices
 */
export function calculateBounds(vertices: Array<VectorVertex>): Bounds {
  if (vertices.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  const firstVertex = vertices[0];
  if (!firstVertex) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  let minX = firstVertex.x;
  let minY = firstVertex.y;
  let maxX = firstVertex.x;
  let maxY = firstVertex.y;

  for (const vertex of vertices) {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
