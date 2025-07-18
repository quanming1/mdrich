import React, { useMemo, useState, useRef } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { MarkdownParser } from "./extensiones/Parser";
import textPlugin from "./extensiones/TextPlugin";
import {
  createMdastReactMapper,
  MdastReactMapper,
  ConversionResult,
} from "./extensiones/MdastReactMapper";

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
  const mapperRef = useRef<MdastReactMapper | null>(null);
  const conversionResultRef = useRef<ConversionResult | null>(null);

  const { renderedElement, mappingInfo } = useMemo(() => {
    // 1. 解析 Markdown 为 mdast（使用插件）
    const processedMdast = markdownParser.md2mdast(md);

    // 3. 创建映射器并转换
    const mapper = createMdastReactMapper({
      development: true,
      idRenderer: {
        dataAttribute: "data-mdast-id",
      },
    });

    mapperRef.current = mapper;
    const result = mapper.convert(processedMdast);
    conversionResultRef.current = result;

    // 🔍 调试信息
    console.log("🔧 调试信息:", {
      processedMdast: processedMdast,
      hastTree: result.hastTree,
      totalNodes: result.stats.totalNodes,
      allIds: result.mapper.getAllIds(),
    });

    return {
      renderedElement: result.element,
      mappingInfo: {
        totalNodes: result.stats.totalNodes,
        renderTime: result.stats.renderTime.toFixed(2),
        mapperStats: result.mapper.getStats(),
      },
    };
  }, [md]);

  // 处理点击事件，展示映射信息
  const handleElementClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const mdastId = target.getAttribute("data-mdast-id");

    if (mdastId && mapperRef.current) {
      setSelectedElement(mdastId);

      // 高亮选中的元素
      document.querySelectorAll("[data-mdast-id]").forEach((el) => {
        (el as HTMLElement).style.outline = "";
      });
      target.style.outline = "2px solid #007bff";

      console.log("选中的节点信息:", {
        id: mdastId,
        element: target,
        mdastNode: mapperRef.current.findMdastNodeByElement(target),
        mapping: mapperRef.current.getMapper().getNodeById(mdastId),
      });
    }
  };

  const getSelectedNodeInfo = () => {
    if (!selectedElement || !mapperRef.current) return null;

    const mapping = mapperRef.current.getMapper().getNodeById(selectedElement);
    if (!mapping) return null;

    return {
      id: mapping.id,
      type: mapping.node.type,
      path: mapping.path,
      hasChildren: Boolean(mapping.node.children?.length),
      childrenCount: mapping.node.children?.length || 0,
      parent: mapping.parent?.type || "root",
    };
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🎯 Mdast-React ID 映射系统演示</h1>

      {/* 系统信息面板 */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h3>📊 系统统计</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          <div>
            <strong>总节点数:</strong> {mappingInfo.totalNodes}
          </div>
          <div>
            <strong>渲染时间:</strong> {mappingInfo.renderTime}ms
          </div>
          <div>
            <strong>根节点数:</strong> {mappingInfo.mapperStats.rootNodes}
          </div>
          <div>
            <strong>叶节点数:</strong> {mappingInfo.mapperStats.leafNodes}
          </div>
        </div>
      </div>

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
                {(() => {
                  const nodeInfo = getSelectedNodeInfo();
                  return nodeInfo ? (
                    <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
                      <div>
                        <strong>ID:</strong> {nodeInfo.id}
                      </div>
                      <div>
                        <strong>类型:</strong> {nodeInfo.type}
                      </div>
                      <div>
                        <strong>路径:</strong> [{nodeInfo.path.join(", ")}]
                      </div>
                      <div>
                        <strong>父节点:</strong> {nodeInfo.parent}
                      </div>
                      <div>
                        <strong>子节点数:</strong> {nodeInfo.childrenCount}
                      </div>
                    </div>
                  ) : (
                    <div>无法获取节点信息</div>
                  );
                })()}
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
