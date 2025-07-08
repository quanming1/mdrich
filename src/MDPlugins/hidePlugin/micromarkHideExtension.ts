const nodeNum = "&".charCodeAt(0);

export const micromarkHideExtension = {
  flow: {
    [nodeNum]: {
      name: "hide",
      tokenize(effects: any, ok: any, nok: any) {
        return function start(code: number) {
          if (code !== nodeNum) return nok(code);

          effects.enter("hide");
          effects.enter("hideMarker");
          effects.consume(code); // 消费开始的 &
          effects.exit("hideMarker");
          return contentStart;
        };

        function contentStart(code: number) {
          if (code === -1 || code === 10 || code === nodeNum) {
            return nok(code); // 空内容或立即结束
          }
          effects.enter("hideText");
          return content(code);
        }

        function content(code: number) {
          // -1 是结束符,65532 是换行符
          if (code === -1) {
            return nok; // 未闭合
          }
          if (code === nodeNum) {
            effects.exit("hideText");
            effects.enter("hideMarker");
            effects.consume(code); // 消费结束的 &
            effects.exit("hideMarker");
            effects.exit("hide");
            return ok;
          }
          console.log("消费code：", String.fromCharCode(code));
          effects.consume(code);
          return content;
        }
      },
    },
  },
};
