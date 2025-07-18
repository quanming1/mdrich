import React from "react";
import * as MDAST from "./mdast";

// 基础渲染器props
export interface BaseRenderProps {
  node: MDAST.Node;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// 根节点渲染props
export interface RootRenderProps extends BaseRenderProps {
  node: MDAST.Root;
}

// 段落渲染props
export interface ParagraphRenderProps extends BaseRenderProps {
  node: MDAST.Paragraph;
}

// 标题渲染props
export interface HeadingRenderProps extends BaseRenderProps {
  node: MDAST.Heading;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

// 文本渲染props
export interface TextRenderProps extends BaseRenderProps {
  node: MDAST.Text;
  value: string;
}

// 强调渲染props
export interface EmphasisRenderProps extends BaseRenderProps {
  node: MDAST.Emphasis;
}

// 加粗渲染props
export interface StrongRenderProps extends BaseRenderProps {
  node: MDAST.Strong;
}

// 删除线渲染props
export interface DeleteRenderProps extends BaseRenderProps {
  node: MDAST.Delete;
}

// 内联代码渲染props
export interface InlineCodeRenderProps extends BaseRenderProps {
  node: MDAST.InlineCode;
  value: string;
}

// 链接渲染props
export interface LinkRenderProps extends BaseRenderProps {
  node: MDAST.Link;
  href: string;
  title?: string;
}

// 图片渲染props
export interface ImageRenderProps extends BaseRenderProps {
  node: MDAST.Image;
  src: string;
  alt?: string;
  title?: string;
}

// 换行渲染props
export interface BreakRenderProps extends BaseRenderProps {
  node: MDAST.Break;
}

// 引用渲染props
export interface BlockquoteRenderProps extends BaseRenderProps {
  node: MDAST.Blockquote;
}

// 列表渲染props
export interface ListRenderProps extends BaseRenderProps {
  node: MDAST.List;
  ordered: boolean;
  start?: number;
}

// 列表项渲染props
export interface ListItemRenderProps extends BaseRenderProps {
  node: MDAST.ListItem;
  checked?: boolean | null;
}

// 代码块渲染props
export interface CodeRenderProps extends BaseRenderProps {
  node: MDAST.Code;
  language?: string;
  value: string;
}

// HTML渲染props
export interface HtmlRenderProps extends BaseRenderProps {
  node: MDAST.Html;
  value: string;
}

// 分割线渲染props
export interface ThematicBreakRenderProps extends BaseRenderProps {
  node: MDAST.ThematicBreak;
}

// 渲染函数类型
export type RootRenderer = (props: RootRenderProps) => React.ReactElement;
export type ParagraphRenderer = (props: ParagraphRenderProps) => React.ReactElement;
export type HeadingRenderer = (props: HeadingRenderProps) => React.ReactElement;
export type TextRenderer = (props: TextRenderProps) => React.ReactElement;
export type EmphasisRenderer = (props: EmphasisRenderProps) => React.ReactElement;
export type StrongRenderer = (props: StrongRenderProps) => React.ReactElement;
export type DeleteRenderer = (props: DeleteRenderProps) => React.ReactElement;
export type InlineCodeRenderer = (props: InlineCodeRenderProps) => React.ReactElement;
export type LinkRenderer = (props: LinkRenderProps) => React.ReactElement;
export type ImageRenderer = (props: ImageRenderProps) => React.ReactElement;
export type BreakRenderer = (props: BreakRenderProps) => React.ReactElement;
export type BlockquoteRenderer = (props: BlockquoteRenderProps) => React.ReactElement;
export type ListRenderer = (props: ListRenderProps) => React.ReactElement;
export type ListItemRenderer = (props: ListItemRenderProps) => React.ReactElement;
export type CodeRenderer = (props: CodeRenderProps) => React.ReactElement;
export type HtmlRenderer = (props: HtmlRenderProps) => React.ReactElement;
export type ThematicBreakRenderer = (props: ThematicBreakRenderProps) => React.ReactElement;

// 渲染器集合接口
export interface Renderers {
  root?: RootRenderer;
  paragraph?: ParagraphRenderer;
  heading?: HeadingRenderer;
  text?: TextRenderer;
  emphasis?: EmphasisRenderer;
  strong?: StrongRenderer;
  delete?: DeleteRenderer;
  inlineCode?: InlineCodeRenderer;
  link?: LinkRenderer;
  image?: ImageRenderer;
  break?: BreakRenderer;
  blockquote?: BlockquoteRenderer;
  list?: ListRenderer;
  listItem?: ListItemRenderer;
  code?: CodeRenderer;
  html?: HtmlRenderer;
  thematicBreak?: ThematicBreakRenderer;
}

// 渲染器配置
export interface RendererConfig {
  renderers?: Renderers;
  className?: string;
  style?: React.CSSProperties;
  // 是否启用HTML渲染（安全考虑）
  allowDangerousHtml?: boolean;
  // 自定义处理未知节点类型
  unknownNodeHandler?: (node: MDAST.Node) => React.ReactElement | null;
}

// 渲染上下文
export interface RendererContext {
  config: RendererConfig;
  depth: number;
  parentNode?: MDAST.Node;
}

// Hook返回类型
export interface UseRendererResult {
  render: (tree: MDAST.Root) => React.ReactElement;
  config: RendererConfig;
  updateConfig: (config: Partial<RendererConfig>) => void;
}
