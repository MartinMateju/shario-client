import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
import { ALL_LOCALE_CODES } from "@/i18n/locales";

const entries = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? entries(child, name)
      : [[name, child]];
  });

function sampleArguments(nodes, count, values = {}) {
  for (const node of nodes) {
    if (node.type === TYPE.argument) values[node.value] ??= "Example";
    if (node.type === TYPE.number || node.type === TYPE.plural) {
      values[node.value] = count;
    }
    if (node.type === TYPE.date || node.type === TYPE.time) {
      values[node.value] = new Date("2026-06-10T12:30:00Z");
    }
    if (node.type === TYPE.select) {
      values[node.value] = Object.keys(node.options)[0];
    }
    if (node.type === TYPE.tag) {
      values[node.value] = (chunks) => chunks.join("");
      sampleArguments(node.children, count, values);
    }
    if (node.options) {
      for (const option of Object.values(node.options)) {
        sampleArguments(option.value, count, values);
      }
    }
  }
  return values;
}

describe("product messages render with the real ICU formatter", () => {
  it.each(ALL_LOCALE_CODES)(
    "%s formats every message, including plural and rich-text arguments",
    (locale) => {
      const catalog = JSON.parse(
        fs.readFileSync(path.resolve(`src/messages/${locale}.json`), "utf8"),
      );
      const failures = [];
      for (const [key, message] of entries(catalog)) {
        if (typeof message !== "string") continue;
        try {
          const ast = parse(message);
          const formatter = new IntlMessageFormat(ast, locale);
          const counts = message.includes("plural,")
            ? [0, 1, 2, 5, 21, 1.5]
            : [2];
          for (const count of counts) {
            formatter.format(sampleArguments(ast, count));
          }
        } catch (error) {
          failures.push(`${key}: ${error.message}`);
        }
      }
      expect(failures).toEqual([]);
    },
    30_000,
  );
});
