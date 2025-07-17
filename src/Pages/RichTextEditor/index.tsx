import React, { useState, useRef, useEffect } from "react";
import "./style.scss";
import ReactMarkdown from "react-markdown";
import textPlugin, {
  mdastDebugPlugin,
  PathUtils,
  customMarkdownComponents,
  DOMSelectionConverter,
  SelectionUtils,
  RangeUtils,
  PointUtils,
  MDASTEditor,
} from "../../extensiones/TextPlugin";

const RichTextEditor: React.FC = () => {
  const [content, setContent] = useState<string>(
    localStorage.getItem("text") ||
      `# 标题

这是普通文本

_[(color:red;font-size:18px)这是红色大字]_

_[(background:yellow;padding:8px)这是黄色背景]_

另一段普通文本`,
  );

  const previewRef = useRef<HTMLDivElement>(null);
  const mdastEditorRef = useRef<MDASTEditor | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value);
  };

  // Selection 监听功能
  useEffect(() => {
    const handleSelectionChange = () => {
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) return;

      const range = domSelection.getRangeAt(0);
      if (!previewRef.current?.contains(range.commonAncestorContainer)) {
        return; // 选择不在预览区域内
      }

      // 获取AST树
      const mdastTree = (window as any).__mdastTree;
      if (!mdastTree) return;

      // 转换为Slate Selection
      const selection = DOMSelectionConverter.fromDOMSelection(domSelection, mdastTree);
      if (!selection) return;

      // 区分选择状态和光标状态
      if (SelectionUtils.isCollapsed(selection)) {
        // 光标状态 - 输出光标位置信息
        const point = selection.anchor;
        const astNode = PathUtils.getNodeByPath(mdastTree, point.path);

        console.log(
          `🔸 光标位置: [${point.path.join(",")}]:${point.offset} (${astNode?.type || "unknown"})`,
        );
      } else {
        // 选择状态 - 输出选择内容对应的mdast
        const selectedText = domSelection.toString();
        const [start, end] = RangeUtils.edges(selection);

        // 获取选择范围内的AST节点
        const startNode = PathUtils.getNodeByPath(mdastTree, start.path);
        const endNode = PathUtils.getNodeByPath(mdastTree, end.path);

        console.log(`📝 选择文字: "${selectedText}" -> 对应MDAST:`, {
          startNode: startNode,
          endNode: PathUtils.isPathEqual(start.path, end.path) ? null : endNode,
          range: {
            start: `[${start.path.join(",")}]:${start.offset}`,
            end: `[${end.path.join(",")}]:${end.offset}`,
          },
        });
      }
    };

    // 防抖处理
    let timeoutId: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleSelectionChange, 100);
    };

    document.addEventListener("selectionchange", debouncedHandler);

    return () => {
      document.removeEventListener("selectionchange", debouncedHandler);
      clearTimeout(timeoutId);
    };
  }, []);

  // MDAST编辑器初始化
  useEffect(() => {
    if (!previewRef.current) return;

    // 等待MDAST树生成
    const initEditor = () => {
      const mdastTree = (window as any).__mdastTree;
      if (mdastTree && previewRef.current) {
        // 销毁旧的编辑器
        if (mdastEditorRef.current) {
          mdastEditorRef.current.destroy();
        }

        // 创建新的编辑器
        mdastEditorRef.current = new MDASTEditor(mdastTree, previewRef.current);
        console.log("✅ MDAST编辑器已初始化");
      }
    };

    // 延迟初始化，确保ReactMarkdown已经渲染完成
    const timer = setTimeout(initEditor, 500);

    // 监听content变化，重新初始化编辑器
    return () => {
      clearTimeout(timer);
      if (mdastEditorRef.current) {
        mdastEditorRef.current.destroy();
        mdastEditorRef.current = null;
      }
    };
  }, [content]); // 依赖content，当内容变化时重新初始化编辑器

  return (
    <div className="rich-text-editor">
      <div className="editor-header">
        <h1>富文本编辑器 - Selection & Range 系统</h1>
        <p>💡 在右侧预览区域选择文字或移动光标，查看控制台中的Selection信息</p>
      </div>

      <div className="editor-container">
        {/* 左侧编辑器 */}
        <div className="editor-panel">
          <div className="panel-header">
            <h3>Markdown 编辑器</h3>
          </div>
          <textarea
            className="editor-textarea"
            value={content}
            onChange={handleChange}
            placeholder="在这里输入您的内容..."
            spellCheck={false}
          />
        </div>

        {/* 右侧预览 */}
        <div className="preview-panel">
          <div className="panel-header">
            <h3>预览区域 (Selection监听)</h3>
          </div>
          <div
            className="preview-content"
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning={true}
            style={{
              minHeight: "300px",
              border: "1px solid #e0e0e0",
              padding: "16px",
              borderRadius: "4px",
              outline: "none",
            }}
          >
            <ReactMarkdown
              remarkPlugins={[textPlugin, mdastDebugPlugin]}
              rehypePlugins={[]}
              components={customMarkdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
