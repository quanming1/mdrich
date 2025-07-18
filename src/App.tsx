import React from "react";
import { mdast2react } from "../packages/mdast2react/index";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const mdastJson = {
  type: "root",
  children: [
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          value: "你好，mdast 渲染示例！",
        },
      ],
      data: {
        hName: "p",
      },
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          value: "这是 ",
        },
        {
          type: "span",
          children: [
            {
              type: "text",
              value: "红色加粗文本",
            },
          ],
          data: {
            hName: "span",
            hProperties: {
              style: {
                color: "red",
                fontWeight: "bold",
                fontSize: "18px",
              },
            },
          },
        },
        {
          type: "text",
          value: "，后面还有普通文本。",
        },
      ],
      data: {
        hName: "p",
      },
    },
    {
      type: "element",
      tagName: "h2",
      children: [
        {
          type: "text",
          value: "更多示例内容",
        },
      ],
      data: {
        hName: "h2",
      },
    },
    {
      type: "element",
      tagName: "ul",
      children: [
        {
          type: "element",
          tagName: "li",
          children: [
            {
              type: "text",
              value: "列表项一",
            },
          ],
          data: {
            hName: "li",
          },
        },
        {
          type: "element",
          tagName: "li",
          children: [
            {
              type: "text",
              value: "列表项二，带有",
            },
            {
              type: "span",
              children: [
                {
                  type: "text",
                  value: "蓝色背景",
                },
              ],
              data: {
                hName: "span",
                hProperties: {
                  style: {
                    backgroundColor: "lightblue",
                    padding: "2px 5px",
                    borderRadius: "3px",
                  },
                },
              },
            },
          ],
          data: {
            hName: "li",
          },
        },
      ],
      data: {
        hName: "ul",
      },
    },
    {
      type: "element",
      tagName: "blockquote",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value: "这是一段引用文本，带有",
            },
            {
              type: "span",
              children: [
                {
                  type: "text",
                  value: "特殊样式",
                },
              ],
              data: {
                hName: "span",
                hProperties: {
                  style: {
                    textDecoration: "underline",
                    fontStyle: "italic",
                    color: "purple",
                  },
                },
              },
            },
          ],
          data: {
            hName: "p",
          },
        },
      ],
      data: {
        hName: "blockquote",
      },
    },
    {
      type: "element",
      tagName: "div",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value: "这是一个带有边框的特殊区域",
            },
          ],
          data: {
            hName: "p",
          },
        },
      ],
      data: {
        hName: "div",
        hProperties: {
          style: {
            border: "2px dashed #666",
            padding: "10px",
            margin: "15px 0",
            backgroundColor: "#f9f9f9",
          },
        },
      },
    },
  ],
};

const processor = unified().use(remarkParse).use();

const md = `
# 你好，mdast 渲染示例！

这是 **红色加粗文本**，后面还有普通文本。

## 更多示例内容

- 列表项一
- 列表项二，带有蓝色背景
`;

function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>mdast 渲染示例</h1>
      <div style={{ border: "1px solid #ccc", padding: "10px" }}>{mdast2react(mdastJson)}</div>

      <h3>{JSON.stringify(processor.parse(md))}</h3>
    </div>
  );
}

export default App;
