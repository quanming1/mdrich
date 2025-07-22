import * as _ from "lodash-es";
import { visit } from "unist-util-visit";
import { nanoid } from "nanoid";

const attrIdKey = "data-mdrich-id";
export function insertNodeAttrs(mdast: any): any {
  mdast = _.cloneDeep(mdast);

  visit(mdast, (node: any, index, parent: any | undefined) => {
    if (node.type === "root") return;
    node.data = node.data || {};
    node.data["hProperties"] = node.data["hProperties"] || {};
    const id = node.data["hProperties"][attrIdKey] || nanoid(6);

    if (isTextNode(node)) {
      const spanWrapper = {
        type: "TextWrapper",
        data: {
          hName: "span",
          hProperties: {
            "data-mdrich-node": "text",
            "data-mdrich-leaf": true,
            "data-mdrich-id": id,
          },
        },
        children: [node],
      };
      (parent as any).children[index] = spanWrapper;
    } else {
      node.data["hProperties"][attrIdKey] = id;
      if (parent && parent.type === "root") {
        node.data["hProperties"]["data-mdrich-node"] = "element";
      }
    }
  });

  return mdast;
}

function isTextNode(node: any): boolean {
  return node.type === "text";
}
