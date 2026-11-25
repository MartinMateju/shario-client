import { createRef } from "react";
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import VisualEmailEditor from "@/components/communications/email/VisualEmailEditor";

const original =
  '<p style="margin: 0;">Hello <strong>{{entryCode}}</strong>.</p>';
function view(props) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <VisualEmailEditor
        value={original}
        ariaLabel="Email content"
        {...props}
      />
    </NextIntlClientProvider>
  );
}

describe("VisualEmailEditor", () => {
  it("does not emit normalized HTML on opening, focus, or external-language content changes", async () => {
    const onChange = vi.fn();
    const onFocus = vi.fn();
    const rendered = render(view({ onChange, onFocus }));
    const body = await screen.findByRole("textbox", { name: "Email content" });
    expect(body).toHaveAttribute("contenteditable", "true");
    fireEvent.focus(body);
    expect(onFocus).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    rendered.rerender(view({ onChange, value: "<p>Česky {{entryCode}}</p>" }));
    await waitFor(() => expect(body).toHaveTextContent("Česky {{entryCode}}"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("inserts the requested variable through the body-editor ref", async () => {
    const onChange = vi.fn();
    const editorRef = createRef();
    const getClientRects = vi.spyOn(Range.prototype, "getClientRects");
    const getBoundingClientRect = vi.spyOn(
      Range.prototype,
      "getBoundingClientRect",
    );
    render(view({ value: "<p>Hello</p>", onChange, editorRef }));
    const body = await screen.findByRole("textbox", { name: "Email content" });
    await act(async () => {
      editorRef.current.insertText("{{entryCode}}");
      // Tiptap focuses and scrolls the selection on the next animation frame.
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(body).toHaveFocus();
    expect(getClientRects).toHaveBeenCalled();
    expect(getBoundingClientRect).toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const html = onChange.mock.calls.at(-1)[0];
    expect(html).toContain("{{entryCode}}");
    expect(html).not.toMatch(/<[^>]*{{entryCode}}/);
    expect(
      screen.getByRole("textbox", { name: "Email content" }),
    ).toHaveTextContent("{{entryCode}}");
  });

  it("keeps read-only content and formatting controls disabled", async () => {
    const onChange = vi.fn();
    const editorRef = createRef();
    render(view({ disabled: true, onChange, editorRef }));
    const body = await screen.findByRole("textbox", { name: "Email content" });
    expect(body).toHaveAttribute("contenteditable", "false");
    expect(
      screen.getByRole("button", {
        name: messages.EmailAutomations.visualEditor.bold,
      }),
    ).toBeDisabled();
    act(() =>
      expect(editorRef.current.insertText("{{entryCode}}")).toBe(false),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("retains a changed block background when changing padding afterwards", async () => {
    const onChange = vi.fn();
    render(view({ onChange }));
    await screen.findByRole("textbox", { name: "Email content" });
    fireEvent.click(
      screen.getByRole("button", {
        name: messages.EmailAutomations.visualEditor.blockStyle,
      }),
    );
    fireEvent.input(
      screen.getByLabelText(
        messages.EmailAutomations.visualEditor.blockBackground,
      ),
      { target: { value: "#edf3eb" } },
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.change(
      screen.getByLabelText(
        messages.EmailAutomations.visualEditor.blockBackground,
      ),
      { target: { value: "#edf3eb" } },
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.change(
      screen.getByLabelText(
        messages.EmailAutomations.visualEditor.blockPadding,
      ),
      { target: { value: "24px" } },
    );
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const template = document.createElement("template");
    template.innerHTML = onChange.mock.calls.at(-1)[0];
    expect(template.content.querySelector("p").style.backgroundColor).toBe(
      "rgb(237, 243, 235)",
    );
    expect(template.content.querySelector("p").style.padding).toBe("24px");
    expect(
      screen.getByLabelText(
        messages.EmailAutomations.visualEditor.blockBackground,
      ),
    ).toHaveValue("#edf3eb");
  });

  it("prevents browser file-drop navigation without changing the template", async () => {
    const onChange = vi.fn();
    render(view({ onChange }));
    const body = await screen.findByRole("textbox", { name: "Email content" });
    const drop = createEvent.drop(body, {
      dataTransfer: { files: [new File(["test"], "test.txt")] },
    });
    fireEvent(body, drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies toolbar typography and color to the actual selected content", async () => {
    const onChange = vi.fn();
    render(
      view({
        value:
          '<p style="font-weight:bold;font-size:34px;">Code {{entryCode}}</p>',
        onChange,
      }),
    );
    const body = await screen.findByRole("textbox", { name: "Email content" });
    fireEvent.keyDown(body, { key: "a", code: "KeyA", ctrlKey: true });
    const bold = screen.getByRole("button", {
      name: messages.EmailAutomations.visualEditor.bold,
    });
    const size = screen.getByLabelText(
      messages.EmailAutomations.visualEditor.fontSize,
    );
    expect(bold).toHaveAttribute("aria-pressed", "true");
    expect(size).toHaveValue("34px");
    fireEvent.change(size, { target: { value: "" } });
    fireEvent.click(bold);
    expect(bold).toHaveAttribute("aria-pressed", "false");
    expect(size).toHaveValue("");
    fireEvent.input(
      screen.getByLabelText(messages.EmailAutomations.visualEditor.textColor),
      { target: { value: "#3055aa" } },
    );
    expect(
      screen.getByLabelText(messages.EmailAutomations.visualEditor.textColor),
    ).toHaveValue("#3055aa");
    const html = onChange.mock.calls.at(-1)[0];
    expect(html).not.toMatch(/font-size|font-weight|<strong/);
    expect(html).toContain("color:");
    expect(html).toContain("{{entryCode}}");
    fireEvent.change(
      screen.getByLabelText(messages.EmailAutomations.visualEditor.body),
      { target: { value: "2" } },
    );
    expect(onChange.mock.calls.at(-1)[0]).toContain("<h2");
  });
});
