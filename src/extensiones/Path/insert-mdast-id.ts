import { nanoid } from "nanoid";
import * as _ from "lodash-es";
import { visit } from "unist-util-visit";
import { Node } from "unist";

// 遍历mdast，为每个节点添加一个唯一的id，并添加到hProperties中
export function insertMdastId(mdast: Node, key: string): Node {
  mdast = _.cloneDeep(mdast);
  visit(mdast, (node: Node) => {
    if (node.type === "root") return;

    node.data = node.data || {};
    node.data["hProperties"] = node.data["hProperties"] || {};
    node.data["hProperties"][key] = nanoid(6);
  });
  return mdast;
}
