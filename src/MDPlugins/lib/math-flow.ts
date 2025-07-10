/**
 * 数学流类型定义
 */
interface Construct {
  tokenize: any;
  concrete?: boolean;
  name?: string;
  partial?: boolean;
}

type State = (code: number | null) => State | void;

interface TokenizeContext {
  events: any[];
  interrupt?: boolean;
  parser: any;
  previous: number | null;
  now(): any;
}

interface Tokenizer {
  (effects: any, ok: State, nok: State): State;
}

// 使用any类型避免模块解析问题
const assert: any = require("devlop").ok;
const factorySpace: any = require("micromark-factory-space").factorySpace;
const markdownLineEnding: any = require("micromark-util-character").markdownLineEnding;
const codes: any = require("micromark-util-symbol").codes;
const constants: any = require("micromark-util-symbol").constants;
const types: any = require("micromark-util-symbol").types;

/** 数学流构造器 */
export const mathFlow: Construct = {
  tokenize: tokenizeMathFenced,
  concrete: true,
  name: "mathFlow",
};

/** 非懒惰延续构造器 */
const nonLazyContinuation: Construct = {
  tokenize: tokenizeNonLazyContinuation,
  partial: true,
};

/**
 * 数学栅栏化标记器
 */
function tokenizeMathFenced(this: TokenizeContext, effects: any, ok: State, nok: State): State {
  const self = this;
  const tail = self.events[self.events.length - 1];
  const initialSize =
    tail && tail[1].type === types.linePrefix ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let sizeOpen = 0;

  return start;

  /**
   * 数学开始。
   */
  function start(code: number | null): State | void {
    assert(code === "=".charCodeAt(0), "expected `$`");
    effects.enter("mathFlow");
    effects.enter("mathFlowFence");
    effects.enter("mathFlowFenceSequence");
    return sequenceOpen(code);
  }

  /**
   * 在开始栅栏序列中。
   */
  function sequenceOpen(code: number | null): State | void {
    if (code === "=".charCodeAt(0)) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen;
    }

    if (sizeOpen < 2) {
      return nok(code);
    }

    effects.exit("mathFlowFenceSequence");
    return factorySpace(effects, metaBefore, types.whitespace)(code);
  }

  /**
   * 在开始栅栏中，在元数据之前。
   */
  function metaBefore(code: number | null): State | void {
    if (code === codes.eof || markdownLineEnding(code)) {
      return metaAfter(code);
    }

    effects.enter("mathFlowFenceMeta");
    effects.enter(types.chunkString, { contentType: constants.contentTypeString });
    return meta(code);
  }

  /**
   * 在元数据中。
   */
  function meta(code: number | null): State | void {
    if (code === codes.eof || markdownLineEnding(code)) {
      effects.exit(types.chunkString);
      effects.exit("mathFlowFenceMeta");
      return metaAfter(code);
    }

    if (code === "=".charCodeAt(0)) {
      return nok(code);
    }

    effects.consume(code);
    return meta;
  }

  /**
   * 元数据之后。
   */
  function metaAfter(code: number | null): State | void {
    // 保证是eol/eof。
    effects.exit("mathFlowFence");

    if (self.interrupt) {
      return ok(code);
    }

    return effects.attempt(nonLazyContinuation, beforeNonLazyContinuation, after)(code);
  }

  /**
   * 在数学中的eol/eof之后，在非懒惰关闭栅栏或内容处。
   */
  function beforeNonLazyContinuation(code: number | null): State | void {
    return effects.attempt(
      { tokenize: tokenizeClosingFence, partial: true },
      after,
      contentStart,
    )(code);
  }

  /**
   * 在数学内容之前，绝对不在关闭栅栏之前。
   */
  function contentStart(code: number | null): State | void {
    return (
      initialSize
        ? factorySpace(effects, beforeContentChunk, types.linePrefix, initialSize + 1)
        : beforeContentChunk
    )(code);
  }

  /**
   * 在数学内容之前，在可选前缀之后。
   */
  function beforeContentChunk(code: number | null): State | void {
    if (code === codes.eof) {
      return after(code);
    }

    if (markdownLineEnding(code)) {
      return effects.attempt(nonLazyContinuation, beforeNonLazyContinuation, after)(code);
    }

    effects.enter("mathFlowValue");
    return contentChunk(code);
  }

  /**
   * 在数学内容中。
   */
  function contentChunk(code: number | null): State | void {
    if (code === codes.eof || markdownLineEnding(code)) {
      effects.exit("mathFlowValue");
      return beforeContentChunk(code);
    }

    effects.consume(code);
    return contentChunk;
  }

  /**
   * 数学之后（哈！）。
   */
  function after(code: number | null): State | void {
    effects.exit("mathFlow");
    return ok(code);
  }

  /** 关闭栅栏标记器 */
  function tokenizeClosingFence(effects: any, ok: State, nok: State): State {
    let size = 0;

    assert(self.parser.constructs.disable.null, "expected `disable.null`");
    /**
     * 在关闭栅栏之前，在可选空白处。
     */
    return factorySpace(
      effects,
      beforeSequenceClose,
      types.linePrefix,
      self.parser.constructs.disable.null.includes("codeIndented") ? undefined : constants.tabSize,
    );

    /**
     * 在关闭栅栏中，在可选空白之后，在序列处。
     */
    function beforeSequenceClose(code: number | null): State | void {
      effects.enter("mathFlowFence");
      effects.enter("mathFlowFenceSequence");
      return sequenceClose(code);
    }

    /**
     * 在关闭栅栏序列中。
     */
    function sequenceClose(code: number | null): State | void {
      if (code === "=".charCodeAt(0)) {
        size++;
        effects.consume(code);
        return sequenceClose;
      }

      if (size < sizeOpen) {
        return nok(code);
      }

      effects.exit("mathFlowFenceSequence");
      return factorySpace(effects, afterSequenceClose, types.whitespace)(code);
    }

    /**
     * 在关闭栅栏序列之后，在可选空白之后。
     */
    function afterSequenceClose(code: number | null): State | void {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit("mathFlowFence");
        return ok(code);
      }

      return nok(code);
    }
  }
}

/**
 * 非懒惰延续标记器
 */
function tokenizeNonLazyContinuation(
  this: TokenizeContext,
  effects: any,
  ok: State,
  nok: State,
): State {
  const self = this;

  return start;

  /** 开始状态 */
  function start(code: number | null): State | void {
    if (code === null) {
      return ok(code);
    }

    assert(markdownLineEnding(code), "expected eol");
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return lineStart;
  }

  /** 行开始状态 */
  function lineStart(code: number | null): State | void {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}
