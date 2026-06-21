import type { PathCommand } from "../path-parser";
import type { VectorSegment, VectorVertex } from "../vector-networks/types";
import { arcToBezier } from "./arc-converter";

// Constants for bezier curve conversions
const QUADRATIC_TO_CUBIC_RATIO = 2 / 3;
const VERTEX_TOLERANCE = 0.001;

export type CurveBuilderState = {
  vertices: Array<VectorVertex>;
  segments: Array<VectorSegment>;
  currentX: number;
  currentY: number;
  pathStartX: number;
  pathStartY: number;
  currentPath: Array<number>;
  // Track last control point for smooth curve commands
  lastControlPointX?: number;
  lastControlPointY?: number;
  lastCommand?: string;
};

export function createInitialState(): CurveBuilderState {
  return {
    vertices: [],
    segments: [],
    currentX: 0,
    currentY: 0,
    pathStartX: 0,
    pathStartY: 0,
    currentPath: [],
  };
}

function addVertex(state: CurveBuilderState, x: number, y: number): number {
  const existingIndex = state.vertices.findIndex(
    (v) =>
      Math.abs(v.x - x) < VERTEX_TOLERANCE &&
      Math.abs(v.y - y) < VERTEX_TOLERANCE
  );

  if (existingIndex !== -1) {
    return existingIndex;
  }

  state.vertices.push({
    styleID: 0,
    x,
    y,
  });
  return state.vertices.length - 1;
}

function addSegment(
  state: CurveBuilderState,
  startIdx: number,
  endIdx: number,
  tangentStartX = 0,
  tangentStartY = 0,
  tangentEndX = 0,
  tangentEndY = 0
): number {
  const segment: VectorSegment = {
    styleID: 0,
    start: {
      vertex: startIdx,
      dx: tangentStartX,
      dy: tangentStartY,
    },
    end: {
      vertex: endIdx,
      dx: tangentEndX,
      dy: tangentEndY,
    },
  };
  state.segments.push(segment);
  return state.segments.length - 1;
}

export function processCommand(
  state: CurveBuilderState,
  cmd: PathCommand
): void {
  const { type, args } = cmd;

  switch (type) {
    case "M": {
      const x = args[0] ?? 0;
      const y = args[1] ?? 0;

      addVertex(state, x, y);
      state.currentPath = [];
      state.currentX = x;
      state.currentY = y;
      state.pathStartX = x;
      state.pathStartY = y;
      // Reset control point tracking on new path
      state.lastCommand = "M";
      break;
    }

    case "L": {
      const x = args[0] ?? 0;
      const y = args[1] ?? 0;

      const startIdx = addVertex(state, state.currentX, state.currentY);
      const endIdx = addVertex(state, x, y);
      const segmentIdx = addSegment(state, startIdx, endIdx);
      state.currentPath.push(segmentIdx);

      // Reset control point tracking for non-curve commands
      state.lastCommand = "L";

      state.currentX = x;
      state.currentY = y;
      break;
    }

    case "C": {
      const cp1x = args[0] ?? 0;
      const cp1y = args[1] ?? 0;
      const cp2x = args[2] ?? 0;
      const cp2y = args[3] ?? 0;
      const x = args[4] ?? 0;
      const y = args[5] ?? 0;

      const startIdx = addVertex(state, state.currentX, state.currentY);
      const endIdx = addVertex(state, x, y);

      const segmentIdx = addSegment(
        state,
        startIdx,
        endIdx,
        cp1x - state.currentX,
        cp1y - state.currentY,
        cp2x - x,
        cp2y - y
      );
      state.currentPath.push(segmentIdx);

      // Store last control point for smooth commands
      state.lastControlPointX = cp2x;
      state.lastControlPointY = cp2y;
      state.lastCommand = "C";

      state.currentX = x;
      state.currentY = y;
      break;
    }

    case "Q": {
      const cpx = args[0] ?? 0;
      const cpy = args[1] ?? 0;
      const x = args[2] ?? 0;
      const y = args[3] ?? 0;

      // Convert quadratic to cubic bezier
      const cp1x =
        state.currentX + QUADRATIC_TO_CUBIC_RATIO * (cpx - state.currentX);
      const cp1y =
        state.currentY + QUADRATIC_TO_CUBIC_RATIO * (cpy - state.currentY);
      const cp2x = x + QUADRATIC_TO_CUBIC_RATIO * (cpx - x);
      const cp2y = y + QUADRATIC_TO_CUBIC_RATIO * (cpy - y);

      const startIdx = addVertex(state, state.currentX, state.currentY);
      const endIdx = addVertex(state, x, y);

      const segmentIdx = addSegment(
        state,
        startIdx,
        endIdx,
        cp1x - state.currentX,
        cp1y - state.currentY,
        cp2x - x,
        cp2y - y
      );
      state.currentPath.push(segmentIdx);

      // Store last control point for smooth commands
      state.lastControlPointX = cpx;
      state.lastControlPointY = cpy;
      state.lastCommand = "Q";

      state.currentX = x;
      state.currentY = y;
      break;
    }

    case "A": {
      const rx = args[0] ?? 0;
      const ry = args[1] ?? 0;
      const xAxisRotation = args[2] ?? 0;
      const largeArcFlag = args[3] ?? 0;
      const sweepFlag = args[4] ?? 0;
      const x = args[5] ?? 0;
      const y = args[6] ?? 0;

      // Convert arc to cubic bezier curve(s)
      const bezierCurves = arcToBezier(
        state.currentX,
        state.currentY,
        x,
        y,
        rx,
        ry,
        xAxisRotation,
        largeArcFlag,
        sweepFlag
      );

      for (const curve of bezierCurves) {
        const startIdx = addVertex(state, curve.x1, curve.y1);
        const endIdx = addVertex(state, curve.x2, curve.y2);

        // Calculate tangent vectors
        const tangentStartX = curve.cp1x - curve.x1;
        const tangentStartY = curve.cp1y - curve.y1;
        const tangentEndX = curve.cp2x - curve.x2;
        const tangentEndY = curve.cp2y - curve.y2;

        const segmentIdx = addSegment(
          state,
          startIdx,
          endIdx,
          tangentStartX,
          tangentStartY,
          tangentEndX,
          tangentEndY
        );
        state.currentPath.push(segmentIdx);
      }

      state.currentX = x;
      state.currentY = y;
      break;
    }

    case "S": {
      // Smooth cubic bezier - first control point is reflection of previous second control point
      const cp2x = args[0] ?? 0;
      const cp2y = args[1] ?? 0;
      const x = args[2] ?? 0;
      const y = args[3] ?? 0;

      // Calculate reflected control point
      let cp1x = state.currentX;
      let cp1y = state.currentY;

      if (
        (state.lastCommand === "C" || state.lastCommand === "S") &&
        state.lastControlPointX !== undefined &&
        state.lastControlPointY !== undefined
      ) {
        // Reflect the last control point across the current point
        cp1x = 2 * state.currentX - state.lastControlPointX;
        cp1y = 2 * state.currentY - state.lastControlPointY;
      }

      const startIdx = addVertex(state, state.currentX, state.currentY);
      const endIdx = addVertex(state, x, y);

      const segmentIdx = addSegment(
        state,
        startIdx,
        endIdx,
        cp1x - state.currentX,
        cp1y - state.currentY,
        cp2x - x,
        cp2y - y
      );
      state.currentPath.push(segmentIdx);

      // Store last control point for next smooth command
      state.lastControlPointX = cp2x;
      state.lastControlPointY = cp2y;
      state.lastCommand = "S";

      state.currentX = x;
      state.currentY = y;
      break;
    }

    case "T": {
      // Smooth quadratic bezier - control point is reflection of previous control point
      const x = args[0] ?? 0;
      const y = args[1] ?? 0;

      // Calculate reflected control point
      let cpx = state.currentX;
      let cpy = state.currentY;

      if (
        (state.lastCommand === "Q" || state.lastCommand === "T") &&
        state.lastControlPointX !== undefined &&
        state.lastControlPointY !== undefined
      ) {
        // Reflect the last control point across the current point
        cpx = 2 * state.currentX - state.lastControlPointX;
        cpy = 2 * state.currentY - state.lastControlPointY;
      }

      // Convert quadratic to cubic bezier
      const cp1x =
        state.currentX + QUADRATIC_TO_CUBIC_RATIO * (cpx - state.currentX);
      const cp1y =
        state.currentY + QUADRATIC_TO_CUBIC_RATIO * (cpy - state.currentY);
      const cp2x = x + QUADRATIC_TO_CUBIC_RATIO * (cpx - x);
      const cp2y = y + QUADRATIC_TO_CUBIC_RATIO * (cpy - y);

      const startIdx = addVertex(state, state.currentX, state.currentY);
      const endIdx = addVertex(state, x, y);

      const segmentIdx = addSegment(
        state,
        startIdx,
        endIdx,
        cp1x - state.currentX,
        cp1y - state.currentY,
        cp2x - x,
        cp2y - y
      );
      state.currentPath.push(segmentIdx);

      // Store last control point for next smooth command
      state.lastControlPointX = cpx;
      state.lastControlPointY = cpy;
      state.lastCommand = "T";

      state.currentX = x;
      state.currentY = y;
      break;
    }

    case "Z": {
      if (
        Math.abs(state.currentX - state.pathStartX) > VERTEX_TOLERANCE ||
        Math.abs(state.currentY - state.pathStartY) > VERTEX_TOLERANCE
      ) {
        const startIdx = addVertex(state, state.currentX, state.currentY);
        const endIdx = addVertex(state, state.pathStartX, state.pathStartY);
        const segmentIdx = addSegment(state, startIdx, endIdx);
        state.currentPath.push(segmentIdx);
      }

      state.currentX = state.pathStartX;
      state.currentY = state.pathStartY;
      break;
    }
    default: {
      break;
    }
  }
}
