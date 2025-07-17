import { TextTokenType } from "../constants/constant";
import "../styles/index.scss";

export function fromTextExtention() {
  let stemp = {};
  return {
    enter: {
      [TextTokenType.TextContent](token) {
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
                style: stemp,
              },
            },
          },
          token,
        );
      },

      [TextTokenType.StyleContent](token) {
        stemp = {}; // 必须重置，不然会叠加
        const styles = this.sliceSerialize(token);
        const styleList = styles.split(";");
        styleList.forEach((item) => {
          const [key, value] = item.split(":");
          if (key && value) {
            stemp[key.trim()] = value.trim();
          }
        });
      },
    },
    exit: {
      [TextTokenType.TextContent](token) {
        this.exit(token);
      },
    },
  };
}
