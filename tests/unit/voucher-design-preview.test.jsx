import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useVoucherDesignPreview from "@/components/vouchers/editor/useVoucherDesignPreview";

const api = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  usePreviewVoucherDesignMutation: () => [api.preview],
}));

function request() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { unwrap: () => promise, abort: vi.fn(), resolve, reject };
}

async function advance(milliseconds = 500) {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds);
  });
}

async function resolvePreview(pending, svg) {
  await act(async () => pending.resolve({ svg }));
}

describe("voucher server preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    api.preview.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("debounces typing and preserves the timer when equivalent payload objects rerender", async () => {
    const pending = request();
    api.preview.mockReturnValue(pending);
    const { result, rerender } = renderHook(
      ({ payload }) => useVoucherDesignPreview({ payload }),
      { initialProps: { payload: { title: "First" } } },
    );
    expect(result.current.isUpdating).toBe(true);
    await advance(300);
    rerender({ payload: { title: "Final" } });
    await advance(300);
    expect(api.preview).not.toHaveBeenCalled();
    rerender({ payload: { title: "Final" } });
    await advance(200);
    expect(api.preview).toHaveBeenCalledExactlyOnceWith({ title: "Final" });
    await resolvePreview(pending, "<svg>Final</svg>");
    expect(result.current.svg).toBe("<svg>Final</svg>");
    expect(result.current.isUpdating).toBe(false);
  });

  it("aborts replaced requests and ignores stale responses even if cancellation cannot stop them", async () => {
    const first = request();
    const second = request();
    api.preview.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { result, rerender } = renderHook(
      ({ payload }) => useVoucherDesignPreview({ payload }),
      { initialProps: { payload: { title: "First" } } },
    );
    await advance();
    rerender({ payload: { title: "Second" } });
    expect(first.abort).toHaveBeenCalledOnce();
    await advance();
    await resolvePreview(second, "<svg>Second</svg>");
    await resolvePreview(first, "<svg>Obsolete</svg>");
    expect(result.current.svg).toBe("<svg>Second</svg>");
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("retains the last valid image during updates and failures and retries the current payload", async () => {
    const first = request();
    const failed = request();
    const retried = request();
    api.preview
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(failed)
      .mockReturnValueOnce(retried);
    const { result, rerender } = renderHook(
      ({ payload }) => useVoucherDesignPreview({ payload }),
      { initialProps: { payload: { title: "Saved" } } },
    );
    await advance();
    await resolvePreview(first, "<svg>Saved</svg>");
    rerender({ payload: { title: "Edited" } });
    expect(result.current.svg).toBe("<svg>Saved</svg>");
    expect(result.current.isUpdating).toBe(true);
    await advance();
    const failure = { status: 503, data: { message: "Try again" } };
    await act(async () => failed.reject(failure));
    expect(result.current.svg).toBe("<svg>Saved</svg>");
    expect(result.current.error).toBe(failure);
    expect(result.current.isUpdating).toBe(false);

    act(() => result.current.retry());
    expect(result.current.error).toBeNull();
    await advance();
    expect(api.preview).toHaveBeenLastCalledWith({ title: "Edited" });
    await resolvePreview(retried, "<svg>Edited</svg>");
    expect(result.current.svg).toBe("<svg>Edited</svg>");
    expect(result.current.error).toBeNull();
  });

  it("stops requests for disabled or absent payloads and preserves the last valid image", async () => {
    const first = request();
    const aborted = request();
    api.preview.mockReturnValueOnce(first).mockReturnValueOnce(aborted);
    const { result, rerender } = renderHook(useVoucherDesignPreview, {
      initialProps: { payload: { title: "Saved" }, enabled: true },
    });
    await advance();
    await resolvePreview(first, "<svg>Saved</svg>");
    rerender({ payload: { title: "Edited" }, enabled: true });
    await advance();
    rerender({ payload: { title: "Edited" }, enabled: false });
    expect(aborted.abort).toHaveBeenCalledOnce();
    await resolvePreview(aborted, "<svg>Disabled</svg>");
    expect(result.current.svg).toBe("<svg>Saved</svg>");
    expect(result.current.isUpdating).toBe(false);
    rerender({ payload: null, enabled: true });
    await advance();
    expect(api.preview).toHaveBeenCalledTimes(2);
    expect(result.current.svg).toBe("<svg>Saved</svg>");
    expect(result.current.error).toBeNull();
  });

  it("aborts on unmount and clears a pending debounce before it starts a request", async () => {
    const pending = request();
    api.preview.mockReturnValue(pending);
    const first = renderHook(() =>
      useVoucherDesignPreview({ payload: { title: "Pending" } }),
    );
    await advance();
    first.unmount();
    expect(pending.abort).toHaveBeenCalledOnce();
    await act(async () => pending.reject(new Error("Aborted")));

    const second = renderHook(() =>
      useVoucherDesignPreview({ payload: { title: "Typing" } }),
    );
    second.unmount();
    await advance();
    expect(api.preview).toHaveBeenCalledOnce();
  });

  it("treats an empty response as a preview error", async () => {
    const pending = request();
    api.preview.mockReturnValue(pending);
    const { result } = renderHook(() =>
      useVoucherDesignPreview({ payload: { title: "Voucher" } }),
    );
    await advance();
    await resolvePreview(pending, "");
    expect(result.current.svg).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.isUpdating).toBe(false);
  });
});
