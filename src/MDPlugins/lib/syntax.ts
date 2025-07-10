/**
 * 数学语法扩展的类型定义
 */
interface Options {
  singleDollarTextMath?: boolean;
}

interface Extension {
  flow: Record<number, any>;
  text: Record<number, any>;
}

// 使用any类型避免模块解析问题
const codes: any = require("micromark-util-symbol").codes;
const mathFlow: any = require("./math-flow.ts").mathFlow;
const mathText: any = require("./math-text.ts").mathText;

/**
 * 为 `micromark` 创建扩展以启用数学语法。
 *
 * @param options 配置选项 (默认: `{}`)
 * @returns 可以传递给 `extensions` 的 `micromark` 扩展，用于启用数学语法
 */
function main(options?: Options | null | undefined): Extension {
  return {
    flow: { ["=".charCodeAt(0)]: mathFlow },
    text: { ["=".charCodeAt(0)]: mathText(options) },
  };
}

export const mathExt = function () {
  const data = this.data();
  // 注册 micromark 扩展
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(main());
};
