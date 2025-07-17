import React, { ReactNode } from "react";

/**
 * 基础组件属性类型
 */
interface BaseComponentProps {
  children?: ReactNode;
  node?: any;
  value?: string;
  href?: string;
  [key: string]: any;
}

/**
 * 简化的路径组件包装器
 */
function withPathFromNode<T extends BaseComponentProps>(
  Component: React.ComponentType<T>,
  nodeType: string,
) {
  return function PathAwareComponent(props: T) {
    const { node, ...otherProps } = props;

    // 从节点的data.hProperties中获取路径信息
    const pathInfo = node?.data?.hProperties || {};

    // 合并路径属性
    const enhancedProps = {
      ...otherProps,
      ...pathInfo,
    } as T;

    return <Component {...enhancedProps} />;
  };
}

/**
 * 自定义 ReactMarkdown 组件
 */
export const customMarkdownComponents = {
  // 段落
  p: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <p {...props}>{children}</p>,
    "paragraph",
  ),

  // 标题
  h1: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <h1 {...props}>{children}</h1>,
    "heading",
  ),

  h2: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <h2 {...props}>{children}</h2>,
    "heading",
  ),

  h3: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <h3 {...props}>{children}</h3>,
    "heading",
  ),

  h4: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <h4 {...props}>{children}</h4>,
    "heading",
  ),

  h5: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <h5 {...props}>{children}</h5>,
    "heading",
  ),

  h6: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <h6 {...props}>{children}</h6>,
    "heading",
  ),

  // 强调
  strong: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <strong {...props}>{children}</strong>,
    "strong",
  ),

  // 斜体
  em: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <em {...props}>{children}</em>,
    "emphasis",
  ),

  // 代码
  code: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <code {...props}>{children}</code>,
    "inlineCode",
  ),

  // 代码块
  pre: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <pre {...props}>{children}</pre>,
    "code",
  ),

  // 链接
  a: withPathFromNode(
    ({ children, href, ...props }: BaseComponentProps) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
    "link",
  ),

  // 列表
  ul: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <ul {...props}>{children}</ul>,
    "list",
  ),

  ol: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <ol {...props}>{children}</ol>,
    "list",
  ),

  li: withPathFromNode(
    ({ children, ...props }: BaseComponentProps) => <li {...props}>{children}</li>,
    "listItem",
  ),

  // 自定义TextContent组件
  TextContent: withPathFromNode(({ children, node, ...props }: BaseComponentProps) => {
    const style = node?.data?.hProperties?.style || {};

    return (
      <span style={style} className="custom-text-content" {...props}>
        {children}
      </span>
    );
  }, "TextContent"),
};

/**
 * 简化的 DOM 到 AST 路径查找工具
 */
export class DOMToASTMapper {
  /**
   * 从 DOM 元素获取 AST 路径
   * @param element DOM 元素
   * @returns AST 路径字符串
   */
  static getDOMPath(element: Element): string | null {
    // 向上查找最近的带有 data-ast-path 属性的元素
    let current = element;
    while (current && current !== document.body) {
      const astPath = current.getAttribute("data-ast-path");
      if (astPath) {
        return astPath;
      }
      current = current.parentElement!;
    }
    return null;
  }

  /**
   * 获取 DOM 元素的 AST 节点类型
   * @param element DOM 元素
   * @returns AST 节点类型
   */
  static getDOMNodeType(element: Element): string | null {
    let current = element;
    while (current && current !== document.body) {
      const astType = current.getAttribute("data-ast-type");
      if (astType) {
        return astType;
      }
      current = current.parentElement!;
    }
    return null;
  }

  /**
   * 从选择中获取 AST 节点信息
   * @param selection 浏览器选择对象
   * @returns AST 节点信息
   */
  static getNodeFromSelection(selection: globalThis.Selection): {
    path: string | null;
    nodeType: string | null;
    element: Element | null;
  } | null {
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;

    // 如果是文本节点，获取其父元素
    const element =
      startContainer.nodeType === Node.TEXT_NODE
        ? startContainer.parentElement
        : (startContainer as Element);

    if (!element) {
      return null;
    }

    return {
      path: this.getDOMPath(element),
      nodeType: this.getDOMNodeType(element),
      element: element,
    };
  }
}

// 导出工具函数
export { DOMToASTMapper as DOMMapper };
