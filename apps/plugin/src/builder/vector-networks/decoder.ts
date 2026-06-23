import type { VectorNetwork, VectorRegion, VectorSegment, VectorVertex } from "@figma/plugin-typings";

export function bytesToVectorNetwork(bytes: Uint8Array): VectorNetwork {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  function readUint32(): number {
    const val = view.getUint32(offset, true);
    offset += 4;
    return val;
  }

  function readFloat32(): number {
    const val = view.getFloat32(offset, true);
    offset += 4;
    return val;
  }

  const numVertices = readUint32();
  const numSegments = readUint32();
  const numRegions = readUint32();

  const vertices: Array<VectorVertex> = [];
  for (let i = 0; i < numVertices; i++) {
    const _styleID = readUint32(); // read and discard styleID
    vertices.push({
      x: readFloat32(),
      y: readFloat32(),
    });
  }

  const segments: Array<VectorSegment> = [];
  for (let i = 0; i < numSegments; i++) {
    const _styleID = readUint32(); // read and discard styleID
    const startVertex = readUint32();
    const startDx = readFloat32();
    const startDy = readFloat32();
    const endVertex = readUint32();
    const endDx = readFloat32();
    const endDy = readFloat32();

    segments.push({
      start: startVertex,
      end: endVertex,
      tangentStart: { x: startDx, y: startDy },
      tangentEnd: { x: endDx, y: endDy },
    });
  }

  const regions: Array<VectorRegion> = [];
  for (let i = 0; i < numRegions; i++) {
    const styleIDWithWindingRule = readUint32();
    const _styleID = styleIDWithWindingRule >> 1; // discard styleID
    const windingRule = (styleIDWithWindingRule & 1) === 1 ? "NONZERO" : "EVENODD";

    const numLoops = readUint32();
    const loops: Array<Array<number>> = [];
    for (let j = 0; j < numLoops; j++) {
      const numLoopSegments = readUint32();
      const loopSegments: Array<number> = [];
      for (let k = 0; k < numLoopSegments; k++) {
        loopSegments.push(readUint32());
      }
      loops.push(loopSegments);
    }

    regions.push({
      windingRule,
      loops,
    });
  }

  return {
    vertices,
    segments,
    regions,
  };
}
