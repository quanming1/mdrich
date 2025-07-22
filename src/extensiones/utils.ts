/**
 * 获取节点文本
 * @param node 节点
 * @returns 节点文本
 */
export function getTextWrapper(node: any) {
  if (node.value) return node.value;
  else if (node.type === "TextWrapper") {
    return getTextWrapper(node.children[0]);
  }
  return null;
}

/**
 * 编辑节点文本
 * @param node 节点
 * @param value 新文本
 */
export function editTextWrapper(node: any, value: string) {
  if (node.value) {
    node.value = value;
  } else if (node.type === "TextWrapper") {
    editTextWrapper(node.children[0], value);
  }
}
