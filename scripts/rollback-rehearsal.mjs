import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, writeFile, symlink, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RehearsalProcesses } from "./rollback-processes.mjs";
import { snapshotDependencyDirectory } from "./rollback-dependencies.mjs";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (pairs, value, index, all) =>
        index % 2 ? pairs : [...pairs, [value, all[index + 1]]],
      [],
    ),
);
const backend = resolve(args["--backend"] || join(frontend, "../backend"));
const rollbackClientDependencies = args["--rollback-client-dependencies"];
if (Object.hasOwn(args, "--rollback-client-dependencies")) {
  assert.ok(
    typeof rollbackClientDependencies === "string" &&
      rollbackClientDependencies.trim(),
    "--rollback-client-dependencies requires a checkout directory.",
  );
}
const serverTarget =
  args["--server-target"] || "a4cedc2d1d45da552c6a7bae0bb8cf15bfb2bb7f";
const clientTarget =
  args["--client-target"] ||
  execFileSync(
    "git",
    ["rev-parse", "ca3ee1a67b27d5031e8a5ccf1648277c1b291e93^{commit}"],
    {
      cwd: frontend,
      encoding: "utf8",
    },
  ).trim();
for (const ref of [serverTarget, clientTarget])
  assert.match(
    ref,
    /^[a-f0-9]{40}$/,
    "Rollback targets must be immutable full commit SHAs.",
  );
const output = resolve(
  args["--output"] ||
    join(
      frontend,
      "test-results/rollback-rehearsal",
      new Date().toISOString().replaceAll(":", "-"),
    ),
);
await mkdir(output, { recursive: true });
const git = (repo, values) =>
  execFileSync("git", values, {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
const { rehearsalEnvironment } = await import(
  pathToFileURL(join(backend, "tests/rollback/environment.mjs"))
);
const { assertDedicatedRedis } = await import(
  pathToFileURL(join(backend, "tests/rollback/redis-isolation.mjs"))
);
const { MongoMemoryReplSet } = createRequire(join(backend, "package.json"))(
  "mongodb-memory-server",
);
const processes = new RehearsalProcesses();
const report = {
  kind: "isolated-local-process-rollback",
  productionControlPlaneTested: false,
  startedAt: new Date().toISOString(),
  target: { server: serverTarget, client: clientTarget },
  versions: {},
  processes: [],
  checks: {},
};
let replica;
let redisOwnership;
let env;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const saveReport = () =>
  writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));

async function snapshot(repo, name, ref, dependencyRoot) {
  const destination = join(output, name);
  await mkdir(destination, { recursive: true });
  const sourceFiles = ref
    ? git(repo, ["ls-tree", "-r", "--name-only", ref]).split("\n")
    : [
        ...new Set([
          ...git(repo, ["ls-files", "-z"]).split("\0"),
          ...git(repo, [
            "ls-files",
            "--others",
            "--exclude-standard",
            "-z",
            "--",
            "src",
            "tests",
            "scripts",
            ".github",
          ]).split("\0"),
        ]),
      ].filter(Boolean);
  if (ref) {
    const archive = join(output, `${name}.tar`);
    execFileSync("git", ["archive", "--format=tar", "--output", archive, ref], {
      cwd: repo,
    });
    execFileSync("tar", ["-xf", archive, "-C", destination]);
    await rm(archive);
    for (const file of sourceFiles) {
      if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example"))
        await rm(join(destination, file));
    }
  } else {
    for (const file of sourceFiles) {
      if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example"))
        continue;
      await mkdir(dirname(join(destination, file)), { recursive: true });
      await cp(join(repo, file), join(destination, file));
    }
  }
  const hash = createHash("sha256");
  for (const file of sourceFiles.sort()) {
    if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example"))
      continue;
    hash.update(file);
    hash.update(await readFile(join(destination, file)));
  }
  report.versions[name] = {
    commit: ref || git(repo, ["rev-parse", "HEAD"]),
    sourceSha256: hash.digest("hex"),
    dirty: !ref && Boolean(git(repo, ["status", "--porcelain"])),
    path: destination,
  };
  const modules = await snapshotDependencyDirectory({
    snapshot: destination,
    source: repo,
    dependencyRoot,
  });
  report.versions[name].dependencyPath = modules;
  await symlink(modules, join(destination, "node_modules"), "dir");
  return destination;
}
function launch(name, cwd, argv, overrides = {}, service = true) {
  const logPath = join(output, `${name}.log`);
  const log = createWriteStream(logPath);
  const child = spawn(process.execPath, argv, {
    cwd,
    env: { ...env, ...overrides },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.logPath = logPath;
  child.name = name;
  processes.track(child, {
    service,
    allowSignalShutdown: name.includes("client"),
  });
  child.once("close", () => log.end());
  report.processes.push({
    name,
    pid: child.pid,
    cwd,
    argv,
    startedAt: new Date().toISOString(),
  });
  return child;
}
async function run(name, cwd, argv, overrides) {
  const child = launch(name, cwd, argv, overrides, false);
  const result = await processes.wait(child.completion);
  assert.equal(
    result.code,
    0,
    `${name} failed (${result.code}); inspect ${child.logPath}`,
  );
}
async function stop(child) {
  await processes.stop(child);
}
async function poll(check, label, children = [], timeout = 180000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    processes.assertHealthy();
    for (const child of children)
      assert.equal(
        child.exitCode,
        null,
        `${child.name} exited: ${child.logPath}`,
      );
    try {
      if (await processes.wait(check())) return;
    } catch (error) {
      processes.assertHealthy();
      if (error?.code === "ERR_ASSERTION") throw error;
    }
    await delay(500);
  }
  throw new Error(`Timed out: ${label}`);
}
async function httpReady(url) {
  return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok;
}
async function startServer(version, repo) {
  const roles = [
    ["api", "src/server.ts"],
    ["email", "src/workers/communication-email.worker.ts"],
    ["scheduler", "src/workers/communication-automation-scheduler.worker.ts"],
    ["imports", "src/workers/data-import.worker.ts"],
  ];
  const processes = roles.map(([role, entry]) =>
    launch(`${version}-${role}`, repo, [
      "--import",
      "tsx",
      "--import",
      "./tests/rollback/stripe-transport.ts",
      entry,
    ]),
  );
  await poll(
    () => httpReady("http://127.0.0.1:4311/ready"),
    `${version} API readiness`,
    processes,
  );
  assert.ok(await httpReady("http://127.0.0.1:4311/health"));
  for (const child of processes.slice(1))
    await poll(
      async () =>
        (await readFile(child.logPath, "utf8")).includes(
          "worker_operational_sample",
        ),
      `${child.name} Mongo/Redis heartbeat`,
      processes,
    );
  await poll(
    async () =>
      (await readFile(processes[2].logPath, "utf8")).includes(
        "Communication automation check finished.",
      ),
    `${version} scheduler successful scan`,
    processes,
  );
  report.checks[`${version}ApiAndAllWorkersReady`] = true;
  const operationsUrl = "http://127.0.0.1:4311/internal/operations/health";
  if (version === "candidate") {
    assert.equal((await fetch(operationsUrl)).status, 401);
    let operations;
    await poll(
      async () => {
        const response = await fetch(operationsUrl, {
          headers: { authorization: `Bearer ${env.OPS_MONITOR_TOKEN}` },
        });
        operations = await response.json();
        await writeFile(
          join(output, "candidate-operations-health.json"),
          JSON.stringify(operations, null, 2),
        );
        return response.status === 200;
      },
      "candidate aggregate operations health",
      processes,
    );
    for (const role of [
      "communication-email",
      "communication-scheduler",
      "data-import",
    ])
      assert.ok(
        operations.checks.some(
          (check) => check.id === `worker.${role}` && check.status === "ok",
        ),
      );
    assert.ok(operations.checks.some((check) => check.id.startsWith("cron.")));
    assert.ok(operations.checks.every((check) => check.status === "ok"));
    report.checks.candidateAggregateOperationsHealthReady = true;
  } else {
    const response = await fetch(operationsUrl, {
      headers: { authorization: `Bearer ${env.OPS_MONITOR_TOKEN}` },
    });
    const body = await response.json();
    // This baseline's global API auth boundary catches unknown routes before
    // its 404 handler; it must not expose the new operations response schema.
    assert.equal(response.status, 401);
    assert.equal(body.schemaVersion, undefined);
    assert.equal(body.checks, undefined);
    report.checks.baselineOperationsSchemaAbsentAsExpected = true;
  }
  return processes;
}
async function startClient(version, repo) {
  const child = launch(
    `${version}-client`,
    repo,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4310",
    ],
    { NODE_ENV: "production" },
  );
  await poll(
    () => httpReady("http://127.0.0.1:4310/api/health"),
    `${version} Next production server`,
    [child],
  );
  let intended = new URL("http://studio-alpha.shario.localhost:4310/en");
  let rendered = false;
  for (let redirects = 0; redirects < 5; redirects++) {
    assert.ok(
      ["studio-alpha.shario.localhost", "127.0.0.1"].includes(
        intended.hostname,
      ) && intended.port === "4310",
      "Client redirected outside its local fixture host.",
    );
    const response = await fetch(
      `http://127.0.0.1:4310${intended.pathname}${intended.search}`,
      {
        headers: { host: "studio-alpha.shario.localhost:4310" },
        redirect: "manual",
      },
    );
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      intended = new URL(response.headers.get("location"), intended);
      continue;
    }
    assert.equal(
      response.status,
      200,
      `Client page failed: ${response.status}`,
    );
    const html = await response.text();
    assert.match(html, /<html[\s>]/i);
    assert.match(html, /<body[\s>]/i);
    assert.ok(!html.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
    rendered = true;
    break;
  }
  assert.ok(rendered, "Client redirect chain did not reach a rendered page.");
  report.checks[`${version}ClientProductionHttpReady`] = true;
  return child;
}
const scenario = (repo, phase) =>
  run(
    `scenario-${phase}`,
    repo,
    [
      "--import",
      "tsx",
      "--import",
      "./tests/rollback/stripe-transport.ts",
      "tests/rollback/scenario.ts",
      phase,
    ],
    phase === "seed" ? { E2E_TEST_MODE: "true" } : {},
  );
const providerMessages = async () => {
  const response = await fetch("http://127.0.0.1:4100/__e2e/messages", {
    headers: { "x-e2e-key": env.E2E_TEST_KEY },
  });
  assert.ok(response.ok);
  return (await response.json()).messages;
};

try {
  // Refuse to share the HTTP ports with an existing deployment/test process.
  for (const port of [4310, 4311, 4100]) {
    try {
      await fetch(`http://127.0.0.1:${port}`, {
        signal: AbortSignal.timeout(1000),
      });
      throw new Error(`Port ${port} is already occupied.`);
    } catch (error) {
      if (error.message.includes("already occupied")) throw error;
    }
  }
  redisOwnership = await assertDedicatedRedis({
    url: "redis://127.0.0.1:6379/15",
    ownership: args["--dedicated-redis"],
  });
  report.checks.isolatedEmptyRedisClaimed = true;
  const targetClient = await snapshot(
    frontend,
    "rollback-client",
    clientTarget,
    rollbackClientDependencies,
  );
  const candidateClient = await snapshot(frontend, "candidate-client");
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  env = rehearsalEnvironment({
    mongoUri: replica.getUri(`shario-rollback-test-${Date.now()}`),
    directory: output,
    guard: join(backend, "tests/rollback/loopback-only.cjs"),
  });
  env.REHEARSAL_REDIS_OWNER = redisOwnership.owner;
  env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = join(
    backend,
    "tests/rollback/font-responses.cjs",
  );
  report.fonts =
    "Offline bundled-font fixture through Next font response hook; visual fidelity not tested.";
  await run(
    "build-rollback-client",
    targetClient,
    ["node_modules/next/dist/bin/next", "build", "--webpack"],
    { NODE_ENV: "production" },
  );
  await run(
    "build-candidate-client",
    candidateClient,
    ["node_modules/next/dist/bin/next", "build", "--webpack"],
    { NODE_ENV: "production" },
  );
  const targetServer = await snapshot(backend, "rollback-server", serverTarget);
  const candidateServer = await snapshot(backend, "candidate-server");
  // Test support is identical on both sides; application source is untouched.
  for (const repo of [targetServer, candidateServer])
    await cp(join(backend, "tests/rollback"), join(repo, "tests/rollback"), {
      recursive: true,
    });
  const provider = launch("postmark-local-sink", frontend, [
    "e2e/support/postmark-stub.mjs",
  ]);
  await poll(
    () => httpReady("http://127.0.0.1:4100/ready"),
    "loopback provider sink",
    [provider],
  );
  await scenario(candidateServer, "seed");
  const candidateProcesses = await startServer("candidate", candidateServer);
  const candidateWeb = await startClient("candidate", candidateClient);
  await scenario(candidateServer, "candidate");
  const before = await providerMessages();
  await writeFile(
    join(output, "provider-before.json"),
    JSON.stringify(before, null, 2),
  );
  // Roll back frontend first while the candidate API remains available.
  report.rollbackStartedAt = new Date().toISOString();
  await stop(candidateWeb);
  const rollbackWeb = await startClient("rollback", targetClient);
  report.clientRestoredAt = new Date().toISOString();
  report.checks.rollbackClientServedAgainstCandidateApi = true;
  // Keep Mongo/Redis/provider receipts running throughout the version switch.
  for (const child of candidateProcesses) await stop(child);
  await scenario(candidateServer, "queue-during-outage");
  const rollbackProcesses = await startServer("rollback", targetServer);
  report.apiAndWorkersRestoredAt = new Date().toISOString();
  await scenario(targetServer, "verify");
  report.dataVerifiedAt = new Date().toISOString();
  report.recoveryDurationMs =
    Date.parse(report.dataVerifiedAt) - Date.parse(report.rollbackStartedAt);
  const after = await providerMessages();
  await writeFile(
    join(output, "provider-after.json"),
    JSON.stringify(after, null, 2),
  );
  const sent = JSON.parse(
    await readFile(join(output, "candidate-delivery.json"), "utf8"),
  );
  const resumed = JSON.parse(
    await readFile(join(output, "rollback-delivery.json"), "utf8"),
  );
  assert.equal(
    after.filter((message) => message.metadata.emailLogId === sent.id).length,
    1,
    "Previously delivered email was sent twice.",
  );
  assert.equal(
    after.filter((message) => message.metadata.emailLogId === resumed.id)
      .length,
    1,
    "Queued email did not resume exactly once.",
  );
  assert.deepEqual(
    after.filter((message) =>
      before.some((original) => original.messageId === message.messageId),
    ),
    before,
    "Provider history changed.",
  );
  const actions = (await readFile(join(output, "stripe-actions.jsonl"), "utf8"))
    .trim()
    .split("\n");
  assert.equal(
    actions.length,
    1,
    "A duplicate payment-provider action occurred.",
  );
  assert.equal(
    (await readFile(join(output, "stripe-checkout-requests.jsonl"), "utf8"))
      .trim()
      .split("\n").length,
    1,
    "Duplicate Stripe SDK checkout request across rollback.",
  );
  try {
    assert.equal(
      (await readFile(env.REHEARSAL_BLOCKED_FILE, "utf8")).trim(),
      "",
      "Application attempted forbidden outbound network.",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  report.checks = {
    ...report.checks,
    ...JSON.parse(await readFile(join(output, "verification.json"), "utf8")),
    providerCheckoutActions: actions.length,
    providerEmailMessagesBefore: before.length,
    providerEmailMessagesAfter: after.length,
    noExternalNetworkAttempts: true,
    sameMongoAndRedisThroughout: true,
  };
  processes.assertHealthy();
  for (const child of [rollbackWeb, ...rollbackProcesses]) await stop(child);
  await stop(provider);
  processes.assertHealthy();
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await processes.cleanup();
  await replica?.stop();
  if (redisOwnership)
    report.redisRequiresRecreation = !(await redisOwnership
      .release()
      .catch(() => false));
  report.finishedAt = new Date().toISOString();
  await saveReport();
  console.log(
    JSON.stringify({
      status: report.status,
      report: join(output, "report.json"),
      error: report.error,
    }),
  );
}
