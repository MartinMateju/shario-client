import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

// The API slice reads its base URL when it is first imported.
vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
});

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
}));

import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { apiSlice } from "@/lib/features/api/apiSlice";
import { authCacheIsolationMiddleware } from "@/lib/features/auth/authCacheIsolationMiddleware";
import authReducer from "@/lib/features/auth/authSlice";

function SessionRestore() {
  useTokenRefresh();

  return null;
}

describe("useTokenRefresh", () => {
  it("does not leave the session restore response in the API cache", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const store = configureStore({
      reducer: {
        auth: authReducer,
        [apiSlice.reducerPath]: apiSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
          authCacheIsolationMiddleware,
          apiSlice.middleware,
        ),
    });

    render(
      <Provider store={store}>
        <SessionRestore />
      </Provider>,
    );

    await vi.waitFor(() => {
      expect(store.getState().auth.sessionReady).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0].url).toMatch(
      /^https:\/\/api\.example\.test\/auth\/(customer\/)?refresh$/,
    );
    expect(store.getState().api.mutations).toEqual({});
  });
});
