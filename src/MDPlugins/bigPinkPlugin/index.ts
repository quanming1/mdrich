import { fromMarkdownBigPinkExtension } from "./fromMarkdownBigPinkExtension";
import { micromarkBigPinkExtension } from "./micromarkBigPinkExtension";

function BigPinkPlugin() {
  const data = this.data();

  // 注册 fromMarkdown 扩展
  data.fromMarkdownExtensions = data.fromMarkdownExtensions || [];
  data.fromMarkdownExtensions.push(fromMarkdownBigPinkExtension);

  // 注册 micromark 扩展
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(micromarkBigPinkExtension);
}

export default BigPinkPlugin;
