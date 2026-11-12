import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        "opportunity.eyebrow": "Business Advisor",
        "opportunity.courseFallback": "This course",
        "opportunity.weekdays.saturday": "Saturday",
        "opportunity.items.noBookings": "No upcoming bookings yet.",
        "opportunity.items.repeatedCourseSaturation":
          `${values.course} averages ${values.value}% capacity on ` +
          `${values.day} at ${values.time}`,
        "opportunity.guidance":
          "I’ll highlight useful opportunities here as new studio data becomes available.",
        "opportunity.evidence": `Based on ${values.sessions} high-fill sessions`,
        "opportunity.openAdvisor": "Open advisor",
        "opportunity.actions.reviewCourseCapacity": "Review capacity",
      };

      return messages[key] || key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AiOpportunityCard } from "@/components/dashboard/overview/BusinessPulse";

describe("dashboard Business Advisor card", () => {
  it("replaces the generic offer CTA with a quiet path to the advisor", () => {
    const { container } = render(
      <AiOpportunityCard
        canOpenAdvisor
        opportunity={{
          available: true,
          key: "noBookings",
          value: 0,
          href: "/app/products?action=create",
          actionKey: "createOffer",
          source: "deterministic",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Business Advisor" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No upcoming bookings yet.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "I’ll highlight useful opportunities here as new studio data becomes available.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /create an offer/i }),
    ).not.toBeInTheDocument();

    const advisorLink = screen.getByRole("link", { name: /open advisor/i });
    expect(advisorLink).toHaveAttribute("href", "/app/ai?view=advisor");
    expect(advisorLink).toHaveAttribute(
      "data-business-advisor-action",
      "quiet",
    );
    expect(advisorLink).not.toHaveClass("bg-cobalt-600", "text-white");
    expect(
      container.querySelector("[data-business-advisor-card]"),
    ).toBeInTheDocument();
  });

  it("does not expose the advisor route without AI permission", () => {
    render(
      <AiOpportunityCard
        canOpenAdvisor={false}
        opportunity={{
          available: true,
          key: "noBookings",
          value: 0,
          href: "/app/products?action=create",
          actionKey: "createOffer",
          source: "deterministic",
        }}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps qualified operational actions as understated links", () => {
    render(
      <AiOpportunityCard
        canOpenAdvisor
        opportunity={{
          available: true,
          key: "repeatedCourseSaturation",
          value: 96.7,
          href: "/app/products?category=classesEvents",
          actionKey: "reviewCourseCapacity",
          source: "deterministic",
          details: {
            courseName: "Saturday wheel",
            weekdayKey: "saturday",
            localStartTime: "18:00",
            highFillSessionCount: 4,
          },
        }}
      />,
    );

    expect(
      screen.getByText(
        "Saturday wheel averages 96.7% capacity on Saturday at 18:00",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Based on 4 high-fill sessions"),
    ).toBeInTheDocument();

    const action = screen.getByRole("link", { name: /review capacity/i });
    expect(action).toHaveAttribute(
      "href",
      "/app/products?category=classesEvents",
    );
    expect(action).toHaveAttribute("data-business-advisor-action", "quiet");
    expect(action).not.toHaveClass("bg-cobalt-600", "text-white");
  });
});
