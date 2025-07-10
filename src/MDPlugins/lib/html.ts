/**
 * HTML选项接口
 */
interface HtmlOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
  macros?: any;
  colorIsTextColor?: boolean;
  maxSize?: number;
  maxExpand?: number;
  allowedProtocols?: string[];
  strict?: boolean | string | ((errorCode: string) => boolean);
  trust?: boolean | ((context: any) => boolean);
  fleqn?: boolean;
  leqno?: boolean;
  output?: "html" | "mathml" | "htmlAndMathml";
}

/**
 * HTML扩展接口
 */
interface HtmlExtension {
  enter: Record<string, (() => void) | (() => any)>;
  exit: Record<string, (() => void) | ((token?: any) => void)>;
}

import katex from "katex";

const renderToString = katex.renderToString;

/**
 * 为 `micromark` 创建扩展以在序列化为 HTML 时支持数学。
 *
 * > 👉 **注意**: 这使用 KaTeX 来渲染数学。
 *
 * @param options 配置 (默认: `{}`)
 * @returns 可以传递给 `htmlExtensions` 的 `micromark` 扩展，用于在序列化为 HTML 时支持数学
 */
export function mathHtml(options?: HtmlOptions | null | undefined): HtmlExtension {
  return {
    enter: {
      mathFlow(): void {
        (this as any).lineEndingIfNeeded();
        (this as any).tag('<div class="math math-display">');
      },
      mathFlowFenceMeta(): void {
        (this as any).buffer();
      },
      mathText(): void {
        // 双重？

        (this as any).tag('<span class="math math-inline">');
        (this as any).buffer();
      },
    },
    exit: {
      mathFlow(): void {
        const value = (this as any).resume();
        (this as any).tag(math(value.replace(/(?:\r?\n|\r)$/, ""), true));
        (this as any).tag("</div>");
        (this as any).setData("mathFlowOpen");
        (this as any).setData("slurpOneLineEnding");
      },
      mathFlowFence(): void {
        // 在第一个栅栏之后。
        if (!(this as any).getData("mathFlowOpen")) {
          (this as any).setData("mathFlowOpen", true);
          (this as any).setData("slurpOneLineEnding", true);
          (this as any).buffer();
        }
      },
      mathFlowFenceMeta(): void {
        (this as any).resume();
      },
      mathFlowValue(token?: any): void {
        (this as any).raw((this as any).sliceSerialize(token));
      },
      mathText(): void {
        const value = (this as any).resume();
        (this as any).tag(math(value, false));
        (this as any).tag("</span>");
      },
      mathTextData(token?: any): void {
        (this as any).raw((this as any).sliceSerialize(token));
      },
    },
  };

  /**
   * 渲染数学公式
   * @param value 数学文本
   * @param displayMode 是否为显示模式
   * @returns HTML字符串
   */
  function math(value: string, displayMode: boolean): string {
    return renderToString(value, { ...(options as any), displayMode });
  }
}
