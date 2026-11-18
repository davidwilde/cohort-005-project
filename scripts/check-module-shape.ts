// Fails when a folder under app/modules/ is a module in name only.
// dependency-cruiser checks how modules are imported; this checks that each
// one has the shape app/modules/README.md describes: entry points at the root,
// implementation in lib/, and at least one test in tests/.
// Usage: tsx scripts/check-module-shape.ts (reads the git index).

import { execFileSync } from "node:child_process";

const MODULES_ROOT = "app/modules/";
const FOLDERS = new Set(["lib", "tests"]);

/** Problems with one module, given its files relative to the module folder. */
export function moduleShapeProblems(name: string, files: string[]): string[] {
  const root = files.filter((file) => !file.includes("/"));
  const folders = new Set(
    files.filter((file) => file.includes("/")).map((file) => file.split("/")[0])
  );
  const problems: string[] = [];

  for (const folder of folders) {
    if (!FOLDERS.has(folder))
      problems.push(
        `${name}/${folder}/: a module has only lib/ and tests/ as folders`
      );
  }
  if (!root.some((file) => /\.tsx?$/.test(file)))
    problems.push(`${name}: no entry point (a .ts file at the module root)`);
  if (!files.some((file) => file.startsWith("lib/")))
    problems.push(`${name}: no lib/ folder for the implementation`);
  if (!files.some((file) => /^tests\/.+\.test\.tsx?$/.test(file)))
    problems.push(`${name}: no test in tests/`);
  return problems;
}

/** Groups repo paths under app/modules/ by module name. */
export function groupByModule(paths: string[]): Map<string, string[]> {
  const modules = new Map<string, string[]>();
  for (const path of paths) {
    if (!path.startsWith(MODULES_ROOT)) continue;
    const [name, ...rest] = path.slice(MODULES_ROOT.length).split("/");
    if (rest.length === 0) continue; // a file such as README.md
    modules.set(name, [...(modules.get(name) ?? []), rest.join("/")]);
  }
  return modules;
}

function main() {
  const paths = execFileSync("git", ["ls-files", "--", MODULES_ROOT], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const problems = [...groupByModule(paths)].flatMap(([name, files]) =>
    moduleShapeProblems(name, files)
  );
  if (problems.length === 0) return;

  console.error(
    "These folders under app/modules/ are not shaped as modules:\n"
  );
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`
Each module has entry points at its root, its implementation in lib/, and its
tests in tests/. Copy app/modules/example/ to start one. See
app/modules/README.md.`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
