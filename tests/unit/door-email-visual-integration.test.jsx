import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import DoorAccessEmailTemplateModal from "@/components/communications/email/DoorAccessEmailTemplateModal";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  reset: vi.fn(),
  insertText: vi.fn(),
}));

vi.mock("@/lib/features/emailTemplates/emailTemplatesApiSlice", () => ({
  useUpdateDoorAccessEmailTemplateMutation: () => [
    mocks.save,
    { isLoading: false },
  ],
  useResetDoorAccessEmailTemplateMutation: () => [
    mocks.reset,
    { isLoading: false },
  ],
}));

// Exercise the parent draft, locale and save contracts independently of
// ProseMirror's browser selection implementation, covered by editor tests.
vi.mock("next/dynamic", async () => {
  const { useImperativeHandle, useRef } = await import("react");
  return {
    default: () =>
      function VisualEditorFixture({
        value,
        onChange,
        ariaLabel,
        disabled,
        onFocus,
        editorRef,
        invalid,
      }) {
        const input = useRef(null);
        useImperativeHandle(
          editorRef,
          () => ({
            insertText(token) {
              if (disabled) return;
              mocks.insertText(token);
              onChange(`${value}<p>${token}</p>`);
              input.current?.focus();
            },
          }),
          [disabled, onChange, value],
        );
        return (
          <textarea
            ref={input}
            data-testid="visual-email-editor"
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            value={value}
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.value)}
          />
        );
      },
  };
});

const englishHtml =
  '<h1 style="margin:0 0 20px;font-size:28px;line-height:1.3;color:inherit;">Your entry code</h1>\n' +
  '<div style="margin:24px 0;padding:24px;border:1px solid #d8d4cb;border-radius:12px;text-align:center;"><p style="margin:0;font-family:monospace;font-size:34px;font-weight:bold;letter-spacing:4px;">{{entryCode}}</p></div>\n' +
  '<p><a href="{{bookingUrl}}">Manage booking</a> &amp; <a href="https://example.test/visit?lang=en&amp;source=email">Directions</a></p>';
const czechHtml = '<p style="color:#123456">Váš kód: {{entryCode}}</p>';
const template = {
  defaultLocale: "en",
  contentVariants: {
    en: {
      subject: "Welcome to {{studioName}}",
      format: "html",
      htmlContent: englishHtml,
      body: "Your code: {{entryCode}}",
    },
    cs: {
      subject: "Vítejte v {{studioName}}",
      format: "html",
      htmlContent: czechHtml,
      body: "Váš kód: {{entryCode}}",
    },
  },
};

function show({ source = template, canManage = true } = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DoorAccessEmailTemplateModal
        location={{
          locationId: "location-a",
          locationName: "Grohova",
          isCustomized: true,
          template: source,
        }}
        canManage={canManage}
        onClose={onClose}
        onSaved={onSaved}
      />
    </NextIntlClientProvider>,
  );
  return { onClose, onSaved };
}

const body = () => screen.getByRole("textbox", { name: "Email content" });
const subject = () => screen.getByRole("textbox", { name: "Subject" });
const mode = (name) => screen.getByRole("button", { name });
const language = (locale) =>
  screen.getByRole("tab", {
    name: messages.EmailAutomations.editor.languages[locale],
  });
const save = async () => {
  fireEvent.click(mode("Save template"));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  return mocks.save.mock.calls[0][0];
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  mocks.reset.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe("door email visual editing integration", () => {
  it("opens compatible HTML visually without making an untouched draft dirty", () => {
    const { onClose } = show();
    expect(mode("Visual editor")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("visual-email-editor")).toHaveValue(englishHtml);
    fireEvent.click(language("cs"));
    expect(body()).toHaveValue(czechHtml);
    fireEvent.click(language("en"));
    expect(body()).toHaveValue(englishHtml);
    fireEvent.click(mode("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Discard changes" }),
    ).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("preserves exact HTML in both languages when only the subject is edited", async () => {
    show();
    fireEvent.click(language("cs"));
    fireEvent.click(language("en"));
    fireEvent.change(subject(), { target: { value: "Your upcoming visit" } });
    const payload = await save();
    expect(payload).toMatchObject({
      locationId: "location-a",
      defaultLocale: "en",
      contentVariants: {
        en: { subject: "Your upcoming visit", htmlContent: englishHtml },
        cs: {
          subject: template.contentVariants.cs.subject,
          htmlContent: czechHtml,
        },
      },
    });
  });

  it("retains HTML drafts and each language's mode through source and visual switching", async () => {
    show();
    const draft = "<p><strong>Courtyard entrance</strong>: {{entryCode}}</p>";
    fireEvent.click(mode("HTML source"));
    expect(screen.queryByTestId("visual-email-editor")).not.toBeInTheDocument();
    fireEvent.change(body(), { target: { value: draft } });
    fireEvent.click(language("cs"));
    expect(screen.getByTestId("visual-email-editor")).toHaveValue(czechHtml);
    fireEvent.click(language("en"));
    expect(mode("HTML source")).toHaveAttribute("aria-pressed", "true");
    expect(body()).toHaveValue(draft);
    fireEvent.click(mode("Visual editor"));
    expect(screen.getByTestId("visual-email-editor")).toHaveValue(draft);
    fireEvent.click(mode("HTML source"));
    expect(body()).toHaveValue(draft);
    const payload = await save();
    expect(payload.contentVariants.en.htmlContent).toBe(draft);
    expect(payload.contentVariants.cs.htmlContent).toBe(czechHtml);
  });

  it("saves visual edits only to their active language and requires its entry code", async () => {
    show();
    const englishDraft = "<p>Enter through the courtyard: {{entryCode}}</p>";
    const czechDraft = "<p>Vstup ze dvora: <strong>{{entryCode}}</strong></p>";
    fireEvent.change(body(), { target: { value: englishDraft } });
    fireEvent.click(language("cs"));
    fireEvent.change(body(), { target: { value: "<p>Vstup ze dvora</p>" } });
    expect(mode("Save template")).toBeDisabled();
    fireEvent.change(body(), { target: { value: czechDraft } });
    expect(mode("Save template")).toBeEnabled();
    fireEvent.click(language("en"));
    expect(body()).toHaveValue(englishDraft);
    const payload = await save();
    expect(payload.contentVariants.en.htmlContent).toBe(englishDraft);
    expect(payload.contentVariants.cs.htmlContent).toBe(czechDraft);
    expect(payload.contentVariants.en.body).toContain("{{entryCode}}");
    expect(payload.contentVariants.cs.body).toContain("{{entryCode}}");
  });

  it("does not author an empty secondary language merely by opening its tab", async () => {
    show({
      source: {
        defaultLocale: "en",
        contentVariants: { en: template.contentVariants.en },
      },
    });
    fireEvent.click(language("cs"));
    expect(body()).toHaveValue("");
    fireEvent.click(language("en"));
    const payload = await save();
    expect(Object.keys(payload.contentVariants)).toEqual(["en"]);
    expect(payload.contentVariants.en.htmlContent).toBe(englishHtml);
  });

  it("routes body placeholders through the visual ref while keeping subject insertion separate", async () => {
    show();
    fireEvent.click(
      screen.getByText(messages.EmailAutomations.editor.variables),
    );
    fireEvent.focus(subject());
    const code = mode("{{entryCode}}");
    expect(code).toBeDisabled();
    subject().setSelectionRange(subject().value.length, subject().value.length);
    fireEvent.click(mode("{{studioName}}"));
    expect(subject()).toHaveValue("Welcome to {{studioName}}{{studioName}}");
    expect(mocks.insertText).not.toHaveBeenCalled();
    fireEvent.focus(body());
    fireEvent.click(code);
    expect(mocks.insertText).toHaveBeenCalledWith("{{entryCode}}");
    expect(body()).toHaveValue(`${englishHtml}<p>{{entryCode}}</p>`);
    fireEvent.click(language("cs"));
    fireEvent.focus(body());
    fireEvent.click(mode("{{bookingTime}}"));
    expect(body()).toHaveValue(`${czechHtml}<p>{{bookingTime}}</p>`);
    const payload = await save();
    expect(payload.contentVariants.en.htmlContent).toBe(
      `${englishHtml}<p>{{entryCode}}</p>`,
    );
    expect(payload.contentVariants.cs.htmlContent).toBe(
      `${czechHtml}<p>{{bookingTime}}</p>`,
    );
  });

  it.each([
    '<table width="100%"><tbody><tr><td style="padding:24px">{{entryCode}}</td></tr></tbody></table>',
    '<p>{{entryCode}}</p><img src="https://example.test/studio.jpg" alt="Entrance" width="400">',
  ])("preserves unsupported custom HTML in source mode: %s", async (html) => {
    show({
      source: {
        ...template,
        contentVariants: {
          ...template.contentVariants,
          en: { ...template.contentVariants.en, htmlContent: html },
        },
      },
    });
    expect(screen.queryByTestId("visual-email-editor")).not.toBeInTheDocument();
    expect(mode("Visual editor")).toBeDisabled();
    expect(mode("HTML source")).toHaveAttribute("aria-pressed", "true");
    expect(body()).toHaveValue(html);
    expect(
      screen.getByText(messages.EmailAutomations.visualEditor.unsupported),
    ).toBeVisible();
    fireEvent.change(subject(), { target: { value: "Updated subject" } });
    const payload = await save();
    expect(payload.contentVariants.en.htmlContent).toBe(html);
  });

  it("offers read-only visual viewing with no mutation controls", () => {
    const { onClose } = show({ canManage: false });
    expect(screen.getByTestId("visual-email-editor")).toBeDisabled();
    expect(subject()).toBeDisabled();
    expect(mode("HTML source")).toBeDisabled();
    expect(mode("Visual editor")).toBeDisabled();
    fireEvent.click(
      screen.getByText(messages.EmailAutomations.editor.variables),
    );
    expect(mode("{{entryCode}}")).toBeDisabled();
    expect(mode("{{studioName}}")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save template" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Restore default message" }),
    ).not.toBeInTheDocument();
    fireEvent.click(language("cs"));
    expect(body()).toHaveValue(czechHtml);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Close template" }).at(-1),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.insertText).not.toHaveBeenCalled();
  });
});
