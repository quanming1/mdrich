import { TextTokenType } from "./constant";
// @ts-ignore
import { codes } from "micromark-util-symbol";

const allCodes = {
  _: "_".charCodeAt(0),
  "[": "[".charCodeAt(0),
  "]": "]".charCodeAt(0),
  "(": "(".charCodeAt(0),
  ")": ")".charCodeAt(0),
};

export default function micromarkTextExtension(options = {}) {
  return {
    text: {
      [allCodes["_"]]: {
        name: "micromark-text-extension",
        tokenize(effect, ok, nok) {
          let delimiterCount = 0;
          return delimiter;

          // 定界符解析
          function delimiter(code: number) {
            if (code === allCodes["_"] && delimiterCount === 0) {
              effect.enter(TextTokenType.Text);
              effect.enter(TextTokenType.Delimiter);
              delimiterCount++;
              effect.consume(code);
              return delimiter;
            } else if (code === allCodes["["] && delimiterCount === 1) {
              effect.consume(code);
              delimiterCount++;
              effect.exit(TextTokenType.Delimiter);
              return delimiter;
            } else if (code === allCodes["("] && delimiterCount === 2) {
              delimiterCount++;
              effect.enter(TextTokenType.StyleDelimiter);
              effect.consume(code);
              effect.exit(TextTokenType.StyleDelimiter);
              effect.enter(TextTokenType.StyleContent);
              return styleContent;
            } else if (code === allCodes[")"] && delimiterCount === 3) {
              delimiterCount++;
              effect.enter(TextTokenType.StyleDelimiter);
              effect.consume(code);
              effect.exit(TextTokenType.StyleDelimiter);
              effect.enter(TextTokenType.TextContent);
              // 进入正文解析
              return content;
            } else if (code === allCodes["]"] && delimiterCount === 4) {
              effect.enter(TextTokenType.Delimiter);
              delimiterCount++;
              effect.consume(code);
              return delimiter;
            } else if (code === allCodes["_"] && delimiterCount === 5) {
              delimiterCount++;
              effect.consume(code);
              effect.exit(TextTokenType.Delimiter);
              effect.exit(TextTokenType.Text);
              return ok(code);
            }

            console.error("定界符解析错误", {
              char: String.fromCharCode(code),
              code,
            });
            return nok(code);
          }

          function styleContent(code: number) {
            if (code === allCodes[")"]) {
              effect.exit(TextTokenType.StyleContent);
              return delimiter(code);
            } else if (code === codes.eof) {
              return nok(code);
            }
            effect.consume(code);
            return styleContent;
          }

          // 正文解析
          function content(code: number) {
            if (code === allCodes["]"]) {
              effect.exit(TextTokenType.TextContent);
              return delimiter(code);
            } else if (code === codes.eof) {
              return nok(code);
            }

            effect.consume(code);
            return content;
          }
        },
      },
    },
  };
}
