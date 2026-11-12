import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const intl = vi.hoisted(() => ({ locale: "en" }));
const publicTenant = vi.hoisted(() => ({ tenant: null }));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    publicTenant.tenant ? { tenant: publicTenant.tenant } : null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => intl.locale,
  useTranslations:
    () =>
    (key, values = {}) =>
      key === "sources.title"
        ? `${values.count} sources`
        : key === "sources.contextFreshnessCompact"
          ? intl.locale === "cs"
            ? `obnoveno ${values.date}`
            : `refreshed ${values.date}`
          : key === "sources.contextSourceCount"
            ? `${values.count} authorized context sources were checked.`
            : key === "sources.showDetails"
              ? intl.locale === "cs"
                ? "Zobrazit zdroje"
                : "Show sources"
              : key === "sources.hideDetails"
                ? intl.locale === "cs"
                  ? "Skrýt zdroje"
                  : "Hide sources"
                : key === "sources.answerSourcesTitle"
                  ? `Sources supporting this answer (${values.count})`
                  : key === "sources.relatedSourcesTitle"
                    ? `Related approved sources (${values.count})`
                    : key === "sources.noAnswerSources"
                      ? "No individual Knowledge Hub source was cited."
                      : key === "sources.availableContextTitle"
                        ? `Context available to the assistant (${values.count})`
                        : key === "sources.availableContextDescription"
                          ? "Available context is not necessarily answer evidence."
                          : key === "sources.source"
                            ? "Source"
                            : key === "sources.version"
                              ? `Version ${values.version}`
                              : key === "sources.contextSources.credits"
                                ? "Credits"
                                : key === "sources.contextSources.courses"
                                  ? "Courses and sessions"
                                  : key ===
                                      "sources.contextSources.current_booking"
                                    ? "Current booking"
                                    : key ===
                                        "sources.contextSources.booking_trend_report"
                                      ? "Booking trend report"
                                      : key === "sources.updated"
                                        ? `Updated ${values.date}`
                                        : key ===
                                            "sources.contextWarnings.insufficient"
                                          ? "Schválené podklady nestačily k ověření odpovědi."
                                          : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import AiSources from "@/components/ai/AiSources";
import {
  getAiEvidence,
  getAiEvidenceWarningKey,
  getConciergeSuggestionKeys,
  getSafeExternalCitationUrl,
  getSafeKnowledgeSourceHref,
  normalizeAiCitation,
} from "@/components/ai/ai.utils";

describe("AI evidence normalization", () => {
  it("normalizes the canonical evidence envelope and keeps only evidence metadata", () => {
    expect(
      getAiEvidence({
        evidence: {
          generatedAt: "2026-08-05T09:00:00.000Z",
          context: {
            basis: "workspace_facts",
            freshnessAt: "2026-08-05T08:59:00.000Z",
            sourceCount: 8,
            complete: false,
            truncated: true,
          },
          sources: [{ id: "bookings", title: "Bookings" }],
          warnings: [{ code: "context_truncated" }],
        },
      }),
    ).toEqual({
      generatedAt: "2026-08-05T09:00:00.000Z",
      context: {
        basis: "workspace_facts",
        freshnessAt: "2026-08-05T08:59:00.000Z",
        sourceCount: 8,
        candidateCount: null,
        complete: false,
        truncated: true,
        stale: null,
      },
      sources: [{ id: "bookings", title: "Bookings" }],
      warnings: [{ code: "context_truncated" }],
    });
  });

  it("uses legacy grounding and citations when an older message has no evidence envelope", () => {
    expect(
      getAiEvidence({
        grounding: {
          basis: "knowledge",
          sourceCount: 1,
          retrievedAt: "2026-08-05T09:00:00.000Z",
        },
        citations: [{ sourceId: "rules", title: "Studio rules" }],
      }),
    ).toMatchObject({
      generatedAt: "2026-08-05T09:00:00.000Z",
      sources: [{ sourceId: "rules", title: "Studio rules" }],
      context: {
        basis: "knowledge",
        freshnessAt: "2026-08-05T09:00:00.000Z",
        sourceCount: 1,
      },
    });
  });

  it("never suggests personal-record questions to the customer concierge", () => {
    const customerSuggestions = getConciergeSuggestionKeys("customer");

    expect(customerSuggestions).toEqual([
      "studioRules",
      "memberships",
      "materials",
    ]);
    expect(customerSuggestions).not.toEqual(
      expect.arrayContaining(["myBookings", "credits", "myPieces"]),
    );
  });
});

describe("AI citation URL safety", () => {
  it("accepts absolute HTTP(S) source URLs without credentials", () => {
    expect(
      getSafeExternalCitationUrl("https://studio.example/guides/clay"),
    ).toBe("https://studio.example/guides/clay");
    expect(getSafeExternalCitationUrl("http://studio.example/help")).toBe(
      "http://studio.example/help",
    );
  });

  it.each([
    "/internal/knowledge",
    "//evil.example/guide",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "https://user:secret@studio.example/guide",
    "not a URL",
  ])("rejects an unsafe or non-external source URL", (value) => {
    expect(getSafeExternalCitationUrl(value)).toBe("");
  });

  it("keeps a title-only citation when sourceUrl is absent or invalid", () => {
    expect(
      normalizeAiCitation({ id: "one", title: "Studio rules" }),
    ).toMatchObject({
      id: "one",
      title: "Studio rules",
      excerpt: "",
      href: "",
      external: false,
    });
    expect(
      normalizeAiCitation({
        id: "two",
        title: "Kiln safety",
        sourceUrl: "javascript:alert(1)",
      }),
    ).toMatchObject({
      title: "Kiln safety",
      href: "",
      external: false,
    });
  });

  it("accepts only canonical Knowledge Hub deep links", () => {
    expect(
      getSafeKnowledgeSourceHref(
        "/app/knowledge?resource=507f1f77bcf86cd799439011",
      ),
    ).toBe("/app/knowledge?resource=507f1f77bcf86cd799439011");
    expect(
      getSafeKnowledgeSourceHref(
        "/portal/knowledge?resource=507f1f77bcf86cd799439011",
      ),
    ).toBe("/portal/knowledge?resource=507f1f77bcf86cd799439011");
    expect(getSafeKnowledgeSourceHref("/help/507f1f77bcf86cd799439011")).toBe(
      "/help/507f1f77bcf86cd799439011",
    );

    expect(
      getSafeKnowledgeSourceHref(
        "/app/knowledge?resource=507f1f77bcf86cd799439011&redirect=https://evil.example",
      ),
    ).toBe("");
    expect(
      getSafeKnowledgeSourceHref("/app/knowledge?resource=not-an-id"),
    ).toBe("");
  });
});

describe("AiSources", () => {
  beforeEach(() => {
    intl.locale = "en";
    publicTenant.tenant = null;
  });

  it("keeps disabled portal citations as text and restores links when preview settings change", () => {
    publicTenant.tenant = {
      publicSite: {
        customerPortal: { pages: { studioGuide: { enabled: false } } },
      },
    };
    const citations = [
      {
        id: "studio-rules",
        title: "Studio rules",
        excerpt: "Use only approved clay.",
        sourceHref: "/portal/knowledge?resource=507f1f77bcf86cd799439011",
      },
    ];
    const { rerender } = render(<AiSources citations={citations} />);
    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));

    expect(screen.getByText("Studio rules")).toBeVisible();
    expect(screen.getByText("Use only approved clay.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Studio rules" })).toBeNull();

    publicTenant.tenant.publicSite.customerPortal.pages.studioGuide.enabled = true;
    rerender(<AiSources citations={citations} />);
    expect(screen.getByRole("link", { name: "Studio rules" })).toHaveAttribute(
      "href",
      citations[0].sourceHref,
    );
  });

  it("preserves enabled, workspace, public, and external citations when a portal page is disabled", () => {
    publicTenant.tenant = {
      publicSite: {
        customerPortal: { pages: { studioGuide: { enabled: false } } },
      },
    };
    render(
      <AiSources
        citations={[
          { id: "bookings", title: "My bookings", href: "/portal/bookings" },
          {
            id: "workspace",
            title: "Workspace rules",
            sourceHref: "/app/knowledge?resource=507f1f77bcf86cd799439011",
          },
          {
            id: "public",
            title: "Public guide",
            href: "/help/507f1f77bcf86cd799439011",
          },
          {
            id: "external",
            title: "External guide",
            sourceUrl: "https://example.com/portal/knowledge",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));

    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "href",
      "/portal/bookings",
    );
    expect(
      screen.getByRole("link", { name: "Workspace rules" }),
    ).toHaveAttribute(
      "href",
      "/app/knowledge?resource=507f1f77bcf86cd799439011",
    );
    expect(screen.getByRole("link", { name: "Public guide" })).toHaveAttribute(
      "href",
      "/help/507f1f77bcf86cd799439011",
    );
    expect(
      screen.getByRole("link", { name: "External guide" }),
    ).toHaveAttribute("href", "https://example.com/portal/knowledge");
  });

  it("keeps portal citations available without public tenant context", () => {
    render(
      <AiSources
        citations={[
          {
            title: "Studio rules",
            sourceHref: "/portal/knowledge?resource=507f1f77bcf86cd799439011",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.getByRole("link", { name: "Studio rules" })).toBeVisible();
  });

  it("keeps evidence compact by default and reveals answer sources on request", () => {
    render(
      <AiSources
        evidence={{
          generatedAt: "2026-08-05T09:00:00.000Z",
          context: {
            basis: "knowledge",
            freshnessAt: "2026-08-05T09:00:00.000Z",
            sourceCount: 1,
          },
          sources: [{ id: "rules", title: "Studio rules" }],
        }}
      />,
    );

    const toggle = screen.getByRole("button", {
      name: "Show sources",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Studio rules")).not.toBeVisible();
    expect(screen.getByText(/refreshed/)).not.toBeVisible();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Studio rules")).toBeVisible();
    expect(
      screen.getByText("Sources supporting this answer (1)"),
    ).toBeVisible();
  });

  it("separates answer sources from the secondary available-context list", () => {
    render(
      <AiSources
        evidence={{
          context: {
            basis: "workspace_facts",
            sourceCount: 2,
          },
          sources: [
            {
              id: "rules",
              title: "Studio rules",
              type: "guide",
            },
            {
              id: "context:credits",
              title: "Server fallback title",
              type: "context",
              category: "credits",
            },
            {
              id: "context:courses",
              title: "Another fallback title",
              type: "context",
              category: "courses",
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));

    expect(screen.getByText("Studio rules")).toBeVisible();
    expect(
      screen.getByText("Context available to the assistant (2)"),
    ).toBeVisible();
    expect(screen.getByText("Credits")).not.toBeVisible();
    expect(screen.getByText("Courses and sessions")).not.toBeVisible();

    fireEvent.click(screen.getByText("Context available to the assistant (2)"));

    expect(screen.getByText("Credits")).toBeVisible();
    expect(screen.getByText("Courses and sessions")).toBeVisible();
    expect(screen.queryByText("sources.types.context")).toBeNull();
    expect(screen.queryByText("Authorized context")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows current booking and booking trend evidence with client-owned labels", () => {
    render(
      <AiSources
        evidence={{
          context: {
            basis: "workspace_facts",
            sourceCount: 2,
          },
          sources: [
            {
              id: "context:current_booking",
              title: "Untrusted booking label",
              type: "context",
              category: "current_booking",
            },
            {
              id: "context:booking_trend_report",
              title: "Untrusted trend label",
              type: "context",
              category: "booking_trend_report",
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    fireEvent.click(screen.getByText("Context available to the assistant (2)"));

    expect(screen.getByText("Current booking")).toBeVisible();
    expect(screen.getByText("Booking trend report")).toBeVisible();
    expect(screen.queryByText("Untrusted booking label")).toBeNull();
    expect(screen.queryByText("Untrusted trend label")).toBeNull();
  });

  it("uses the selected locale immediately when the component rerenders", () => {
    const view = render(
      <AiSources
        evidence={{
          generatedAt: "2026-08-05T09:00:00.000Z",
          context: { basis: "workspace_facts", sourceCount: 1 },
          sources: [
            {
              id: "context:credits",
              title: "Credits",
              type: "context",
              category: "credits",
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Show sources" })).toBeVisible();
    expect(screen.getByText(/refreshed/)).not.toBeVisible();

    intl.locale = "cs";
    view.rerender(
      <AiSources
        evidence={{
          generatedAt: "2026-08-05T09:00:00.000Z",
          context: { basis: "workspace_facts", sourceCount: 1 },
          sources: [
            {
              id: "context:credits",
              title: "Credits",
              type: "context",
              category: "credits",
            },
          ],
        }}
      />,
    );

    const czechToggle = screen.getByRole("button", {
      name: "Zobrazit zdroje",
    });
    expect(czechToggle).toBeVisible();
    expect(screen.getByText(/obnoveno/)).not.toBeVisible();
    fireEvent.click(czechToggle);
    expect(screen.getByText(/obnoveno/)).toBeVisible();
  });

  it("keeps technical warnings inside an accessible disclosure", () => {
    render(
      <AiSources
        evidence={{
          context: {
            basis: "workspace_facts",
            sourceCount: 1,
            complete: false,
          },
          sources: [
            {
              id: "context:credits",
              title: "Credits",
              type: "context",
              category: "credits",
            },
          ],
        }}
      />,
    );

    const region = screen.getByRole("region", {
      name: "sources.groundingLabel",
    });
    const toggle = screen.getByRole("button", {
      name: "Show sources",
    });
    const controlled = document.getElementById(
      toggle.getAttribute("aria-controls"),
    );

    expect(region).toContainElement(toggle);
    expect(controlled).toHaveAttribute("hidden");
    expect(
      screen.getByText("sources.contextWarnings.partial"),
    ).not.toBeVisible();

    fireEvent.click(toggle);
    expect(controlled).not.toHaveAttribute("hidden");
    expect(screen.getByText("sources.contextWarnings.partial")).toBeVisible();
    expect(toggle).toHaveAccessibleName("Hide sources");
  });

  it("renders code-only evidence warnings through localized translation keys", () => {
    expect(getAiEvidenceWarningKey("insufficient_evidence")).toBe(
      "insufficient",
    );

    render(
      <AiSources
        evidence={{
          context: { basis: "public_facts", sourceCount: 1 },
          sources: [],
          warnings: [{ code: "insufficient_evidence" }],
        }}
      />,
    );

    expect(
      screen.getByText("Schválené podklady nestačily k ověření odpovědi."),
    ).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(
      screen.getByText("Schválené podklady nestačily k ověření odpovědi."),
    ).toBeVisible();
    expect(screen.queryByText("insufficient_evidence")).toBeNull();
  });

  it("never renders arbitrary technical warning messages from the response", () => {
    render(
      <AiSources
        evidence={{
          context: {
            basis: "workspace_facts",
            sourceCount: 1,
            complete: false,
          },
          sources: [
            {
              id: "context:operations",
              title: "Operations",
              type: "context",
              category: "operations",
            },
          ],
          warnings: [
            {
              code: "unknown_internal_warning",
              message: "PRIVATE_DATABASE_HOST_FAILURE",
            },
          ],
        }}
      />,
    );

    expect(screen.queryByText("PRIVATE_DATABASE_HOST_FAILURE")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.queryByText("PRIVATE_DATABASE_HOST_FAILURE")).toBeNull();
    expect(screen.getByText("sources.contextWarnings.partial")).toBeVisible();
  });

  it("renders a validated sourceUrl as a protected external link", () => {
    render(
      <AiSources
        citations={[
          {
            id: "guide",
            title: "Clay guide",
            sourceUrl: "https://studio.example/guides/clay",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.getByRole("link", { name: /Clay guide/ })).toHaveAttribute(
      "href",
      "https://studio.example/guides/clay",
    );
    expect(screen.getByRole("link", { name: /Clay guide/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: /Clay guide/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("renders legacy and invalid-URL citations as title-only text", () => {
    render(
      <AiSources
        citations={[
          { id: "plain", title: "Studio rules" },
          {
            id: "unsafe",
            title: "Kiln safety",
            sourceUrl: "javascript:alert(1)",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.getByText("Studio rules").closest("a")).toBeNull();
    expect(screen.getByText("Kiln safety").closest("a")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("prefers a safe internal resource link and shows provenance", () => {
    render(
      <AiSources
        grounding={{ status: "grounded", knowledgeStatus: "matched" }}
        citations={[
          {
            id: "guide:0:hash",
            title: "Kiln safety",
            sourceHref: "/app/knowledge?resource=507f1f77bcf86cd799439011",
            sourceUrl: "https://studio.example/old-link",
            kind: "guide",
            version: 3,
            updatedAt: "2026-07-15T10:00:00.000Z",
            excerpt: "Wear the approved protective equipment.",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    const link = screen.getByRole("link", { name: "Kiln safety" });
    expect(link).toHaveAttribute(
      "href",
      "/app/knowledge?resource=507f1f77bcf86cd799439011",
    );
    expect(link).not.toHaveAttribute("target");
    expect(screen.getByText("Version 3")).toBeVisible();
    expect(
      screen.getByText("Wear the approved protective equipment."),
    ).toBeVisible();
    expect(link.closest("details")).toBeNull();
  });

  it("retains canonical evidence audience, locale and version provenance", () => {
    render(
      <AiSources
        evidence={{
          context: { basis: "knowledge", sourceCount: 1 },
          sources: [
            {
              id: "guide",
              title: "Customer guide",
              type: "guide",
              audience: "customer",
              locale: "en",
              version: 5,
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.getByText("Version 5")).toBeVisible();
    expect(screen.getByText("sources.audiences.customer")).toBeVisible();
    expect(screen.getByText("EN")).toBeVisible();
  });

  it("hides evidence diagnostics when there is no source to show", () => {
    render(
      <AiSources
        grounding={{
          status: "insufficient",
          insufficientEvidence: true,
          knowledgeStatus: "no_match",
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Show sources" })).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("labels citations as related instead of supporting when evidence is insufficient", () => {
    render(
      <AiSources
        grounding={{
          status: "insufficient",
          insufficientEvidence: true,
          knowledgeStatus: "no_match",
        }}
        citations={[{ id: "related", title: "Related studio guide" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));

    expect(screen.getByText("Related approved sources (1)")).toBeVisible();
    expect(screen.queryByText("Sources supporting this answer (1)")).toBeNull();
    expect(screen.getByText("Related studio guide")).toBeVisible();
  });

  it("does not call a workspace-fact answer insufficient just because knowledge did not match", () => {
    render(
      <AiSources
        grounding={{
          status: "workspace_facts",
          basis: "workspace_facts",
          insufficientEvidence: false,
          knowledgeStatus: "no_match",
        }}
        evidence={{
          context: { basis: "workspace_facts", sourceCount: 1 },
          sources: [
            {
              id: "context:operations",
              title: "Operations",
              type: "context",
              category: "operations",
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(
      screen.getByText("sources.states.workspaceFacts.title"),
    ).toBeVisible();
    expect(screen.queryByText("sources.states.insufficient.title")).toBeNull();
  });

  it("fails closed for malformed evidence instead of claiming workspace context", () => {
    render(
      <AiSources
        evidence={{
          context: { basis: "knowledge", sourceCount: 1 },
          sources: [
            {
              id: "context:credits",
              title: "Credits",
              type: "context",
              category: "credits",
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.getByText("sources.states.insufficient.title")).toBeVisible();
    expect(
      screen.queryByText("sources.states.workspaceFacts.title"),
    ).toBeNull();
  });

  it("does not describe a completed no-match as partially unavailable", () => {
    render(
      <AiSources
        evidence={{
          context: {
            basis: "insufficient",
            sourceCount: 1,
            complete: true,
            truncated: false,
          },
          sources: [
            {
              id: "related",
              title: "Related studio guide",
              type: "guide",
            },
          ],
          warnings: [{ code: "insufficient_evidence" }],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show sources" }));
    expect(screen.getByText("sources.states.insufficient.title")).toBeVisible();
    expect(screen.queryByText("sources.contextWarnings.partial")).toBeNull();
  });
});
