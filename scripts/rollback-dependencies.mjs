import assert from "node:assert/strict";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Resolve preinstalled dependencies without installing or changing either source. */
export async function snapshotDependencyDirectory({
  snapshot,
  source,
  dependencyRoot,
}) {
  const isolated = dependencyRoot !== undefined;
  if (isolated) {
    assert.ok(
      typeof dependencyRoot === "string" && dependencyRoot.trim(),
      "The rollback dependency checkout path must not be empty.",
    );
  }
  const root = resolve(isolated ? dependencyRoot : source);
  assert.ok(
    (await stat(root)).isDirectory(),
    `Dependency checkout is not a directory: ${root}`,
  );
  // Compare bytes without assert.deepEqual's potentially enormous Buffer diff.
  // A mismatch must produce a small, actionable failure even for large locks.
  for (const file of isolated
    ? ["package.json", "package-lock.json"]
    : ["package-lock.json"]) {
    const [expected, installed] = await Promise.all([
      readFile(join(snapshot, file)),
      readFile(join(root, file)),
    ]);
    assert.ok(
      expected.equals(installed),
      `Snapshot dependency ${file} differs from ${root}. Install isolated pinned-target dependencies before using this harness.`,
    );
  }
  const modules = join(root, "node_modules");
  if (isolated) {
    assert.ok(
      (await lstat(modules)).isDirectory(),
      `Pinned rollback node_modules must be an installed directory, not a symlink: ${modules}`,
    );
    assert.notEqual(
      await realpath(modules),
      await realpath(join(source, "node_modules")),
      "Pinned rollback dependencies must be separate from candidate dependencies.",
    );
  } else {
    assert.ok(
      (await stat(modules)).isDirectory(),
      `Installed node_modules directory is missing: ${modules}`,
    );
  }
  return modules;
}
