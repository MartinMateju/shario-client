import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const MANAGED_PORTS = [4310, 4311, 4002];
const PORT_RELEASE_TIMEOUT_MS = 5_000;
const [suiteName, ...playwrightArguments] = process.argv.slice(2);

if (!suiteName || playwrightArguments.length === 0) {
  throw new Error(
    "Usage: node scripts/run-playwright-ci.mjs <suite-name> <playwright arguments...>",
  );
}

if (process.platform === "win32") {
  throw new Error("The browser CI process-group runner requires a POSIX host.");
}

const canBind = (port) =>
  new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      if (["EACCES", "EADDRINUSE"].includes(error.code)) {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen({ exclusive: true, host: "127.0.0.1", port }, () =>
      server.close(() => resolve(true)),
    );
  });

const getOccupiedPorts = async () => {
  const availability = await Promise.all(
    MANAGED_PORTS.map(async (port) => ({
      available: await canBind(port),
      port,
    })),
  );

  return availability
    .filter(({ available }) => !available)
    .map(({ port }) => port);
};

const waitForPortsToBeReleased = async () => {
  const deadline = Date.now() + PORT_RELEASE_TIMEOUT_MS;
  let occupiedPorts = await getOccupiedPorts();

  while (occupiedPorts.length > 0 && Date.now() < deadline) {
    await delay(250);
    occupiedPorts = await getOccupiedPorts();
  }

  return occupiedPorts;
};

const occupiedBeforeStart = await getOccupiedPorts();
if (occupiedBeforeStart.length > 0) {
  throw new Error(
    `${suiteName} cannot start because CI port(s) ${occupiedBeforeStart.join(", ")} are already occupied.`,
  );
}

const child = spawn(
  "npx",
  ["--no-install", "playwright", "test", ...playwrightArguments],
  {
    detached: true,
    env: process.env,
    stdio: "inherit",
  },
);

const terminateProcessGroup = (signal) => {
  if (!child.pid) return;

  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
};

const forwardInterrupt = () => terminateProcessGroup("SIGINT");
const forwardTermination = () => terminateProcessGroup("SIGTERM");
process.on("SIGINT", forwardInterrupt);
process.on("SIGTERM", forwardTermination);

let outcome;
try {
  outcome = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
} finally {
  terminateProcessGroup("SIGTERM");
  let occupiedAfterStop = await waitForPortsToBeReleased();

  if (occupiedAfterStop.length > 0) {
    terminateProcessGroup("SIGKILL");
    occupiedAfterStop = await waitForPortsToBeReleased();
  }

  process.off("SIGINT", forwardInterrupt);
  process.off("SIGTERM", forwardTermination);

  if (occupiedAfterStop.length > 0) {
    throw new Error(
      `${suiteName} left CI port(s) ${occupiedAfterStop.join(", ")} occupied after process-group cleanup.`,
    );
  }
}

if (outcome.signal) {
  console.error(`${suiteName} exited after receiving ${outcome.signal}.`);
}
process.exitCode = outcome.code ?? 1;
