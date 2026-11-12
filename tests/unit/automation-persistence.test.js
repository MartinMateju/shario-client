import { describe, expect, it, vi } from "vitest";

import { persistCommunicationAutomation } from "../../src/components/communications/email/automationPersistence";

describe("communication automation persistence", () => {
  it("reuses the persisted draft id after activation fails", async () => {
    const createAutomation = vi.fn().mockResolvedValue({ _id: "automation-1" });
    const updateAutomation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sender is not verified"))
      .mockResolvedValueOnce({ _id: "automation-1", isActive: true });
    let persistedId = "";
    const payload = { name: "Reminder", isActive: true };

    await expect(
      persistCommunicationAutomation({
        persistedId,
        payload,
        activate: true,
        createAutomation,
        updateAutomation,
        onPersisted: (id) => {
          persistedId = id;
        },
      }),
    ).rejects.toThrow("Sender is not verified");

    expect(persistedId).toBe("automation-1");

    await persistCommunicationAutomation({
      persistedId,
      payload,
      activate: true,
      createAutomation,
      updateAutomation,
    });

    expect(createAutomation).toHaveBeenCalledTimes(1);
    expect(updateAutomation).toHaveBeenCalledTimes(2);
    expect(updateAutomation).toHaveBeenLastCalledWith({
      id: "automation-1",
      name: "Reminder",
      isActive: true,
    });
  });
});
