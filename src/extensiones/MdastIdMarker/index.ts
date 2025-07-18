import { visit } from "unist-util-visit";
import { generateId, IdGeneratorOptions } from "../IdGenerator";

/**
 * MdastIdMarker 模块
 * 职责：在 mdast 构建阶段为节点添加唯一 ID
 * 特点：不侵入原有数据结构，ID 存储在 data.id 字段
 */

export interface MdastNode {
  type: string;
  children?: MdastNode[];
  data?: {
    id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface MdastIdMarkerOptions {
  /** ID 生成选项 */
  idOptions?: IdGeneratorOptions;
  /** 是否跳过某些节点类型 */
  skipTypes?: string[];
  /** 是否只标记特定节点类型 */
  includeTypes?: string[];
  /** 自定义 ID 字段路径 */
  idFieldPath?: string;
}

/**
 * 为 mdast 树中的所有节点添加唯一 ID
 * @param tree mdast 语法树
 * @param options 配置选项
 * @returns 处理后的 mdast 树（原地修改）
 */
export function markMdastWithIds(tree: MdastNode, options: MdastIdMarkerOptions = {}): MdastNode {
  const { idOptions = {}, skipTypes = [], includeTypes = [], idFieldPath = "data.id" } = options;

  // 访问所有节点
  visit(tree, (node: MdastNode) => {
    // 类型过滤
    if (skipTypes.length > 0 && skipTypes.includes(node.type)) {
      return; // 跳过此类型
    }

    if (includeTypes.length > 0 && !includeTypes.includes(node.type)) {
      return; // 只处理指定类型
    }

    // 确保 data 对象存在
    if (!node.data) {
      node.data = {};
    }

    // 如果还没有 ID，生成一个
    if (!node.data.id) {
      node.data.id = generateId(idOptions);
    }

    // 🔧 关键修复：直接设置 hProperties，确保 remark-rehype 能传递属性
    if (!node.data.hProperties) {
      node.data.hProperties = {};
    }

    // 将 ID 添加到 hProperties 中，这样 remark-rehype 会自动处理
    node.data.hProperties["data-mdast-id"] = node.data.id;
  });

  return tree;
}

/**
 * 为单个节点添加 ID
 * @param node mdast 节点
 * @param options 配置选项
 * @returns 处理后的节点（原地修改）
 */
export function markNodeWithId(node: MdastNode, options: MdastIdMarkerOptions = {}): MdastNode {
  const { idOptions = {} } = options;

  if (!node.data) {
    node.data = {};
  }

  if (!node.data.id) {
    node.data.id = generateId(idOptions);
  }

  return node;
}

/**
 * 获取节点的 ID
 * @param node mdast 节点
 * @returns 节点的 ID，如果没有则返回 null
 */
export function getNodeId(node: MdastNode): string | null {
  return node?.data?.id || null;
}

/**
 * 检查节点是否已有 ID
 * @param node mdast 节点
 * @returns 是否已有 ID
 */
export function hasNodeId(node: MdastNode): boolean {
  return Boolean(node?.data?.id);
}

/**
 * 为 remark 插件创建的工厂函数
 * @param options 配置选项
 * @returns remark 插件函数
 */
export function createMdastIdMarkerPlugin(options: MdastIdMarkerOptions = {}) {
  return function mdastIdMarkerPlugin() {
    return function transformer(tree: MdastNode) {
      return markMdastWithIds(tree, options);
    };
  };
}

// 预设配置
export const presets = {
  // 为所有节点添加 ID
  all: {
    idOptions: { prefix: "mdast" },
  },

  // 只为内容节点添加 ID（跳过根节点）
  contentOnly: {
    skipTypes: ["root"],
    idOptions: { prefix: "mdast" },
  },

  // 只为文本相关节点添加 ID
  textOnly: {
    includeTypes: ["text", "emphasis", "strong", "link", "paragraph"],
    idOptions: { prefix: "text" },
  },

  // 开发模式（包含时间戳）
  dev: {
    idOptions: {
      prefix: "mdast",
      includeTimestamp: true,
    },
  },
};
