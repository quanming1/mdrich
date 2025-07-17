export enum TextTokenType {
  Text = "Text",
  Delimiter = "Delimiter", // 定界符
  StyleDelimiter = "StyleDelimiter", // 样式定界符
  TextContent = "TextContent", // 文字内容
  StyleContent = "StyleContent", // 样式内容
}

export const textCode = "=".charCodeAt(0);
