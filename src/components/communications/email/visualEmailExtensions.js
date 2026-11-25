import { Extension, Node, nodeInputRule, nodePasteRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  BackgroundColor,
  TextStyle,
  TextStyleKit,
} from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";

import { DOOR_ACCESS_EMAIL_VARIABLES } from "./doorAccessEmailContent";
import {
  isVisualEmailLinkAllowed,
  sanitizeVisualEmailStyle,
} from "./visualEmailHtml";

const variablePattern = (names) =>
  names.filter((name) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(name)).join("|") ||
  "(?!)";
const supportedTypes = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "emailContainer",
  "horizontalRule",
  "hardBreak",
  "textStyle",
  "bold",
  "italic",
  "underline",
  "strike",
  "link",
];
const globalAttributes = [
  "dir",
  "lang",
  "title",
  "align",
  "bgcolor",
  "width",
  "height",
  "valign",
];
const textStyleProperties = [
  "color",
  "font-family",
  "font-size",
  "line-height",
];
const markStyleProperties = [
  ...textStyleProperties,
  "font-weight",
  "font-style",
  "text-decoration",
];

function preservedStyle(element, type) {
  if (type === "textStyle" && element.localName !== "span") return null;
  const style = document.createElement("span").style;
  style.cssText = sanitizeVisualEmailStyle(element.getAttribute("style") || "");
  // Controlled typography lives in marks. Retaining the same declarations in
  // the presentation bag would make Unbold/Default size appear to do nothing.
  for (const property of markStyleProperties) style.removeProperty(property);
  if (type === "textStyle") style.removeProperty("background-color");
  if (["paragraph", "heading", "emailContainer"].includes(type))
    style.removeProperty("text-align");
  return sanitizeVisualEmailStyle(style.cssText) || null;
}

const EmailTextStyle = TextStyle.extend({
  parseHTML() {
    return [
      ...(this.parent?.() || []),
      {
        tag: "span",
        consuming: false,
        getAttrs: (element) =>
          globalAttributes.some((attribute) => element.hasAttribute(attribute))
            ? {}
            : false,
      },
      {
        tag: "*",
        consuming: false,
        getAttrs: (element) =>
          textStyleProperties.some((property) =>
            element.style.getPropertyValue(property),
          )
            ? {}
            : false,
      },
    ];
  },
});

const EmailBackgroundColor = BackgroundColor.extend({
  addGlobalAttributes() {
    return (this.parent?.() || []).map((group) => ({
      ...group,
      attributes: {
        ...group.attributes,
        backgroundColor: {
          ...group.attributes.backgroundColor,
          parseHTML: (element) =>
            element.localName === "span"
              ? group.attributes.backgroundColor.parseHTML(element)
              : null,
        },
      },
    }));
  },
});

export const EmailContainer = Node.create({
  name: "emailContainer",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "div" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, 0],
});

export const EmailPresentation = Extension.create({
  name: "emailPresentation",
  addGlobalAttributes() {
    return supportedTypes.map((type) => ({
      types: [type],
      attributes: {
        emailStyle: {
          default: null,
          parseHTML: (element) => preservedStyle(element, type),
          renderHTML: ({ emailStyle }) =>
            emailStyle ? { style: sanitizeVisualEmailStyle(emailStyle) } : {},
        },
        ...Object.fromEntries(
          globalAttributes.map((attribute) => [
            attribute,
            {
              default: null,
              parseHTML: (element) =>
                type === "textStyle" && element.localName !== "span"
                  ? null
                  : element.getAttribute(attribute),
              renderHTML: (attributes) =>
                attributes[attribute]
                  ? { [attribute]: attributes[attribute] }
                  : {},
            },
          ]),
        ),
      },
    }));
  },
});

export const EmailVariable = Node.create({
  name: "emailVariable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  // Marks wrap the complete atom, preserving existing emphasis without ever
  // splitting a variable into HTML fragments the delivery worker cannot use.
  addOptions: () => ({
    tokenClassName: "",
    variableNames: DOOR_ACCESS_EMAIL_VARIABLES,
  }),
  addAttributes: () => ({ name: { default: "entryCode", rendered: false } }),
  parseHTML() {
    return [
      {
        tag: "span[data-email-variable]",
        getAttrs: (element) =>
          this.options.variableNames.includes(
            element.getAttribute("data-email-variable"),
          )
            ? { name: element.getAttribute("data-email-variable") }
            : false,
      },
    ];
  },
  // Template variables must never be put in HTML attributes. The backend
  // substitutes this contiguous visible text, including on a later re-import.
  renderHTML: ({ node }) => ["span", {}, `{{${node.attrs.name}}}`],
  renderText: ({ node }) => `{{${node.attrs.name}}}`,
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = this.options.tokenClassName;
      dom.contentEditable = "false";
      dom.textContent = `{{${node.attrs.name}}}`;
      return { dom };
    };
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: new RegExp(
          `{{\\s*(${variablePattern(this.options.variableNames)})\\s*}}$`,
        ),
        type: this.type,
        getAttributes: (match) => ({ name: match[1] }),
      }),
    ];
  },
  addPasteRules() {
    return [
      nodePasteRule({
        find: new RegExp(
          `{{\\s*(${variablePattern(this.options.variableNames)})\\s*}}`,
          "g",
        ),
        type: this.type,
        getAttributes: (match) => ({ name: match[1] }),
      }),
    ];
  },
});

export function createVisualEmailExtensions({
  tokenClassName = "",
  variableNames = DOOR_ACCESS_EMAIL_VARIABLES,
} = {}) {
  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      trailingNode: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        isAllowedUri: isVisualEmailLinkAllowed,
        HTMLAttributes: { target: null, rel: "noopener noreferrer" },
      },
    }),
    EmailContainer,
    EmailPresentation,
    TextStyleKit.configure({ textStyle: false, backgroundColor: false }),
    EmailTextStyle,
    EmailBackgroundColor,
    TextAlign.configure({ types: ["heading", "paragraph", "emailContainer"] }),
    EmailVariable.configure({ tokenClassName, variableNames }),
  ];
}

export function findVisualEmailBlock(editor) {
  if (!editor) return null;
  const { $from } = editor.state.selection;
  let textBlock = null;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    const block = { node, position: $from.before(depth) };
    if (node.type.name === "emailContainer") return block;
    if (!textBlock && node.isTextblock) textBlock = block;
  }
  return textBlock;
}

export function updateVisualEmailBlockStyle(
  editor,
  patch,
  { focus = true } = {},
) {
  const block = findVisualEmailBlock(editor);
  if (!block || !editor.isEditable) return false;
  const element = document.createElement("div");
  element.style.cssText = block.node.attrs.emailStyle || "";
  for (const [property, value] of Object.entries(patch)) {
    if (value) element.style.setProperty(property, value);
    else element.style.removeProperty(property);
  }
  const emailStyle =
    sanitizeVisualEmailStyle(element.getAttribute("style") || "") || null;
  if (emailStyle === block.node.attrs.emailStyle) return false;
  const chain = editor.chain();
  if (focus) chain.focus();
  chain
    .command(({ tr }) => {
      tr.setNodeMarkup(block.position, undefined, {
        ...block.node.attrs,
        emailStyle,
      });
      return true;
    })
    .run();
  return true;
}
