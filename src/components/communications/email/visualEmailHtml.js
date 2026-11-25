import DOMPurify from "dompurify";

const VISUAL_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "br",
  "blockquote",
  "ol",
  "ul",
  "li",
  "a",
  "hr",
];
const VISUAL_TAG_SET = new Set(VISUAL_TAGS);
const GLOBAL_ATTRIBUTES = [
  "style",
  "dir",
  "lang",
  "title",
  "align",
  "bgcolor",
  "width",
  "height",
  "valign",
];
const LINK_ATTRIBUTES = ["href", "rel", "target"];
const STYLE_PROPERTIES = new Set([
  "background-color",
  "border",
  "border-bottom",
  "border-color",
  "border-left",
  "border-radius",
  "border-right",
  "border-style",
  "border-top",
  "border-width",
  "color",
  "display",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-transform",
  "vertical-align",
  "white-space",
  "width",
]);
const VARIABLE_NAMES = new Set([
  "entryCode",
  "studioName",
  "studioAddress",
  "bookingTime",
  "bookingUrl",
]);
const TOKEN_PATTERN = /{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g;
const BOOKING_LINK = "{{bookingUrl}}";
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
]);
const CONTAINER_CHILD_TAGS = new Set([...BLOCK_TAGS, "hr"]);
const INLINE_MARK_TAGS = new Set([
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
]);
const INLINE_BOX_PROPERTIES =
  /^(?:border(?:-|$)|padding(?:-|$)|margin(?:-|$)|(?:min-|max-)?width$|height$|vertical-align$)/;

const hasDOM = () =>
  typeof document !== "undefined" && Boolean(DOMPurify.sanitize);

function styleDeclarations(source) {
  return String(source ?? "")
    .split(";")
    .filter((part) => part.trim())
    .map((part) => {
      const colon = part.indexOf(":");
      return {
        property: colon < 0 ? "" : part.slice(0, colon).trim().toLowerCase(),
        value: colon < 0 ? "" : part.slice(colon + 1).trim(),
      };
    });
}

function safeStyleValue(property, value) {
  if (!STYLE_PROPERTIES.has(property) || !value || value.length > 500)
    return false;
  if (/[{}<>\\@\u0000-\u001f\u007f]/.test(value) || /\/\*|\*\//.test(value))
    return false;
  if (
    /(?:expression\s*\(|url\s*\(|(?:java|vb)script\s*:|behavior\s*:|-moz-binding|(?:var|env|attr)\s*\()/i.test(
      value,
    )
  )
    return false;
  if (property === "display" && /^none\b/i.test(value)) return false;
  if (property === "color" && /^transparent\b/i.test(value)) return false;
  if (
    property === "font-size" &&
    /^(?:0+(?:\.0*)?|\.0+)\s*(?:[a-z%]+)?(?:\s*!important)?$/i.test(value)
  )
    return false;
  return true;
}

/** Inline email styles only; no stylesheet classes or external resources. */
export function sanitizeVisualEmailStyle(source) {
  return styleDeclarations(source)
    .filter(({ property, value }) => safeStyleValue(property, value))
    .map(({ property, value }) => `${property}: ${value.replace(/["']/g, "")}`)
    .join("; ");
}

/** The booking URL is the only dynamic link target supported by the server. */
export function isVisualEmailLinkAllowed(href) {
  const value = String(href ?? "").trim();
  if (value === BOOKING_LINK) return true;
  if (!value || /[{}\u0000-\u0020\u007f-\u009f<>\\]/.test(value)) return false;
  if (/^mailto:/i.test(value)) return value.length > 7;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function allowedAttribute(element, name, value) {
  if (/[{}]/.test(value))
    return (
      element.localName === "a" && name === "href" && value === BOOKING_LINK
    );
  if (GLOBAL_ATTRIBUTES.includes(name)) return true;
  if (element.localName !== "a") return false;
  if (name === "href") return isVisualEmailLinkAllowed(value);
  if (name === "target") return ["_blank", "_self"].includes(value);
  if (name === "rel")
    return value
      .split(/\s+/)
      .filter(Boolean)
      .every((part) => ["noopener", "noreferrer"].includes(part.toLowerCase()));
  return false;
}

function unsupportedStructure(element) {
  const declarations = styleDeclarations(element.getAttribute("style"));
  if (element.localName === "div") {
    // The editor's div node contains blocks. Wrapping bare or mixed inline
    // children in paragraphs would introduce spacing and change their layout.
    const hasInlineChildren = [...element.childNodes].some((child) =>
      child.nodeType === 3
        ? Boolean(child.nodeValue.trim())
        : child.nodeType === 1 && !CONTAINER_CHILD_TAGS.has(child.localName),
    );
    const hasDifferentDisplay = declarations.some(
      ({ property, value }) =>
        property === "display" && !/^block(?:\s*!important)?$/i.test(value),
    );
    if (!element.children.length || hasInlineChildren || hasDifferentDisplay)
      return "structure:div-layout";
  }
  if (
    INLINE_MARK_TAGS.has(element.localName) &&
    declarations.some(
      ({ property, value }) =>
        INLINE_BOX_PROPERTIES.test(property) ||
        (property === "display" && !/^inline(?:\s*!important)?$/i.test(value)),
    )
  ) {
    // ProseMirror represents inline styles as marks and may split one wrapper
    // into siblings around nested formatting. Repeating a box changes spacing.
    return "structure:inline-box";
  }
  if (
    element.localName === "span" &&
    (element.parentElement?.closest("span") || element.querySelector("span")) &&
    declarations.some(
      ({ property, value }) =>
        /\b(?:inherit|unset|revert(?:-layer)?|larger|smaller|bolder|lighter)\b/i.test(
          value,
        ) ||
        (["font-size", "letter-spacing", "line-height"].includes(property) &&
          /(?:\d+(?:\.\d*)?|\.\d+)(?:em|ex|ch|%)(?:\s|$)/i.test(value)),
    )
  ) {
    // Relative values depend on nesting depth, which flattened text-style marks
    // cannot reproduce. Literal colors and absolute font sizes remain editable.
    return "structure:relative-span-style";
  }
  if (
    declarations.some(({ property, value }) => {
      // These CSS rules become semantic marks. Other weights, oblique text,
      // resets inside an emphasized ancestor, and decorated line styles cannot
      // be represented by the editor without changing the existing design.
      if (property === "font-weight") return !/^(?:bold|700)$/i.test(value);
      if (property === "font-style") return !/^italic$/i.test(value);
      if (property === "text-decoration")
        return !/^(?:underline|line-through)$/i.test(value);
      return false;
    })
  )
    return "structure:unsupported-typography";
  return null;
}

/** Check before conversion so existing custom layouts never lose features silently. */
export function getVisualEmailCompatibility(html) {
  if (!hasDOM()) return { supported: false, reasons: ["dom-unavailable"] };
  // Template content is inert: neither executable nodes nor resource-bearing
  // elements are attached to the live document during compatibility inspection.
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  const reasons = new Set();
  for (const element of template.content.querySelectorAll("*")) {
    if (!VISUAL_TAG_SET.has(element.localName))
      reasons.add(`tag:${element.localName}`);
    const structureIssue = unsupportedStructure(element);
    if (structureIssue) reasons.add(structureIssue);
    for (const { name, value } of element.attributes) {
      if (
        name === "data-email-variable" &&
        element.localName === "span" &&
        VARIABLE_NAMES.has(value)
      )
        continue;
      if (!allowedAttribute(element, name, value))
        reasons.add(`attribute:${name}`);
      if (name === "style") {
        for (const declaration of styleDeclarations(value)) {
          // The virtual default includes this rule, but the delivery sanitizer
          // already removes it. It is safe to omit without changing sent HTML.
          if (declaration.property === "overflow-wrap") continue;
          if (!safeStyleValue(declaration.property, declaration.value))
            reasons.add(`style:${declaration.property || "invalid"}`);
        }
      }
    }
  }
  return { supported: reasons.size === 0, reasons: [...reasons] };
}

/** Sanitize an inert fragment before supplying it to the visual editor. */
export function prepareVisualEmailHtml(
  html,
  variableNames = [...VARIABLE_NAMES],
) {
  if (!hasDOM()) return "";
  const fragment = DOMPurify.sanitize(String(html ?? ""), {
    ALLOWED_TAGS: VISUAL_TAGS,
    ALLOWED_ATTR: [...GLOBAL_ATTRIBUTES, ...LINK_ATTRIBUTES],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  for (const element of fragment.querySelectorAll("*")) {
    for (const { name, value } of [...element.attributes]) {
      if (!allowedAttribute(element, name, value))
        element.removeAttribute(name);
      else if (name === "style") {
        const style = sanitizeVisualEmailStyle(value);
        if (style) element.setAttribute("style", style);
        else element.removeAttribute("style");
      }
    }
    if (
      element.localName === "a" &&
      element.getAttribute("target") === "_blank"
    ) {
      element.setAttribute("rel", "noopener noreferrer");
    }
  }

  // Operate only on text nodes. Attribute values must never become placeholder
  // atoms, and pasted editor metadata must not manufacture new credentials.
  const walker = document.createTreeWalker(fragment, 4 /* SHOW_TEXT */);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const text = node.nodeValue || "";
    const matches = [...text.matchAll(TOKEN_PATTERN)].filter((match) =>
      variableNames.includes(match[1]),
    );
    if (!matches.length) continue;
    const parent = node.parentElement;
    if (
      matches.length === 1 &&
      matches[0][0] === text &&
      parent?.localName === "span" &&
      !parent.attributes.length &&
      parent.childNodes.length === 1
    ) {
      parent.setAttribute("data-email-variable", matches[0][1]);
      node.nodeValue = `{{${matches[0][1]}}}`;
      continue;
    }
    const replacement = document.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      replacement.append(
        document.createTextNode(text.slice(cursor, match.index)),
      );
      const token = document.createElement("span");
      token.setAttribute("data-email-variable", match[1]);
      token.textContent = `{{${match[1]}}}`;
      replacement.append(token);
      cursor = match.index + match[0].length;
    }
    replacement.append(document.createTextNode(text.slice(cursor)));
    node.replaceWith(replacement);
  }
  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}

/** A readable text alternative that retains actionable link destinations. */
export function visualEmailToPlainText(html) {
  if (!hasDOM()) return null;
  const fragment = DOMPurify.sanitize(String(html ?? ""), {
    ALLOWED_TAGS: [
      ...VISUAL_TAGS,
      "table",
      "tbody",
      "thead",
      "tfoot",
      "tr",
      "td",
      "th",
      "img",
    ],
    ALLOWED_ATTR: ["href", "alt"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  function read(node) {
    if (node.nodeType === 3)
      return (node.nodeValue || "").replace(/[\t\r\n ]+/g, " ");
    const tag = node.localName;
    if (tag === "br" || tag === "hr") return "\n";
    if (tag === "img") return node.getAttribute("alt") || "";
    const text = [...node.childNodes].map(read).join("");
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      return isVisualEmailLinkAllowed(href) && text.trim() !== href
        ? `${text}${text.trim() ? " " : ""}(${href})`
        : text;
    }
    if (tag === "li") return `\n• ${text.trim()}\n`;
    if (tag === "td" || tag === "th") return `${text}\t`;
    if (tag === "tr") return `${text.trim()}\n`;
    return BLOCK_TAGS.has(tag) ? `\n${text.trim()}\n` : text;
  }
  return read(fragment)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
