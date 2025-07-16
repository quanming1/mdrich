import React, { useState } from "react";
import "./style.scss";
import ReactMarkdown from "react-markdown";
import textPlugin from "../../extensiones/TextPlugin";

const RichTextEditor: React.FC = () => {
  const [content, setContent] = useState<string>(`=123=`);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value);
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-header">
        <h1>富文本编辑器</h1>
      </div>

      <div className="editor-container">
        {/* 左侧编辑器 */}
        <div className="editor-panel">
          <div className="panel-header">
            <h3>编辑器</h3>
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
            <h3>预览</h3>
          </div>
          <div className="preview-content">
            <ReactMarkdown remarkPlugins={[textPlugin]} rehypePlugins={[]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
