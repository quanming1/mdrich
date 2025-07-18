import * as MDAST from "../types/mdast";

// 节点类型检查函数
export const isRoot = (node: MDAST.Node): node is MDAST.Root => node.type === "root";

export const isParagraph = (node: MDAST.Node): node is MDAST.Paragraph => node.type === "paragraph";

export const isHeading = (node: MDAST.Node): node is MDAST.Heading => node.type === "heading";

export const isText = (node: MDAST.Node): node is MDAST.Text => node.type === "text";

export const isEmphasis = (node: MDAST.Node): node is MDAST.Emphasis => node.type === "emphasis";

export const isStrong = (node: MDAST.Node): node is MDAST.Strong => node.type === "strong";

export const isDelete = (node: MDAST.Node): node is MDAST.Delete => node.type === "delete";

export const isInlineCode = (node: MDAST.Node): node is MDAST.InlineCode =>
  node.type === "inlineCode";

export const isLink = (node: MDAST.Node): node is MDAST.Link => node.type === "link";

export const isImage = (node: MDAST.Node): node is MDAST.Image => node.type === "image";

export const isBreak = (node: MDAST.Node): node is MDAST.Break => node.type === "break";

export const isBlockquote = (node: MDAST.Node): node is MDAST.Blockquote =>
  node.type === "blockquote";

export const isList = (node: MDAST.Node): node is MDAST.List => node.type === "list";

export const isListItem = (node: MDAST.Node): node is MDAST.ListItem => node.type === "listItem";

export const isCode = (node: MDAST.Node): node is MDAST.Code => node.type === "code";

export const isHtml = (node: MDAST.Node): node is MDAST.Html => node.type === "html";

export const isThematicBreak = (node: MDAST.Node): node is MDAST.ThematicBreak =>
  node.type === "thematicBreak";

// 检查节点是否有子节点
export const hasChildren = (node: MDAST.Node): node is MDAST.Node & { children: MDAST.Node[] } => {
  return "children" in node && Array.isArray((node as any).children);
};

// 检查节点是否为叶子节点（没有子节点）
export const isLeafNode = (node: MDAST.Node): boolean => {
  return !hasChildren(node);
};

// 检查节点是否为块级节点
export const isBlockNode = (node: MDAST.Node): boolean => {
  return (
    isRoot(node) ||
    isParagraph(node) ||
    isHeading(node) ||
    isBlockquote(node) ||
    isList(node) ||
    isListItem(node) ||
    isCode(node) ||
    isThematicBreak(node)
  );
};

// 检查节点是否为内联节点
export const isInlineNode = (node: MDAST.Node): boolean => {
  return (
    isText(node) ||
    isEmphasis(node) ||
    isStrong(node) ||
    isDelete(node) ||
    isInlineCode(node) ||
    isLink(node) ||
    isImage(node) ||
    isBreak(node)
  );
};

// 获取节点的显示名称
export const getNodeDisplayName = (node: MDAST.Node): string => {
  switch (node.type) {
    case "root":
      return "Root";
    case "paragraph":
      return "Paragraph";
    case "heading":
      return `Heading ${(node as MDAST.Heading).depth}`;
    case "text":
      return "Text";
    case "emphasis":
      return "Emphasis";
    case "strong":
      return "Strong";
    case "delete":
      return "Delete";
    case "inlineCode":
      return "Inline Code";
    case "link":
      return "Link";
    case "image":
      return "Image";
    case "break":
      return "Break";
    case "blockquote":
      return "Blockquote";
    case "list":
      return "List";
    case "listItem":
      return "List Item";
    case "code":
      return "Code Block";
    case "html":
      return "HTML";
    case "thematicBreak":
      return "Thematic Break";
    default:
      return "Unknown";
  }
};

// 遍历节点树
export function walkTree(
  node: MDAST.Node,
  visitor: (node: MDAST.Node, depth: number, parent?: MDAST.Node) => void,
  depth = 0,
  parent?: MDAST.Node,
): void {
  visitor(node, depth, parent);

  if (hasChildren(node)) {
    for (const child of node.children) {
      walkTree(child, visitor, depth + 1, node);
    }
  }
}

// 查找节点
export function findNode(
  tree: MDAST.Node,
  predicate: (node: MDAST.Node) => boolean,
): MDAST.Node | null {
  if (predicate(tree)) {
    return tree;
  }

  if (hasChildren(tree)) {
    for (const child of tree.children) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  }

  return null;
}

// 查找所有匹配的节点
export function findAllNodes(
  tree: MDAST.Node,
  predicate: (node: MDAST.Node) => boolean,
): MDAST.Node[] {
  const results: MDAST.Node[] = [];

  walkTree(tree, (node) => {
    if (predicate(node)) {
      results.push(node);
    }
  });

  return results;
}

// 转换节点树
export function transformTree<T>(
  node: MDAST.Node,
  transformer: (node: MDAST.Node, children?: T[]) => T,
): T {
  if (hasChildren(node)) {
    const transformedChildren = node.children.map((child) => transformTree(child, transformer));
    return transformer(node, transformedChildren);
  } else {
    return transformer(node);
  }
}

// 获取节点路径
export function getNodePath(tree: MDAST.Node, target: MDAST.Node): number[] | null {
  function findPath(node: MDAST.Node, path: number[]): number[] | null {
    if (node === target) {
      return path;
    }

    if (hasChildren(node)) {
      for (let i = 0; i < node.children.length; i++) {
        const childPath = findPath(node.children[i], [...path, i]);
        if (childPath) return childPath;
      }
    }

    return null;
  }

  return findPath(tree, []);
}

// 根据路径获取节点
export function getNodeByPath(tree: MDAST.Node, path: number[]): MDAST.Node | null {
  let current = tree;

  for (const index of path) {
    if (!hasChildren(current) || index >= current.children.length) {
      return null;
    }
    current = current.children[index];
  }

  return current;
}
