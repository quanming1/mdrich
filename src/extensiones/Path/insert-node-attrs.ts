import * as _ from "lodash-es";
import { visit } from "unist-util-visit";
import { nanoid } from "nanoid";
import { isTextNode, isVoidNode } from "../utils";

const attrIdKey = "data-mdrich-id";

function addKey(node: any) {
  const id = nanoid(6);
  node.data = node.data || {};
  node.data["hProperties"] = node.data["hProperties"] || {};
  node.data["hProperties"][attrIdKey] = id;
  return node;
}

export function insertNodeAttrs(mdast: any): any {
  mdast = _.cloneDeep(mdast);

  visit(mdast, (node: any, index, parent: any | undefined) => {
    if (node.type === "root") return;
    if (isVoidNode(node)) {
      const imageWrapper = {
        type: "VoidWrapper",
        data: {
          hName: "span",
          hProperties: {
            "data-mdrich-node": "void",
          },
        },
        children: [addKey(node)],
      };
      (parent as any).children[index] = addKey(imageWrapper);
    } else if (isTextNode(node)) {
      const spanWrapper = {
        type: "TextWrapper",
        data: {
          hName: "span",
          hProperties: {
            "data-mdrich-node": "text",
            "data-mdrich-leaf": true,
          },
        },
        children: [addKey(node)],
      };
      (parent as any).children[index] = addKey(spanWrapper);
    } else {
      addKey(node);
      if (parent && parent.type === "root") {
        node.data["hProperties"]["data-mdrich-node"] = "element";
      }
    }
  });

  return mdast;
}
