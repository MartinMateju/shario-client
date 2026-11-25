import { describe, expect, it } from "vitest";
import {
  getVisualEmailCompatibility,
  isVisualEmailLinkAllowed,
  prepareVisualEmailHtml,
  sanitizeVisualEmailStyle,
  visualEmailToPlainText,
} from "@/components/communications/email/visualEmailHtml";

function fragment(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

const defaultHtml = `<h1 style="margin:0 0 20px;font-size:28px;line-height:1.3;color:inherit;">Your studio entry code</h1>
<p>Your booking starts soon. Here is your code for <strong>{{studioName}}</strong>.</p>
<div style="margin:24px 0;padding:24px;border:1px solid #d8d4cb;border-radius:12px;text-align:center;">
<p style="margin:0 0 10px;font-size:13px;">DOOR ACCESS CODE</p>
<p style="margin:0;font-family:monospace;font-size:34px;font-weight:bold;letter-spacing:4px;overflow-wrap:anywhere;">{{entryCode}}</p></div>
<p><strong>Booking:</strong> {{bookingTime}}</p>
<p><strong>Address:</strong> {{studioAddress}}</p>
<p><a href="{{bookingUrl}}">Manage booking</a></p>`;

describe("visual email HTML imports", () => {
  it("preserves the built-in styled code panel and booking link", () => {
    expect(getVisualEmailCompatibility(defaultHtml)).toMatchObject({
      supported: true,
    });
    const output = fragment(prepareVisualEmailHtml(defaultHtml));
    expect(output.querySelector("h1").style.fontSize).toBe("28px");
    const panel = output.querySelector("div");
    expect(panel.style.padding).toBe("24px");
    expect(panel.style.border).toContain("1px solid");
    expect(panel.style.borderRadius).toBe("12px");
    expect(panel.style.textAlign).toBe("center");
    const code = panel.querySelector('[data-email-variable="entryCode"]');
    expect(code.textContent).toBe("{{entryCode}}");
    expect(code.parentElement.style.fontFamily).toBe("monospace");
    expect(code.parentElement.style.fontSize).toBe("34px");
    expect(code.parentElement.style.letterSpacing).toBe("4px");
    expect(code.parentElement.style.overflowWrap).toBe("");
    expect(output.querySelector("a").getAttribute("href")).toBe(
      "{{bookingUrl}}",
    );
  });

  it.each([
    "<table><tr><td>{{entryCode}}</td></tr></table>",
    '<p><img src="https://example.com/logo.png" alt="Logo">{{entryCode}}</p>',
    '<p style="position:relative">{{entryCode}}</p>',
    '<p class="brand-message">{{entryCode}}</p>',
    '<ol start="3"><li>{{entryCode}}</li></ol>',
    '<a href="tel:+420123456789">Call</a><p>{{entryCode}}</p>',
  ])(
    "retains unsupported existing features through the caller's fallback: %s",
    (html) => {
      expect(getVisualEmailCompatibility(html)).toMatchObject({
        supported: false,
      });
    },
  );

  it("keeps supported global attributes and multi-parameter links stable", () => {
    const source =
      '<div dir="rtl" lang="cs" title="Arrival & departure" align="center" bgcolor="#fff" width="600" height="200" valign="top"><p><a href="https://example.com/?a=1&amp;b=2" target="_blank">Map</a></p></div>';
    expect(getVisualEmailCompatibility(source).supported).toBe(true);
    const html = prepareVisualEmailHtml(source);
    const root = fragment(html).querySelector("div");
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.getAttribute("lang")).toBe("cs");
    expect(root.getAttribute("title")).toBe("Arrival & departure");
    expect(root.getAttribute("align")).toBe("center");
    expect(root.getAttribute("bgcolor")).toBe("#fff");
    expect(root.getAttribute("width")).toBe("600");
    expect(root.getAttribute("height")).toBe("200");
    expect(root.getAttribute("valign")).toBe("top");
    expect(root.querySelector("a").getAttribute("href")).toBe(
      "https://example.com/?a=1&b=2",
    );
    expect(root.querySelector("a").getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
    expect(prepareVisualEmailHtml(html)).toBe(html);
  });

  it.each([
    '<p><span style="padding:10px;background-color:#ff0000">Outer <span style="color:#0000ff">Inner {{entryCode}}</span> Tail</span></p>',
    '<p><span style="border:1px solid #000">Code <strong>{{entryCode}}</strong></span></p>',
    '<p><a href="{{bookingUrl}}" style="padding:12px">Manage <strong>booking</strong></a></p>',
    '<div style="display:inline">Text/code {{entryCode}}</div>',
    '<div style="display:inline"><p>{{entryCode}}</p></div>',
    "<div>Before<p>{{entryCode}}</p>After</div>",
    "<div><span>{{entryCode}}</span></div>",
    '<div style="padding:12px"></div><p>{{entryCode}}</p>',
    '<p><span style="font-size:2em">Outer <span style="font-size:1.5em">{{entryCode}}</span></span></p>',
    '<p><span style="font-size:20px">Outer <span style="font-size:150%">{{entryCode}}</span></span></p>',
    '<p><span style="color:red">Outer <span style="color:inherit">{{entryCode}}</span></span></p>',
  ])(
    "protects existing wrapper layouts that the visual schema cannot preserve: %s",
    (html) => {
      expect(getVisualEmailCompatibility(html)).toMatchObject({
        supported: false,
      });
    },
  );

  it.each([
    '<p><span style="font-style:oblique">{{entryCode}}</span></p>',
    '<p><span style="font-weight:500">{{entryCode}}</span></p>',
    '<p><strong>Bold <span style="font-weight:normal">{{entryCode}}</span></strong></p>',
    '<p><strong>Bold <span style="font-weight:400">{{entryCode}}</span></strong></p>',
    '<p><em>Italic <span style="font-style:normal">{{entryCode}}</span></em></p>',
    '<p><span style="text-decoration:underline double red">{{entryCode}}</span></p>',
    '<p><u>Underlined <span style="text-decoration:none">{{entryCode}}</span></u></p>',
  ])(
    "protects existing typography that semantic marks cannot preserve: %s",
    (html) => {
      expect(getVisualEmailCompatibility(html)).toMatchObject({
        supported: false,
      });
    },
  );

  it.each([
    "font-weight:bold",
    "font-weight:700",
    "font-style:italic",
    "text-decoration:underline",
    "text-decoration:line-through",
  ])("supports ordinary semantic formatting: %s", (style) => {
    expect(
      getVisualEmailCompatibility(
        `<p><span style="${style}">{{entryCode}}</span></p>`,
      ),
    ).toMatchObject({ supported: true });
  });

  it("keeps block containers and ordinary nested typography visually editable", () => {
    const html =
      '<div style="display:block;padding:12px"><p><span style="font-size:20px;color:#333">Outer <span style="font-size:16px;color:#00f">Inner {{entryCode}}</span> Tail</span></p></div>';
    expect(getVisualEmailCompatibility(html)).toMatchObject({
      supported: true,
    });
    expect(getVisualEmailCompatibility(defaultHtml)).toMatchObject({
      supported: true,
    });
  });

  it("turns only supported text placeholders into atomic marker spans", () => {
    const html = prepareVisualEmailHtml(
      '<p title="{{studioName}}">{{ entryCode }} {{studioName}} {{studioAddress}} {{bookingTime}} {{bookingUrl}} {{unknown}} {{broken</p><a href="{{bookingUrl}}">Manage booking</a>',
    );
    const dom = fragment(html);
    expect(
      [...dom.querySelectorAll("[data-email-variable]")].map((node) =>
        node.getAttribute("data-email-variable"),
      ),
    ).toEqual([
      "entryCode",
      "studioName",
      "studioAddress",
      "bookingTime",
      "bookingUrl",
    ]);
    expect(dom.querySelector("p").hasAttribute("title")).toBe(false);
    expect(dom.textContent).toContain("{{unknown}} {{broken");
    expect(dom.querySelector("a").getAttribute("href")).toBe("{{bookingUrl}}");
    expect(prepareVisualEmailHtml(html)).toBe(html);
  });

  it("does not turn forged editor metadata into a credential placeholder", () => {
    const dom = fragment(
      prepareVisualEmailHtml(
        '<span data-email-variable="entryCode">ordinary text</span><span data-email-variable="evil">{{entryCode}}</span>',
      ),
    );
    const tokens = dom.querySelectorAll("[data-email-variable]");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].textContent).toBe("{{entryCode}}");
    expect(dom.textContent).toContain("ordinary text");
  });

  it("removes executable markup, dangerous URLs, metadata, and unsafe styles without attaching content", () => {
    const before = document.body.innerHTML;
    const html =
      prepareVisualEmailHtml(`<script>window.injected=true</script><style>body{display:none}</style><svg onload="alert(1)"></svg><iframe src="https://example.com"></iframe><img src="https://example.com/x" onerror="alert(1)"><form><input name="location"></form>
<p class="fixed inset-0" id="location" onclick="alert(1)" data-any="x" style="position:fixed;background-color:red;background-image:url(https://example.com/x);color:expression(alert(1));width:var(--danger);padding:12px">Safe {{entryCode}}</p>
<a href="jav&#x61;script:alert(1)">bad</a><a href="https://example.com/{{entryCode}}">code link</a>`);
    const dom = fragment(html);
    expect(
      dom.querySelector("script, style, svg, iframe, img, form, input"),
    ).toBeNull();
    expect(dom.querySelector("p").getAttributeNames()).toEqual(["style"]);
    expect(dom.querySelector("p").style.padding).toBe("12px");
    expect(dom.querySelector("p").style.backgroundColor).toBe("red");
    expect(html).not.toMatch(/javascript:|onclick|expression\(|url\(|var\(/i);
    expect(
      [...dom.querySelectorAll("a")].every(
        (node) => !node.hasAttribute("href"),
      ),
    ).toBe(true);
    expect(document.body.innerHTML).toBe(before);
  });

  it("strips hidden and obfuscated CSS while retaining supported typography", () => {
    expect(
      sanitizeVisualEmailStyle(
        'display:none;font-size:0px;color:transparent;line-height:1.5;letter-spacing:4px;font-family:"Courier New";font-weight:bold;background-color:u/**/rl(https://example.com);margin:expression(alert(1));border:1px solid #ddd;opacity:0',
      ),
    ).toBe(
      "line-height: 1.5; letter-spacing: 4px; font-family: Courier New; font-weight: bold; border: 1px solid #ddd",
    );
  });
});

describe("visual email link targets", () => {
  it.each([
    "https://example.com/?a=1&b=2",
    "http://example.com/map",
    "mailto:hello@example.com",
    "{{bookingUrl}}",
  ])("allows %s", (url) => {
    expect(isVisualEmailLinkAllowed(url)).toBe(true);
  });
  it.each([
    "",
    "https:",
    "//example.com",
    "/relative",
    "tel:1234",
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://example.com/{{entryCode}}",
    "mailto:{{entryCode}}@example.com",
    "https://example.com/{{bookingUrl}}",
    "{{studioName}}",
    "{{ bookingUrl }}",
    "{{bookingUrl}}/extra",
    "https://example.com/\npath",
  ])("rejects %s", (url) => {
    expect(isVisualEmailLinkAllowed(url)).toBe(false);
  });
});

describe("visual email plain-text alternatives", () => {
  it("decodes entities and preserves booking and static link destinations", () => {
    const text = visualEmailToPlainText(
      '<h1>Arrival &amp; access</h1><p>Code: <span>{{entryCode}}</span></p><p><a href="{{bookingUrl}}">Manage booking</a></p><p><a href="https://example.com/map?a=1&amp;b=2">Map &amp; directions</a></p><p>&lt;Reception&gt; &#39;opens&#39; at 9&nbsp;am.</p>',
    );
    expect(text).toContain("Arrival & access");
    expect(text).toContain("Code: {{entryCode}}");
    expect(text).toContain("Manage booking ({{bookingUrl}})");
    expect(text).toContain(
      "Map & directions (https://example.com/map?a=1&b=2)",
    );
    expect(text).toContain("<Reception> 'opens' at 9 am.");
    expect(text).not.toMatch(/&amp;|&lt;|<span>/);
  });

  it("keeps list and table text, image alternatives, and line breaks but excludes active content", () => {
    const text = visualEmailToPlainText(
      '<ul><li>First<br>Next line</li><li>Second</li></ul><table><tr><td>Entry</td><td>{{entryCode}}</td></tr></table><img src="https://example.com/map.png" alt="Entrance map"><script>secret</script><style>hidden</style>',
    );
    expect(text).toContain("• First\nNext line");
    expect(text).toContain("• Second");
    expect(text).toContain("Entry\t{{entryCode}}");
    expect(text).toContain("Entrance map");
    expect(text).not.toMatch(/secret|hidden/);
  });

  it("does not duplicate link text that already displays its destination", () => {
    expect(
      visualEmailToPlainText(
        '<a href="https://example.com">https://example.com</a>',
      ),
    ).toBe("https://example.com");
  });
});
