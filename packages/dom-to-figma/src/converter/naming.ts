/**
 * Get an appropriate Figma node name based on HTML element tag
 */
export function getNodeNameFromElement(element: Element): string {
  const tagName = element.tagName.toLowerCase();

  const tagNameMap: Record<string, string> = {
    section: "Section",
    nav: "Navigation",
    aside: "Sidebar",
    header: "Header",
    footer: "Footer",
    button: "Button",
    img: "Image",
    table: "Table",
    tr: "Table Row",
    th: "Table Head",
    tbody: "Table Body",
    thead: "Table Header",
    tfoot: "Table Footer",
    td: "Table Cell",
  };

  return tagNameMap[tagName] ?? "Container";
}
