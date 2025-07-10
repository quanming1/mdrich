/**
 * 数学文本类型定义
 */
interface Options {
  singleDollarTextMath?: boolean | null;
}

interface Construct {
  tokenize: any;
  resolve?: any;
  previous?: any;
  name?: string;
}

interface Previous {
  (code: number | null): boolean;
}

interface Resolver {
  (events: any[]): any[];
}

type State = (code: number | null) => State | void;

interface Token {
  type: string;
  start?: any;
  end?: any;
}

interface TokenizeContext {
  events: any[];
  previous: number | null;
}

interface Tokenizer {
  (effects: any, ok: State, nok: State): State;
}

// 待办事项：下一个主要版本：清理HTML编译器中的空格。
// 这必须与 `mdast-util-math` 协调。

// 使用any类型避免模块解析问题
const assert: any = require("devlop").ok;
const markdownLineEnding: any = require("micromark-util-character").markdownLineEnding;
const codes: any = require("micromark-util-symbol").codes;
const types: any = require("micromark-util-symbol").types;

/**
 * 创建数学文本构造器
 * @param options 配置 (默认: `{}`)
 * @returns 构造器
 */
export function mathText(options?: Options | null | undefined): Construct {
  const options_ = options || {};
  let single = options_.singleDollarTextMath;

  if (single === null || single === undefined) {
    single = true;
  }

  return {
    tokenize: tokenizeMathText,
    resolve: resolveMathText,
    previous,
    name: "mathText",
  };

  /**
   * 数学文本标记器
   */
  function tokenizeMathText(this: TokenizeContext, effects: any, ok: State, nok: State): State {
    const self = this;
    let sizeOpen = 0;
    /** 大小 */
    let size: number;
    /** 令牌 */
    let token: Token;

    return start;

    /**
     * 数学（文本）开始。
     */
    function start(code: number | null): State | void {
      assert(code === "=".charCodeAt(0), "expected `$`");
      assert(previous.call(self, self.previous), "expected correct previous");
      effects.enter("mathText");
      effects.enter("mathTextSequence");
      return sequenceOpen(code);
    }

    /**
     * 在开始序列中。
     */
    function sequenceOpen(code: number | null): State | void {
      if (code === "=".charCodeAt(0)) {
        effects.consume(code);
        sizeOpen++;
        return sequenceOpen;
      }

      // 序列中的标记不够。
      if (sizeOpen < 2 && !single) {
        return nok(code);
      }

      effects.exit("mathTextSequence");
      return between(code);
    }

    /**
     * 在某物和其他东西之间。
     */
    function between(code: number | null): State | void {
      if (code === codes.eof) {
        return nok(code);
      }

      if (code === "=".charCodeAt(0)) {
        token = effects.enter("mathTextSequence");
        size = 0;
        return sequenceClose(code);
      }

      // 制表符不起作用，虚拟空格没有意义。
      if (code === codes.space) {
        effects.enter("space");
        effects.consume(code);
        effects.exit("space");
        return between;
      }

      if (markdownLineEnding(code)) {
        effects.enter(types.lineEnding);
        effects.consume(code);
        effects.exit(types.lineEnding);
        return between;
      }

      // 数据。
      effects.enter("mathTextData");
      return data(code);
    }

    /**
     * 在数据中。
     */
    function data(code: number | null): State | void {
      if (
        code === codes.eof ||
        code === codes.space ||
        code === "=".charCodeAt(0) ||
        markdownLineEnding(code)
      ) {
        effects.exit("mathTextData");
        return between(code);
      }

      effects.consume(code);
      return data;
    }

    /**
     * 在关闭序列中。
     */
    function sequenceClose(code: number | null): State | void {
      // 更多。
      if (code === "=".charCodeAt(0)) {
        effects.consume(code);
        size++;
        return sequenceClose;
      }

      // 完成！
      if (size === sizeOpen) {
        effects.exit("mathTextSequence");
        effects.exit("mathText");
        return ok(code);
      }

      // 更多或更少的重音：标记为数据。
      token.type = "mathTextData";
      return data(code);
    }
  }
}

/** 解析数学文本 */
function resolveMathText(events: any[]): any[] {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  /** 索引 */
  let index: number;
  /** 进入 */
  let enter: number | undefined;

  // 如果我们以EOL或空格开始和结束。
  if (
    (events[headEnterIndex][1].type === types.lineEnding ||
      events[headEnterIndex][1].type === "space") &&
    (events[tailExitIndex][1].type === types.lineEnding ||
      events[tailExitIndex][1].type === "space")
  ) {
    index = headEnterIndex;

    // 并且我们有数据。
    while (++index < tailExitIndex) {
      if (events[index][1].type === "mathTextData") {
        // 那么我们有填充。
        events[tailExitIndex][1].type = "mathTextPadding";
        events[headEnterIndex][1].type = "mathTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }

  // 合并相邻的空格和数据。
  index = headEnterIndex - 1;
  tailExitIndex++;

  while (++index <= tailExitIndex) {
    if (enter === undefined) {
      if (index !== tailExitIndex && events[index][1].type !== types.lineEnding) {
        enter = index;
      }
    } else if (index === tailExitIndex || events[index][1].type === types.lineEnding) {
      events[enter][1].type = "mathTextData";

      if (index !== enter + 2) {
        events[enter][1].end = events[index - 1][1].end;
        events.splice(enter + 2, index - enter - 2);
        tailExitIndex -= index - enter - 2;
        index = enter + 2;
      }

      enter = undefined;
    }
  }

  return events;
}

/**
 * 前一个字符检查
 */
function previous(this: TokenizeContext, code: number | null): boolean {
  // 如果有前一个代码，总是会有一个尾部。
  return (
    code !== "=".charCodeAt(0) ||
    this.events[this.events.length - 1][1].type === types.characterEscape
  );
}
