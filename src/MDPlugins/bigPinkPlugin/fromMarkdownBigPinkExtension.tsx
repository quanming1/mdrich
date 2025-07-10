export const fromMarkdownBigPinkExtension = {
  enter: {
    bigpink(token) {
      console.log("进入bigpink", token);
      this.enter(
        {
          type: "bigpink",
          children: [],
          data: {
            hName: "span",
            hProperties: {
              className: ["bigpink"],
              style: {
                color: "pink",
                fontSize: "30px",
                fontWeight: "bold",
                backgroundColor: "#ffe6f2",
                padding: "4px 8px",
                borderRadius: "4px",
                border: "2px solid pink",
              },
            },
          },
        },
        token,
      );
    },
    bigpinkData(token) {
      console.log("进入bigpinkData", token);
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
      console.log("退出bigpink", token);
      this.exit(token);
    },
    bigpinkData(token) {
      console.log("退出bigpinkData", token);
      this.exit(token);
    },
  },
};
