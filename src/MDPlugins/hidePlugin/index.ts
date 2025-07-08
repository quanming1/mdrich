import { fromMarkdownHideExtension } from "./fromMarkdownHideExtension";
import { micromarkHideExtension } from "./micromarkHideExtension";

function HidePlugin() {
  const data = this.data();

  // 注册 fromMarkdown 扩展
  data.fromMarkdownExtensions = data.fromMarkdownExtensions || [];
  data.fromMarkdownExtensions.push(fromMarkdownHideExtension);

  // 注册 micromark 扩展
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(micromarkHideExtension);
}

export default HidePlugin;
