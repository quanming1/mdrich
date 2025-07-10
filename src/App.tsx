import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import BigPinkPlugin from "./MDPlugins/bigPinkPlugin";

const testMarkdown = `
@@
这
是
基
本
的
大


粉


色文
本@1





@@
`;

const MarkdownContent = ({ markdown }) => {
  return (
    <ReactMarkdown remarkPlugins={[BigPinkPlugin]} rehypePlugins={[]}>
      {markdown}
    </ReactMarkdown>
  );
};

export default function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>BigPink插件测试页面</h1>
      <MarkdownContent markdown={testMarkdown} />

      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h2>原始Markdown代码:</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "14px", color: "#666" }}>
          {testMarkdown}
        </pre>
      </div>
    </div>
  );
}
