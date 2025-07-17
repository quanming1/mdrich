// 重新导出核心功能
export { default, mdastDebugPlugin, PathUtils, ASTNode } from "./core/index";

// 重新导出组件
export { customMarkdownComponents, DOMMapper } from "./components/customComponents";

// 重新导出工具函数
export { stringToPath, pathToString } from "./utils/pathUtils";

// 重新导出Selection系统
export {
  Point,
  Range,
  Selection,
  PointUtils,
  RangeUtils,
  SelectionUtils,
  DOMSelectionConverter,
} from "./utils/selection";
