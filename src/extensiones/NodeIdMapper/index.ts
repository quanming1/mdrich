import { MdastNode } from "../MdastIdMarker";
import { visit } from "unist-util-visit";

/**
 * NodeIdMapper 模块
 * 职责：维护 ID 到节点的映射关系，提供快速查找能力
 * 特点：支持双向查找，自动更新，内存优化
 */

export interface NodeMapping {
  id: string;
  node: MdastNode;
  path: number[]; // 节点在树中的路径
  parent?: MdastNode;
  index?: number; // 在父节点中的索引
}

export interface NodeIdMapperOptions {
  /** 是否自动更新映射 */
  autoUpdate?: boolean;
  /** 是否跟踪节点路径 */
  trackPaths?: boolean;
  /** 是否跟踪父子关系 */
  trackParents?: boolean;
}

export class NodeIdMapper {
  private idToMapping = new Map<string, NodeMapping>();
  private nodeToId = new WeakMap<MdastNode, string>();
  private options: Required<NodeIdMapperOptions>;

  constructor(options: NodeIdMapperOptions = {}) {
    this.options = {
      autoUpdate: true,
      trackPaths: true,
      trackParents: true,
      ...options,
    };
  }

  /**
   * 从 mdast 树构建映射关系
   * @param tree mdast 语法树
   */
  buildFromTree(tree: MdastNode): void {
    this.clear();

    const pathStack: number[] = [];
    let parentStack: MdastNode[] = [tree];

    visit(
      tree,
      (node: MdastNode, index: number | null, parent: MdastNode | null) => {
        const nodeId = node.data?.id;
        if (!nodeId) return;

        // 构建路径
        const path = [...pathStack];
        if (index !== null) {
          path.push(index);
        }

        // 创建映射
        const mapping: NodeMapping = {
          id: nodeId,
          node,
          path: this.options.trackPaths ? path : [],
          parent: this.options.trackParents ? parent || undefined : undefined,
          index: index || undefined,
        };

        // 存储映射
        this.idToMapping.set(nodeId, mapping);
        this.nodeToId.set(node, nodeId);

        // 更新路径栈（访问子节点前）
        if (node.children && node.children.length > 0) {
          if (index !== null) {
            pathStack.push(index);
          }
          parentStack.push(node);
        }
      },
      (node: MdastNode, index: number | null) => {
        // 访问子节点后，回退路径栈
        if (node.children && node.children.length > 0) {
          pathStack.pop();
          parentStack.pop();
        }
      },
    );
  }

  /**
   * 根据 ID 获取节点
   * @param id 节点 ID
   * @returns 节点信息
   */
  getNodeById(id: string): NodeMapping | null {
    return this.idToMapping.get(id) || null;
  }

  /**
   * 根据节点获取 ID
   * @param node mdast 节点
   * @returns 节点 ID
   */
  getIdByNode(node: MdastNode): string | null {
    return this.nodeToId.get(node) || null;
  }

  /**
   * 根据路径获取节点
   * @param path 节点路径
   * @param tree 根节点
   * @returns 目标节点
   */
  getNodeByPath(path: number[], tree: MdastNode): MdastNode | null {
    let current = tree;

    for (const index of path) {
      if (!current.children || index >= current.children.length) {
        return null;
      }
      current = current.children[index];
    }

    return current;
  }

  /**
   * 获取节点的父节点
   * @param id 节点 ID
   * @returns 父节点信息
   */
  getParentById(id: string): NodeMapping | null {
    const mapping = this.getNodeById(id);
    if (!mapping || !mapping.parent) return null;

    const parentId = this.getIdByNode(mapping.parent);
    return parentId ? this.getNodeById(parentId) : null;
  }

  /**
   * 获取节点的子节点
   * @param id 节点 ID
   * @returns 子节点 ID 列表
   */
  getChildrenIds(id: string): string[] {
    const mapping = this.getNodeById(id);
    if (!mapping || !mapping.node.children) return [];

    return mapping.node.children
      .map((child) => this.getIdByNode(child))
      .filter((id): id is string => id !== null);
  }

  /**
   * 获取兄弟节点
   * @param id 节点 ID
   * @returns 兄弟节点 ID 列表
   */
  getSiblingIds(id: string): string[] {
    const mapping = this.getNodeById(id);
    if (!mapping || !mapping.parent) return [];

    return this.getChildrenIds(this.getIdByNode(mapping.parent)!).filter(
      (siblingId) => siblingId !== id,
    );
  }

  /**
   * 检查节点是否存在
   * @param id 节点 ID
   * @returns 是否存在
   */
  hasNode(id: string): boolean {
    return this.idToMapping.has(id);
  }

  /**
   * 添加单个节点映射
   * @param node mdast 节点
   * @param parent 父节点
   * @param index 在父节点中的索引
   */
  addNode(node: MdastNode, parent?: MdastNode, index?: number): void {
    const nodeId = node.data?.id;
    if (!nodeId) return;

    // 计算路径
    let path: number[] = [];
    if (this.options.trackPaths && parent) {
      const parentMapping = this.getNodeById(this.getIdByNode(parent)!);
      if (parentMapping && index !== undefined) {
        path = [...parentMapping.path, index];
      }
    }

    const mapping: NodeMapping = {
      id: nodeId,
      node,
      path,
      parent: this.options.trackParents ? parent : undefined,
      index,
    };

    this.idToMapping.set(nodeId, mapping);
    this.nodeToId.set(node, nodeId);
  }

  /**
   * 移除节点映射
   * @param id 节点 ID
   */
  removeNode(id: string): void {
    const mapping = this.idToMapping.get(id);
    if (mapping) {
      this.nodeToId.delete(mapping.node);
      this.idToMapping.delete(id);
    }
  }

  /**
   * 清空所有映射
   */
  clear(): void {
    this.idToMapping.clear();
    this.nodeToId = new WeakMap();
  }

  /**
   * 获取所有节点 ID
   * @returns 所有节点 ID 数组
   */
  getAllIds(): string[] {
    return Array.from(this.idToMapping.keys());
  }

  /**
   * 获取映射统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalNodes: number;
    rootNodes: number;
    leafNodes: number;
    maxDepth: number;
  } {
    const mappings = Array.from(this.idToMapping.values());

    return {
      totalNodes: mappings.length,
      rootNodes: mappings.filter((m) => !m.parent).length,
      leafNodes: mappings.filter((m) => !m.node.children || m.node.children.length === 0).length,
      maxDepth: Math.max(...mappings.map((m) => m.path.length), 0),
    };
  }

  /**
   * 根据类型查找节点
   * @param type 节点类型
   * @returns 匹配的节点 ID 列表
   */
  findNodesByType(type: string): string[] {
    return Array.from(this.idToMapping.values())
      .filter((mapping) => mapping.node.type === type)
      .map((mapping) => mapping.id);
  }

  /**
   * 根据条件查找节点
   * @param predicate 查找条件
   * @returns 匹配的节点 ID 列表
   */
  findNodes(predicate: (node: MdastNode) => boolean): string[] {
    return Array.from(this.idToMapping.values())
      .filter((mapping) => predicate(mapping.node))
      .map((mapping) => mapping.id);
  }
}

/**
 * 创建全局映射器实例
 */
export function createGlobalMapper(options?: NodeIdMapperOptions): NodeIdMapper {
  return new NodeIdMapper(options);
}

// 导出单例实例（可选使用）
export const globalMapper = new NodeIdMapper();
