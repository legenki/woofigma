import type { ElementKind } from "./classify";
import {
  defaultClassify,
  hasOnlyInlineFlowChildren,
  isInlineParagraph,
} from "./classify";
import type { ConversionResult, InheritedProperties } from "./convert";
import { convertElement } from "./convert";
import {
  getElementPositionRelativeToParent,
  getTextPositionRelativeToParent,
  getTextSize,
  isElementNode,
  isSvgElement,
  isTextEmpty,
  isTextNode,
  sortNodesByStackingOrder,
} from "./dom";
import type { FontCache } from "./font-cache";
import type { ImageCache } from "./image-cache";
import { nodeToTextNodeChange } from "./nodes/text";
import type { FigmaBlob, FigmaGuid, FigmaNodeChange } from "./types";

export type Classify = (
  element: Element,
  defaultKind: ElementKind
) => ElementKind;

export type WalkContext = {
  classify?: Classify;
  createGuid: () => FigmaGuid;
  registerBlob: (blob: FigmaBlob) => number;
  fontCache: FontCache;
  imageCache: ImageCache;
  appendChanges: (changes: ReadonlyArray<FigmaNodeChange>) => void;
};

const EMPTY_INHERITED: InheritedProperties = {};
const VIEWBOX_SEPARATOR = /[\s,]+/;

export async function walkRoot(
  root: Element,
  parentGuid: FigmaGuid,
  ctx: WalkContext
) {
  await walkNode(root, parentGuid, 0, EMPTY_INHERITED, ctx);
}

async function walkNode(
  node: Node,
  parentGuid: FigmaGuid,
  childIndex: number,
  inheritedProperties: InheritedProperties,
  ctx: WalkContext
): Promise<boolean> {
  try {
    if (isTextNode(node)) {
      return await renderTextNode(
        node,
        parentGuid,
        childIndex,
        inheritedProperties,
        ctx
      );
    }
    if (!isElementNode(node)) {
      return false;
    }

    const defaultKind = defaultClassify(node);
    const kind = ctx.classify ? ctx.classify(node, defaultKind) : defaultKind;

    if (kind === "skip") {
      return false;
    }

    const guid = ctx.createGuid();
    const position = getElementPositionRelativeToParent(node);

    const result = await convertElement(node, kind, {
      guid,
      parentGuid,
      childIndex,
      position,
      inheritedProperties,
      registerBlob: ctx.registerBlob,
      fontCache: ctx.fontCache,
      imageCache: ctx.imageCache,
      createGuid: ctx.createGuid,
    });

    ctx.appendChanges(result.changes);

    if (result.hasChildren) {
      await walkChildren(
        node,
        guid,
        nextInheritedProperties(node, inheritedProperties, result),
        ctx
      );
    }

    return true;
  } catch (error) {
    console.warn("Failed to process node:", error);
    return false;
  }
}

async function walkChildren(
  element: Element,
  parentGuid: FigmaGuid,
  inheritedProperties: InheritedProperties,
  ctx: WalkContext
) {
  const childNodes = Array.from(element.childNodes);
  const isFlow =
    hasOnlyInlineFlowChildren(element) && !isInlineParagraph(element);
  const sortedNodes = isFlow
    ? childNodes
    : sortNodesByStackingOrder(childNodes);

  let childNodeIndex = 0;

  // Process ::before
  const beforeStyle = window.getComputedStyle(element, "::before");
  const beforeContent = beforeStyle.content;
  if (
    beforeContent &&
    beforeContent !== "none" &&
    beforeStyle.display !== "none"
  ) {
    const success = await walkPseudoElement(
      element,
      "::before",
      parentGuid,
      childNodeIndex,
      inheritedProperties,
      ctx
    );
    if (success) {
      childNodeIndex += 1;
    }
  }

  for (const node of sortedNodes) {
    const success = await walkNode(
      node,
      parentGuid,
      childNodeIndex,
      inheritedProperties,
      ctx
    );
    if (success) {
      childNodeIndex += 1;
    }
  }

  // Process ::after
  const afterStyle = window.getComputedStyle(element, "::after");
  const afterContent = afterStyle.content;
  if (
    afterContent &&
    afterContent !== "none" &&
    afterStyle.display !== "none"
  ) {
    const success = await walkPseudoElement(
      element,
      "::after",
      parentGuid,
      childNodeIndex,
      inheritedProperties,
      ctx
    );
    if (success) {
      childNodeIndex += 1;
    }
  }
}

async function walkPseudoElement(
  element: Element,
  pseudoElt: "::before" | "::after",
  parentGuid: FigmaGuid,
  childIndex: number,
  inheritedProperties: InheritedProperties,
  ctx: WalkContext
): Promise<boolean> {
  const style = window.getComputedStyle(element, pseudoElt);
  if (style.display === "none") return false;

  let x = 0;
  let y = 0;
  if (style.position === "absolute") {
    const leftStr = style.left;
    const topStr = style.top;
    if (leftStr !== "auto") x = (Number.parseFloat(leftStr) || 0);
    if (topStr !== "auto") y = (Number.parseFloat(topStr) || 0);
  }
  const position = { x, y };

  const guid = ctx.createGuid();
  const result = await convertElement(element, "frame", {
    guid,
    parentGuid,
    childIndex,
    position,
    inheritedProperties,
    registerBlob: ctx.registerBlob,
    fontCache: ctx.fontCache,
    imageCache: ctx.imageCache,
    createGuid: ctx.createGuid,
    pseudoElt,
  });

  ctx.appendChanges(result.changes);

  // Parse text content if present
  let contentString = style.content;
  if (
    contentString &&
    contentString !== "none" &&
    contentString !== "normal" &&
    contentString !== '""' &&
    contentString !== "''"
  ) {
    contentString = contentString.replace(/^["'](.*)["']$/, "$1");
    if (contentString) {
      const textGuid = ctx.createGuid();
      const textChange = await nodeToTextNodeChange(element, {
        guid: textGuid,
        parentGuid: guid,
        childIndex: 0,
        position: { x: 0, y: 0 },
        registerBlob: ctx.registerBlob,
        textContent: contentString,
        fontCache: ctx.fontCache,
        pseudoElt,
      });
      ctx.appendChanges([textChange]);
    }
  }

  return true;
}

async function renderTextNode(
  textNode: Text,
  parentGuid: FigmaGuid,
  childIndex: number,
  inheritedProperties: InheritedProperties,
  ctx: WalkContext
): Promise<boolean> {
  if (isTextEmpty(textNode)) {
    return false;
  }
  if (!textNode.parentElement) {
    return false;
  }

  const guid = ctx.createGuid();
  const change = await nodeToTextNodeChange(textNode, {
    guid,
    parentGuid,
    childIndex,
    position: getTextPositionRelativeToParent(textNode),
    size: getTextSize(textNode),
    textContent: (textNode.textContent || "").trim(),
    registerBlob: ctx.registerBlob,
    inheritedProperties,
    fontCache: ctx.fontCache,
  });

  ctx.appendChanges([change]);
  return true;
}

function nextInheritedProperties(
  element: Element,
  prev: InheritedProperties,
  result: ConversionResult
): InheritedProperties {
  let svgViewbox = prev.svgViewbox;
  if (isSvgElement(element)) {
    const parsed = element
      .getAttribute("viewBox")
      ?.split(VIEWBOX_SEPARATOR)
      .map(Number);
    if (parsed) {
      svgViewbox = {
        width: parsed[2] ?? 0,
        height: parsed[3] ?? 0,
      };
    }
  }

  return {
    textGradient: result.frameTextGradient ?? prev.textGradient,
    svgViewbox,
  };
}
