import React, { useEffect } from "react";
import HidePlugin from "./MDPlugins/hidePlugin";
import ReactMarkdown from "react-markdown";
import BigPinkPlugin from "./MDPlugins/bigPinkPlugin";

const testND = `=123=`;

export default function App() {
  useEffect(() => {
    console.log("testND");
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <ReactMarkdown remarkPlugins={[BigPinkPlugin]}>{testND}</ReactMarkdown>
    </div>
  );
}
