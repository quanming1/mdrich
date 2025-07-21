import { Node as MdastNode } from "unist";

export function getCustomSelection() {
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return;

  const anchorId = getId(domSelection.anchorNode);
  const focusId = getId(domSelection.focusNode);

  return {
    start: {
      id: anchorId,
      offset: domSelection.anchorOffset,
    },
    end: {
      id: focusId,
      offset: domSelection.focusOffset,
    },
    type: domSelection.type,
  };
}

function getId(anchorElement: Node): any {
  let e: HTMLElement = null;
  // 是文本节点
  e = anchorElement.parentElement;
  if (!e?.dataset?.mdastId) return null;
  const mdastId = e.dataset.mdastId;
  return mdastId;
}

export function getIdsToDelete(
  mdast: MdastNode,
  start: { id: string; offset: number },
  end: { id: string; offset: number },
): string[] {
  if (start.id === end.id) {
    // 如果开头节点id等于结尾id，直接返回这个节点
    return [start.id];
  }

  const ids: string[] = [];
  let recording = false;
  let finished = false;

  function inorder(node: MdastNode) {
    if (finished) return;

    const nodeId = node["data"]?.["hProperties"]?.["data-mdast-id"];

    if (nodeId === start.id) {
      recording = true;
    }
    if (recording && nodeId && node["type"] === "text") {
      ids.push(nodeId);
    }

    if (nodeId === end.id && recording) {
      finished = true;
      return;
    }

    if (Array.isArray(node["children"])) {
      for (const child of node["children"]) {
        inorder(child);
        if (finished) break;
      }
    }
  }

  inorder(mdast);
  return ids;
}
