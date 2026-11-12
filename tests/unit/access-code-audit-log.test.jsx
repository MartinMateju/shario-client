import { render, screen } from "@testing-library/react";

import AccessCodeAuditLog from "@/components/views/access-codes/AccessCodeAuditLog";

const ACTOR_ID = "6a859b3f0b2f4e6a98537c0e";

vi.mock("next-intl", () => ({
  useFormatter: () => ({ dateTime: () => "Aug 20, 2026, 11:02 AM" }),
  useTranslations: () => (key, values) => {
    const messages = {
      "audit.actions.code_revealed": "Access code revealed",
      "audit.actions.updated": "Access-code inventory updated",
      "audit.performedBy": `By ${values?.name}`,
      "audit.systemActor": "System",
    };

    return messages[key] || key;
  },
}));

vi.mock("@/lib/features/accessCodes/accessCodeApiSlice", () => ({
  useGetAccessCodeAuditQuery: () => ({
    data: {
      items: [
        {
          id: "audit-1",
          actorId: ACTOR_ID,
          actor: {
            name: "Marta Novak",
            email: "marta@example.com",
          },
          action: "code.revealed",
          metadata: { maskedCode: "••••34" },
          createdAt: "2026-08-20T09:02:00.000Z",
        },
      ],
    },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

describe("AccessCodeAuditLog", () => {
  it("shows who revealed a code without displaying the internal actor ID", () => {
    render(<AccessCodeAuditLog enabled poolId="pool-1" />);

    expect(screen.getByText("Access code revealed")).toBeInTheDocument();
    expect(screen.getByText("By Marta Novak · ••••34")).toBeInTheDocument();
    expect(screen.queryByText(ACTOR_ID)).not.toBeInTheDocument();
  });
});
