import { mathText } from "./testMath";
import { codes } from "micromark-util-symbol";

const MathTextFun = () => {
  return {
    text: {
      [codes.dollar]: mathText,
    },
  };
};

export const MathPlugin = function () {
  const data = this.data();
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(MathTextFun);
};
