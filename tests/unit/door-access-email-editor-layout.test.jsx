import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import DoorAccessEmailTemplateModal from "@/components/communications/email/DoorAccessEmailTemplateModal";
import LocalizedEmailEditor from "@/components/communications/email/LocalizedEmailEditor";
import { normalizeContentVariants } from "@/components/communications/email/emailContent";

const mocks = vi.hoisted(() => ({ save: vi.fn(), reset: vi.fn() }));
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

const template = {
  defaultLocale: "en",
  contentVariants: {
    en: {
      subject: "Welcome to {{studioName}}",
      format: "plain",
      body: "Your door code: {{entryCode}}",
    },
    cs: {
      subject: "Vítejte v {{studioName}}",
      format: "plain",
      body: "Váš kód: {{entryCode}}",
    },
  },
};

function showEditor() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DoorAccessEmailTemplateModal
        location={{
          locationId: "location-a",
          locationName: "Grohova",
          isCustomized: true,
          template,
        }}
        canManage
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("door email editing workspace", () => {
  it("keeps essential code guidance visible and preserves drafts while opening and closing help", () => {
    showEditor();
    const help = screen.getByRole("button", { name: "Template help" });
    const previewHint = messages.EmailAutomations.doorTemplates.previewHint;
    expect(help).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(previewHint)).not.toBeInTheDocument();
    expect(
      screen.getByText("Keep {{entryCode}} in the message."),
    ).toBeVisible();

    const body = screen.getByRole("textbox", { name: "Email content" });
    fireEvent.change(body, {
      target: { value: "Use the courtyard entrance: {{entryCode}}" },
    });
    fireEvent.click(help);
    expect(help).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(previewHint)).toBeVisible();
    expect(
      document.getElementById(help.getAttribute("aria-controls")),
    ).toContainElement(screen.getByText(previewHint));
    fireEvent.click(help);
    expect(screen.queryByText(previewHint)).not.toBeInTheDocument();
    expect(body).toHaveValue("Use the courtyard entrance: {{entryCode}}");
    expect(screen.getByRole("button", { name: "Save template" })).toBeEnabled();
    expect(mocks.save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: "Discard changes" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(body).toHaveValue("Use the courtyard entrance: {{entryCode}}");
  });

  it("reveals variable controls on demand and preserves body-only insertion rules", async () => {
    showEditor();
    const variables = screen.getByText(
      messages.EmailAutomations.editor.variables,
    );
    const disclosure = variables.closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(
      screen.getByRole("button", { name: "{{entryCode}}" }),
    ).not.toBeVisible();
    fireEvent.click(variables);
    expect(disclosure).toHaveAttribute("open");

    const code = screen.getByRole("button", { name: "{{entryCode}}" });
    const body = screen.getByRole("textbox", { name: "Email content" });
    fireEvent.focus(screen.getByRole("textbox", { name: "Subject" }));
    expect(code).toBeDisabled();
    fireEvent.focus(body);
    expect(code).toBeEnabled();
    body.setSelectionRange(body.value.length, body.value.length);
    fireEvent.click(code);
    expect(body).toHaveValue("Your door code: {{entryCode}}{{entryCode}}");
    await waitFor(() => expect(body).toHaveFocus());
    fireEvent.click(variables);
    expect(disclosure).not.toHaveAttribute("open");
    expect(body).toHaveValue("Your door code: {{entryCode}}{{entryCode}}");
  });

  it("keeps the ordinary email editor's variable controls visible without a disclosure", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LocalizedEmailEditor value={normalizeContentVariants(template)} />
      </NextIntlClientProvider>,
    );
    expect(
      screen
        .getByText(messages.EmailAutomations.editor.variables)
        .closest("details"),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "{{firstName}}" })).toBeVisible();
  });
});
