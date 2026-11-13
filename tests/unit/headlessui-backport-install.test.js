import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { applyHeadlessUITransitionBackport } from "../../scripts/apply-headlessui-transition-backport.mjs";
import { headlessUITransitionBackport as backport } from "../../scripts/patches/headlessui-react-2.2.10-transition.mjs";

const hash = (content) => createHash("sha256").update(content).digest("hex");
const fixtures = [];
const tempParent = path.resolve(os.tmpdir());

// npm ci has already patched the package in CI; local shared dependencies can
// still be pristine. Recover only the exact known original bytes for fixtures.
const originalBuilds = backport.files.map((file) => {
  let content = readFileSync(
    path.join(process.cwd(), "node_modules/@headlessui/react", file.path),
    "utf8",
  );
  if (hash(content) === file.patchedSha256) {
    for (const { from, to } of [...file.replacements].reverse()) {
      if (content.split(to).length !== 2)
        throw new Error("Invalid installed backport fixture");
      content = content.replace(to, () => from);
    }
  }
  if (hash(content) !== file.originalSha256)
    throw new Error(`Unknown installed fixture: ${file.path}`);
  return content;
});

function createFixture() {
  const root = mkdtempSync(path.join(tempParent, "skab-headlessui-backport-"));
  fixtures.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: backport.name, version: backport.version }),
  );
  backport.files.forEach((file, index) => {
    const target = path.join(root, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, originalBuilds[index]);
  });
  return root;
}

const readBuilds = (root) =>
  backport.files.map((file) =>
    readFileSync(path.join(root, file.path), "utf8"),
  );

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    if (
      path.dirname(path.resolve(root)) !== tempParent ||
      !path.basename(root).startsWith("skab-headlessui-backport-")
    ) {
      throw new Error(
        "Refusing cleanup outside the created fixture directories",
      );
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Headless UI backport installation", () => {
  it("patches all runtime formats and is idempotent without altering package metadata", () => {
    const root = createFixture();
    const metadata = readFileSync(path.join(root, "package.json"), "utf8");
    expect(applyHeadlessUITransitionBackport(root).patchedFiles).toEqual(
      backport.files.map((file) => file.path),
    );
    const patched = readBuilds(root);
    expect(patched.map(hash)).toEqual(
      backport.files.map((file) => file.patchedSha256),
    );
    expect(applyHeadlessUITransitionBackport(root).patchedFiles).toEqual([]);
    expect(readBuilds(root)).toEqual(patched);
    expect(readFileSync(path.join(root, "package.json"), "utf8")).toBe(
      metadata,
    );
  });

  it.each([
    { name: backport.name, version: "2.2.11" },
    { name: "another-package", version: backport.version },
  ])(
    "rejects unknown package metadata before writing ($name@$version)",
    (metadata) => {
      const root = createFixture();
      writeFileSync(path.join(root, "package.json"), JSON.stringify(metadata));
      expect(() => applyHeadlessUITransitionBackport(root)).toThrow(
        "requires @headlessui/react@2.2.10",
      );
      expect(readBuilds(root)).toEqual(originalBuilds);
    },
  );

  it.each(backport.files.map((file, index) => [file.path, index]))(
    "rejects unexpected bytes in %s without changing any build",
    (_name, index) => {
      const root = createFixture();
      writeFileSync(
        path.join(root, backport.files[index].path),
        `${originalBuilds[index]}\n// unexpected content\n`,
      );
      const before = readBuilds(root);
      expect(() => applyHeadlessUITransitionBackport(root)).toThrow(
        "Unrecognized Headless UI build",
      );
      expect(readBuilds(root)).toEqual(before);
    },
  );

  it("preflights the last build before writing the first and resumes known mixed states", () => {
    const root = createFixture();
    const last = path.join(root, backport.files[2].path);
    rmSync(last);
    expect(() => applyHeadlessUITransitionBackport(root)).toThrow();
    expect(readFileSync(path.join(root, backport.files[0].path), "utf8")).toBe(
      originalBuilds[0],
    );
    writeFileSync(last, originalBuilds[2]);
    applyHeadlessUITransitionBackport(root);
    writeFileSync(path.join(root, backport.files[0].path), originalBuilds[0]);
    expect(applyHeadlessUITransitionBackport(root).patchedFiles).toEqual([
      backport.files[0].path,
    ]);
    expect(readBuilds(root).map(hash)).toEqual(
      backport.files.map((file) => file.patchedSha256),
    );
  });

  it("verifies the backport on install and both production build commands", () => {
    const { scripts } = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    const backportCommand =
      "node scripts/apply-headlessui-transition-backport.mjs";
    expect(scripts.postinstall).toBe(backportCommand);
    for (const hook of ["prebuild", "prebuild:turbopack"]) {
      expect(scripts[hook].split(" && ")).toEqual([
        "node scripts/validate-vercel-env.mjs",
        "node scripts/validate-locales.mjs",
        backportCommand,
      ]);
    }
    expect(scripts.build).toBe("next build --webpack");
    expect(scripts["build:turbopack"]).toBe("next build");
  });
});

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`Missing bundled function: ${name}`);
  const opening = source.indexOf("{", start);
  let depth = 1;
  let end = opening + 1;
  while (depth > 0 && end < source.length) {
    if (source[end] === "{") depth += 1;
    if (source[end] === "}") depth -= 1;
    end += 1;
  }
  if (depth !== 0) throw new Error(`Unclosed bundled function: ${name}`);
  return source.slice(start, end);
}

class TestCSSTransition {
  playState = "running";
  constructor() {
    this.finished = new Promise((resolve, reject) => {
      this.finish = () => {
        this.playState = "finished";
        resolve(this);
      };
      this.cancel = () => {
        this.playState = "idle";
        reject(new DOMException("Cancelled", "AbortError"));
      };
    });
  }
}

function disposables() {
  const callbacks = [];
  return {
    add: (callback) => callbacks.push(callback),
    dispose: () => callbacks.splice(0).forEach((callback) => callback()),
  };
}

const settlePromises = async () => {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
};

describe.each([
  ["ESM", 0, "M", "m"],
  ["development CommonJS", 1, "waitForTransition", "disposables"],
  ["production CommonJS", 2, "dd", "de"],
])(
  "%s bundled transition waiter",
  (_format, index, waiterName, disposablesName) => {
    function loadWaiter() {
      const root = createFixture();
      applyHeadlessUITransitionBackport(root);
      const source = readBuilds(root)[index];
      return vm.runInNewContext(
        `${functionSource(source, "getPendingTransitionsForBackport")}\n${functionSource(source, waiterName)}\n${waiterName}`,
        {
          CSSTransition: TestCSSTransition,
          Promise,
          [disposablesName]: disposables,
        },
      );
    }

    it("waits for a late replacement, ignores unrelated/finished animations, and completes once", async () => {
      const waitForTransition = loadWaiter();
      const enter = new TestCSSTransition();
      const leave = new TestCSSTransition();
      const unrelated = {
        playState: "running",
        finished: new Promise(() => {}),
      };
      let animations = [enter, unrelated];
      const element = { getAnimations: vi.fn(() => animations) };
      const done = vi.fn();
      waitForTransition(element, done);
      animations = [leave, unrelated];
      enter.cancel();
      await settlePromises();
      expect(done).not.toHaveBeenCalled();
      expect(element.getAnimations).toHaveBeenCalledTimes(2);
      // Finished entries deliberately remain listed, as permitted by the API.
      leave.finish();
      await settlePromises();
      expect(done).toHaveBeenCalledTimes(1);
    });

    it.each(["before replacement", "during replacement"])(
      "disposal %s stops re-query and completion",
      async (stage) => {
        const waitForTransition = loadWaiter();
        const enter = new TestCSSTransition();
        const leave = new TestCSSTransition();
        let animations = [enter];
        const element = { getAnimations: vi.fn(() => animations) };
        const done = vi.fn();
        const dispose = waitForTransition(element, done);
        if (stage === "before replacement") dispose();
        animations = [leave];
        enter.cancel();
        await settlePromises();
        if (stage === "during replacement") dispose();
        const queriesAtDispose = element.getAnimations.mock.calls.length;
        leave.finish();
        await settlePromises();
        expect(element.getAnimations).toHaveBeenCalledTimes(queriesAtDispose);
        expect(done).not.toHaveBeenCalled();
      },
    );

    it("completes without CSS transitions or the optional animation API", () => {
      const waitForTransition = loadWaiter();
      for (const element of [{ getAnimations: () => [] }, {}]) {
        const done = vi.fn();
        waitForTransition(element, done);
        expect(done).toHaveBeenCalledTimes(1);
      }
    });
  },
);
