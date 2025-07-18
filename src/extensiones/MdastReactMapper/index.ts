import React from "react";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
// @ts-ignore
import { jsx, jsxs } from "react/jsx-runtime";

import { MdastNode, markMdastWithIds, MdastIdMarkerOptions } from "../MdastIdMarker";
import { NodeIdMapper, NodeIdMapperOptions } from "../NodeIdMapper";
import { addIdAttributesToHast, ReactIdRendererOptions, HastNode } from "../ReactIdRenderer";

/**
 * MdastReactMapper 模块
 * 职责：统一协调各模块，提供完整的 mdast → React 转换流程
 * 特点：高度可配置，支持插件扩展，自动管理映射关系
 */

export interface MdastReactMapperOptions {
  /** mdast ID 标记选项 */
  idMarker?: MdastIdMarkerOptions;
  /** React ID 渲染选项 */
  idRenderer?: ReactIdRendererOptions;
  /** 节点映射器选项 */
  mapper?: NodeIdMapperOptions;
  /** remark-rehype 选项 */
  remarkRehype?: any;
  /** 自定义组件映射 */
  components?: Record<string, React.ComponentType<any>>;
  /** 是否启用映射器 */
  enableMapper?: boolean;
  /** 是否在开发模式 */
  development?: boolean;
}

export interface ConversionResult {
  /** 渲染的 React 元素 */
  element: React.ReactElement;
  /** 节点映射器实例 */
  mapper: NodeIdMapper;
  /** 处理后的 mdast 树 */
  mdastTree: MdastNode;
  /** 处理后的 hast 树 */
  hastTree: HastNode;
  /** 转换统计信息 */
  stats: {
    totalNodes: number;
    processedNodes: number;
    renderTime: number;
  };
}

export class MdastReactMapper {
  private options: Required<MdastReactMapperOptions>;
  private mapper: NodeIdMapper;

  constructor(options: MdastReactMapperOptions = {}) {
    this.options = {
      idMarker: {},
      idRenderer: {},
      mapper: {},
      remarkRehype: { allowDangerousHtml: true },
      components: {},
      enableMapper: true,
      development: false,
      ...options,
    };

    this.mapper = new NodeIdMapper(this.options.mapper);
  }

  /**
   * 转换 mdast 树为 React 元素
   * @param mdastTree mdast 语法树
   * @returns 转换结果
   */
  convert(mdastTree: MdastNode): ConversionResult {
    const startTime = performance.now();

    // 1. 为 mdast 树添加 ID
    const processedMdastTree = this.addIdsToMdast(mdastTree);

    // 2. 构建映射关系（如果启用）
    if (this.options.enableMapper) {
      this.mapper.buildFromTree(processedMdastTree);
    }

    // 3. 转换 mdast → hast（ID会自动通过hProperties传递）
    const hastTree = this.convertMdastToHast(processedMdastTree);

    // 4. 转换 hast → React
    const element = this.convertHastToReact(hastTree);

    const endTime = performance.now();

    return {
      element,
      mapper: this.mapper,
      mdastTree: processedMdastTree,
      hastTree: hastTree,
      stats: {
        totalNodes: this.mapper.getAllIds().length,
        processedNodes: this.mapper.getAllIds().length,
        renderTime: endTime - startTime,
      },
    };
  }

  /**
   * 为 mdast 树添加 ID
   * @param mdastTree 原始 mdast 树
   * @returns 处理后的 mdast 树
   */
  private addIdsToMdast(mdastTree: MdastNode): MdastNode {
    // 创建副本避免修改原始树
    const treeCopy = JSON.parse(JSON.stringify(mdastTree));
    return markMdastWithIds(treeCopy, this.options.idMarker);
  }

  /**
   * 转换 mdast → hast
   * @param mdastTree 处理后的 mdast 树
   * @returns hast 树
   */
  private convertMdastToHast(mdastTree: MdastNode): HastNode {
    const processor = unified().use(remarkRehype, this.options.remarkRehype);
    return processor.runSync(mdastTree as any) as HastNode;
  }

  /**
   * 为 hast 树添加 data-mdast-id 属性
   * @param hastTree 原始 hast 树
   * @returns 处理后的 hast 树
   */
  private addIdsToHast(hastTree: HastNode): HastNode {
    return addIdAttributesToHast(hastTree, this.options.idRenderer);
  }

  /**
   * 转换 hast → React
   * @param hastTree 处理后的 hast 树
   * @returns React 元素
   */
  private convertHastToReact(hastTree: HastNode): React.ReactElement {
    return toJsxRuntime(hastTree as any, {
      Fragment: React.Fragment,
      jsx: jsx as any,
      jsxs: jsxs as any,
      components: this.options.components,
      passNode: this.options.development, // 开发模式传递节点信息
    });
  }

  /**
   * 根据 DOM 元素查找对应的 mdast 节点
   * @param element DOM 元素
   * @returns mdast 节点信息
   */
  findMdastNodeByElement(element: HTMLElement): MdastNode | null {
    const mdastId = element.getAttribute("data-mdast-id");
    if (!mdastId) return null;

    const mapping = this.mapper.getNodeById(mdastId);
    return mapping ? mapping.node : null;
  }

  /**
   * 根据 mdast 节点查找对应的 DOM 元素
   * @param node mdast 节点
   * @returns DOM 元素
   */
  findElementByMdastNode(node: MdastNode): HTMLElement | null {
    const nodeId = this.mapper.getIdByNode(node);
    if (!nodeId) return null;

    return document.querySelector(`[data-mdast-id="${nodeId}"]`) as HTMLElement;
  }

  /**
   * 获取映射器实例
   * @returns 节点映射器
   */
  getMapper(): NodeIdMapper {
    return this.mapper;
  }

  /**
   * 更新配置
   * @param options 新的配置选项
   */
  updateOptions(options: Partial<MdastReactMapperOptions>): void {
    this.options = { ...this.options, ...options };

    // 如果映射器选项更新，重新创建映射器
    if (options.mapper) {
      this.mapper = new NodeIdMapper(this.options.mapper);
    }
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  getOptions(): Required<MdastReactMapperOptions> {
    return { ...this.options };
  }

  /**
   * 清空映射器
   */
  clearMapper(): void {
    this.mapper.clear();
  }
}

/**
 * 创建 MdastReactMapper 实例的工厂函数
 * @param options 配置选项
 * @returns mapper 实例
 */
export function createMdastReactMapper(options?: MdastReactMapperOptions): MdastReactMapper {
  return new MdastReactMapper(options);
}

/**
 * 便捷函数：直接转换 mdast 为 React 元素
 * @param mdastTree mdast 语法树
 * @param options 配置选项
 * @returns React 元素
 */
export function mdastToReact(
  mdastTree: MdastNode,
  options?: MdastReactMapperOptions,
): React.ReactElement {
  const mapper = createMdastReactMapper(options);
  return mapper.convert(mdastTree).element;
}

/**
 * 便捷函数：转换并返回完整结果
 * @param mdastTree mdast 语法树
 * @param options 配置选项
 * @returns 完整转换结果
 */
export function mdastToReactWithMapping(
  mdastTree: MdastNode,
  options?: MdastReactMapperOptions,
): ConversionResult {
  const mapper = createMdastReactMapper(options);
  return mapper.convert(mdastTree);
}

// 预设配置
export const presets = {
  // 标准配置
  standard: {
    idMarker: { idOptions: { prefix: "mdast" } },
    idRenderer: { dataAttribute: "data-mdast-id" },
    mapper: { trackPaths: true, trackParents: true },
    enableMapper: true,
  },

  // 高性能配置（最小化映射）
  performance: {
    idMarker: { skipTypes: ["text"] },
    idRenderer: { includeTagNames: ["div", "span", "p"] },
    mapper: { trackPaths: false, trackParents: false },
    enableMapper: true,
  },

  // 开发模式配置
  development: {
    idMarker: { idOptions: { includeTimestamp: true } },
    idRenderer: { dataAttribute: "data-debug-mdast-id" },
    mapper: { trackPaths: true, trackParents: true },
    enableMapper: true,
    development: true,
  },

  // 禁用映射配置
  minimal: {
    idMarker: {},
    idRenderer: {},
    mapper: {},
    enableMapper: false,
  },
};
