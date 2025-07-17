import { PathUtils, ASTPath, ASTNode } from "./pathUtils";
import { DOMSelectionConverter, Selection, SelectionUtils, RangeUtils } from "./selection";

/**
 * 简单的MDAST编辑器
 * 监听DOM编辑事件，将变更映射到MDAST中
 */
export class MDASTEditor {
  private mdastTree: ASTNode;
  private targetElement: HTMLElement;

  constructor(mdastTree: ASTNode, targetElement: HTMLElement) {
    this.mdastTree = mdastTree;
    this.targetElement = targetElement;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners() {
    // 监听输入事件
    this.targetElement.addEventListener("input", this.handleInput.bind(this));

    // 监听键盘事件
    this.targetElement.addEventListener("keydown", this.handleKeyDown.bind(this));

    // 监听粘贴事件
    this.targetElement.addEventListener("paste", this.handlePaste.bind(this));
  }

  /**
   * 处理输入事件
   */
  private handleInput(event: Event) {
    console.log("🔥 检测到DOM编辑事件 - input");
    this.processEditChange();
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent) {
    // 只处理会改变内容的按键
    if (["Backspace", "Delete", "Enter"].includes(event.key)) {
      console.log(`🔥 检测到DOM编辑事件 - ${event.key}`);
      setTimeout(() => this.processEditChange(), 0); // 延迟处理，等DOM更新完成
    }
  }

  /**
   * 处理粘贴事件
   */
  private handlePaste(event: ClipboardEvent) {
    console.log("🔥 检测到DOM编辑事件 - paste");
    setTimeout(() => this.processEditChange(), 0); // 延迟处理，等粘贴完成
  }

  /**
   * 处理编辑变更
   */
  private processEditChange() {
    const domSelection = window.getSelection();
    if (!domSelection) return;

    // 获取当前选择
    const selection = DOMSelectionConverter.fromDOMSelection(domSelection, this.mdastTree);
    if (!selection) return;

    // 获取当前选择位置的信息
    const point = SelectionUtils.isCollapsed(selection)
      ? selection.anchor
      : RangeUtils.start(selection);

    // 获取编辑的文本节点
    const editedNode = this.getEditedTextNode(point.path);
    if (!editedNode) return;
    // 克隆MDAST树进行修改
    const modifiedMdast = this.cloneMDASTTree(this.mdastTree);

    // 更新被编辑的节点
    this.updateTextNode(modifiedMdast, point.path, editedNode.textContent || "");

    // 输出修改后的MDAST
    console.log("📝 修改后的MDAST:");
    console.log(JSON.stringify(modifiedMdast, null, 2));

    // 更新全局MDAST引用
    (window as any).__mdastTree = modifiedMdast;
    this.mdastTree = modifiedMdast;
  }

  /**
   * 获取被编辑的文本节点
   */
  private getEditedTextNode(path: ASTPath): HTMLElement | null {
    // 根据路径查找对应的DOM元素
    const pathString = PathUtils.pathToString(path);
    const element = this.targetElement.querySelector(`[data-ast-path="${pathString}"]`);

    if (element) {
      return element as HTMLElement;
    }

    // 如果找不到精确匹配，可能是文本节点的父元素
    const parentPath = PathUtils.getParentPath(path);
    const parentPathString = PathUtils.pathToString(parentPath);
    const parentElement = this.targetElement.querySelector(`[data-ast-path="${parentPathString}"]`);

    return (parentElement as HTMLElement) || null;
  }

  /**
   * 克隆MDAST树
   */
  private cloneMDASTTree(tree: ASTNode): ASTNode {
    return JSON.parse(JSON.stringify(tree));
  }

  /**
   * 更新文本节点的内容
   */
  private updateTextNode(tree: ASTNode, path: ASTPath, newValue: string): void {
    const targetNode = PathUtils.getNodeByPath(tree, path);

    if (targetNode && targetNode.type === "text") {
      targetNode.value = newValue;
    } else {
      // 如果目标节点不是文本节点，可能需要更新其子节点
      const parentPath = PathUtils.getParentPath(path);
      const parentNode = PathUtils.getNodeByPath(tree, parentPath);

      if (parentNode && parentNode.children) {
        // 简化处理：用新的文本节点替换
        const textNode: ASTNode = {
          type: "text",
          value: newValue,
          __path: path,
          __pathString: PathUtils.pathToString(path),
        };

        const lastIndex = path[path.length - 1];
        if (parentNode.children[lastIndex]) {
          parentNode.children[lastIndex] = textNode;
        }
      }
    }
  }

  /**
   * 销毁编辑器，移除事件监听器
   */
  destroy() {
    this.targetElement.removeEventListener("input", this.handleInput.bind(this));
    this.targetElement.removeEventListener("keydown", this.handleKeyDown.bind(this));
    this.targetElement.removeEventListener("paste", this.handlePaste.bind(this));
  }

  /**
   * 更新MDAST树引用
   */
  updateMDASTTree(newTree: ASTNode) {
    this.mdastTree = newTree;
  }
}
