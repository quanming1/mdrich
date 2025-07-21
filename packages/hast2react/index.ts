import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment } from "react";
// @ts-ignore
import { jsx, jsxs } from "react/jsx-runtime";
import { visit } from "unist-util-visit";
import { urlAttributes } from "html-url-attributes";

// 安全协议检查
const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

/**
 * 默认的 URL 转换函数，确保 URL 安全
 */
function defaultUrlTransform(value: string): string {
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");

  if (
    colon === -1 ||
    // 如果第一个冒号在 `?`, `#`, 或 `/` 之后，则不是协议
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value; // 返回原始 URL
  }

  return ""; // 不安全的 URL 返回空字符串
}

/**
 * hast 转 React 元素的选项
 */
interface HastToReactOptions {
  /** 允许的 HTML 元素列表 */
  allowedElements?: string[];
  /** 不允许的 HTML 元素列表 */
  disallowedElements?: string[];
  /** 自定义组件映射表 */
  components?: Record<string, React.ComponentType<any>>;
  /** 是否跳过原始 HTML */
  skipHtml?: boolean;
  /** 是否展开不允许的元素 */
  unwrapDisallowed?: boolean;
  /** URL 转换函数 */
  urlTransform?: (url: string, key: string, node: any) => string;
  /** 自定义元素过滤函数 */
  allowElement?: (element: any, index: number, parent: any) => boolean;
}

/**
 * 将 hast 树转换为 React 元素
 * @param hastTree hast 语法树（HTML AST）
 * @param options 转换选项
 * @returns React 元素
 */
export function hast2react(hastTree: any, options: HastToReactOptions = {}): React.ReactElement {
  const {
    allowedElements,
    allowElement,
    components,
    disallowedElements,
    skipHtml = true,
    unwrapDisallowed = true,
    urlTransform = defaultUrlTransform,
  } = options;

  // 检查互斥选项
  if (allowedElements && disallowedElements) {
    throw new Error(
      "Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other",
    );
  }

  // 创建 hast 树的副本以避免修改原始树
  const clonedHastTree = JSON.parse(JSON.stringify(hastTree));

  // 对 hast 树进行安全处理
  visit(clonedHastTree, transform);

  // 将 hast 转换为 React 元素
  return toJsxRuntime(clonedHastTree, {
    Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
  });

  /**
   * hast 节点转换函数
   */
  function transform(node: any, index: number, parent: any): number | void {
    // 处理原始 HTML 节点
    if (node.type === "raw" && parent && typeof index === "number") {
      if (skipHtml) {
        parent.children.splice(index, 1);
      } else {
        parent.children[index] = { type: "text", value: node.value };
      }
      return index;
    }

    // 处理元素节点的 URL 属性
    if (node.type === "element") {
      for (const key in urlAttributes) {
        if (
          Object.prototype.hasOwnProperty.call(urlAttributes, key) &&
          Object.prototype.hasOwnProperty.call(node.properties, key)
        ) {
          const value = node.properties[key];
          const test = urlAttributes[key];
          if (test === null || test.includes(node.tagName)) {
            node.properties[key] = urlTransform(String(value || ""), key, node);
          }
        }
      }
    }

    // 处理元素过滤
    if (node.type === "element") {
      let remove = allowedElements
        ? !allowedElements.includes(node.tagName)
        : disallowedElements
          ? disallowedElements.includes(node.tagName)
          : false;

      if (!remove && allowElement && typeof index === "number") {
        remove = !allowElement(node, index, parent);
      }

      if (remove && parent && typeof index === "number") {
        if (unwrapDisallowed && node.children) {
          parent.children.splice(index, 1, ...node.children);
        } else {
          parent.children.splice(index, 1);
        }
        return index;
      }
    }
  }
}
