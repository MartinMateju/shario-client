import { Transition } from "@headlessui/react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class ControlledCSSTransition {
  playState = "running";

  constructor() {
    this.finished = new Promise((resolve, reject) => {
      this.finish = () => {
        this.playState = "finished";
        resolve(this);
      };
      this.cancel = () => {
        this.playState = "idle";
        reject(new DOMException("The animation was cancelled", "AbortError"));
      };
    });
  }
}

function Panel({ show, afterEnter, afterLeave }) {
  return (
    <Transition show={show} afterEnter={afterEnter} afterLeave={afterLeave}>
      <div data-testid="transition-panel">Dismissible content</div>
    </Transition>
  );
}

async function advanceAnimationFrames() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
}

describe("real Headless UI transition dismissal", () => {
  let animations;

  beforeEach(() => {
    animations = [];
    vi.useFakeTimers();
    vi.stubGlobal("CSSTransition", ControlledCSSTransition);
    vi.spyOn(Element.prototype, "getAnimations").mockImplementation(
      () => animations,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([false, true])(
    "waits for a delayed reversal and removes the panel (finished animations retained: %s)",
    async (retainFinishedAnimations) => {
      const afterLeave = vi.fn();
      const { rerender } = render(
        <Panel show={false} afterLeave={afterLeave} />,
      );
      const entering = new ControlledCSSTransition();
      animations = [entering];
      rerender(<Panel show afterLeave={afterLeave} />);
      await advanceAnimationFrames();

      rerender(<Panel show={false} afterLeave={afterLeave} />);
      await advanceAnimationFrames();

      // The browser exposes the reversed animation after the closing render
      // has captured the old entering animation. Its completion must not be
      // mistaken for the completion of the still-running reverse animation.
      const reversed = new ControlledCSSTransition();
      animations = retainFinishedAnimations ? [entering, reversed] : [reversed];
      if (retainFinishedAnimations) entering.finish();
      else entering.cancel();
      await advanceAnimationFrames();
      expect(screen.getByTestId("transition-panel")).toBeInTheDocument();
      expect(afterLeave).not.toHaveBeenCalled();

      reversed.finish();
      if (!retainFinishedAnimations) animations = [];
      await advanceAnimationFrames();
      expect(screen.queryByTestId("transition-panel")).not.toBeInTheDocument();
      expect(afterLeave).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps a reopened panel mounted when its abandoned leave animation finishes", async () => {
    const afterEnter = vi.fn();
    const afterLeave = vi.fn();
    const panel = (show) => (
      <Panel show={show} afterEnter={afterEnter} afterLeave={afterLeave} />
    );
    const { rerender } = render(panel(false));
    const entering = new ControlledCSSTransition();
    animations = [entering];
    rerender(panel(true));
    await advanceAnimationFrames();
    rerender(panel(false));
    await advanceAnimationFrames();
    const reversed = new ControlledCSSTransition();
    animations = [reversed];
    entering.finish();
    await advanceAnimationFrames();

    const reopening = new ControlledCSSTransition();
    animations = [reopening];
    rerender(panel(true));
    await advanceAnimationFrames();
    reversed.finish();
    await advanceAnimationFrames();
    expect(screen.getAllByTestId("transition-panel")).toHaveLength(1);
    expect(afterLeave).not.toHaveBeenCalled();

    reopening.finish();
    await advanceAnimationFrames();
    expect(screen.getByTestId("transition-panel")).toBeInTheDocument();
    expect(afterEnter).toHaveBeenCalledTimes(1);

    const finalLeave = new ControlledCSSTransition();
    animations = [finalLeave];
    rerender(panel(false));
    await advanceAnimationFrames();
    finalLeave.finish();
    await advanceAnimationFrames();
    expect(screen.queryByTestId("transition-panel")).not.toBeInTheDocument();
    expect(afterLeave).toHaveBeenCalledTimes(1);
  });

  it("does not complete a pending transition after its component is unmounted", async () => {
    const afterEnter = vi.fn();
    const afterLeave = vi.fn();
    const { rerender, unmount } = render(
      <Panel show={false} afterEnter={afterEnter} afterLeave={afterLeave} />,
    );
    const entering = new ControlledCSSTransition();
    animations = [entering];
    rerender(<Panel show afterEnter={afterEnter} afterLeave={afterLeave} />);
    await advanceAnimationFrames();
    rerender(
      <Panel show={false} afterEnter={afterEnter} afterLeave={afterLeave} />,
    );
    await advanceAnimationFrames();
    const reversed = new ControlledCSSTransition();
    animations = [reversed];
    entering.finish();
    await advanceAnimationFrames();

    unmount();
    reversed.finish();
    await advanceAnimationFrames();
    expect(screen.queryByTestId("transition-panel")).not.toBeInTheDocument();
    expect(afterEnter).not.toHaveBeenCalled();
    expect(afterLeave).not.toHaveBeenCalled();
  });
});
