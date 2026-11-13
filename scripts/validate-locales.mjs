import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { ALL_LOCALE_CODES } from "../src/i18n/locales.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/messages",
);
const sourceLocale = "en";
const targetLocales = ALL_LOCALE_CODES.filter(
  (locale) => locale !== sourceLocale,
);

const readCatalog = (locale) =>
  JSON.parse(fs.readFileSync(path.join(root, `${locale}.json`), "utf8"));

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const collectLeaves = (value, prefix = "") => {
  if (!isRecord(value)) return new Map([[prefix, value]]);

  return Object.entries(value).reduce((leaves, [key, child]) => {
    const childPath = prefix ? `${prefix}.${key}` : key;

    for (const [leafPath, leafValue] of collectLeaves(child, childPath)) {
      leaves.set(leafPath, leafValue);
    }

    return leaves;
  }, new Map());
};

export const validateRequiredCatalogKeys = ({ locale, source, catalog }) => {
  const failures = [];
  // Full product coverage is required even while a locale remains noindex
  // pending editorial review. New namespaces cannot bypass this check.
  const namespaces = Object.keys(source);

  for (const namespace of namespaces) {
    const expected = collectLeaves(source[namespace], namespace);
    const actual = collectLeaves(catalog[namespace], namespace);

    if (!catalog[namespace]) {
      failures.push(`${locale}: missing required namespace ${namespace}`);
      continue;
    }

    const missing = [...expected.keys()].filter((key) => !actual.has(key));
    const extra = [...actual.keys()].filter((key) => !expected.has(key));

    if (missing.length) {
      failures.push(
        `${locale}: ${namespace} is missing ${missing.length} keys (${missing
          .slice(0, 5)
          .join(", ")})`,
      );
    }

    if (extra.length) {
      failures.push(
        `${locale}: ${namespace} has ${extra.length} unknown keys (${extra
          .slice(0, 5)
          .join(", ")})`,
      );
    }
  }

  return failures;
};

const SIMPLE_ARGUMENT_TYPES = new Set(["number", "date", "time"]);
const COMPLEX_ARGUMENT_TYPES = new Set(["plural", "select", "selectordinal"]);
const PLURAL_SELECTORS = new Set([
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
]);
const APOSTROPHE_QUOTABLE_CHARACTERS = new Set(["{", "}", "#"]);

const createIcuError = (message, position) =>
  new Error(`${message} at character ${position + 1}`);

const skipWhitespace = (state) => {
  while (/\s/u.test(state.message[state.index] || "")) {
    state.index += 1;
  }
};

const readIdentifier = (state) => {
  const start = state.index;

  while (/[A-Za-z0-9_.-]/u.test(state.message[state.index] || "")) {
    state.index += 1;
  }

  return state.message.slice(start, state.index);
};

/**
 * Implements the ICU apostrophe rules that matter for catalog validation:
 * - two apostrophes represent one literal apostrophe;
 * - an apostrophe only opens a quoted literal when it precedes ICU syntax;
 * - an unmatched opening apostrophe quotes through the end of the message.
 *
 * This keeps ordinary contractions such as `Today's` and Danish `URL'en`
 * literal while allowing `'{notAnArgument}'` in translated copy.
 */
const consumeApostrophe = (state) => {
  const nextCharacter = state.message[state.index + 1];

  if (nextCharacter === "'") {
    state.index += 2;
    return;
  }

  if (!APOSTROPHE_QUOTABLE_CHARACTERS.has(nextCharacter)) {
    state.index += 1;
    return;
  }

  state.index += 2;

  while (state.index < state.message.length) {
    if (state.message[state.index] !== "'") {
      state.index += 1;
      continue;
    }

    if (state.message[state.index + 1] === "'") {
      state.index += 2;
      continue;
    }

    state.index += 1;
    return;
  }
};

const registerArgument = (state, name, type) => {
  state.argumentSignatures.add(`${name}:${type}`);
};

const parseSequence = (state, stopAtClosingBrace = false) => {
  while (state.index < state.message.length) {
    const character = state.message[state.index];

    if (character === "'") {
      consumeApostrophe(state);
      continue;
    }

    if (character === "{") {
      parseArgument(state);
      continue;
    }

    if (character === "}") {
      if (stopAtClosingBrace) return;

      throw createIcuError("Unexpected closing brace", state.index);
    }

    state.index += 1;
  }

  if (stopAtClosingBrace) {
    throw createIcuError("Unclosed ICU branch", state.index);
  }
};

const parseSimpleArgumentStyle = (state, argumentType) => {
  skipWhitespace(state);

  if (state.message[state.index] === "}") {
    state.index += 1;
    return;
  }

  if (state.message[state.index] !== ",") {
    throw createIcuError(
      `Expected a closing brace or style after ${argumentType}`,
      state.index,
    );
  }

  state.index += 1;
  const styleStart = state.index;
  let hasStyleContent = false;

  while (state.index < state.message.length) {
    const character = state.message[state.index];

    if (character === "'") {
      consumeApostrophe(state);
      hasStyleContent = true;
      continue;
    }

    if (character === "{") {
      throw createIcuError(
        `Unexpected opening brace in ${argumentType} style`,
        state.index,
      );
    }

    if (character === "}") {
      if (
        !hasStyleContent &&
        !state.message.slice(styleStart, state.index).trim()
      ) {
        throw createIcuError(`Empty ${argumentType} style`, styleStart);
      }

      state.index += 1;
      return;
    }

    if (!/\s/u.test(character)) hasStyleContent = true;
    state.index += 1;
  }

  throw createIcuError(`Unclosed ${argumentType} argument`, state.index);
};

const readExactPluralSelector = (state) => {
  const remaining = state.message.slice(state.index);
  const match = remaining.match(/^=-?(?:\d+(?:\.\d+)?|\.\d+)/u);

  if (!match) return null;

  state.index += match[0].length;
  return match[0];
};

const readPluralOffset = (state) => {
  const start = state.index;

  if (!state.message.startsWith("offset:", start)) return null;

  state.index += "offset:".length;
  const remaining = state.message.slice(state.index);
  const match = remaining.match(/^(?:\d+(?:\.\d+)?|\.\d+)/u);

  if (!match) {
    throw createIcuError(
      "Plural offset must be a non-negative number",
      state.index,
    );
  }

  state.index += match[0].length;

  if (
    state.index < state.message.length &&
    !/[\s}]/u.test(state.message[state.index])
  ) {
    throw createIcuError("Invalid character after plural offset", state.index);
  }

  return match[0];
};

const parseComplexArgument = (state, argumentType) => {
  const selectors = new Set();
  let hasBranch = false;
  let hasOffset = false;

  while (state.index < state.message.length) {
    skipWhitespace(state);

    if (state.message[state.index] === "}") {
      if (!hasBranch) {
        throw createIcuError(
          `${argumentType} argument must contain at least one branch`,
          state.index,
        );
      }

      if (!selectors.has("other")) {
        throw createIcuError(
          `${argumentType} argument must contain an other branch`,
          state.index,
        );
      }

      state.index += 1;
      return;
    }

    if (
      argumentType !== "select" &&
      state.message.startsWith("offset:", state.index)
    ) {
      if (hasBranch || hasOffset) {
        throw createIcuError(
          "Plural offset must appear once before all branches",
          state.index,
        );
      }

      readPluralOffset(state);
      hasOffset = true;
      continue;
    }

    const selectorStart = state.index;
    const exactSelector =
      argumentType === "select" ? null : readExactPluralSelector(state);
    const selector = exactSelector || readIdentifier(state);

    if (!selector) {
      throw createIcuError(
        `Expected a ${argumentType} branch selector`,
        selectorStart,
      );
    }

    if (
      argumentType !== "select" &&
      !exactSelector &&
      !PLURAL_SELECTORS.has(selector)
    ) {
      throw createIcuError(
        `Unknown ${argumentType} selector “${selector}”`,
        selectorStart,
      );
    }

    if (selectors.has(selector)) {
      throw createIcuError(
        `Duplicate ${argumentType} selector “${selector}”`,
        selectorStart,
      );
    }

    selectors.add(selector);
    skipWhitespace(state);

    if (state.message[state.index] !== "{") {
      throw createIcuError(
        `Expected an opening brace for the ${selector} branch`,
        state.index,
      );
    }

    state.index += 1;
    parseSequence(state, true);

    if (state.message[state.index] !== "}") {
      throw createIcuError(`Unclosed ${selector} branch`, state.index);
    }

    state.index += 1;
    hasBranch = true;
  }

  throw createIcuError(`Unclosed ${argumentType} argument`, state.index);
};

function parseArgument(state) {
  const openingIndex = state.index;
  state.index += 1;
  skipWhitespace(state);

  const nameStart = state.index;
  const argumentName = readIdentifier(state);

  if (!argumentName) {
    throw createIcuError("ICU argument name is missing", nameStart);
  }

  skipWhitespace(state);

  if (state.message[state.index] === "}") {
    registerArgument(state, argumentName, "simple");
    state.index += 1;
    return;
  }

  if (state.message[state.index] !== ",") {
    throw createIcuError(
      `Expected a comma or closing brace after “${argumentName}”`,
      state.index,
    );
  }

  state.index += 1;
  skipWhitespace(state);

  const typeStart = state.index;
  const argumentType = readIdentifier(state);

  if (!argumentType) {
    throw createIcuError("ICU argument type is missing", typeStart);
  }

  if (
    !SIMPLE_ARGUMENT_TYPES.has(argumentType) &&
    !COMPLEX_ARGUMENT_TYPES.has(argumentType)
  ) {
    throw createIcuError(
      `Unknown ICU argument type “${argumentType}”`,
      typeStart,
    );
  }

  registerArgument(state, argumentName, argumentType);
  skipWhitespace(state);

  if (SIMPLE_ARGUMENT_TYPES.has(argumentType)) {
    parseSimpleArgumentStyle(state, argumentType);
    return;
  }

  if (state.message[state.index] !== ",") {
    throw createIcuError(
      `Expected a comma before ${argumentType} branches`,
      state.index,
    );
  }

  state.index += 1;
  parseComplexArgument(state, argumentType);

  if (state.index <= openingIndex) {
    throw createIcuError("ICU parser did not advance", openingIndex);
  }
}

export const analyzeIcuMessage = (message) => {
  if (typeof message !== "string") {
    return { argumentSignatures: [] };
  }

  const state = {
    message,
    index: 0,
    argumentSignatures: new Set(),
  };

  parseSequence(state);

  return {
    argumentSignatures: [...state.argumentSignatures].sort(),
  };
};

const runIcuParserSelfTest = () => {
  const validMessages = [
    ["Today's schedule and URL'en", []],
    ["'{literal}' and {name}", ["name:simple"]],
    ["Two apostrophes '' and {count, number}", ["count:number"]],
    [
      "{count, plural, offset:1 =0 {None} one {{name} has one} other {{name} has #}}",
      ["count:plural", "name:simple"],
    ],
    [
      "{gender, select, female {{name} is ready} other {{name} is ready}}",
      ["gender:select", "name:simple"],
    ],
  ];
  const invalidMessages = [
    "Broken }",
    "{count",
    "{count, bananas, one {# item} other {# items}}",
    "{count, plural, one {# item}}",
    "{kind, select, studio {Studio}}",
    "{count, plural, one # item other {# items}}",
    "{count, plural, maybe {# item} other {# items}}",
    "{count, plural, one {{nested, bananas}} other {Valid}}",
    "{count, plural, one {# item} other {# items}",
    "{count, number,}",
  ];

  for (const [message, expectedSignatures] of validMessages) {
    const analysis = analyzeIcuMessage(message);

    if (!sameList(analysis.argumentSignatures, expectedSignatures)) {
      throw new Error(
        `ICU parser self-test returned the wrong signatures for: ${message}`,
      );
    }
  }

  for (const message of invalidMessages) {
    let rejected = false;

    try {
      analyzeIcuMessage(message);
    } catch {
      rejected = true;
    }

    if (!rejected) {
      throw new Error(
        `ICU parser self-test accepted invalid syntax: ${message}`,
      );
    }
  }

  const simpleSignature = analyzeIcuMessage("{count}").argumentSignatures;
  const numberSignature =
    analyzeIcuMessage("{count, number}").argumentSignatures;

  if (sameList(simpleSignature, numberSignature)) {
    throw new Error("ICU parser self-test did not preserve argument types");
  }
};

const extractTags = (message) => {
  if (typeof message !== "string") return [];

  // Preserve opening/closing direction, order and multiplicity. Comparing
  // only unique tag names would accept a missing closing tag or a removed
  // repeated rich-text segment, both of which can fail at render time.
  return Array.from(
    message.matchAll(/<\/?[A-Za-z][A-Za-z0-9_-]*>/g),
    ([tag]) => tag,
  );
};

const sameList = (left, right) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

runIcuParserSelfTest();

if (
  sameList(extractTags("<accent>One</accent><accent>Two</accent>"), [
    "<accent>",
    "</accent>",
    "<accent>",
    "</accent>",
  ]) === false
) {
  throw new Error("Rich-text tag parser did not preserve tag structure");
}

const validateCatalogFiles = () => {
  const source = readCatalog(sourceLocale);
  const sourceLeaves = collectLeaves(source);
  const failures = [];
  const summaries = [];
  const sourceIcuAnalyses = new Map();

  for (const [key, value] of sourceLeaves) {
    try {
      sourceIcuAnalyses.set(key, analyzeIcuMessage(value));
    } catch (error) {
      failures.push(
        `${sourceLocale}: ${key} has invalid ICU syntax (${error.message})`,
      );
    }
  }

  for (const locale of targetLocales) {
    const catalogPath = path.join(root, `${locale}.json`);
    if (!fs.existsSync(catalogPath)) {
      failures.push(`${locale}: missing catalog file`);
      continue;
    }
    const catalog = readCatalog(locale);
    const leaves = collectLeaves(catalog);

    failures.push(...validateRequiredCatalogKeys({ locale, source, catalog }));

    for (const [key, value] of leaves) {
      if (!sourceLeaves.has(key)) {
        failures.push(`${locale}: unknown key ${key}`);
        continue;
      }

      const sourceValue = sourceLeaves.get(key);

      if (typeof value !== typeof sourceValue) {
        failures.push(`${locale}: ${key} changes the source value type`);
        continue;
      }

      if (typeof value === "string" && sourceValue.trim() && !value.trim()) {
        failures.push(`${locale}: ${key} has an empty translation`);
        continue;
      }

      const sourceAnalysis = sourceIcuAnalyses.get(key);
      let targetAnalysis;

      try {
        targetAnalysis = analyzeIcuMessage(value);
      } catch (error) {
        failures.push(
          `${locale}: ${key} has invalid ICU syntax (${error.message})`,
        );
        continue;
      }

      if (!sourceAnalysis) continue;

      const sourceTags = extractTags(sourceValue);
      const targetTags = extractTags(value);

      if (
        !sameList(
          sourceAnalysis.argumentSignatures,
          targetAnalysis.argumentSignatures,
        )
      ) {
        failures.push(
          `${locale}: ${key} changes ICU argument names or types (${sourceAnalysis.argumentSignatures.join(", ")} -> ${targetAnalysis.argumentSignatures.join(", ")})`,
        );
      }

      if (!sameList(sourceTags, targetTags)) {
        failures.push(
          `${locale}: ${key} changes rich-text tags (${sourceTags.join(", ")} -> ${targetTags.join(", ")})`,
        );
      }
    }

    summaries.push({
      locale,
      translatedLeaves: leaves.size,
      sourceLeaves: sourceLeaves.size,
      coverage: `${((leaves.size / sourceLeaves.size) * 100).toFixed(1)}%`,
    });
  }

  console.table(summaries);

  if (failures.length) {
    console.error(`\n${failures.length} catalog validation failure(s):`);
    failures.slice(0, 100).forEach((failure) => console.error(`- ${failure}`));

    if (failures.length > 100) {
      console.error(`- …and ${failures.length - 100} more`);
    }

    process.exitCode = 1;
  } else {
    console.log(
      "\nTarget catalogs passed namespace, key, placeholder and tag checks.",
    );
  }
};

if (
  process.argv[1] &&
  fs.existsSync(process.argv[1]) &&
  fs.realpathSync(process.argv[1]) ===
    fs.realpathSync(fileURLToPath(import.meta.url))
) {
  validateCatalogFiles();
}
