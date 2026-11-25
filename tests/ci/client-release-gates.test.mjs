import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../.github/workflows/client-ci.yml", import.meta.url),
  "utf8",
);
const regression = readFileSync(
  new URL(
    "../../.github/workflows/client-full-regression.yml",
    import.meta.url,
  ),
  "utf8",
);
const smoke = readFileSync(
  new URL("../../.github/workflows/e2e-smoke.yml", import.meta.url),
  "utf8",
);

// Read the real shell blocks without requiring npm dependencies: these tests
// deliberately run before npm ci in the provenance preflight job.
function job(document, id) {
  const lines = document.split("\n");
  const start = lines.indexOf(`  ${id}:`);
  assert.notEqual(start, -1, `Missing workflow job ${id}`);
  const next = lines.findIndex(
    (line, index) => index > start && /^  [\w-]+:$/.test(line),
  );
  return lines.slice(start, next === -1 ? undefined : next).join("\n");
}

function gateScript(id) {
  const body = job(workflow, id);
  const lines = body.split("\n");
  const start = lines.indexOf("        run: |");
  assert.notEqual(start, -1, `Missing shell gate in ${id}`);
  const script = [];
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith("          ")) break;
    script.push(line.slice(10));
  }
  return script.join("\n");
}

function passes(id, values) {
  const temporary = mkdtempSync(path.join(tmpdir(), "shario-ci-gate-"));
  try {
    const result = spawnSync(
      "bash",
      ["--noprofile", "--norc", "-eo", "pipefail", "-c", gateScript(id)],
      {
        env: {
          PATH: process.env.PATH,
          GITHUB_STEP_SUMMARY: path.join(temporary, "summary.md"),
          SOURCE_URL: "https://github.com/example/client/actions/runs/123",
          ...values,
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.error, undefined);
    return result.status === 0;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

const badResults = ["failure", "cancelled", "skipped", "", "neutral"];

test("full coverage gate accepts fresh success and verified reuse only", () => {
  assert.equal(
    passes("coverage", {
      VALIDATION: "success",
      REUSED: "false",
      UNIT: "success",
    }),
    true,
  );
  assert.equal(
    passes("coverage", {
      VALIDATION: "success",
      REUSED: "true",
      UNIT: "skipped",
    }),
    true,
  );
  for (const result of badResults) {
    for (const reused of ["true", "false", ""]) {
      assert.equal(
        passes("coverage", {
          VALIDATION: result,
          REUSED: reused,
          UNIT: "success",
        }),
        false,
        `validation=${result}, reuse=${reused}`,
      );
    }
    for (const reused of ["false", "", "TRUE"]) {
      assert.equal(
        passes("coverage", {
          VALIDATION: "success",
          REUSED: reused,
          UNIT: result,
        }),
        false,
        `unit=${result}, reuse=${reused}`,
      );
    }
  }
});

test("quality gate requires coverage, lint/contracts and a successful build", () => {
  const fresh = {
    VALIDATION: "success",
    REUSED: "false",
    CHECKS: "success",
    COVERAGE: "success",
    SMOKE: "success",
    FORK_BUILD: "skipped",
  };
  assert.equal(passes("quality", fresh), true);
  assert.equal(
    passes("quality", { ...fresh, SMOKE: "skipped", FORK_BUILD: "success" }),
    true,
  );
  assert.equal(
    passes("quality", {
      ...fresh,
      REUSED: "true",
      CHECKS: "skipped",
      SMOKE: "skipped",
    }),
    true,
  );
  for (const field of ["VALIDATION", "CHECKS", "COVERAGE", "SMOKE"]) {
    for (const result of badResults) {
      assert.equal(
        passes("quality", { ...fresh, [field]: result }),
        false,
        `${field}=${result}`,
      );
    }
  }
  for (const field of ["VALIDATION", "COVERAGE"]) {
    for (const result of badResults) {
      assert.equal(
        passes("quality", { ...fresh, REUSED: "true", [field]: result }),
        false,
        `reuse must not bypass ${field}=${result}`,
      );
    }
  }
});

test("release gate rejects missing, cancelled or failed required results", () => {
  const fresh = {
    VALIDATION: "success",
    QUALITY: "success",
    SMOKE: "success",
    REUSED: "false",
  };
  assert.equal(passes("release-ready", fresh), true);
  assert.equal(
    passes("release-ready", { ...fresh, REUSED: "true", SMOKE: "skipped" }),
    true,
  );
  for (const field of ["VALIDATION", "QUALITY", "SMOKE"]) {
    for (const result of badResults) {
      assert.equal(
        passes("release-ready", { ...fresh, [field]: result }),
        false,
        `${field}=${result}`,
      );
    }
  }
  for (const field of ["VALIDATION", "QUALITY"]) {
    for (const result of badResults) {
      assert.equal(
        passes("release-ready", { ...fresh, REUSED: "true", [field]: result }),
        false,
      );
    }
  }
});

test("fresh-work conditions skip only explicit reuse and pin smoke to the resolved backend", () => {
  for (const id of ["checks", "unit", "release-smoke"]) {
    const body = job(workflow, id);
    assert.match(body, /needs: validation/);
    assert.match(
      body,
      /if: \$\{\{ needs\.validation\.outputs\.reused != 'true'/,
    );
  }
  assert.match(
    job(workflow, "release-smoke"),
    /server_ref: \$\{\{ needs\.validation\.outputs\.server_sha \}\}/,
  );
  const release = job(workflow, "release-ready");
  assert.match(release, /needs: \[validation, quality, release-smoke\]/);
  assert.match(
    release,
    /CI_VALIDATION_DEPENDENCY_TREE: \$\{\{ needs\.validation\.outputs\.server_tree \}\}/,
  );
  assert.match(
    release,
    /CI_VALIDATION_DEPENDENCY_SHA: \$\{\{ needs\.validation\.outputs\.server_sha \}\}/,
  );
  for (const step of [
    "Record successful validation provenance",
    "Upload validation provenance",
  ]) {
    const condition = release
      .slice(release.indexOf(`- name: ${step}`))
      .split("\n")[1];
    assert.ok(condition.includes("needs.validation.outputs.reused != 'true'"));
    assert.ok(condition.includes("github.event_name == 'pull_request'"));
    assert.ok(
      condition.includes("github.event.pull_request.base.ref == 'main'"),
    );
    assert.ok(
      condition.includes(
        "github.event.pull_request.head.repo.full_name == github.repository",
      ),
    );
  }
});

test("fork PRs cannot obtain private-server credentials or certify release readiness", () => {
  const sameRepository =
    "github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository";
  assert.ok(job(workflow, "release-ready").includes(sameRepository));
  assert.ok(job(workflow, "release-smoke").includes(sameRepository));
  const validation = job(workflow, "validation");
  const privateCheckout = validation.slice(
    validation.indexOf("- name: Resolve the paired server once"),
  );
  assert.ok(
    privateCheckout.split("- name: Pin the server")[0].includes(sameRepository),
  );
  const fork = job(workflow, "fork-build");
  assert.match(
    fork,
    /github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.repo\.full_name != github\.repository/,
  );
  assert.doesNotMatch(fork, /secrets\./);
});

test("one smoke build owns PR compilation while full coverage owns all unit tests", () => {
  assert.doesNotMatch(job(workflow, "checks"), /npm run build/);
  assert.match(job(workflow, "unit"), /npm run test:coverage/);
  assert.doesNotMatch(workflow, /npm run test:critical/);
  assert.match(smoke, /NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES: "true"/);
  assert.match(smoke, /NEXT_PUBLIC_DEFAULT_TIME_ZONE: Europe\/Prague/);
  const smokeConfig = readFileSync(
    new URL("../../playwright.smoke.config.js", import.meta.url),
    "utf8",
  );
  assert.match(smokeConfig, /npm run build && npm run start/);
});

test("browser matrix consumes one revision-checked build and cannot pass after build failure", () => {
  const shared = job(regression, "browser-build");
  const browser = job(regression, "browser");
  assert.match(shared, /run: npm run build/);
  assert.match(shared, /git rev-parse HEAD > browser-build\/commit\.txt/);
  assert.match(shared, /tar --exclude='\.next\/cache' -czf/);
  assert.match(browser, /needs: browser-build/);
  assert.doesNotMatch(browser.split("    steps:")[0], /always\(\)/);
  assert.doesNotMatch(browser, /npm run build/);
  assert.match(
    browser,
    /name: \$\{\{ needs\.browser-build\.outputs\.artifact_name \}\}/,
  );
  assert.ok(
    browser.includes(
      'test "$(cat browser-build/commit.txt)" = "$(git rev-parse HEAD)"',
    ),
  );
  assert.equal((browser.match(/- suite:/g) || []).length, 12);
  assert.doesNotMatch(regression.split("permissions:")[0], /^  push:/m);
  assert.doesNotMatch(regression, /name: Complete unit and coverage suite/);
});
