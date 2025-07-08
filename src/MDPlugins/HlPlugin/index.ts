// micromark 扩展 - 词法分析阶段
const micromarkHighlightExtension = {
  text: {
    37: {
      // % 的 ASCII 码
      name: "highlight",
      tokenize: function (effects: any, ok: any, nok: any) {
        return function start(code: number) {
          if (code !== 37) return nok(code);

          effects.enter("highlight");
          effects.enter("highlightMarker");
          effects.consume(code); // 消费开始的 %
          effects.exit("highlightMarker");
          return contentStart;
        };

        function contentStart(code: number) {
          if (code === -1 || code === 10 || code === 37) {
            return nok(code); // 空内容或立即结束
          }
          effects.enter("highlightText");
          return content(code);
        }

        function content(code: number) {
          if (code === -1 || code === 10) {
            return nok(code); // 未闭合
          }
          if (code === 37) {
            effects.exit("highlightText");
            effects.enter("highlightMarker");
            effects.consume(code); // 消费结束的 %
            effects.exit("highlightMarker");
            effects.exit("highlight");
            return ok;
          }
          effects.consume(code);
          return content;
        }
      },
    },
  },
};

// fromMarkdown 扩展 - AST 构建阶段
const fromMarkdownHighlightExtension = {
  enter: {
    highlight: function (this: any, token: any) {
      this.enter(
        {
          type: "highlight",
          children: [],
          data: {
            hName: "span",
            hProperties: {
              className: ["custom-highlight"],
              style: {
                backgroundColor: "pink",
                fontWeight: "bold",
                padding: "2px 4px",
                borderRadius: "3px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              },
            },
          },
        },
        token,
      );
    },
    highlightText: function (this: any, token: any) {
      this.enter(
        {
          type: "text",
          value: "",
        },
        token,
      );
    },
  },
  exit: {
    highlight: function (this: any, token: any) {
      this.exit(token);
    },
    highlightText: function (this: any, token: any) {
      const node = this.stack[this.stack.length - 1];
      node.value = this.sliceSerialize(token);
      this.exit(token);
    },
  },
};

// 插件函数 - 注册扩展
export default function customHighlightPlugin() {
  // 直接返回一个配置函数，在插件加载时执行
  const data = this.data();

  // 注册词法分析阶段扩展
  const micromarkExtensions = data.micromarkExtensions || [];
  micromarkExtensions.push(micromarkHighlightExtension);
  data.micromarkExtensions = micromarkExtensions;

  // 注册 AST 构建阶段扩展
  const fromMarkdownExtensions = data.fromMarkdownExtensions || [];
  fromMarkdownExtensions.push(fromMarkdownHighlightExtension);
  data.fromMarkdownExtensions = fromMarkdownExtensions;
}
