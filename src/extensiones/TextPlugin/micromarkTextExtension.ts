import { TextTokenType, textCode } from "./constant";
// @ts-ignore
import { codes } from "micromark-util-symbol";

export default function micromarkTextExtension(options = {}) {
  return {
    text: {
      [textCode]: {
        name: "micromark-text-extension",
        tokenize(effect, ok, nok) {
          return start;

          function start(code: number) {
            if (code !== textCode) {
              return nok(code);
            }
            effect.enter(TextTokenType.Text);
            effect.enter(TextTokenType.TextMarker);
            effect.consume(textCode);
            effect.exit(TextTokenType.TextMarker);
            effect.enter(TextTokenType.TextContent);
            return contentAuth;
          }

          // 在content上面加一层，防止==这总情况，出现空的token导致报错
          function contentAuth(code) {
            if (code === textCode || code === codes.eof) {
              return nok(code);
            }
            return content(code);
          }

          function content(code: number) {
            if (code === codes.eof) {
              return nok(code);
            } else if (code === textCode) {
              effect.exit(TextTokenType.TextContent);
              return end(code);
            }
            effect.consume(code);
            return content;
          }

          function end(code: number) {
            if (code !== textCode) {
              return nok(code);
            }
            effect.enter(TextTokenType.TextMarker);
            effect.consume(textCode);
            effect.exit(TextTokenType.TextMarker);
            effect.exit(TextTokenType.Text);
            return ok(code);
          }
        },
      },
    },
  };
}
