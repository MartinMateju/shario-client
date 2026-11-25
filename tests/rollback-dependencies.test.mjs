import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { snapshotDependencyDirectory } from "../scripts/rollback-dependencies.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "rollback-dependencies-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = Object.fromEntries(
    ["source", "snapshot", "dependencyRoot"].map((name) => [
      name,
      join(root, name),
    ]),
  );
  for (const [name, path] of Object.entries(paths)) {
    await mkdir(path);
    await writeFile(
      join(path, "package.json"),
      '{"name":"fixture","version":"1.0.0"}\n',
    );
    await writeFile(
      join(path, "package-lock.json"),
      '{"lockfileVersion":3,"packages":{}}\n',
    );
    if (name !== "snapshot") await mkdir(join(path, "node_modules"));
  }
  return paths;
}

test("unchanged snapshots reuse source dependencies only with an identical lock", async (t) => {
  const { source, snapshot } = await fixture(t);
  assert.equal(
    await snapshotDependencyDirectory({ source, snapshot }),
    join(source, "node_modules"),
  );
  await writeFile(join(source, "package-lock.json"), "different lock");
  await assert.rejects(
    snapshotDependencyDirectory({ source, snapshot }),
    /package-lock.json differs/,
  );
});

test("a pinned client uses separately installed target dependencies despite candidate changes", async (t) => {
  const paths = await fixture(t);
  await writeFile(
    join(paths.source, "package.json"),
    '{"name":"new-candidate"}',
  );
  await writeFile(
    join(paths.source, "package-lock.json"),
    "candidate dependencies",
  );
  const modules = await snapshotDependencyDirectory(paths);
  assert.equal(modules, join(paths.dependencyRoot, "node_modules"));
  assert.equal(
    await readFile(join(paths.source, "package-lock.json"), "utf8"),
    "candidate dependencies",
  );
});

for (const file of ["package.json", "package-lock.json"]) {
  test(`a supplied dependency checkout must match the archived target's ${file}`, async (t) => {
    const paths = await fixture(t);
    await writeFile(join(paths.dependencyRoot, file), "not the pinned target");
    await assert.rejects(
      snapshotDependencyDirectory(paths),
      /Snapshot dependency .* differs/,
    );
  });
}

test("large mismatched locks produce a bounded failure without Buffer diffs", async (t) => {
  const { source, snapshot } = await fixture(t);
  await writeFile(join(source, "package-lock.json"), "a".repeat(900_000));
  await writeFile(join(snapshot, "package-lock.json"), "b".repeat(900_000));
  await assert.rejects(
    snapshotDependencyDirectory({ source, snapshot }),
    (error) => {
      assert.ok(error.message.length < 1000);
      assert.equal(error.actual, false);
      assert.equal(error.expected, true);
      assert.doesNotMatch(error.message, /Buffer|Uint8Array/);
      return true;
    },
  );
});

test("a supplied target cannot alias candidate node_modules through a symlink", async (t) => {
  const paths = await fixture(t);
  await rm(join(paths.dependencyRoot, "node_modules"), { recursive: true });
  await symlink(
    join(paths.source, "node_modules"),
    join(paths.dependencyRoot, "node_modules"),
    "dir",
  );
  await assert.rejects(snapshotDependencyDirectory(paths), /not a symlink/);
});

test("a supplied target cannot be the candidate checkout", async (t) => {
  const paths = await fixture(t);
  await assert.rejects(
    snapshotDependencyDirectory({ ...paths, dependencyRoot: paths.source }),
    /must be separate/,
  );
});

test("a supplied target must already have a real node_modules directory", async (t) => {
  const paths = await fixture(t);
  const modules = join(paths.dependencyRoot, "node_modules");
  await rm(modules, { recursive: true });
  await assert.rejects(snapshotDependencyDirectory(paths), /ENOENT/);
  await writeFile(modules, "not installed");
  await assert.rejects(
    snapshotDependencyDirectory(paths),
    /installed directory/,
  );
});

test("an empty optional path cannot silently select candidate dependencies", async (t) => {
  const paths = await fixture(t);
  await assert.rejects(
    snapshotDependencyDirectory({ ...paths, dependencyRoot: "" }),
    /must not be empty/,
  );
});
