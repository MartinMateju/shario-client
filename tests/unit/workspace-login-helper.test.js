import { describe, expect, it, vi } from "vitest";

import { loginWorkspaceAs } from "../../e2e/helpers/auth-surfaces.js";

const setup = ({ status = 200 } = {}) => {
  let navigated = false;
  let cachedBody;
  let resolveResponse;
  const responseReady = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  const payload = { accessToken: "fixture-token" };
  const response = {
    ok: () => status === 200,
    status: () => status,
    url: () => "http://127.0.0.1:4001/auth",
    request: () => ({ method: () => "POST" }),
    body: vi.fn(async () => {
      if (cachedBody === undefined) {
        if (navigated)
          throw new Error("No resource with given identifier found");
        cachedBody = Buffer.from(JSON.stringify(payload));
      }
      return cachedBody;
    }),
    json: async () => JSON.parse((await response.body()).toString()),
    text: async () => (await response.body()).toString(),
  };
  const workspaceReady = vi.fn(async () => {});
  const page = {
    goto: vi.fn(async () => {}),
    getByLabel: () => ({ fill: vi.fn(async () => {}) }),
    getByRole: () => ({
      waitFor: vi.fn(async () => {}),
      click: vi.fn(async () => {
        resolveResponse(response);
      }),
    }),
    waitForResponse: vi.fn(async (matches) => {
      const result = await responseReady;
      expect(matches(result)).toBe(true);
      return result;
    }),
    waitForURL: vi.fn(async () => {
      navigated = true;
    }),
    locator: vi.fn(() => ({ waitFor: workspaceReady })),
  };
  return { page, response, payload, workspaceReady };
};

describe("workspace E2E login response lifetime", () => {
  it("retains real login JSON before navigation discards the response resource", async () => {
    const { page, response, payload, workspaceReady } = setup();
    const login = await loginWorkspaceAs(page, {
      slug: "studio-alpha",
      email: "owner@studio-alpha.test",
    });

    expect(login).toBe(response);
    expect(page.waitForURL).toHaveBeenCalledOnce();
    expect(page.locator).toHaveBeenCalledWith('[data-workspace-ui="true"]');
    expect(workspaceReady).toHaveBeenCalledOnce();
    await expect(login.json()).resolves.toEqual(payload);
  });

  it("still rejects a failed real login before checking the workspace", async () => {
    const { page, workspaceReady } = setup({ status: 401 });
    await expect(
      loginWorkspaceAs(page, {
        slug: "studio-alpha",
        email: "owner@studio-alpha.test",
      }),
    ).rejects.toThrow("Workspace login failed with 401");
    expect(page.waitForURL).not.toHaveBeenCalled();
    expect(workspaceReady).not.toHaveBeenCalled();
  });
});
