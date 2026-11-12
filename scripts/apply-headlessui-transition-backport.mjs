import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { headlessUITransitionBackport as backport } from "./patches/headlessui-react-2.2.10-transition.mjs";

const sha256 = (content) => createHash("sha256").update(content).digest("hex");

export function applyHeadlessUITransitionBackport(packageDirectory) {
  const root = path.resolve(packageDirectory);
  const metadata = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  if (
    metadata.name !== backport.name ||
    metadata.version !== backport.version
  ) {
    throw new Error(
      `Headless UI transition backport requires ${backport.name}@${backport.version}; found ${metadata.name}@${metadata.version}. Review the upstream fix before updating this guard.`,
    );
  }

  // Preflight every build before writing any file. Known mixed original/patched
  // states are safe to resume; unknown bytes always abort the complete patch.
  const changes = backport.files
    .map((file) => {
      const target = path.join(root, file.path);
      const original = readFileSync(target);
      const digest = sha256(original);
      if (digest === file.patchedSha256) return null;
      if (digest !== file.originalSha256) {
        throw new Error(
          `Unrecognized Headless UI build: ${file.path} (sha256 ${digest}). No files were changed.`,
        );
      }

      let patched = original.toString("utf8");
      for (const { from, to } of file.replacements) {
        if (patched.split(from).length !== 2) {
          throw new Error(
            `Expected exactly one backport match in ${file.path}. No files were changed.`,
          );
        }
        patched = patched.replace(from, () => to);
      }
      if (sha256(patched) !== file.patchedSha256) {
        throw new Error(
          `Unexpected backport result for ${file.path}. No files were changed.`,
        );
      }
      return { target, content: patched, relativePath: file.path };
    })
    .filter(Boolean);

  for (const change of changes)
    writeFileSync(change.target, change.content, "utf8");
  return {
    version: backport.version,
    patchedFiles: changes.map((change) => change.relativePath),
  };
}

function main(args) {
  const repositoryDirectory = fileURLToPath(new URL("../", import.meta.url));
  if (args.length !== 0 && (args.length !== 2 || args[0] !== "--package-dir")) {
    throw new Error(
      "Usage: node scripts/apply-headlessui-transition-backport.mjs [--package-dir <isolated-package-directory>]",
    );
  }
  const explicitDirectory = args.length === 2;
  const packageDirectory = explicitDirectory
    ? path.resolve(args[1])
    : path.join(repositoryDirectory, "node_modules", "@headlessui", "react");
  const result = applyHeadlessUITransitionBackport(packageDirectory);
  console.log(
    `Headless UI ${result.version} transition backport verified (${result.patchedFiles.length} files patched).`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
