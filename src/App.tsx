import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MarkdownParser } from "./extensiones/Parser";
import textPlugin from "./extensiones/TextPlugin";
import { insertNodeAttrs } from "./extensiones/Path/insert-node-attrs";
import { visit } from "unist-util-visit";
import { getCustomSelection, getIdsToDelete } from "./extensiones/Selection";
import { useReactive } from "ahooks";
import "./Style/index.scss";

import * as _ from "lodash-es";
import { IMEManager } from "./Utils/IMEManager";
import { getTextWrapper, editTextWrapper } from "./extensiones/utils";

const md = `
# 你好，mdast ID 映射系统示例！

这是 _[(color:red;font-weight:bold)红色加粗文本]_，后面还有普通文本。

## 功能演示

- 每个节点都有唯一 ID
- DOM 与 mdast 一一对应
- 选中内容后高亮显示对应节点
- 支持**加粗**、*斜体*、~~删除线~~
- 支持[超链接](https://www.example.com)
- 支持图片 ![示例图片](https://placekitten.com/100/100)
- 支持代码块和行内代码：\`console.log("hello")\`

_[(color:red;font-size:18px)这是带样式的文本]_

> 这是一个引用块

1. 有序列表项一
2. 有序列表项二

---

\`\`\`js
// 代码块示例
function hello() {
  console.log("Hello, world!");
}
\`\`\`

| 表头1 | 表头2 |
|-------|-------|
| 单元格1 | 单元格2 |
| 单元格3 | 单元格4 |

- [x] 已完成任务
- [ ] 未完成任务

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
    // let processedMdast = insertMdastId(markdownParser.md2mdast(md), "data-mdast-id");
    let processedMdast = markdownParser.md2mdast(md);
    processedMdast = insertNodeAttrs(processedMdast);
    state.mdast = processedMdast;
    state.renderedElement = markdownParser.mdast2react(processedMdast);
  }, [md]);

  const handleElementClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const mdastId = target.getAttribute("data-mdrich-id");

    if (mdastId) {
      visit(state.mdast, (node: any) => {
        if (node.data?.["hProperties"]?.["data-mdrich-id"] === mdastId) {
          state.selectedElement = node.data?.["hProperties"]?.["data-mdrich-id"];
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
        const allNodes = divRef.current.querySelectorAll("[data-mdrich-id]");
        allNodes.forEach((el) => {
          (el as HTMLElement).classList.remove("highlight-selection");
        });
      }

      // 给选中的id加上高亮样式
      if (divRef.current && Array.isArray(idsToDelete)) {
        idsToDelete.forEach((id) => {
          const el = divRef.current.querySelector(`[data-mdrich-id="${id}"]`);
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
      if (mdast.data?.["hProperties"]?.["data-mdrich-id"] === nodeId) {
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
        editTextWrapper(node, value);
      } else {
        console.log("没有找到节点", nodeId);
      }
      return mdast;
    },
    getNode(mdast: any, nodeId: string) {
      let target = null;
      visit(mdast, (node: any) => {
        if (node.data?.["hProperties"]?.["data-mdrich-id"] === nodeId) {
          target = node;
        }
      });
      return target;
    },
  };

  function flatMdast(mdast: any, flatAST: any[] = []) {
    if (mdast.type !== "TextWrapper" && Array.isArray(mdast.children)) {
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
      `[data-mdrich-id="${cursorPositionRef.current.nodeId}"]`,
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
        const ranges = event.getTargetRanges();
        console.log("eventandranges", event, ranges);
        const id = (ranges[0].startContainer as HTMLElement).getAttribute("data-mdrich-id");
        const node = EditorManager.getNode(state.mdast, id);
        if (node.type !== "TextWrapper") {
          console.log("删除了一个非文本包装节点，不处理", node);
          return;
        }
        event.preventDefault();

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
                if (node.data?.["hProperties"]?.["data-mdrich-id"] === startId) {
                  if (node.type !== "TextWrapper") {
                    console.log("不是文本包装节点", node);
                    return;
                  }
                  console.log("删除前", getTextWrapper(node));
                  console.log(
                    "删除后",
                    getTextWrapper(node).slice(0, startOffset) +
                      getTextWrapper(node).slice(endOffset),
                  );

                  EditorManager.editNode(
                    newMdast,
                    startId,
                    getTextWrapper(node).slice(0, startOffset) +
                      getTextWrapper(node).slice(endOffset),
                  );
                }
              });
            } else {
              // 1、删除中间的节点
              let startIndex = flatAST.findIndex(
                (node) => node.data?.["hProperties"]?.["data-mdrich-id"] === startId,
              );
              let endIndex = flatAST.findIndex(
                (node) => node.data?.["hProperties"]?.["data-mdrich-id"] === endId,
              );
              const startNodeNewText = getTextWrapper(flatAST[startIndex]).slice(0, startOffset);
              const endNodeNewText = getTextWrapper(flatAST[endIndex]).slice(endOffset);
              editTextWrapper(flatAST[startIndex], startNodeNewText);
              EditorManager.editNode(newMdast, startId, startNodeNewText);
              editTextWrapper(flatAST[endIndex], endNodeNewText);
              EditorManager.editNode(newMdast, endId, endNodeNewText);
              // 大于2个节点的跨度，删除中间的节点
              if (endIndex - startIndex > 1) {
                const nodes = flatAST.splice(startIndex + 1, endIndex - startIndex - 1);
                nodes.forEach((node) => {
                  EditorManager.deleteNode(
                    newMdast,
                    node.data?.["hProperties"]?.["data-mdrich-id"],
                  );
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
          const startId = startParentElement.getAttribute("data-mdrich-id");
          const endId = endParentElement.getAttribute("data-mdrich-id");
          return deleteText(mdast, startId, endId, startOffset, endOffset);
        };

        // 仅处理删除操作
        if (event.inputType.startsWith("delete")) {
          let newMdast = deleteRange(state.mdast, ranges);
          state.renderedElement = markdownParser.mdast2react(newMdast);
          state.mdast = newMdast;
        } else if (event.inputType === "insertText") {
          let newMdast = deleteRange(state.mdast, ranges);
          const insertText = event.data;
          const ele = ranges[0].startContainer.parentElement;
          const id = ele.getAttribute("data-mdrich-id");
          const node = EditorManager.getNode(newMdast, id);
          if (node) {
            newMdast = _.cloneDeep(
              EditorManager.editNode(
                newMdast,
                id,
                `${getTextWrapper(node).slice(0, ranges[0].startOffset)}${insertText}${getTextWrapper(node).slice(ranges[0].startOffset)}`,
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
              const id = ele.getAttribute("data-mdrich-id");
              const node = EditorManager.getNode(state.mdast, id);
              if (node) {
                EditorManager.editNode(
                  newMdast,
                  id,
                  getTextWrapper(node).slice(0, startComposePos.startOffset) +
                    imeManagerRef.current?.lastResult +
                    getTextWrapper(node).slice(startComposePos.endOffset),
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

  // 监听img被删除的事件
  useEffect(() => {
    const handleImg = (imgNode: HTMLImageElement) => {
      console.log("图片被删除，id为：", imgNode.getAttribute("data-mdrich-id"));
      const id = imgNode.getAttribute("data-mdrich-id");
      if (id) {
        const newMdast = _.cloneDeep(state.mdast);
        EditorManager.deleteNode(newMdast, id);
        state.renderedElement = markdownParser.mdast2react(newMdast);
        state.mdast = newMdast;
      }
    };
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1 && (node as HTMLElement).tagName === "IMG") {
              handleImg(node as HTMLImageElement);
            }
            // 递归检查子节点
            if (node.hasChildNodes && node.hasChildNodes()) {
              node.childNodes.forEach((child) => {
                if (child.nodeType === 1 && (child as HTMLElement).tagName === "IMG") {
                  handleImg(child as HTMLImageElement);
                }
              });
            }
          });
        }
      });
    });

    if (divRef.current) {
      observer.observe(divRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [divRef]);

  return (
    <div className="app-container">
      <div className="app-layout">
        {/* 渲染区域 */}
        <div className="content-section">
          <h3 className="section-title">🎨 渲染</h3>
          <div
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            onClick={handleElementClick}
            className="editor-area"
          >
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

Node.prototype.removeChild = function (child: any) {
  return child.remove();
};
