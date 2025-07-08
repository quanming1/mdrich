const codeNum = "=".charCodeAt(0);

export const micromarkBigPinkExtension = {
  text: {
    [codeNum]: {
      name: "bigpink",
      tokenize(effects, ok, nok) {
        return start;

        function start(code) {
          if (code !== codeNum) {
            return nok;
          }
          effects.enter("bigpink");
          effects.enter("bigpink-mk");
          effects.consume(code);
          effects.exit("bigpink-mk");
          effects.enter("bigpinkText");
          return inside;
        }
        function inside(code) {
          console.log("code", String.fromCharCode(code));

          if (code === -1) {
            return nok;
          } else if (code === codeNum) {
            effects.exit("bigpinkText");
            effects.enter("bigpink-mk");
            effects.consume(code);
            effects.exit("bigpink-mk");
            effects.exit("bigpink");

            return ok;
          }

          effects.consume(code);
          return inside;
        }
      },
    },
  },
};
