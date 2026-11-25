import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

import { RehearsalProcesses } from "../scripts/rollback-processes.mjs";

async function fixture(t, { timeout = 1000 } = {}) {
  const processes = new RehearsalProcesses({ shutdownTimeout: timeout });
  t.after(() => processes.cleanup());
  const launch = async ({ termination = "clean", ...options } = {}) => {
    const handler = {
      clean: "process.on('SIGTERM', () => process.exit(0));",
      delayed:
        "process.on('SIGTERM', () => setTimeout(() => process.exit(0), 100));",
      ignore: "process.on('SIGTERM', () => {});",
      failure: "process.on('SIGTERM', () => process.exit(23));",
      signal: "",
      conventional: "process.on('SIGTERM', () => process.exit(143));",
    }[termination];
    const child = spawn(
      process.execPath,
      [
        "-e",
        `${handler}
         process.on('message', code => process.exit(code));
         setInterval(() => {}, 1000);
         process.send('ready');`,
      ],
      { stdio: ["ignore", "ignore", "ignore", "ipc"] },
    );
    child.name = options.service === false ? "scenario" : "worker";
    child.logPath = "dummy-process.log";
    processes.track(child, options);
    await once(child, "message");
    return child;
  };
  return { processes, launch };
}

for (const code of [0, 23]) {
  test(`an already-exited service cannot pass shutdown (exit ${code})`, async (t) => {
    const { processes, launch } = await fixture(t);
    const child = await launch();
    child.send(code);
    await child.completion;
    await assert.rejects(processes.stop(child), /exited unexpectedly/);
    assert.throws(() => processes.assertHealthy(), /exited unexpectedly/);
  });
}

test("SIGKILL remains a failure even for a client allowed to stop by signal", async (t) => {
  const { processes, launch } = await fixture(t);
  const child = await launch({ allowSignalShutdown: true });
  child.kill("SIGKILL");
  await child.completion;
  assert.equal(child.exitCode, null);
  assert.equal(child.signalCode, "SIGKILL");
  await assert.rejects(processes.stop(child), /exited unexpectedly.*SIGKILL/);
});

test("an unexpected exit interrupts another running command", async (t) => {
  const { processes, launch } = await fixture(t);
  const worker = await launch();
  const command = await launch({ service: false });
  const waiting = processes.wait(command.completion);
  worker.send(23);
  await assert.rejects(waiting, /worker exited unexpectedly/);
  assert.equal(command.exitCode, null);
});

test("a successful one-shot command is expected, while failure is retained", async (t) => {
  const { processes, launch } = await fixture(t);
  const success = await launch({ service: false });
  success.send(0);
  assert.equal((await processes.wait(success.completion)).code, 0);
  processes.assertHealthy();
  const failure = await launch({ service: false });
  failure.send(23);
  await assert.rejects(
    processes.wait(failure.completion),
    /scenario exited unexpectedly/,
  );
});

test("clean shutdown is accepted and repeated stop calls share its outcome", async (t) => {
  const { processes, launch } = await fixture(t);
  const child = await launch({ termination: "delayed" });
  await Promise.all([processes.stop(child), processes.stop(child)]);
  await processes.stop(child);
  assert.equal(child.exitCode, 0);
  processes.assertHealthy();
});

for (const termination of ["signal", "conventional"]) {
  test(`intentional client ${termination} shutdown is accepted`, async (t) => {
    const { processes, launch } = await fixture(t);
    const child = await launch({ termination, allowSignalShutdown: true });
    await processes.stop(child);
    processes.assertHealthy();
  });
}

test("an unsuccessful graceful shutdown fails the final health check", async (t) => {
  const { processes, launch } = await fixture(t);
  const child = await launch({ termination: "failure" });
  await assert.rejects(processes.stop(child), /failed graceful shutdown/);
  assert.throws(() => processes.assertHealthy(), /failed graceful shutdown/);
});

test("a drain timeout kills the process and cannot become a passing cleanup", async (t) => {
  const { processes, launch } = await fixture(t, { timeout: 50 });
  const child = await launch({ termination: "ignore" });
  await assert.rejects(processes.stop(child), /did not drain cleanly/);
  await processes.cleanup();
  assert.equal(child.signalCode, "SIGKILL");
  assert.throws(() => processes.assertHealthy(), /did not drain cleanly/);
});

test("another service dying during an intentional drain still fails", async (t) => {
  const { processes, launch } = await fixture(t);
  const draining = await launch({ termination: "delayed" });
  const worker = await launch();
  const stopping = processes.stop(draining);
  worker.send(23);
  await assert.rejects(stopping, /exited unexpectedly/);
  assert.equal(draining.exitCode, 0);
  await assert.rejects(processes.stop(worker), /exited unexpectedly/);
});

test("SIGKILL racing an intentional drain is rejected", async (t) => {
  const { processes, launch } = await fixture(t);
  const child = await launch({
    termination: "ignore",
    allowSignalShutdown: true,
  });
  const stopping = processes.stop(child);
  child.kill("SIGKILL");
  await assert.rejects(stopping, /failed graceful shutdown.*SIGKILL/);
  assert.throws(() => processes.assertHealthy(), /failed graceful shutdown/);
});
