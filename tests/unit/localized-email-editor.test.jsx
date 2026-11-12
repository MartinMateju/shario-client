import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LocalizedEmailEditor from "@/components/communications/email/LocalizedEmailEditor";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("@/components/communications/email/SandboxedEmailPreview", () => ({
  default: ({ variant }) => (
    <div data-testid="email-preview">{variant.subject}</div>
  ),
}));

const INITIAL_VALUE = {
  defaultLocale: "cs",
  variants: {
    cs: {
      subject: "Český předmět",
      format: "plain",
      bodyText: "Český text",
      bodyHtml: "",
    },
    en: {
      subject: "English subject",
      format: "plain",
      bodyText: "English body",
      bodyHtml: "",
    },
  },
};

function EditorHarness() {
  const [value, setValue] = useState(INITIAL_VALUE);

  return (
    <>
      <LocalizedEmailEditor value={value} onChange={setValue} />
      <output data-testid="editor-value">{JSON.stringify(value)}</output>
    </>
  );
}

describe("LocalizedEmailEditor", () => {
  it("connects language tabs to the active editor panel and supports arrow navigation", () => {
    render(<EditorHarness />);

    const csTab = screen.getByRole("tab", { name: "languages.cs" });
    const enTab = screen.getByRole("tab", { name: "languages.en" });
    const csPanel = screen.getByRole("tabpanel");

    expect(csTab).toHaveAttribute("aria-selected", "true");
    expect(csTab).toHaveAttribute("tabindex", "0");
    expect(enTab).toHaveAttribute("tabindex", "-1");
    expect(csTab).toHaveAttribute("aria-controls", csPanel.id);
    expect(csPanel).toHaveAttribute("aria-labelledby", csTab.id);
    expect(screen.getByRole("textbox", { name: "subject" })).toHaveValue(
      "Český předmět",
    );

    fireEvent.keyDown(csTab, { key: "ArrowRight" });

    const enPanel = screen.getByRole("tabpanel");
    expect(enTab).toHaveAttribute("aria-selected", "true");
    expect(enTab).toHaveAttribute("tabindex", "0");
    expect(enTab).toHaveAttribute("aria-controls", enPanel.id);
    expect(enPanel).toHaveAttribute("aria-labelledby", enTab.id);
    expect(screen.getByRole("textbox", { name: "subject" })).toHaveValue(
      "English subject",
    );
  });

  it("follows a resolved template default without resetting later language choices", () => {
    const { rerender } = render(<LocalizedEmailEditor value={INITIAL_VALUE} />);
    const resolvedValue = { ...INITIAL_VALUE, defaultLocale: "en" };
    rerender(<LocalizedEmailEditor value={resolvedValue} />);
    expect(screen.getByRole("tab", { name: "languages.en" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "languages.cs" }));
    rerender(<LocalizedEmailEditor value={{ ...resolvedValue }} />);
    expect(screen.getByRole("tab", { name: "languages.cs" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("marks an incomplete secondary language and its missing body", () => {
    render(
      <LocalizedEmailEditor
        value={{
          ...INITIAL_VALUE,
          variants: {
            ...INITIAL_VALUE.variants,
            en: {
              subject: "Draft",
              format: "plain",
              bodyText: "",
              bodyHtml: "",
            },
          },
        }}
        invalidLocales={["en"]}
      />,
    );

    const enTab = screen.getByRole("tab", { name: "languages.en" });
    expect(enTab).toHaveAttribute("data-invalid", "true");
    expect(enTab).toHaveAttribute("title", "incompleteLanguage");
    expect(
      screen.getByRole("tab", { name: "languages.cs" }),
    ).not.toHaveAttribute("data-invalid");
    fireEvent.click(enTab);
    expect(screen.getByRole("textbox", { name: "body" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: "subject" }),
    ).not.toHaveAttribute("aria-invalid");
  });

  it("exposes selected format/default states and keeps editor controls touch-friendly", () => {
    render(<EditorHarness />);

    const plainButton = screen.getByRole("button", { name: "plain" });
    const htmlButton = screen.getByRole("button", { name: "html" });
    const csTab = screen.getByRole("tab", { name: "languages.cs" });

    expect(csTab).toHaveClass("min-h-11");
    expect(plainButton).toHaveClass("min-h-11");
    expect(plainButton).toHaveAttribute("aria-pressed", "true");
    expect(htmlButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(htmlButton);

    expect(htmlButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("editor-value")).toHaveTextContent(
      '"format":"html"',
    );

    fireEvent.click(screen.getByRole("tab", { name: "languages.en" }));
    const makeDefault = screen.getByRole("button", { name: "makeDefault" });
    expect(makeDefault).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(makeDefault);

    expect(
      screen.getByRole("button", { name: "defaultLanguage" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("editor-value")).toHaveTextContent(
      '"defaultLocale":"en"',
    );
  });
});
