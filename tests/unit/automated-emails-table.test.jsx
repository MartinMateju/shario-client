import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AutomatedEmailsTable from "@/components/tables/email_notifications/AutomatedEmailsTable";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const translate = (key, values) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    translate.has = () => false;
    return translate;
  },
}));

const automation = {
  _id: "automation-1",
  name: "Booking reminder",
  scheduleType: "beforeBooking",
  minutesOffset: 60,
  isActive: true,
  purpose: "transactional",
  senderEmail: { email: "hello@studio.test" },
  defaultLocale: "en",
  contentVariants: {
    cs: { subject: "Připomínka", bodyText: "Text" },
    en: { subject: "Reminder", bodyText: "Body" },
  },
};

describe("AutomatedEmailsTable", () => {
  it("renders a keyboard-scrollable desktop table and readable mobile card", () => {
    render(<AutomatedEmailsTable automations={[automation]} />);

    const region = screen.getByRole("region", { name: "title" });
    const table = within(region).getByRole("table");
    const mobileCard = screen.getByRole("article");

    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("overflow-x-auto", "lg:block");
    expect(table).toHaveAttribute("data-workspace-table", "true");
    expect(
      within(table).getByRole("rowheader", { name: /Booking reminder/ }),
    ).toHaveAttribute("scope", "row");
    expect(within(table).getByText("Booking reminder")).toBeVisible();
    expect(mobileCard).toHaveClass("rounded-[24px]");
    expect(within(mobileCard).getByText("Booking reminder")).toBeVisible();
    expect(within(mobileCard).getByText("Reminder")).toBeVisible();
  });

  it("shows the referenced template subject for a legacy template-only automation", () => {
    render(
      <AutomatedEmailsTable
        automations={[
          {
            ...automation,
            subject: "",
            contentVariants: {},
            templateId: "template-1",
          },
        ]}
        emailTemplates={[
          {
            _id: "template-1",
            defaultLocale: "en",
            subject: "Inherited confirmation",
            htmlContent: "<p>Confirmed</p>",
          },
        ]}
      />,
    );

    expect(
      within(screen.getByRole("table")).getByText("Inherited confirmation"),
    ).toBeVisible();
    expect(
      within(screen.getByRole("article")).getByText("Inherited confirmation"),
    ).toBeVisible();
    expect(screen.queryByText("noSubject")).not.toBeInTheDocument();
  });

  it("does not label a fallback language as a completed translation", () => {
    render(
      <AutomatedEmailsTable
        automations={[
          {
            ...automation,
            defaultLocale: "cs",
            contentVariants: {},
            templateId: "template-1",
          },
        ]}
        emailTemplates={[
          {
            _id: "template-1",
            defaultLocale: "en",
            subject: "English",
            htmlContent: "<p>English body</p>",
          },
        ]}
      />,
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText("cs")).toHaveAttribute(
      "title",
      "languageMissing",
    );
    expect(within(table).getByText("en")).toHaveAttribute(
      "title",
      "languageReady",
    );
  });

  it("keeps create, toggle, edit and delete behavior wired", () => {
    const onCreate = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onToggleActive = vi.fn();
    render(
      <AutomatedEmailsTable
        automations={[automation]}
        canManage
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "create" }));
    expect(onCreate).toHaveBeenCalledOnce();

    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "deactivate" }));
    expect(
      within(table).getByRole("button", { name: "deactivate" }),
    ).toHaveClass("min-h-11");
    fireEvent.click(within(table).getByRole("button", { name: "edit" }));
    fireEvent.click(within(table).getByRole("button", { name: "delete" }));

    expect(onToggleActive).toHaveBeenCalledWith(automation, false);
    expect(onEdit).toHaveBeenCalledWith(automation);
    expect(onDelete).toHaveBeenCalledWith(automation);
  });

  it("uses the shared contained empty state", () => {
    render(<AutomatedEmailsTable automations={[]} />);

    expect(screen.getByRole("heading", { name: "emptyTitle" })).toBeVisible();
    expect(screen.getByText("emptyDescription")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
