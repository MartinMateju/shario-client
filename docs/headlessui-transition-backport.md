# Headless UI transition backport

Headless UI 2.2.10 can retain a closed dialog or popover when a CSS transition
reverses before React commits the new transition flags. Its waiter observes the
old animation, then stops while the replacement animation is still running.
The retained dialog can keep its focus trap and intercept clicks.

Upstream evidence and proposed correction:

- [Issue #3892](https://github.com/tailwindlabs/headlessui/issues/3892)
- [PR #3906](https://github.com/tailwindlabs/headlessui/pull/3906), pinned to
  `803c492ec48f862c1dbfcdde366b09b0b8289b23`

This is a locally maintained backport of an open upstream proposal, not an
official released fix. It rechecks pending CSS transitions after the captured
animations settle, ignores finished animations still listed by the browser,
and preserves disposal cancellation. It adds no timeout, polling loop, DOM
watchdog, or new dependency. Attribution is in `THIRD_PARTY_NOTICES.md`.

## Installation and coverage

`npm ci` / `npm install` runs the dependency-free installer through `postinstall`.
`npm run build` and `npm run build:turbopack` verify it again through their
prebuild hooks, including when a build service restores cached dependencies.
Existing build commands remain unchanged. Calling `next build` directly or
disabling lifecycle scripts bypasses these hooks; run the installer explicitly
before using either approach.

The installer updates all three published runtime builds:

- `dist/hooks/use-transition.js` used by ESM imports
- `dist/headlessui.dev.cjs` used by development CommonJS consumers
- `dist/headlessui.prod.cjs` used by production CommonJS consumers

It requires the exact package name and version, verifies each complete file's
SHA-256 against known original or patched bytes, verifies every replacement and
its resulting hash, and preflights **all files before any write**. Unknown
versions, missing files, or unexpected content abort installation. Already
patched files are left untouched; a mixture of known original and patched files
can safely be completed on the next invocation. A filesystem write failure is
reported rather than hidden; rerunning is safe for these known states.

The normal command operates on this checkout's installed package, including
when `node_modules` is a link. For isolated validation or a shared dependency
installation that must remain untouched, copy only `@headlessui/react` into an
ignored directory and explicitly select the copy:

```sh
node scripts/apply-headlessui-transition-backport.mjs --package-dir .vitest/headlessui-patched
```

The directory must contain the copied package's `package.json` and `dist/`;
it is not the parent `node_modules` directory. The installer never downloads or
executes remote code. The fixture-based install contract tests verify all-build
preflight, idempotence, unknown-input rejection, and replacement/cancellation
behavior from each patched runtime. The real exported `Transition` regression
tests exercise delayed reversal, close, and reopen behavior in React.

## Removal

When a released Headless UI version contains the correction, review its source
and run the transition regressions against that unpatched release. Then update
the dependency and lockfile, remove the three lifecycle hooks, the installer,
replacement manifest, and installer-specific tests. Keep the behavioral React
regressions and applicable attribution. Do not merely relax the version/hash
guards to accept a new release or silently skip the patch.
