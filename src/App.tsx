import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MarkdownParser } from "./extensiones/Parser";
import textPlugin from "./extensiones/TextPlugin";
import { insertMdastId } from "./extensiones/Path/insert-mdast-id";
import { visit } from "unist-util-visit";
import { getCustomSelection, getIdsToDelete } from "./extensiones/Selection";
import { useReactive } from "ahooks";
import "./Style/index.scss";

import * as _ from "lodash-es";
import { IMEManager } from "./Utils/IMEManager";

const md = `
# 你好，mdast ID 映射系统示例！
这是 _[(color:red;font-weight:bold)红色加粗文本]_，后面还有普通文本。

## 功能演示

- 每个节点都有唯一 ID
- DOM 与 mdast 一一对应
- 选中内容后高亮显示对应节点

_[(color:red;font-size:18px)这是带样式的文本]_
`;

const markdownParser = new MarkdownParser([textPlugin]);
let idsToDelete = null;
let startOffset = null;
let endOffset = null;

function App() {
  const divRef = useRef<HTMLDivElement>(null);
  const imeManagerRef = useRef<IMEManager | null>(null); // 是否正IME在输入

  // 用ref来存储光标位置
  const cursorPositionRef = useRef<{ nodeId: string; offset: number } | null>(null);

  const state = useReactive({
    selectedElement: null as string | null,
    renderedElement: null as React.ReactElement | null,
    mdast: null as any,
    nodeInfo: null as any,
    // cursorPosition: null as { nodeId: string; offset: number } | null, // 删除
  });

  useMemo(() => {
    const processedMdast = insertMdastId(markdownParser.md2mdast(md), "data-mdast-id");
    state.mdast = processedMdast;
    state.renderedElement = markdownParser.mdast2react(processedMdast);
  }, [md]);

  const handleElementClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const mdastId = target.getAttribute("data-mdast-id");

    if (mdastId) {
      visit(state.mdast, (node: any) => {
        if (node.data?.["hProperties"]?.["data-mdast-id"] === mdastId) {
          state.selectedElement = node.data?.["hProperties"]?.["data-mdast-id"];
          state.nodeInfo = JSON.stringify(node, null, 2);
        }
      });
    }
  };

  useEffect(() => {
    if (!divRef.current) return;

    const handleSelectionChange = () => {
      const customSelection = getCustomSelection();
      startOffset = customSelection.start.offset;
      endOffset = customSelection.end.offset;
      idsToDelete = getIdsToDelete(state.mdast, customSelection.start, customSelection.end);
      // 先清除所有已加的高亮边框
      if (divRef.current) {
        const allNodes = divRef.current.querySelectorAll("[data-mdast-id]");
        allNodes.forEach((el) => {
          (el as HTMLElement).classList.remove("highlight-selection");
        });
      }

      // 给选中的id加上高亮样式
      if (divRef.current && Array.isArray(idsToDelete)) {
        idsToDelete.forEach((id) => {
          const el = divRef.current.querySelector(`[data-mdast-id="${id}"]`);
          if (el) {
            (el as HTMLElement).classList.add("highlight-selection");
          }
        });
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [divRef]);

  const EditorManager = {
    deleteNode: (mdast: any, nodeId: string) => {
      if (mdast.data?.["hProperties"]?.["data-mdast-id"] === nodeId) {
        return null;
      }
      if (Array.isArray(mdast.children)) {
        const c = mdast.children
          .map((node: any) => EditorManager.deleteNode(node, nodeId))
          .filter(Boolean);
        // 对于没有子节点的节点。直接删除
        if (c.length === 0) return null;
        mdast.children = c;
      }

      return mdast;
    },
    editNode(mdast: any, nodeId: string, value: string) {
      const node = EditorManager.getNode(mdast, nodeId);
      if (node) {
        node.value = value;
      } else {
        console.log("没有找到节点", nodeId);
      }
      return mdast;
    },
    getNode(mdast: any, nodeId: string) {
      let target = null;
      visit(mdast, (node: any) => {
        if (node.data?.["hProperties"]?.["data-mdast-id"] === nodeId) {
          target = node;
        }
      });
      return target;
    },
  };

  function flatMdast(mdast: any, flatAST: any[] = []) {
    if (Array.isArray(mdast.children)) {
      mdast.children.forEach((node: any) => {
        flatMdast(node, flatAST);
      });
    } else {
      // 叶子节点
      flatAST.push(mdast);
    }
    return flatAST;
  }

  // 恢复光标位置的函数
  const restoreCursorPosition = () => {
    if (!cursorPositionRef.current || !divRef.current) return;

    const targetElement = divRef.current.querySelector(
      `[data-mdast-id="${cursorPositionRef.current.nodeId}"]`,
    );
    if (targetElement) {
      const textNode = targetElement.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        const selection = window.getSelection();
        const offset = Math.min(cursorPositionRef.current.offset, textNode.textContent.length);

        range.setStart(textNode, offset);
        range.setEnd(textNode, offset);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    // 清除保存的光标位置
    cursorPositionRef.current = null;
  };

  // 当渲染元素更新时恢复光标位置
  useLayoutEffect(() => {
    if (cursorPositionRef.current) {
      restoreCursorPosition();
    }
  }, [state.renderedElement]);

  useEffect(() => {
    if (divRef.current) {
      let startComposePos: StaticRange = null;

      // IME 监听
      imeManagerRef.current = new IMEManager(divRef.current);

      divRef.current.addEventListener("beforeinput", (event) => {
        event.preventDefault();
        const ranges = event.getTargetRanges();
        console.log("eventandranges", event, ranges);
        const deleteRange = (mdast: any, ranges: StaticRange[]) => {
          function deleteText(
            mdast: any,
            startId: string,
            endId: string,
            startOffset: number,
            endOffset: number,
          ) {
            const flatAST = flatMdast(mdast);
            let newMdast = _.cloneDeep(mdast);
            if (startId === endId) {
              visit(mdast, (node: any) => {
                if (node.data?.["hProperties"]?.["data-mdast-id"] === startId) {
                  console.log("删除前", node.value);
                  console.log(
                    "删除后",
                    node.value.slice(0, startOffset) + node.value.slice(endOffset),
                  );

                  EditorManager.editNode(
                    newMdast,
                    startId,
                    node.value.slice(0, startOffset) + node.value.slice(endOffset),
                  );
                }
              });
            } else {
              // 1、删除中间的节点
              let startIndex = flatAST.findIndex(
                (node) => node.data?.["hProperties"]?.["data-mdast-id"] === startId,
              );
              let endIndex = flatAST.findIndex(
                (node) => node.data?.["hProperties"]?.["data-mdast-id"] === endId,
              );
              flatAST[startIndex].value = flatAST[startIndex].value.slice(0, startOffset);
              EditorManager.editNode(newMdast, startId, flatAST[startIndex].value);
              flatAST[endIndex].value = flatAST[endIndex].value.slice(endOffset);
              EditorManager.editNode(newMdast, endId, flatAST[endIndex].value);
              // 大于2个节点的跨度，删除中间的节点
              if (endIndex - startIndex > 1) {
                const nodes = flatAST.splice(startIndex + 1, endIndex - startIndex - 1);
                nodes.forEach((node) => {
                  EditorManager.deleteNode(newMdast, node.data?.["hProperties"]?.["data-mdast-id"]);
                });
              }
            }

            // 保存光标位置信息到ref
            cursorPositionRef.current = { nodeId: startId, offset: startOffset };
            return newMdast;
          }

          const range = ranges[0]; // 通常只有一个范围
          const startContainer = range.startContainer; // 起始节点
          const startOffset = range.startOffset; // 起始偏移量
          const endContainer = range.endContainer; // 结束节点
          const endOffset = range.endOffset; // 结束偏移量

          // 获取包含删除内容的元素
          const startParentElement =
            startContainer.nodeType === Node.TEXT_NODE
              ? startContainer.parentElement
              : (startContainer as HTMLElement);

          const endParentElement = (
            endContainer.nodeType === Node.TEXT_NODE
              ? endContainer.parentElement
              : (endContainer as HTMLElement)
          ) as HTMLElement;
          const startId = startParentElement.getAttribute("data-mdast-id");
          const endId = endParentElement.getAttribute("data-mdast-id");
          return deleteText(mdast, startId, endId, startOffset, endOffset);
        };

        // 仅处理删除操作
        if (event.inputType.startsWith("delete")) {
          const newMdast = deleteRange(state.mdast, ranges);
          state.renderedElement = markdownParser.mdast2react(newMdast);
          state.mdast = newMdast;
        } else if (event.inputType === "insertText") {
          let newMdast = deleteRange(state.mdast, ranges);
          const insertText = event.data;
          const ele = ranges[0].startContainer.parentElement;
          const id = ele.getAttribute("data-mdast-id");
          const node = EditorManager.getNode(newMdast, id);
          if (node) {
            newMdast = _.cloneDeep(
              EditorManager.editNode(
                newMdast,
                id,
                `${node.value.slice(0, ranges[0].startOffset)}${insertText}${node.value.slice(ranges[0].startOffset)}`,
              ),
            );
            state.renderedElement = markdownParser.mdast2react(newMdast);
            state.mdast = newMdast;

            cursorPositionRef.current = {
              nodeId: id,
              offset: ranges[0].startOffset + insertText.length,
            };
          }
        } else if (event.inputType === "insertCompositionText") {
          setTimeout(() => {
            // 开始组词，记录开始的位置
            if (imeManagerRef.current?.isComposing) {
              startComposePos = ranges[0];
              console.log("组词开始，开始位置：", startComposePos);
            } else {
              const newMdast = _.cloneDeep(state.mdast);
              // 组词结束，更新mdast
              console.log("组词结束，输入为：", imeManagerRef.current?.lastResult);
              const ele = startComposePos.startContainer.parentElement;
              const id = ele.getAttribute("data-mdast-id");
              const node = EditorManager.getNode(state.mdast, id);
              if (node) {
                EditorManager.editNode(
                  newMdast,
                  id,
                  node.value.slice(0, startComposePos.startOffset) +
                    imeManagerRef.current?.lastResult +
                    node.value.slice(startComposePos.endOffset),
                );
                state.mdast = newMdast;
                state.renderedElement = markdownParser.mdast2react(newMdast);
              }
            }
          }, 0);
        }
      });
    }
  }, [divRef]);

  return (
    <div className="app-container">
      <div className="app-layout">
        {/* 渲染区域 */}
        <div className="content-section">
          <h3 className="section-title">🎨 渲染</h3>
          <div ref={divRef} contentEditable onClick={handleElementClick} className="editor-area">
            {state.renderedElement}
          </div>
        </div>

        {/* 信息面板 */}
        <div className="sidebar-section">
          <h3 className="section-title">🔍 节点信息</h3>
          <div className="info-panel">
            {state.selectedElement ? (
              <div className="node-info">
                <h4>选中的节点:</h4>
                <textarea cols={50} rows={30} value={state.nodeInfo} readOnly></textarea>
              </div>
            ) : (
              <div className="info-content">点击左侧元素查看节点映射信息</div>
            )}
          </div>

          <h3 className="section-title">📝 原始 Markdown</h3>
          <pre className="markdown-preview">{md}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;

setInterval(() => {
  document.querySelectorAll("iframe").forEach((iframe) => {
    iframe?.remove();
  });
}, 100);
