import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";
import CustomOrderEditor, {
  CustomOrderForm,
} from "@/components/custom-orders/CustomOrderEditor";
import CustomOrderDetail, {
  OrderActionDialog,
  OrderHistory,
} from "@/components/custom-orders/CustomOrderDetail";
import CustomOrdersPage from "@/components/custom-orders/CustomOrdersPage";

const locations = [
  { id: "studio-1", name: "Grohova", timeZone: "Europe/Prague" },
  { id: "studio-2", name: "Václavská", timeZone: "Europe/Prague" },
];
const options = {
  locations,
  assignees: [{ id: "staff-1", name: "Pat Maker" }],
  currency: "CZK",
};
const base = () => ({
  id: "order-1",
  reference: "ZAK-001",
  revision: 4,
  title: "Tea cups",
  description: "Handmade cups for a cafe",
  materials: "Stoneware",
  finish: "",
  pieceCount: 12,
  startDate: "2030-02-10",
  deadline: "2030-02-20",
  locationId: "studio-1",
  location: locations[0],
  timeZone: "Europe/Prague",
  customerId: null,
  customer: { name: "Alex", email: "", phone: "" },
  assigneeId: null,
  quotedAmount: null,
  currency: "CZK",
  status: "active",
  attachments: [],
  history: [],
});
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  comment: vi.fn(),
  close: vi.fn(),
  reopen: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  history: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
  query: {},
  getList: vi.fn(),
  active: "studio-1",
  access: { role: "owner" },
  list: { items: [], page: 1, pages: 3, total: 0 },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/image", () => ({
  default: ({ alt }) => <div role="img" aria-label={alt} />,
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({}) }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: () => mocks.access,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => mocks.active,
}));
vi.mock("@/lib/features/customOrders/customOrdersApiSlice", () => ({
  useGetCustomOrderOptionsQuery: () => ({ data: options }),
  useGetCustomOrderQuery: () => ({ ...mocks.query, refetch: mocks.refetch }),
  useGetCustomOrdersQuery: (...args) => {
    mocks.getList(...args);
    return { data: mocks.list, refetch: mocks.refetch };
  },
  useLazyFindCustomOrderCustomerQuery: () => [mocks.find, {}],
  useCreateCustomOrderMutation: () => [mocks.create, {}],
  useUpdateCustomOrderMutation: () => [mocks.update, {}],
  useCommentCustomOrderMutation: () => [mocks.comment, {}],
  useCloseCustomOrderMutation: () => [mocks.close, {}],
  useReopenCustomOrderMutation: () => [mocks.reopen, {}],
  useUploadCustomOrderAttachmentsMutation: () => [mocks.upload, {}],
  useRemoveCustomOrderAttachmentMutation: () => [mocks.remove, {}],
  useLazyGetCustomOrderHistoryQuery: () => [mocks.history, {}],
}));
const wrap = (children, locale = "en") => (
  <NextIntlClientProvider
    locale={locale}
    messages={locale === "cs" ? cs : en}
    timeZone="Europe/Prague"
  >
    {children}
  </NextIntlClientProvider>
);
const mountForm = (initialItem, props = {}) =>
  render(
    wrap(
      <CustomOrderForm
        initialItem={initialItem}
        options={options}
        defaultLocationId="studio-1"
        {...props}
      />,
    ),
  );
const fieldByLabel = (label) =>
  screen.getByLabelText((content) => content.replace(/\s*\*$/, "") === label);
const fill = (label, value) =>
  fireEvent.change(fieldByLabel(label), { target: { value } });

describe("custom order forms and lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.active = "studio-1";
    mocks.access = { role: "owner" };
    mocks.query = { data: base() };
    mocks.list = { items: [], page: 1, pages: 3, total: 0 };
    for (const name of [
      "create",
      "update",
      "comment",
      "close",
      "reopen",
      "upload",
      "remove",
    ])
      mocks[name].mockImplementation(() => ({
        unwrap: () => Promise.resolve(base()),
      }));
    mocks.find.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          customer: {
            id: "customer-1",
            name: "Jamie",
            email: "jamie@example.test",
          },
        }),
    }));
    mocks.refetch.mockResolvedValue({ data: base() });
  });
  it("marks missing required fields and focuses the first invalid input without sending", async () => {
    mountForm();
    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.CustomOrders.errors.validation,
    );
    expect(fieldByLabel("Order name")).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(fieldByLabel("Order name")).toHaveFocus());
  });
  it("creates a manual customer order without an account, email or financial side effects", async () => {
    mountForm();
    fill("Order name", "Tea cups");
    fill("Detailed description", "Handmade cups for a cafe");
    fill("Materials", "Stoneware");
    fill("Start date", "2030-02-10");
    fill("Deadline", "2030-02-20");
    fireEvent.click(fieldByLabel("Enter contact details"));
    fill("Name", "Alex");
    fill("Number of pieces", "12");
    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.calls[0][0]).toEqual({
      title: "Tea cups",
      description: "Handmade cups for a cafe",
      materials: "Stoneware",
      finish: "",
      startDate: "2030-02-10",
      deadline: "2030-02-20",
      pieceCount: 12,
      locationId: "studio-1",
      customerId: null,
      customer: { name: "Alex", email: "", phone: "" },
      assigneeId: null,
      quotedAmount: null,
      currency: "CZK",
    });
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/app/custom-orders/order-1?saved=1",
      ),
    );
  });
  it("validates chronology, email, piece count and quote with visible field feedback", () => {
    mountForm(base());
    fill("Deadline", "2030-02-01");
    fill("Email (optional)", "invalid");
    fill("Number of pieces", "1.5");
    fill("Quoted amount", "-2");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    for (const field of [
      "Deadline",
      "Email (optional)",
      "Number of pieces",
      "Quoted amount",
    ])
      expect(fieldByLabel(field)).toHaveAttribute("aria-invalid", "true");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("looks up a customer, links read-only contact details, then clears the link when changing location", async () => {
    mountForm(base());
    fireEvent.click(fieldByLabel("Link an existing customer"));
    fill("Customer ID or member number", "42");
    fireEvent.click(screen.getByRole("button", { name: "Find customer" }));
    await screen.findByText("Linked to Jamie");
    expect(mocks.find).toHaveBeenCalledWith({
      identifier: "42",
      locationId: "studio-1",
    });
    expect(fieldByLabel("Name")).toHaveAttribute("readonly");
    fill("Studio location", "studio-2");
    expect(screen.queryByText("Linked to Jamie")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(
      screen.getByText(en.CustomOrders.errors.selectCustomer),
    ).toBeVisible();
  });
  it("sends the revision and explicit cleared values when updating", async () => {
    mountForm({
      ...base(),
      finish: "Blue finish",
      quotedAmount: 1200,
      assigneeId: "staff-1",
    });
    fill(en.CustomOrders.fields.finish, "");
    fill("Quoted amount", "");
    fill("Responsible staff member", "");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      id: "order-1",
      revision: 4,
      finish: "",
      quotedAmount: null,
      assigneeId: null,
    });
  });
  it("retains a stale draft and requires an explicit reload before saving again", async () => {
    mocks.update.mockImplementation(() => ({
      unwrap: () => Promise.reject({ status: 409 }),
    }));
    const reload = vi.fn();
    mountForm(base(), { onReload: reload });
    fill("Order name", "My unsaved name");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(en.CustomOrders.errors.conflict);
    expect(fieldByLabel("Order name")).toHaveValue("My unsaved name");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: en.CustomOrders.reload }),
    );
    expect(reload).toHaveBeenCalledOnce();
  });
  it("keeps the original revision if a refetch arrives while editing", async () => {
    const view = mountForm(base());
    fill("Order name", "My draft");
    view.rerender(
      wrap(
        <CustomOrderForm
          initialItem={{ ...base(), revision: 5, title: "Someone else's edit" }}
          options={options}
          defaultLocationId="studio-1"
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ revision: 4, title: "My draft" }),
      ),
    );
  });
  it("allows an order before a customer is known while requiring a name for manual contact", async () => {
    const item = base();
    const { customerId, customer, ...specification } = item;
    const view = mountForm({
      ...specification,
      customer: { name: "", email: "", phone: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    view.unmount();
    mocks.update.mockClear();
    mountForm({
      ...specification,
      customer: { name: "", email: "", phone: "" },
    });
    fireEvent.click(fieldByLabel("Enter contact details"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(fieldByLabel("Name")).toHaveAttribute("aria-invalid", "true");
  });
  it("renders closed orders read-only on both detail and a direct editor URL", () => {
    mocks.query = {
      data: { ...base(), status: "closed", closeReason: "completed" },
    };
    const view = render(wrap(<CustomOrderDetail id="order-1" />));
    expect(screen.getByText(en.CustomOrders.closedNotice)).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Edit order" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add photos or PDFs" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Progress comment")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen order" })).toBeVisible();
    view.unmount();
    render(wrap(<CustomOrderEditor id="order-1" />));
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View order" })).toBeVisible();
  });
  it("requires an explicit reason to reopen and permits closing as cancelled", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const view = render(
      wrap(
        <OrderActionDialog
          action={{ type: "reopen" }}
          onConfirm={confirm}
          onCancel={vi.fn()}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reopen order" }));
    expect(confirm).not.toHaveBeenCalled();
    fill("Reason for reopening", "Customer requested a revision");
    fireEvent.click(screen.getByRole("button", { name: "Reopen order" }));
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith({
        reason: "Customer requested a revision",
      }),
    );
    view.unmount();
    confirm.mockClear();
    render(
      wrap(
        <OrderActionDialog
          action={{ type: "close" }}
          onConfirm={confirm}
          onCancel={vi.fn()}
        />,
      ),
    );
    fill("Reason for closing", "cancelled");
    fill("Closing note (optional)", "Customer cancelled");
    fireEvent.click(screen.getByRole("button", { name: "Close order" }));
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith({
        reason: "cancelled",
        note: "Customer cancelled",
      }),
    );
  });
  it("respects read-only staff permissions without hiding the order", () => {
    mocks.access = { permissions: ["orders.view"] };
    render(wrap(<CustomOrderDetail id="order-1" />));
    expect(screen.getByRole("heading", { name: "Tea cups" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Close order" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit order" }),
    ).not.toBeInTheDocument();
  });
  it("posts a comment with the current revision and clears only after success", async () => {
    render(wrap(<CustomOrderDetail id="order-1" />));
    fill("Progress comment", "Clay prepared");
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
    await waitFor(() =>
      expect(mocks.comment).toHaveBeenCalledWith({
        id: "order-1",
        revision: 4,
        body: "Clay prepared",
      }),
    );
    await waitFor(() =>
      expect(fieldByLabel("Progress comment")).toHaveValue(""),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Comment added.");
  });
  it("preserves an explicit All locations choice when the header studio changes and resets page for implicit changes", () => {
    const view = render(wrap(<CustomOrdersPage />));
    expect(mocks.getList).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationId: "studio-1", page: 1 }),
      expect.anything(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(mocks.getList).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything(),
    );
    mocks.active = "studio-2";
    view.rerender(wrap(<CustomOrdersPage />));
    expect(mocks.getList).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationId: "studio-2", page: 1 }),
      expect.anything(),
    );
    fill("Studio location", "");
    mocks.active = "studio-1";
    view.rerender(wrap(<CustomOrdersPage />));
    expect(mocks.getList.mock.calls.at(-1)[0]).not.toHaveProperty("locationId");
  });
  it("loads earlier audit events without replacing the most recent events", async () => {
    mocks.history.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          items: [
            {
              id: "e0",
              action: "created",
              actorName: "Pat",
              createdAt: "2030-01-01T10:00:00Z",
              body: "Original brief",
            },
          ],
          page: 2,
          pages: 2,
          total: 2,
        }),
    }));
    render(
      wrap(
        <OrderHistory
          item={{
            ...base(),
            history: [
              {
                id: "e1",
                action: "comment_added",
                actorName: "Pat",
                createdAt: "2030-01-02T10:00:00Z",
                body: "Clay ready",
              },
            ],
            historyPagination: { page: 1, pages: 2 },
          }}
        />,
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Load earlier history" }),
    );
    await screen.findByText("Original brief");
    expect(screen.getByText("Clay ready")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Load earlier history" }),
    ).not.toBeInTheDocument();
  });
  it("provides the complete Czech workflow labels", () => {
    render(
      wrap(
        <CustomOrderForm
          initialItem={base()}
          options={options}
          defaultLocationId="studio-1"
        />,
        "cs",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Upravit zakázku" }),
    ).toBeVisible();
    expect(fieldByLabel("Podrobný popis")).toBeVisible();
    expect(screen.getByRole("button", { name: "Uložit změny" })).toBeVisible();
  });
});
