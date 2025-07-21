import { unified } from "unified";
import remarkParse from "remark-parse";
import { hast2react } from "../../../packages/hast2react/index";
import remarkRehype from "remark-rehype";
import React from "react";

/**
 * markdown 解析器
 */
export class MarkdownParser {
  private parserPlugins: any[];

  constructor(parserPlugins: any[]) {
    this.parserPlugins = parserPlugins;
  }

  // markdown 转 mdast
  md2mdast = (md: string) => {
    let p = unified().use(remarkParse);
    if (this.parserPlugins.length > 0) {
      this.parserPlugins.forEach((plugin) => {
        p = p.use(plugin);
      });
    }
    return p.parse(md);
  };

  // mdast 转 react
  mdast2react = (mdast: any): React.ReactElement => {
    return hast2react(this.mdast2hast(mdast));
  };

  // mdast 转 hast
  mdast2hast = (mdast: any): any => {
    return unified()
      .use(remarkRehype, {
        allowDangerousHtml: false,
        handlers: {
          // 自定义处理 text 节点
          text: (h: any, node: any) => {
            const nodeId = node["data"]?.["hProperties"]?.["data-mdast-id"];
            return {
              type: "element",
              tagName: "span",
              properties: {
                "data-mdast-leaf": true,
                "data-mdast-id": nodeId,
              },
              children: [
                {
                  type: "text",
                  value: node.value,
                },
              ],
            };
          },
        },
      })
      .runSync(mdast);
  };

  parseMarkdown = (md: string): React.ReactElement => {
    return this.mdast2react(this.md2mdast(md));
  };
}
