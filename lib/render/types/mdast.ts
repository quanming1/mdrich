// MDAST节点基础类型定义
export interface BaseNode {
  type: string;
  position?: Position;
  data?: any;
}

export interface Position {
  start: Point;
  end: Point;
}

export interface Point {
  line: number;
  column: number;
  offset?: number;
}

// 根节点
export interface Root extends BaseNode {
  type: "root";
  children: RootContent[];
}

// 所有可能的根内容类型
export type RootContent =
  | Blockquote
  | Heading
  | Paragraph
  | List
  | ListItem
  | Code
  | Html
  | ThematicBreak;

// 所有可能的内联内容类型
export type PhrasingContent =
  | Text
  | Emphasis
  | Strong
  | Delete
  | InlineCode
  | Link
  | Image
  | Break
  | Html;

// 段落
export interface Paragraph extends BaseNode {
  type: "paragraph";
  children: PhrasingContent[];
}

// 标题
export interface Heading extends BaseNode {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: PhrasingContent[];
}

// 文本
export interface Text extends BaseNode {
  type: "text";
  value: string;
}

// 强调
export interface Emphasis extends BaseNode {
  type: "emphasis";
  children: PhrasingContent[];
}

// 加粗
export interface Strong extends BaseNode {
  type: "strong";
  children: PhrasingContent[];
}

// 删除线
export interface Delete extends BaseNode {
  type: "delete";
  children: PhrasingContent[];
}

// 内联代码
export interface InlineCode extends BaseNode {
  type: "inlineCode";
  value: string;
}

// 链接
export interface Link extends BaseNode {
  type: "link";
  url: string;
  title?: string;
  children: PhrasingContent[];
}

// 图片
export interface Image extends BaseNode {
  type: "image";
  url: string;
  title?: string;
  alt?: string;
}

// 换行
export interface Break extends BaseNode {
  type: "break";
}

// 引用
export interface Blockquote extends BaseNode {
  type: "blockquote";
  children: RootContent[];
}

// 列表
export interface List extends BaseNode {
  type: "list";
  ordered?: boolean;
  start?: number;
  spread?: boolean;
  children: ListItem[];
}

// 列表项
export interface ListItem extends BaseNode {
  type: "listItem";
  spread?: boolean;
  checked?: boolean | null;
  children: RootContent[];
}

// 代码块
export interface Code extends BaseNode {
  type: "code";
  lang?: string;
  meta?: string;
  value: string;
}

// HTML
export interface Html extends BaseNode {
  type: "html";
  value: string;
}

// 分割线
export interface ThematicBreak extends BaseNode {
  type: "thematicBreak";
}

// 联合类型
export type Node = Root | RootContent | PhrasingContent;

// 节点类型枚举
export const NodeType = {
  ROOT: "root",
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  TEXT: "text",
  EMPHASIS: "emphasis",
  STRONG: "strong",
  DELETE: "delete",
  INLINE_CODE: "inlineCode",
  LINK: "link",
  IMAGE: "image",
  BREAK: "break",
  BLOCKQUOTE: "blockquote",
  LIST: "list",
  LIST_ITEM: "listItem",
  CODE: "code",
  HTML: "html",
  THEMATIC_BREAK: "thematicBreak",
} as const;

export type NodeTypeName = (typeof NodeType)[keyof typeof NodeType];
