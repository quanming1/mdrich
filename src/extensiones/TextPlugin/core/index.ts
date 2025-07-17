import micromarkTextExtension from "../extensions/micromarkTextExtension";
import { fromTextExtention } from "../extensions/fromMaekdownTextExtention";
import { PathUtils, ASTNode } from "../utils/pathUtils";

/**
 *
 * 语法格式为：_[(css语法;css语法;css语法)文本内容]_
 * 示例：_[(color:red;font-size:12px)你好，世界]_
 * 1. 文本内容为必填项
 * 2. 定界符为：_[()]_
 */

export default function textPlugin(options = {}) {
  const data = this.data();
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push(micromarkTextExtension());

  data.fromMarkdownExtensions = data.fromMarkdownExtensions || [];
  data.fromMarkdownExtensions.push(fromTextExtention());
}

// 增强的 mdast 调试插件 - 集成路径系统
export function mdastDebugPlugin() {
  return function transformer(tree: ASTNode, file: any) {
    console.log("🔧 开始处理AST树，添加路径信息...");

    // 为AST树添加路径信息
    PathUtils.addPathToNodes(tree);

    // 递归为每个节点添加路径属性，供渲染时使用
    function addPathToNode(node: ASTNode, path: number[] = []) {
      // 为节点添加路径信息
      node.__path = path;
      node.__pathString = PathUtils.pathToString(path);

      // 如果有data属性，添加到hProperties中
      if (!node.data) {
        node.data = {};
      }
      if (!node.data.hProperties) {
        node.data.hProperties = {};
      }

      // 添加路径相关的data属性
      node.data.hProperties["data-ast-path"] = PathUtils.pathToString(path);
      node.data.hProperties["data-ast-type"] = node.type;
      node.data.hProperties["data-ast-node"] = JSON.stringify({
        type: node.type,
        path: path,
        value: node.value || undefined,
      });

      // 递归处理子节点
      if (node.children) {
        node.children.forEach((child, index) => {
          addPathToNode(child, [...path, index]);
        });
      }
    }

    addPathToNode(tree);

    // 简化输出：只输出基本的AST树结构
    console.log("\n📄 MDAST 树结构：");
    console.log(JSON.stringify(tree, null, 2));

    // 存储到全局对象，供后续使用
    (window as any).__mdastTree = tree;
    (window as any).__PathUtils = PathUtils;

    console.log("\n✅ AST树处理完成\n");

    // 返回修改后的树
    return tree;
  };
}

// 导出路径工具，供其他模块使用
export { PathUtils, ASTNode } from "../utils/pathUtils";
