import micromarkTextExtension from "./micromarkTextExtension";
import { fromTextExtention } from "./fromMaekdownTextExtention";
/**
 * 富文本：文字部分拓展
 * @param options
 */
export default function textPlugin(options = {}) {
  const data = this.data();
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(micromarkTextExtension());

  data.fromMarkdownExtensions = data.fromMarkdownExtensions || [];
  data.fromMarkdownExtensions.push(fromTextExtention());
}
