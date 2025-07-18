import React from "react";
import * as Renderer from "../types/renderer";

// 默认根节点渲染器
export const DefaultRoot: Renderer.RootRenderer = ({ children, className, style }) => (
  <div className={className} style={style} data-mdast-root>
    {children}
  </div>
);

// 默认段落渲染器
export const DefaultParagraph: Renderer.ParagraphRenderer = ({ children, className, style }) => (
  <p className={className} style={style}>
    {children}
  </p>
);

// 默认标题渲染器
export const DefaultHeading: Renderer.HeadingRenderer = ({ level, children, className, style }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
};

// 默认文本渲染器
export const DefaultText: Renderer.TextRenderer = ({ value }) => <>{value}</>;

// 默认强调渲染器
export const DefaultEmphasis: Renderer.EmphasisRenderer = ({ children, className, style }) => (
  <em className={className} style={style}>
    {children}
  </em>
);

// 默认加粗渲染器
export const DefaultStrong: Renderer.StrongRenderer = ({ children, className, style }) => (
  <strong className={className} style={style}>
    {children}
  </strong>
);

// 默认删除线渲染器
export const DefaultDelete: Renderer.DeleteRenderer = ({ children, className, style }) => (
  <del className={className} style={style}>
    {children}
  </del>
);

// 默认内联代码渲染器
export const DefaultInlineCode: Renderer.InlineCodeRenderer = ({ value, className, style }) => (
  <code className={className} style={style}>
    {value}
  </code>
);

// 默认链接渲染器
export const DefaultLink: Renderer.LinkRenderer = ({ href, title, children, className, style }) => (
  <a
    href={href}
    title={title}
    className={className}
    style={style}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

// 默认图片渲染器
export const DefaultImage: Renderer.ImageRenderer = ({ src, alt, title, className, style }) => (
  <img src={src} alt={alt} title={title} className={className} style={style} />
);

// 默认换行渲染器
export const DefaultBreak: Renderer.BreakRenderer = ({ className, style }) => (
  <br className={className} style={style} />
);

// 默认引用渲染器
export const DefaultBlockquote: Renderer.BlockquoteRenderer = ({ children, className, style }) => (
  <blockquote className={className} style={style}>
    {children}
  </blockquote>
);

// 默认列表渲染器
export const DefaultList: Renderer.ListRenderer = ({
  ordered,
  start,
  children,
  className,
  style,
}) => {
  if (ordered) {
    return (
      <ol start={start} className={className} style={style}>
        {children}
      </ol>
    );
  }

  return (
    <ul className={className} style={style}>
      {children}
    </ul>
  );
};

// 默认列表项渲染器
export const DefaultListItem: Renderer.ListItemRenderer = ({
  checked,
  children,
  className,
  style,
}) => {
  // 如果是任务列表项
  if (checked !== null && checked !== undefined) {
    return (
      <li className={className} style={style}>
        <input type="checkbox" checked={checked} disabled style={{ marginRight: "0.5em" }} />
        {children}
      </li>
    );
  }

  return (
    <li className={className} style={style}>
      {children}
    </li>
  );
};

// 默认代码块渲染器
export const DefaultCode: Renderer.CodeRenderer = ({ language, value, className, style }) => (
  <pre className={className} style={style}>
    <code className={language ? `language-${language}` : undefined}>{value}</code>
  </pre>
);

// 默认HTML渲染器
export const DefaultHtml: Renderer.HtmlRenderer = ({ value, className, style, node }) => {
  const context = React.useContext(
    React.createContext<{ allowDangerousHtml?: boolean }>({ allowDangerousHtml: false }),
  );

  // 只有在明确允许的情况下才渲染HTML
  if (context?.allowDangerousHtml) {
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: value }} />;
  }

  // 默认情况下将HTML作为文本显示
  return (
    <pre className={className} style={style}>
      {value}
    </pre>
  );
};

// 默认分割线渲染器
export const DefaultThematicBreak: Renderer.ThematicBreakRenderer = ({ className, style }) => (
  <hr className={className} style={style} />
);

// 默认渲染器集合
export const defaultRenderers: Renderer.Renderers = {
  root: DefaultRoot,
  paragraph: DefaultParagraph,
  heading: DefaultHeading,
  text: DefaultText,
  emphasis: DefaultEmphasis,
  strong: DefaultStrong,
  delete: DefaultDelete,
  inlineCode: DefaultInlineCode,
  link: DefaultLink,
  image: DefaultImage,
  break: DefaultBreak,
  blockquote: DefaultBlockquote,
  list: DefaultList,
  listItem: DefaultListItem,
  code: DefaultCode,
  html: DefaultHtml,
  thematicBreak: DefaultThematicBreak,
};

// 预设配置
export const defaultConfig: Renderer.RendererConfig = {
  renderers: defaultRenderers,
  allowDangerousHtml: false,
  unknownNodeHandler: (node) => {
    console.warn(`Unknown MDAST node type: ${node.type}`, node);
    return <span data-unknown-node={node.type}>[Unknown: {node.type}]</span>;
  },
};

// 安全配置（禁用HTML渲染）
export const safeConfig: Renderer.RendererConfig = {
  ...defaultConfig,
  allowDangerousHtml: false,
};

// 完整配置（允许HTML渲染）
export const fullConfig: Renderer.RendererConfig = {
  ...defaultConfig,
  allowDangerousHtml: true,
};
