// Fails when a commit adds a file to an exemption from one of oxlint's size
// rules in .oxlintrc.json. The exemptions are for files that were already
// over a limit when the limit arrived. A new or growing file gets split
// instead. A ratchet: removing an entry is always fine.
// Usage: tsx scripts/check-lint-allowlists.ts (compares the index to HEAD).

import { execFileSync } from "node:child_process";
import ts from "typescript";

const CONFIG = ".oxlintrc.json";
export const SIZE_RULES = [
  "max-lines",
  "max-lines-per-function",
  "max-params",
  "max-depth",
];

type Override = { files?: string[]; rules?: Record<string, unknown> };
type OxlintConfig = { overrides?: Override[] };

/** For each size rule, the files an override turns it off for. */
export function sizeExemptions(config: OxlintConfig): Map<string, Set<string>> {
  const exempt = new Map(SIZE_RULES.map((rule) => [rule, new Set<string>()]));
  for (const { files = [], rules = {} } of config.overrides ?? []) {
    for (const rule of SIZE_RULES) {
      if (rules[rule] !== "off") continue;
      for (const file of files) exempt.get(rule)?.add(file);
    }
  }
  return exempt;
}

/** Exemptions in `after` that `before` did not have. */
export function addedExemptions(
  before: OxlintConfig,
  after: OxlintConfig
): { rule: string; file: string }[] {
  const old = sizeExemptions(before);
  return [...sizeExemptions(after)].flatMap(([rule, files]) =>
    [...files]
      .filter((file) => !old.get(rule)?.has(file))
      .map((file) => ({ rule, file }))
  );
}

export function parseJsonc(text: string): OxlintConfig {
  const { config, error } = ts.parseConfigFileTextToJson(CONFIG, text);
  if (error) throw new Error(`${CONFIG} does not parse`);
  return config as OxlintConfig;
}

function gitShow(ref: string): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${CONFIG}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function main() {
  const before = gitShow("HEAD");
  const after = gitShow(""); // the index: what this commit will contain
  if (before === null || after === null) return;

  const added = addedExemptions(parseJsonc(before), parseJsonc(after));
  if (added.length === 0) return;

  console.error(
    `This commit adds files to a size-rule exemption in ${CONFIG}:\n`
  );
  for (const { rule, file } of added) console.error(`  ${rule}: ${file}`);
  console.error(`
The exemptions are only for files that were over a limit before the limit
existed. Split the file or the function instead, and leave ${CONFIG} as it was.`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
