import micromarkTextExtension from "./micromarkTextExtension";
import { fromTextExtention } from "./fromMaekdownTextExtention";
/**
 *
 * 语法格式为：_[[css语法;css语法;css语法]文本内容]_
 * 示例：_[[color:red;font-size:12px]你好，世界]_
 * 1. 文本内容为必填项
 * 2. 定界符为：_[]_
 */

export default function textPlugin(options = {}) {
  const data = this.data();
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(micromarkTextExtension());

  data.fromMarkdownExtensions = data.fromMarkdownExtensions || [];
  data.fromMarkdownExtensions.push(fromTextExtention());
}
