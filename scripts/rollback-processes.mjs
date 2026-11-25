export class RehearsalProcesses {
  #processes = new Map();
  #failure;
  #failed;
  #resolveFailure;
  #shutdownTimeout;

  constructor({ shutdownTimeout = 35000 } = {}) {
    this.#shutdownTimeout = shutdownTimeout;
    // Resolve with an error rather than rejecting an unattended promise.
    this.#failed = new Promise((resolve) => {
      this.#resolveFailure = resolve;
    });
  }

  #fail(error) {
    if (!this.#failure) {
      this.#failure = error;
      this.#resolveFailure(error);
    }
    return error;
  }

  #exitError(child, result) {
    return new Error(
      `${child.name} exited unexpectedly: ${JSON.stringify(result)}; inspect ${child.logPath}`,
    );
  }

  track(child, { service = true, allowSignalShutdown = false } = {}) {
    const state = { service, allowSignalShutdown, stopping: false };
    this.#processes.set(child, state);
    child.completion = new Promise((resolve) => {
      child.once("error", (error) => {
        state.result = { error };
        this.#fail(new Error(`${child.name} failed to run: ${error.message}`));
        resolve(state.result);
      });
      child.once("exit", (code, signal) => {
        state.result = { code, signal };
        if (!state.stopping && (service || code !== 0))
          this.#fail(this.#exitError(child, state.result));
        resolve(state.result);
      });
    });
    return child;
  }

  assertHealthy() {
    for (const [child, state] of this.#processes) {
      if (
        state.service &&
        !state.stopping &&
        (child.exitCode !== null || child.signalCode)
      )
        this.#fail(
          this.#exitError(child, {
            code: child.exitCode,
            signal: child.signalCode,
          }),
        );
    }
    if (this.#failure) throw this.#failure;
  }

  async wait(operation) {
    const result = await Promise.race([
      operation,
      this.#failed.then((error) => {
        throw error;
      }),
    ]);
    this.assertHealthy();
    return result;
  }

  async stop(child, { cleanup = false } = {}) {
    const state = this.#processes.get(child);
    if (!state) throw new Error("Cannot stop an untracked rehearsal process.");
    if (!cleanup) this.assertHealthy();
    if (!state.shutdown) state.shutdown = this.#shutdown(child, state);
    await state.shutdown;
    if (!cleanup) this.assertHealthy();
  }

  async #shutdown(child, state) {
    if (state.result) return;
    // Mark only this process as intentionally stopping. Other services remain
    // supervised while it drains, including between sequential shutdowns.
    state.stopping = true;
    if (!child.kill("SIGTERM"))
      throw this.#fail(
        new Error(`${child.name} exited before shutdown could signal it.`),
      );
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(this.#fail(new Error(`${child.name} did not drain cleanly`)));
      }, this.#shutdownTimeout);
    });
    try {
      const result = await Promise.race([child.completion, timeout]);
      if (
        result.code !== 0 &&
        !(
          state.allowSignalShutdown &&
          (result.signal === "SIGTERM" || result.code === 143)
        )
      )
        throw this.#fail(
          new Error(
            `${child.name} failed graceful shutdown: ${JSON.stringify(result)}`,
          ),
        );
    } finally {
      clearTimeout(timer);
    }
  }

  async cleanup() {
    await Promise.allSettled(
      [...this.#processes].map(async ([child]) => {
        try {
          await this.stop(child, { cleanup: true });
        } finally {
          if (child.exitCode === null && !child.signalCode) {
            child.kill("SIGKILL");
            await child.completion;
          }
        }
      }),
    );
  }
}
