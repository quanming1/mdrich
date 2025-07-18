import React, { createContext, useContext, useMemo } from "react";
import * as MDAST from "../types/mdast";
import * as Renderer from "../types/renderer";
import * as NodeUtils from "../utils/node-utils";

// 渲染上下文
const RendererContext = createContext<Renderer.RendererContext | null>(null);

// Hook for accessing renderer context
export const useRendererContext = (): Renderer.RendererContext => {
  const context = useContext(RendererContext);
  if (!context) {
    throw new Error("useRendererContext must be used within a RendererProvider");
  }
  return context;
};

// 渲染提供者组件
export const RendererProvider: React.FC<{
  config: Renderer.RendererConfig;
  depth?: number;
  parentNode?: MDAST.Node;
  children: React.ReactNode;
}> = ({ config, depth = 0, parentNode, children }) => {
  const contextValue = useMemo(
    () => ({
      config,
      depth,
      parentNode,
    }),
    [config, depth, parentNode],
  );

  return <RendererContext.Provider value={contextValue}>{children}</RendererContext.Provider>;
};

// 核心渲染器组件
export const NodeRenderer: React.FC<{
  node: MDAST.Node;
  key?: string | number;
}> = ({ node, key }) => {
  const context = useRendererContext();
  const { config } = context;

  // 渲染子节点的函数
  const renderChildren = (children: MDAST.Node[]): React.ReactNode => {
    return children.map((child, index) => (
      <RendererProvider key={index} config={config} depth={context.depth + 1} parentNode={node}>
        <NodeRenderer node={child} key={index} />
      </RendererProvider>
    ));
  };

  // 根据节点类型选择渲染器
  const selectRenderer = (node: MDAST.Node) => {
    const renderers = config.renderers || {};

    switch (node.type) {
      case "root":
        return renderers.root;
      case "paragraph":
        return renderers.paragraph;
      case "heading":
        return renderers.heading;
      case "text":
        return renderers.text;
      case "emphasis":
        return renderers.emphasis;
      case "strong":
        return renderers.strong;
      case "delete":
        return renderers.delete;
      case "inlineCode":
        return renderers.inlineCode;
      case "link":
        return renderers.link;
      case "image":
        return renderers.image;
      case "break":
        return renderers.break;
      case "blockquote":
        return renderers.blockquote;
      case "list":
        return renderers.list;
      case "listItem":
        return renderers.listItem;
      case "code":
        return renderers.code;
      case "html":
        return renderers.html;
      case "thematicBreak":
        return renderers.thematicBreak;
      default:
        return null;
    }
  };

  // 创建基础props
  const createBaseProps = (node: MDAST.Node): Renderer.BaseRenderProps => ({
    node,
    className: config.className,
    style: config.style,
  });

  // 渲染节点
  const renderNode = (): React.ReactElement => {
    const renderer = selectRenderer(node);

    // 如果没有找到对应的渲染器，使用默认处理
    if (!renderer) {
      if (config.unknownNodeHandler) {
        const result = config.unknownNodeHandler(node);
        if (result) return result;
      }

      // 默认渲染：如果有子节点就渲染子节点，否则返回空
      if (NodeUtils.hasChildren(node)) {
        return <>{renderChildren(node.children)}</>;
      }

      return <span data-unknown-node={node.type} />;
    }

    // 根据节点类型创建特定的props并调用渲染器
    switch (node.type) {
      case "root": {
        const props: Renderer.RootRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Root,
          children: NodeUtils.hasChildren(node) ? renderChildren(node.children) : undefined,
        };
        return (renderer as Renderer.RootRenderer)(props);
      }

      case "paragraph": {
        const props: Renderer.ParagraphRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Paragraph,
          children: renderChildren((node as MDAST.Paragraph).children),
        };
        return (renderer as Renderer.ParagraphRenderer)(props);
      }

      case "heading": {
        const headingNode = node as MDAST.Heading;
        const props: Renderer.HeadingRenderProps = {
          ...createBaseProps(node),
          node: headingNode,
          level: headingNode.depth,
          children: renderChildren(headingNode.children),
        };
        return (renderer as Renderer.HeadingRenderer)(props);
      }

      case "text": {
        const textNode = node as MDAST.Text;
        const props: Renderer.TextRenderProps = {
          ...createBaseProps(node),
          node: textNode,
          value: textNode.value,
        };
        return (renderer as Renderer.TextRenderer)(props);
      }

      case "emphasis": {
        const props: Renderer.EmphasisRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Emphasis,
          children: renderChildren((node as MDAST.Emphasis).children),
        };
        return (renderer as Renderer.EmphasisRenderer)(props);
      }

      case "strong": {
        const props: Renderer.StrongRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Strong,
          children: renderChildren((node as MDAST.Strong).children),
        };
        return (renderer as Renderer.StrongRenderer)(props);
      }

      case "delete": {
        const props: Renderer.DeleteRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Delete,
          children: renderChildren((node as MDAST.Delete).children),
        };
        return (renderer as Renderer.DeleteRenderer)(props);
      }

      case "inlineCode": {
        const codeNode = node as MDAST.InlineCode;
        const props: Renderer.InlineCodeRenderProps = {
          ...createBaseProps(node),
          node: codeNode,
          value: codeNode.value,
        };
        return (renderer as Renderer.InlineCodeRenderer)(props);
      }

      case "link": {
        const linkNode = node as MDAST.Link;
        const props: Renderer.LinkRenderProps = {
          ...createBaseProps(node),
          node: linkNode,
          href: linkNode.url,
          title: linkNode.title,
          children: renderChildren(linkNode.children),
        };
        return (renderer as Renderer.LinkRenderer)(props);
      }

      case "image": {
        const imageNode = node as MDAST.Image;
        const props: Renderer.ImageRenderProps = {
          ...createBaseProps(node),
          node: imageNode,
          src: imageNode.url,
          alt: imageNode.alt,
          title: imageNode.title,
        };
        return (renderer as Renderer.ImageRenderer)(props);
      }

      case "break": {
        const props: Renderer.BreakRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Break,
        };
        return (renderer as Renderer.BreakRenderer)(props);
      }

      case "blockquote": {
        const props: Renderer.BlockquoteRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.Blockquote,
          children: renderChildren((node as MDAST.Blockquote).children),
        };
        return (renderer as Renderer.BlockquoteRenderer)(props);
      }

      case "list": {
        const listNode = node as MDAST.List;
        const props: Renderer.ListRenderProps = {
          ...createBaseProps(node),
          node: listNode,
          ordered: listNode.ordered || false,
          start: listNode.start,
          children: renderChildren(listNode.children),
        };
        return (renderer as Renderer.ListRenderer)(props);
      }

      case "listItem": {
        const listItemNode = node as MDAST.ListItem;
        const props: Renderer.ListItemRenderProps = {
          ...createBaseProps(node),
          node: listItemNode,
          checked: listItemNode.checked,
          children: renderChildren(listItemNode.children),
        };
        return (renderer as Renderer.ListItemRenderer)(props);
      }

      case "code": {
        const codeNode = node as MDAST.Code;
        const props: Renderer.CodeRenderProps = {
          ...createBaseProps(node),
          node: codeNode,
          language: codeNode.lang,
          value: codeNode.value,
        };
        return (renderer as Renderer.CodeRenderer)(props);
      }

      case "html": {
        const htmlNode = node as MDAST.Html;
        const props: Renderer.HtmlRenderProps = {
          ...createBaseProps(node),
          node: htmlNode,
          value: htmlNode.value,
        };
        return (renderer as Renderer.HtmlRenderer)(props);
      }

      case "thematicBreak": {
        const props: Renderer.ThematicBreakRenderProps = {
          ...createBaseProps(node),
          node: node as MDAST.ThematicBreak,
        };
        return (renderer as Renderer.ThematicBreakRenderer)(props);
      }

      default:
        // 这种情况不应该出现，因为我们已经在前面检查过了
        return <span data-unknown-node={(node as any).type} />;
    }
  };

  return renderNode();
};

// 主渲染函数
export const renderMDAST = (
  tree: MDAST.Root,
  config: Renderer.RendererConfig = {},
): React.ReactElement => {
  return (
    <RendererProvider config={config} depth={0}>
      <NodeRenderer node={tree} key="root" />
    </RendererProvider>
  );
};
