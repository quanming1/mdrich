import React, { useState } from "react";
import "./style.scss";

const RichTextEditor: React.FC = () => {
  const [content, setContent] = useState<string>(
    '# 富文本编辑器\n\n在这里输入您的内容...\n\n**粗体文本**\n\n*斜体文本*\n\n- 列表项 1\n- 列表项 2\n- 列表项 3\n\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```',
  );

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value);
  };

  // 简单的 Markdown 渲染（基础版本）
  const renderMarkdown = (text: string): string => {
    return text
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*)\*/g, "<em>$1</em>")
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>")
      .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
      .replace(/\n/g, "<br>");
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-header">
        <h1>富文本编辑器</h1>
        <p>左侧编辑，右侧预览</p>
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
          <div
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
