export type FigmaGuid = {
  sessionID: number;
  localID: number;
};

export type FigmaTransform = {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
};

export type FigmaSize = {
  x: number;
  y: number;
};

export type FigmaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type FigmaBlob = {
  bytes: Array<number>;
};
