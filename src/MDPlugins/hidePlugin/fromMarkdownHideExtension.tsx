export const fromMarkdownHideExtension = {
  enter: {
    hideMarker: function (token: any) {
      console.log("enter hideMarker token", token);
    },

    hide: function (token: any) {
      console.log("enter hide token", token);
      this.enter(
        {
          type: "hide",
          children: [],
          data: {
            hName: "span",
            hProperties: {
              className: ["custom-hide"],
              style: {
                backgroundColor: "yellow",
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
    hideText: function (token: any) {
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
    hideMarker: function (token: any) {
      console.log("exit hideMarker token", token);
    },
    hide: function (token: any) {
      this.exit(token);
      console.log("this.stack", this.stack);
    },
    hideText: function (token: any) {
      this.exit(token);
    },
  },
};
