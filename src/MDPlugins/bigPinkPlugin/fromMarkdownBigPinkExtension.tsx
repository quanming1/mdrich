export const fromMarkdownBigPinkExtension = {
  enter: {
    bigpink(token) {
      console.log("this", this);
      this.enter(
        {
          type: "bigpink",
          children: [],
          data: {
            hName: "p",
            hProperties: {
              className: ["bigpink"],
              style: {
                color: "pink",
                fontSize: "30px",
                fontWeight: "bold",
              },
            },
          },
        },
        token,
      );
    },
    bigpinkText(token) {
      this.enter(
        {
          type: "text",
          value: this.sliceSerialize(token),
        },
        token,
      );
    },
  },
  exit: {
    bigpink(token) {
      this.exit(token);
    },
    bigpinkText(token) {
      this.exit(token);
    },
  },
};
