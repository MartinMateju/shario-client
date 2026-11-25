import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import {
  createVisualEmailExtensions,
  updateVisualEmailBlockStyle,
} from "@/components/communications/email/visualEmailExtensions";
import {
  getVisualEmailCompatibility,
  prepareVisualEmailHtml,
} from "@/components/communications/email/visualEmailHtml";

const DEFAULT_HTML = `<h1 style="margin:0 0 20px;font-size:28px;line-height:1.3;color:inherit;">Your studio entry code</h1>
<p>Your booking starts soon. Here is your code for <strong>{{studioName}}</strong>.</p>
<div style="margin:24px 0;padding:24px;border:1px solid #d8d4cb;border-radius:12px;text-align:center;">
<p style="margin:0 0 10px;font-size:13px;">DOOR ACCESS CODE</p>
<p style="margin:0;font-family:monospace;font-size:34px;font-weight:bold;letter-spacing:4px;overflow-wrap:anywhere;">{{entryCode}}</p></div>
<p><strong>Booking:</strong> {{bookingTime}}</p><p><a href="{{bookingUrl}}">Manage booking</a></p>`;
let editor;
function create(html = DEFAULT_HTML) {
  editor = new Editor({
    extensions: createVisualEmailExtensions(),
    content: prepareVisualEmailHtml(html),
  });
  return editor;
}
function parsed() {
  const template = document.createElement("template");
  template.innerHTML = editor.getHTML();
  return template.content;
}
function variablePosition(name) {
  let found;
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "emailVariable" && node.attrs.name === name)
      found = position;
  });
  return found;
}

afterEach(() => editor?.destroy());

describe("visual email schema", () => {
  it("preserves the default styled code card, emphasis, and dynamic booking link after editing surrounding text", () => {
    create();
    editor.commands.setTextSelection(1);
    editor.commands.insertContent("Updated: ");
    const html = parsed();
    expect(html.querySelector("h1").textContent).toBe(
      "Updated: Your studio entry code",
    );
    expect(html.querySelector("h1 span").style.fontSize).toBe("28px");
    const card = html.querySelector("div");
    expect(card.style.padding).toBe("24px");
    expect(card.style.borderRadius).toBe("12px");
    expect(card.style.borderWidth).toBe("1px");
    expect(card.style.textAlign).toBe("center");
    const code = card.querySelectorAll("p")[1];
    expect(code.querySelector("span").style.fontFamily).toBe("monospace");
    expect(code.querySelector("span").style.fontSize).toBe("34px");
    expect(code.style.letterSpacing).toBe("4px");
    expect(code.textContent).toBe("{{entryCode}}");
    expect(html.querySelector("strong").textContent).toBe("{{studioName}}");
    expect(html.querySelector("a").getAttribute("href")).toBe("{{bookingUrl}}");
    expect(getVisualEmailCompatibility(editor.getHTML()).supported).toBe(true);
  });

  it("formats an entire credential atom without splitting its literal token or adding token attributes", () => {
    create("<p>Hello {{entryCode}}!</p>");
    const position = variablePosition("entryCode");
    editor.commands.setTextSelection({ from: position, to: position + 1 });
    editor.commands.toggleBold();
    editor.commands.setColor("#3055aa");
    editor.commands.setFontSize("24px");
    expect(editor.getHTML()).toContain("{{entryCode}}");
    expect(editor.getHTML()).not.toMatch(/<[^>]*{{entryCode}}/);
    expect(parsed().textContent).toBe("Hello {{entryCode}}!");
    expect(parsed().querySelector("strong").textContent).toBe("{{entryCode}}");
    editor.commands.deleteSelection();
    expect(editor.getHTML()).not.toContain("{{entryCode}}");
    editor.commands.undo();
    expect(editor.getHTML()).toContain("{{entryCode}}");
  });

  it("updates the selected code card background and padding while preserving its border", () => {
    create();
    editor.commands.setTextSelection(variablePosition("entryCode"));
    expect(
      updateVisualEmailBlockStyle(editor, {
        "background-color": "#f3eee5",
        padding: "36px",
      }),
    ).toBe(true);
    const card = parsed().querySelector("div");
    expect(card.style.padding).toBe("36px");
    expect(card.style.backgroundColor).toBe("rgb(243, 238, 229)");
    expect(card.style.borderWidth).toBe("1px");
    expect(getVisualEmailCompatibility(editor.getHTML()).supported).toBe(true);
  });

  it("accepts only safe static links or the exact booking URL variable", () => {
    create("<p>Manage booking {{entryCode}}</p>");
    editor.commands.setTextSelection({ from: 1, to: 15 });
    expect(editor.commands.setLink({ href: "{{bookingUrl}}" })).toBe(true);
    expect(parsed().querySelector("a").getAttribute("href")).toBe(
      "{{bookingUrl}}",
    );
    expect(
      editor.commands.setLink({ href: "https://example.com/{{entryCode}}" }),
    ).toBe(false);
    expect(editor.commands.setLink({ href: "javascript:alert(1)" })).toBe(
      false,
    );
    expect(parsed().querySelector("a").getAttribute("href")).toBe(
      "{{bookingUrl}}",
    );
  });

  it("reimports saved token spans as atoms without nesting or dropping them", () => {
    create();
    const saved = editor.getHTML();
    editor.commands.setContent(prepareVisualEmailHtml(saved), {
      emitUpdate: false,
    });
    expect(editor.getText()).toContain("{{entryCode}}");
    expect(variablePosition("entryCode")).toBeTypeOf("number");
    expect(editor.getHTML()).toBe(saved);
  });

  it("preserves supported presentation attributes on spans and line breaks", () => {
    create(
      '<p><span title="Entrance" lang="cs" dir="ltr">Ahoj</span><br style="margin: 4px;">{{entryCode}}</p>',
    );
    expect(parsed().querySelector("span[title]").getAttribute("title")).toBe(
      "Entrance",
    );
    expect(parsed().querySelector("span[lang]").getAttribute("lang")).toBe(
      "cs",
    );
    expect(parsed().querySelector("br").style.margin).toBe("4px");
    expect(getVisualEmailCompatibility(editor.getHTML()).supported).toBe(true);
  });

  it("clears imported font sizes without retaining a competing presentation style", () => {
    create(
      '<p><span style="font-size:34px;color:#ff0000">Code {{entryCode}}</span></p>',
    );
    editor.commands.selectAll();
    editor.commands.unsetFontSize();
    expect(editor.getHTML()).not.toContain("font-size");
    expect(editor.getHTML()).toContain("color:");
    expect(editor.getHTML()).toContain("{{entryCode}}");
  });

  it("unbolds imported block typography and clears its inherited size", () => {
    create(
      '<p style="font-weight:bold;font-size:34px;font-family:monospace;letter-spacing:4px;">Code {{entryCode}}</p>',
    );
    editor.commands.selectAll();
    expect(editor.isActive("bold")).toBe(true);
    editor.commands.toggleBold();
    editor.commands.unsetFontSize();
    expect(editor.getHTML()).not.toMatch(/font-weight|<strong|font-size/);
    expect(editor.getHTML()).toContain("font-family: monospace");
    expect(editor.getHTML()).toContain("letter-spacing: 4px");
    expect(editor.getHTML()).toContain("{{entryCode}}");
  });
});
