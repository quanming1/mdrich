import React from "react";
import { visit } from "unist-util-visit";

/**
 * ReactIdRenderer 模块
 * 职责：在 hast → React 转换过程中添加 data-mdast-id 属性
 * 特点：与现有组件系统无缝集成
 */

export interface HastNode {
  type: string;
  tagName?: string;
  properties?: {
    [key: string]: any;
  };
  data?: {
    id?: string;
    [key: string]: any;
  };
  children?: HastNode[];
  value?: string;
}

export interface ReactIdRendererOptions {
  /** 自定义 data 属性名 */
  dataAttribute?: string;
  /** 是否只为特定标签添加属性 */
  includeTagNames?: string[];
  /** 是否跳过某些标签 */
  skipTagNames?: string[];
  /** 是否保留原有的 data 属性 */
  preserveExistingData?: boolean;
}

/**
 * 为 hast 树添加 data-mdast-id 属性
 * @param hastTree hast 语法树
 * @param options 配置选项
 * @returns 处理后的 hast 树（原地修改）
 */
export function addIdAttributesToHast(
  hastTree: HastNode,
  options: ReactIdRendererOptions = {},
): HastNode {
  const {
    dataAttribute = "data-mdast-id",
    includeTagNames = [],
    skipTagNames = [],
    preserveExistingData = true,
  } = options;

  visit(hastTree, (node: HastNode) => {
    // 只处理元素节点
    if (node.type !== "element" || !node.tagName) {
      return;
    }

    // 标签过滤
    if (skipTagNames.length > 0 && skipTagNames.includes(node.tagName)) {
      return;
    }

    if (includeTagNames.length > 0 && !includeTagNames.includes(node.tagName)) {
      return;
    }

    // 获取 mdast 的 ID
    const mdastId = node.data?.id;
    if (!mdastId) {
      return; // 没有 ID 就跳过
    }

    // 确保 properties 对象存在
    if (!node.properties) {
      node.properties = {};
    }

    // 添加 data-mdast-id 属性
    node.properties[dataAttribute] = mdastId;
  });

  return hastTree;
}

/**
 * 创建自定义组件包装器，自动添加 data-mdast-id
 * @param Component 原始组件
 * @param options 配置选项
 * @returns 包装后的组件
 */
export function createIdWrappedComponent<T extends React.ComponentType<any>>(
  Component: T,
  options: ReactIdRendererOptions = {},
): React.ComponentType<React.ComponentProps<T>> {
  const { dataAttribute = "data-mdast-id" } = options;

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    // 从 props 中提取可能的 mdast ID
    const mdastId = (props as any).node?.data?.id;

    // 构建新的 props
    const newProps = { ...props };

    if (mdastId) {
      // 添加 data-mdast-id 属性
      newProps[dataAttribute] = mdastId;
    }

    return React.createElement(Component, { ...newProps, ref });
  });
}

/**
 * 创建组件映射表，自动添加 ID 支持
 * @param components 原始组件映射表
 * @param options 配置选项
 * @returns 包装后的组件映射表
 */
export function createIdEnabledComponents(
  components: Record<string, React.ComponentType<any>>,
  options: ReactIdRendererOptions = {},
): Record<string, React.ComponentType<any>> {
  const result: Record<string, React.ComponentType<any>> = {};

  for (const [tagName, Component] of Object.entries(components)) {
    result[tagName] = createIdWrappedComponent(Component, options);
  }

  return result;
}

/**
 * 创建 rehype 插件，自动添加 data-mdast-id 属性
 * @param options 配置选项
 * @returns rehype 插件函数
 */
export function createReactIdRendererPlugin(options: ReactIdRendererOptions = {}) {
  return function reactIdRendererPlugin() {
    return function transformer(tree: HastNode) {
      return addIdAttributesToHast(tree, options);
    };
  };
}

/**
 * 高阶组件：为任何组件添加 mdast ID 支持
 * @param options 配置选项
 */
export function withMdastId<P extends object>(options: ReactIdRendererOptions = {}) {
  return function <T extends React.ComponentType<P>>(Component: T): React.ComponentType<P> {
    return createIdWrappedComponent(Component, options);
  };
}

// 预设配置
export const presets = {
  // 标准配置：为所有元素添加 data-mdast-id
  standard: {
    dataAttribute: "data-mdast-id",
    preserveExistingData: true,
  },

  // 内容优先：只为内容元素添加 ID
  contentOnly: {
    dataAttribute: "data-mdast-id",
    includeTagNames: ["p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "a", "strong", "em"],
    preserveExistingData: true,
  },

  // 调试模式：使用更明显的属性名
  debug: {
    dataAttribute: "data-debug-mdast-id",
    preserveExistingData: true,
  },

  // 最小模式：只为 span 和 div 添加 ID
  minimal: {
    dataAttribute: "data-mdast-id",
    includeTagNames: ["span", "div"],
    preserveExistingData: true,
  },
};
