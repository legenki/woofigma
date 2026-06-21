// Minimal stand-in for the parts of the Figma Plugin API the builder calls.
// Tests install this on globalThis.figma.

export type MockNode = {
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: Array<MockNode>;
  fills?: unknown;
  effects?: unknown;
  characters?: string;
  fontName?: unknown;
  fontSize?: number;
  layoutMode?: string;
  itemSpacing?: number;
  cornerRadius?: number;
  [key: string]: unknown;
};

// Real `figma.createFrame()` returns a frame pre-filled with an opaque white
// solid. The builder must clear it for transparent containers, so the mock has
// to reproduce that default or the test can't see the bug.
function defaultFrameFills(): Array<unknown> {
  return [
    {
      type: "SOLID",
      visible: true,
      opacity: 1,
      blendMode: "NORMAL",
      color: { r: 1, g: 1, b: 1 },
    },
  ];
}

function makeNode(type: string): MockNode {
  const node: MockNode = {
    type,
    name: type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    children: [],
    appendChild(child: MockNode) {
      node.children.push(child);
    },
    resize(w: number, h: number) {
      node.width = w;
      node.height = h;
    },
  } as MockNode;
  if (type === "FRAME") {
    node.fills = defaultFrameFills();
  }
  return node;
}

export function createFigmaMock() {
  const loadedFonts = new Set<string>();
  const availableFonts = new Set<string>([
    "Inter::Regular",
    "Inter::Medium",
    "Inter::Bold",
  ]);
  return {
    createFrame: () => makeNode("FRAME"),
    createText: () => makeNode("TEXT"),
    createImage: (data: Uint8Array) => {
      // Tests force the error path by passing bytes that start with 0xFF.
      if (data[0] === 0xff) {
        throw new Error("invalid image data");
      }
      return { hash: "img-hash" };
    },
    group: (nodes: Array<MockNode>) => {
      const g = makeNode("GROUP");
      g.children = nodes;
      return g;
    },
    loadFontAsync: (font: { family: string; style: string }) => {
      const key = `${font.family}::${font.style}`;
      if (!availableFonts.has(key)) {
        return Promise.reject(new Error(`font not found: ${key}`));
      }
      loadedFonts.add(key);
      return Promise.resolve();
    },
    currentPage: makeNode("PAGE"),
    viewport: {
      scrollAndZoomIntoView: (_: Array<MockNode>) => {
        // no-op: nothing to scroll in tests
      },
    },
    __loadedFonts: loadedFonts,
    __availableFonts: availableFonts,
  };
}
