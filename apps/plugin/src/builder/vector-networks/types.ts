export type VectorVertex = {
  x: number;
  y: number;
  styleID: number;
};

export type VectorSegment = {
  start: { vertex: number; dx: number; dy: number };
  end: { vertex: number; dx: number; dy: number };
  styleID: number;
};

export type VectorRegion = {
  windingRule: "EVENODD" | "NONZERO";
  styleID: number;
  loops: Array<{ segments: Array<number> }>;
};

export type VectorNetwork = {
  vertices: Array<VectorVertex>;
  segments: Array<VectorSegment>;
  regions: Array<VectorRegion>;
};
