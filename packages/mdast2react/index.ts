import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment } from "react";
// @ts-ignore
import { jsx, jsxs } from "react/jsx-runtime";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { urlAttributes } from "html-url-attributes";

const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

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

interface MdastToReactOptions {
  allowedElements?: string[]; // 允许的 HTML 元素列表
  disallowedElements?: string[]; // 不允许的 HTML 元素列表
  components?: Record<string, React.ComponentType<any>>; // 自定义组件映射表
  skipHtml?: boolean; // 是否跳过原始 HTML
  unwrapDisallowed?: boolean; // 是否展开不允许的元素
  urlTransform?: (url: string, key: string, node: any) => string; // URL 转换函数
  allowElement?: (element: any, index: number, parent: any) => boolean; // 自定义元素过滤函数
  remarkRehypeOptions?: any; // remark-rehype 转换选项
}

export function mdast2react(mdastTree: any, options: MdastToReactOptions = {}): React.ReactElement {
  const {
    allowedElements,
    allowElement,
    components,
    disallowedElements,
    skipHtml = true,
    unwrapDisallowed = true,
    urlTransform = defaultUrlTransform,
    remarkRehypeOptions = { allowDangerousHtml: true },
  } = options; // 解构选项参数

  if (allowedElements && disallowedElements) {
    throw new Error(
      "Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other",
    );
  }

  const processor = unified().use(remarkRehype, remarkRehypeOptions);
  const hastTree = processor.runSync(mdastTree);
  visit(hastTree, transform);
  // 将 hast 转换为 React 元素
  return toJsxRuntime(hastTree, {
    Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
  });

  function transform(node: any, index: number, parent: any): number | void {
    if (node.type === "raw" && parent && typeof index === "number") {
      if (skipHtml) {
        parent.children.splice(index, 1);
      } else {
        parent.children[index] = { type: "text", value: node.value };
      }
      return index;
    }

    if (node.type === "element") {
      for (const key in urlAttributes) {
        if (
          Object.prototype.hasOwnProperty.call(urlAttributes, key) &&
          Object.prototype.hasOwnProperty.call(node.properties, key)
        ) {
          const value = node.properties[key]; // 获取属性值
          const test = urlAttributes[key]; // 获取属性测试条件
          if (test === null || test.includes(node.tagName)) {
            node.properties[key] = urlTransform(String(value || ""), key, node); // 转换 URL
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
