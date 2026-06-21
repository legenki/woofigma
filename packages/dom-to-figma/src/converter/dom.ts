export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

export function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function isTextEmpty(text: Text): boolean {
  return !(text.textContent || "").trim().length;
}

export function isSvgElement(element: Element): boolean {
  return element.tagName.toLowerCase() === "svg";
}

/**
 * Gets the position of an element relative to its parent.
 */
export function getElementPositionRelativeToParent(element: Element): Position {
  const parentElement = element.parentElement;
  const elementRect = element.getBoundingClientRect();

  if (!parentElement) {
    return { x: elementRect.left, y: elementRect.top };
  }

  const parentRect = parentElement.getBoundingClientRect();
  return {
    x: elementRect.left - parentRect.left,
    y: elementRect.top - parentRect.top,
  };
}

export function getElementSize(element: Element): Size {
  const elementRect = element.getBoundingClientRect();
  return {
    width: Math.ceil(elementRect.width),
    height: Math.ceil(elementRect.height),
  };
}

function getTextRect(textNode: Text) {
  const range = document.createRange();
  range.selectNodeContents(textNode);
  return range.getBoundingClientRect();
}

export function getTextPositionRelativeToParent(textNode: Text): Position {
  const parentElement = textNode.parentElement;
  if (!parentElement) {
    return { x: 0, y: 0 };
  }

  const textNodeRect = getTextRect(textNode);
  const parentElementRect = parentElement.getBoundingClientRect();

  return {
    x: textNodeRect.left - parentElementRect.left,
    y: textNodeRect.top - parentElementRect.top,
  };
}

export function getTextSize(textNode: Text): Size {
  const textNodeRect = getTextRect(textNode);
  return {
    // Fonts in Figma take 1px more width sometimes, so we add a buffer.
    width: Math.ceil(textNodeRect.width) + 1,
    height: Math.ceil(textNodeRect.height),
  };
}

export function sortNodesByStackingOrder(nodes: Array<Node>) {
  const nonPositioned: Array<Node> = [];
  const negativeZIndex: Array<{ node: Element; zIndex: number }> = [];
  const positionedAuto: Array<Element> = [];
  const positiveZIndex: Array<{ node: Element; zIndex: number }> = [];

  for (const node of nodes) {
    if (!isElementNode(node)) {
      nonPositioned.push(node);
      continue;
    }

    const style = window.getComputedStyle(node);
    const position = style.position;
    const isPositioned =
      position === "absolute" ||
      position === "relative" ||
      position === "fixed" ||
      position === "sticky";

    if (!isPositioned) {
      nonPositioned.push(node);
      continue;
    }

    const zIndex =
      style.zIndex === "auto" ? "auto" : Number.parseInt(style.zIndex, 10) || 0;

    if (zIndex === "auto") {
      positionedAuto.push(node);
    } else if (zIndex < 0) {
      negativeZIndex.push({ node, zIndex });
    } else {
      positiveZIndex.push({ node, zIndex });
    }
  }

  negativeZIndex.sort((a, b) => a.zIndex - b.zIndex);
  positiveZIndex.sort((a, b) => a.zIndex - b.zIndex);

  return [
    ...nonPositioned,
    ...negativeZIndex.map((item) => item.node),
    ...positionedAuto,
    ...positiveZIndex.map((item) => item.node),
  ];
}
