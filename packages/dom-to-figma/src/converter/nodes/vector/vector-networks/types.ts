export type WindingRule = "NONZERO" | "ODD";

export type VectorVertex = {
  styleID: number;
  x: number;
  y: number;
};

export type VectorSegment = {
  styleID: number;
  start: {
    vertex: number;
    dx: number;
    dy: number;
  };
  end: {
    vertex: number;
    dx: number;
    dy: number;
  };
};

export type VectorRegion = {
  styleID: number;
  windingRule: WindingRule;
  loops: Array<{
    segments: Array<number>;
    windingRule: WindingRule;
  }>;
};

export type VectorNetwork = {
  vertices: Array<VectorVertex>;
  segments: Array<VectorSegment>;
  regions: Array<VectorRegion>;
};
