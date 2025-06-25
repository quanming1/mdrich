module.exports = {
  presets: [
    ["@babel/preset-env", { corejs: 3, useBuiltIns: "usage" }],
    ["@babel/preset-react", { runtime: "automatic" }], //  暂时注销 automatic 表示的是自动导入React
    ["@babel/preset-typescript"],
  ],
  plugins: [
    [
      "@babel/transform-runtime",
      {
        helper: true,
        corejs: false,
      },
    ],
  ],
};
