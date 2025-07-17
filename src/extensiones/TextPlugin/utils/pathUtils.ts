/**
 * 路径工具库 - 类似 Slate 的 Path 系统
 * 用于在 MDAST 树中进行精确的节点定位和操作
 */

export type ASTPath = number[];

export interface ASTNode {
  type: string;
  value?: string;
  children?: ASTNode[];
  [key: string]: any;
}

/**
 * 路径工具类
 */
export class PathUtils {
  /**
   * 根据路径获取AST节点
   * @param ast AST根节点
   * @param path 路径数组
   * @returns 目标节点或null
   */
  static getNodeByPath(ast: ASTNode, path: ASTPath): ASTNode | null {
    if (!ast || !path || path.length === 0) {
      return ast;
    }

    let current = ast;
    for (const index of path) {
      if (!current.children || !current.children[index]) {
        return null;
      }
      current = current.children[index];
    }
    return current;
  }

  /**
   * 设置路径信息到节点
   * @param ast AST根节点
   * @param path 当前路径
   */
  static addPathToNodes(ast: ASTNode, path: ASTPath = []): void {
    if (!ast) return;

    // 为当前节点添加路径信息
    ast.__path = [...path];

    // 递归处理子节点
    if (ast.children) {
      ast.children.forEach((child, index) => {
        this.addPathToNodes(child, [...path, index]);
      });
    }
  }

  /**
   * 路径转字符串
   * @param path 路径数组
   * @returns 路径字符串
   */
  static pathToString(path: ASTPath): string {
    return path.join(",");
  }

  /**
   * 字符串转路径
   * @param pathStr 路径字符串
   * @returns 路径数组
   */
  static stringToPath(pathStr: string): ASTPath {
    if (!pathStr) return [];
    return pathStr.split(",").map(Number);
  }

  /**
   * 比较两个路径
   * @param path1 路径1
   * @param path2 路径2
   * @returns 比较结果 (-1: path1 < path2, 0: 相等, 1: path1 > path2)
   */
  static comparePaths(path1: ASTPath, path2: ASTPath): number {
    const minLength = Math.min(path1.length, path2.length);

    for (let i = 0; i < minLength; i++) {
      if (path1[i] < path2[i]) return -1;
      if (path1[i] > path2[i]) return 1;
    }

    return path1.length - path2.length;
  }

  /**
   * 检查路径是否相等
   * @param path1 路径1
   * @param path2 路径2
   * @returns 是否相等
   */
  static isPathEqual(path1: ASTPath, path2: ASTPath): boolean {
    if (path1.length !== path2.length) return false;
    return path1.every((value, index) => value === path2[index]);
  }

  /**
   * 检查path1是否是path2的祖先
   * @param ancestorPath 祖先路径
   * @param descendantPath 后代路径
   * @returns 是否是祖先关系
   */
  static isAncestor(ancestorPath: ASTPath, descendantPath: ASTPath): boolean {
    if (ancestorPath.length >= descendantPath.length) return false;
    return ancestorPath.every((value, index) => value === descendantPath[index]);
  }

  /**
   * 获取路径的父级路径
   * @param path 路径
   * @returns 父级路径
   */
  static getParentPath(path: ASTPath): ASTPath {
    if (path.length === 0) return [];
    return path.slice(0, -1);
  }

  /**
   * 获取路径的最后一个索引
   * @param path 路径
   * @returns 最后一个索引
   */
  static getLastIndex(path: ASTPath): number {
    return path[path.length - 1];
  }

  /**
   * 遍历AST树中的所有节点
   * @param ast AST根节点
   * @param callback 回调函数
   * @param path 当前路径
   */
  static walkNodes(
    ast: ASTNode,
    callback: (node: ASTNode, path: ASTPath) => void,
    path: ASTPath = [],
  ): void {
    if (!ast) return;

    callback(ast, path);

    if (ast.children) {
      ast.children.forEach((child, index) => {
        this.walkNodes(child, callback, [...path, index]);
      });
    }
  }

  /**
   * 查找符合条件的节点
   * @param ast AST根节点
   * @param predicate 查找条件
   * @returns 符合条件的节点和路径
   */
  static findNode(
    ast: ASTNode,
    predicate: (node: ASTNode, path: ASTPath) => boolean,
  ): { node: ASTNode; path: ASTPath } | null {
    let result: { node: ASTNode; path: ASTPath } | null = null;

    this.walkNodes(ast, (node, path) => {
      if (result) return; // 已找到，停止遍历
      if (predicate(node, path)) {
        result = { node, path };
      }
    });

    return result;
  }

  /**
   * 调试输出：打印带路径的树结构
   * @param ast AST根节点
   * @param path 当前路径
   * @param depth 缩进深度
   */
  static debugPrintTree(ast: ASTNode, path: ASTPath = [], depth: number = 0): void {
    if (!ast) return;

    const indent = "  ".repeat(depth);
    const pathStr = path.length > 0 ? `[${path.join(",")}]` : "[root]";
    const nodeInfo = `${ast.type}${ast.value ? ` "${ast.value}"` : ""}`;

    console.log(`${indent}${pathStr} ${nodeInfo}`);

    if (ast.children) {
      ast.children.forEach((child, index) => {
        this.debugPrintTree(child, [...path, index], depth + 1);
      });
    }
  }
}

// 便捷的导出函数
export const {
  getNodeByPath,
  addPathToNodes,
  pathToString,
  stringToPath,
  comparePaths,
  isPathEqual,
  isAncestor,
  getParentPath,
  getLastIndex,
  walkNodes,
  findNode,
  debugPrintTree,
} = PathUtils;
