import { TextTokenType } from "./constant";
import "./style/index.scss";

export function fromTextExtention() {
  return {
    enter: {
      [TextTokenType.TextContent](token) {
        console.log("this", this);
        console.log("token", token);
        this.enter(
          {
            type: TextTokenType.TextContent,
            children: [
              {
                type: "text",
                value: this.sliceSerialize(token),
              },
            ],
            data: {
              hName: "span",
              hProperties: {
                className: ["richmd-text__wrapper"],
              },
            },
          },
          token,
        );
      },
    },
    exit: {
      [TextTokenType.TextContent](token) {
        this.exit(token);
      },
    },
  };
}
