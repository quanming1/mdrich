import React, { useMemo, useState } from "react";
import { MarkdownParser } from "./extensiones/Parser";
import textPlugin from "./extensiones/TextPlugin";
import { insertMdastId } from "./extensiones/Path/insert-mdast-id";
import { visit } from "unist-util-visit";
import { Node } from "unist";

const md = `
# 你好，mdast ID 映射系统示例！

这是 **红色加粗文本**，后面还有普通文本。

## 功能演示

- 每个节点都有唯一 ID
- DOM 与 mdast 一一对应  
- 点击元素查看映射信息

_[(color:red;font-size:18px)这是带样式的文本]_

_[(color:blue;background:yellow;padding:5px)点击我查看 ID 映射！]_
`;

const markdownParser = new MarkdownParser([textPlugin]);

function App() {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const [renderedElement, setRenderedElement] = useState<React.ReactElement | null>(null);
  const [mdast, setMdast] = useState<any>(null);
  const [nodeInfo, setNodeInfo] = useState<any>(null);

  useMemo(() => {
    const processedMdast = insertMdastId(markdownParser.md2mdast(md), "data-mdast-id");
    setMdast(processedMdast);
    setRenderedElement(markdownParser.mdast2react(processedMdast));
  }, [md]);

  const handleElementClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const mdastId = target.getAttribute("data-mdast-id");

    if (mdastId) {
      visit(mdast, (node: Node) => {
        if (node.data?.["hProperties"]?.["data-mdast-id"] === mdastId) {
          setSelectedElement(node.data?.["hProperties"]?.["data-mdast-id"]);
          setNodeInfo(JSON.stringify(node, null, 2));
        }
      });
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🎯 Mdast-React ID 映射系统演示</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* 渲染区域 */}
        <div style={{ flex: "2" }}>
          <h3>🎨 渲染结果 (点击元素查看映射)</h3>
          <div
            onClick={handleElementClick}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            {renderedElement}
          </div>
        </div>

        {/* 信息面板 */}
        <div style={{ flex: "1" }}>
          <h3>🔍 节点信息</h3>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
              minHeight: "200px",
            }}
          >
            {selectedElement ? (
              <div>
                <h4>选中的节点:</h4>
                <textarea name="" id="" cols={50} rows={30} value={nodeInfo}></textarea>
              </div>
            ) : (
              <div style={{ color: "#666", fontStyle: "italic" }}>点击左侧元素查看节点映射信息</div>
            )}
          </div>

          <h3>📝 原始 Markdown</h3>
          <pre
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: "#f5f5f5",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              overflow: "auto",
              maxHeight: "200px",
            }}
          >
            {md}
          </pre>
        </div>
      </div>

      {/* 使用说明 */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e7f3ff",
          borderRadius: "8px",
        }}
      >
        <h3>💡 使用说明</h3>
        <ul>
          <li>🖱️ 点击左侧渲染内容中的任意元素</li>
          <li>🔗 查看该元素对应的 mdast 节点信息</li>
          <li>
            🆔 每个元素都有唯一的 <code>data-mdast-id</code> 属性
          </li>
          <li>📊 右侧显示详细的映射信息和系统统计</li>
          <li>🎯 实现了完整的 DOM ↔ mdast 双向映射</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
