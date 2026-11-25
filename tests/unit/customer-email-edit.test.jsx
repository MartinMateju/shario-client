import {
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditUserForm from "@/components/forms/user/EditUserForm";
import enMessages from "@/messages/en.json";

const render = (ui) =>
  renderUi(
    <NextIntlClientProvider
      locale="en"
      messages={enMessages}
      timeZone="Europe/Prague"
    >
      {ui}
    </NextIntlClientProvider>,
  );

const mocks = vi.hoisted(() => ({ update: vi.fn(), unwrap: vi.fn() }));
vi.mock("react-redux", () => ({ useSelector: () => "EN" }));
vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useUpdateUserMutation: () => [mocks.update, { isLoading: false }],
}));
const props = () => ({
  user: { id: "customer-1", email: "old@example.test", firstname: "Test" },
  setOpen: vi.fn(),
  showModalConfirm: vi.fn(),
});
describe("existing customer email editor", () => {
  beforeEach(() => {
    mocks.update
      .mockReset()
      .mockImplementation(() => ({ unwrap: mocks.unwrap }));
    mocks.unwrap.mockReset();
  });
  it.each(["sent", "retry_required"])(
    "discloses credential revocation and shows the actual %s delivery outcome",
    async (status) => {
      mocks.unwrap.mockResolvedValue({
        emailChanged: true,
        verificationEmailStatus: status,
      });
      const callbacks = props();
      render(<EditUserForm {...callbacks} />);
      fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
        target: { value: "new@example.test" },
      });
      expect(
        screen.getByText(/signs this customer out of all sessions/),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          status === "sent"
            ? "verification link was sent"
            : "delivery could not be confirmed",
        ),
      );
      expect(mocks.update).toHaveBeenCalledWith({
        id: "customer-1",
        email: "new@example.test",
      });
      expect(callbacks.setOpen).not.toHaveBeenCalled();
      expect(callbacks.showModalConfirm).not.toHaveBeenCalled();
    },
  );
  it("keeps a failed save editable and does not show success", async () => {
    mocks.unwrap.mockRejectedValue({ status: 409 });
    const callbacks = props();
    render(<EditUserForm {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    expect(callbacks.setOpen).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeEnabled();
  });
  it("preserves existing confirmation behavior for an unchanged identity", async () => {
    mocks.unwrap.mockResolvedValue({
      emailChanged: false,
      verificationEmailStatus: "not_required",
    });
    const callbacks = props();
    render(<EditUserForm {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(callbacks.setOpen).toHaveBeenCalledWith(false));
    expect(callbacks.showModalConfirm).toHaveBeenCalledWith(true);
  });
  it("renders a guest customer without a login email", () => {
    render(<EditUserForm {...props()} user={{ id: "guest-1" }} />);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("");
  });
});
