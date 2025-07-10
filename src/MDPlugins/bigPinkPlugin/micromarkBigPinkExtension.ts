const codeNum = "@".charCodeAt(0);

// 导入必要的工具
const markdownLineEnding = require("micromark-util-character").markdownLineEnding;
const codes = require("micromark-util-symbol").codes;
const factorySpace = require("micromark-factory-space").factorySpace;
const types = require("micromark-util-symbol").types;

export const micromarkBigPinkExtension = {
  flow: {
    [codeNum]: {
      name: "bigpink",
      tokenize(effects, ok, nok) {
        let size = 0;
        let sizeOpen = 0;
        let token = null;

        return start;

        function start(code) {
          if (code !== codeNum) {
            return nok(code);
          }

          // @ts-ignore
          window.___token = effects.enter("bigpink");
          effects.enter("bigpinkFence");
          return sequenceOpen(code);
        }

        function sequenceOpen(code) {
          if (code === codeNum) {
            effects.consume(code);
            sizeOpen++;
            return sequenceOpen;
          }

          if (sizeOpen < 2) {
            return nok(code);
          }

          effects.exit("bigpinkFence");
          return between(code);
        }

        function between(code) {
          if (code === codes.eof) {
            return nok(code);
          } else if (code === codeNum) {
            token = effects.enter("bigpinkFence");
            size = 0;
            return sequenceClose(code);
          } else if (code === codes.space) {
            effects.enter("space");
            effects.consume(code);
            effects.exit("space");
            return between;
          } else if (markdownLineEnding(code)) {
            effects.enter("lineEnding");
            effects.consume(code);
            effects.exit("lineEnding");

            return between;
          }
          effects.enter("bigpinkData");

          return data(code);
        }

        function data(code) {
          console.log("遇到了：", String.fromCharCode(code));

          if (
            code === codes.space ||
            code === codeNum ||
            code === codes.eof ||
            markdownLineEnding(code)
          ) {
            effects.exit("bigpinkData");
            return between(code);
          }

          effects.consume(code);
          return data;
        }

        function sequenceClose(code) {
          if (code === codeNum) {
            size++;
            effects.consume(code);
            return sequenceClose;
          }
          if (size === sizeOpen) {
            effects.exit("bigpinkFence");
            effects.exit("bigpink");
            return ok(code);
          }

          token.type = "bigpinkData";
          return data(code);
        }
      },
    },
  },
};
