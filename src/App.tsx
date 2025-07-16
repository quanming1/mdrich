import React from "react";
import "katex/dist/katex.min.css";
import "./Style/index.scss";
import RichTextEditor from "./Pages/RichTextEditor";

export default function App() {
  return (
    <div>
      <RichTextEditor />
    </div>
  );
}
