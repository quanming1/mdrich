import { ASTPath, PathUtils } from "./pathUtils";

/**
 * Point（点）- 表示文档中的一个精确位置
 */
export interface Point {
  path: ASTPath; // 指向文本节点的路径
  offset: number; // 在文本节点内的字符偏移量
}

/**
 * Range（范围）- 表示文档中的一个选择范围
 */
export interface Range {
  anchor: Point; // 选择的起始点
  focus: Point; // 选择的结束点
}

/**
 * Selection（选择）- 编辑器的选择状态
 */
export type Selection = Range | null;

/**
 * Point 工具类
 */
export class PointUtils {
  /**
   * 比较两个 Point 的位置
   * @param point1 第一个点
   * @param point2 第二个点
   * @returns -1: point1 < point2, 0: 相等, 1: point1 > point2
   */
  static compare(point1: Point, point2: Point): number {
    const pathCompare = PathUtils.comparePaths(point1.path, point2.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    return point1.offset - point2.offset;
  }

  /**
   * 检查两个 Point 是否相等
   */
  static equals(point1: Point, point2: Point): boolean {
    return this.compare(point1, point2) === 0;
  }

  /**
   * 检查 Point 是否在指定路径上
   */
  static isAtPath(point: Point, path: ASTPath): boolean {
    return PathUtils.isPathEqual(point.path, path);
  }

  /**
   * 创建一个新的 Point
   */
  static create(path: ASTPath, offset: number): Point {
    return { path: [...path], offset };
  }
}

/**
 * Range 工具类
 */
export class RangeUtils {
  /**
   * 检查 Range 是否是折叠状态（光标状态）
   */
  static isCollapsed(range: Range): boolean {
    return PointUtils.equals(range.anchor, range.focus);
  }

  /**
   * 获取 Range 的边界点（按文档顺序）
   * @returns [start, end] 开始点和结束点
   */
  static edges(range: Range): [Point, Point] {
    const comparison = PointUtils.compare(range.anchor, range.focus);
    if (comparison <= 0) {
      return [range.anchor, range.focus];
    }
    return [range.focus, range.anchor];
  }

  /**
   * 获取 Range 的开始点
   */
  static start(range: Range): Point {
    return this.edges(range)[0];
  }

  /**
   * 获取 Range 的结束点
   */
  static end(range: Range): Point {
    return this.edges(range)[1];
  }

  /**
   * 检查两个 Range 是否相等
   */
  static equals(range1: Range, range2: Range): boolean {
    return (
      PointUtils.equals(range1.anchor, range2.anchor) &&
      PointUtils.equals(range1.focus, range2.focus)
    );
  }

  /**
   * 创建一个新的 Range
   */
  static create(anchor: Point, focus: Point): Range {
    return { anchor, focus };
  }

  /**
   * 创建一个折叠的 Range（光标）
   */
  static createCollapsed(point: Point): Range {
    return { anchor: point, focus: point };
  }
}

/**
 * Selection 工具类
 */
export class SelectionUtils {
  /**
   * 检查 Selection 是否存在
   */
  static exists(selection: Selection): selection is Range {
    return selection !== null;
  }

  /**
   * 检查 Selection 是否是折叠状态
   */
  static isCollapsed(selection: Selection): boolean {
    return selection !== null && RangeUtils.isCollapsed(selection);
  }

  /**
   * 检查 Selection 是否是展开状态
   */
  static isExpanded(selection: Selection): boolean {
    return selection !== null && !RangeUtils.isCollapsed(selection);
  }

  /**
   * 获取 Selection 的文本内容（需要结合 AST 使用）
   */
  static getText(selection: Selection, ast: any): string {
    if (!selection) return "";

    if (RangeUtils.isCollapsed(selection)) {
      return "";
    }

    // 这里需要根据 Range 从 AST 中提取文本内容
    // 简化实现，实际应该遍历范围内的所有文本节点
    const [start, end] = RangeUtils.edges(selection);

    // 如果在同一个文本节点内
    if (PathUtils.isPathEqual(start.path, end.path)) {
      const textNode = PathUtils.getNodeByPath(ast, start.path);
      if (textNode && textNode.value) {
        return textNode.value.slice(start.offset, end.offset);
      }
    }

    return ""; // 跨节点选择的情况需要更复杂的实现
  }
}

/**
 * DOM Selection 到 Slate Selection 的转换器
 */
export class DOMSelectionConverter {
  /**
   * 从 DOM Selection 创建 Slate Selection
   */
  static fromDOMSelection(domSelection: globalThis.Selection | null, ast: any): Selection {
    if (!domSelection || domSelection.rangeCount === 0) {
      return null;
    }

    const range = domSelection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // 将 DOM 位置转换为 Slate Point
    const anchor = this.domPositionToPoint(startContainer, range.startOffset, ast);
    const focus = this.domPositionToPoint(endContainer, range.endOffset, ast);

    if (!anchor || !focus) {
      return null;
    }

    return RangeUtils.create(anchor, focus);
  }

  /**
   * 将 DOM 位置转换为 Slate Point
   */
  private static domPositionToPoint(domNode: Node, offset: number, ast: any): Point | null {
    // 获取包含 data-ast-path 的父元素
    let element =
      domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : (domNode as Element);

    while (element && element !== document.body) {
      const astPath = element.getAttribute("data-ast-path");
      if (astPath) {
        const path = PathUtils.stringToPath(astPath);

        // 如果是文本节点，使用实际的文本偏移
        if (domNode.nodeType === Node.TEXT_NODE) {
          return PointUtils.create(path, offset);
        }

        // 如果是元素节点，偏移量为0
        return PointUtils.create(path, 0);
      }
      element = element.parentElement;
    }

    return null;
  }
}
