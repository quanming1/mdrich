// 主要类型导出
export * from "./types/mdast";
export * from "./types/renderer";

// 核心渲染功能
export { renderMDAST, NodeRenderer, RendererProvider, useRendererContext } from "./core/renderer";

// 导入用于便捷函数
import { renderMDAST as _renderMDAST } from "./core/renderer";

// 默认组件和配置
export {
  // 默认渲染器
  DefaultRoot,
  DefaultParagraph,
  DefaultHeading,
  DefaultText,
  DefaultEmphasis,
  DefaultStrong,
  DefaultDelete,
  DefaultInlineCode,
  DefaultLink,
  DefaultImage,
  DefaultBreak,
  DefaultBlockquote,
  DefaultList,
  DefaultListItem,
  DefaultCode,
  DefaultHtml,
  DefaultThematicBreak,

  // 渲染器集合和预设配置
  defaultRenderers,
  defaultConfig,
  safeConfig,
  fullConfig,
} from "./components/defaults";

// React Hooks
export {
  useMDASTRenderer,
  useRendererConfig,
  useMemoizedRenderer,
  useCustomRenderer,
  useSafeRenderer,
  useFullRenderer,
  withRenderer,
  MDRenderer,
  useMDASTDebug,
} from "./hooks/use-mdast-renderer";

// 工具函数
export {
  // 节点类型检查
  isRoot,
  isParagraph,
  isHeading,
  isText,
  isEmphasis,
  isStrong,
  isDelete,
  isInlineCode,
  isLink,
  isImage,
  isBreak,
  isBlockquote,
  isList,
  isListItem,
  isCode,
  isHtml,
  isThematicBreak,

  // 节点操作
  hasChildren,
  isLeafNode,
  isBlockNode,
  isInlineNode,
  getNodeDisplayName,

  // 树操作
  walkTree,
  findNode,
  findAllNodes,
  transformTree,
  getNodePath,
  getNodeByPath,
} from "./utils/node-utils";

// 便捷函数
export const createRenderer = (config?: import("./types/renderer").RendererConfig) => {
  return (tree: import("./types/mdast").Root) => _renderMDAST(tree, config);
};

// 版本信息
export const VERSION = "1.0.0";
