import { describe, expect, it } from "vitest";
import { groupByModule, moduleShapeProblems } from "./check-module-shape";

describe("moduleShapeProblems", () => {
  it("accepts entry points, lib/ and a test", () => {
    expect(
      moduleShapeProblems("notes", [
        "index.server.ts",
        "lib/notes.ts",
        "tests/notes.test.ts",
      ])
    ).toEqual([]);
  });

  it("reports a folder of public root files with no lib/ or tests/", () => {
    expect(
      moduleShapeProblems("lesson-page", ["queries.server.ts", "schemas.ts"])
    ).toEqual([
      "lesson-page: no lib/ folder for the implementation",
      "lesson-page: no test in tests/",
    ]);
  });

  it("reports a tests/ folder with fixtures but no test", () => {
    expect(
      moduleShapeProblems("notes", [
        "index.ts",
        "lib/notes.ts",
        "tests/fixtures.ts",
      ])
    ).toEqual(["notes: no test in tests/"]);
  });

  it("reports a folder other than lib/ and tests/", () => {
    expect(
      moduleShapeProblems("notes", [
        "index.ts",
        "lib/notes.ts",
        "utils/format.ts",
        "tests/notes.test.ts",
      ])
    ).toEqual(["notes/utils/: a module has only lib/ and tests/ as folders"]);
  });

  it("reports a module with no entry point", () => {
    expect(
      moduleShapeProblems("notes", ["lib/notes.ts", "tests/notes.test.ts"])
    ).toEqual(["notes: no entry point (a .ts file at the module root)"]);
  });
});

describe("groupByModule", () => {
  it("groups paths by module and skips files at the modules root", () => {
    expect(
      groupByModule([
        "app/modules/README.md",
        "app/modules/notes/index.ts",
        "app/modules/notes/lib/notes.ts",
        "app/routes/home.tsx",
      ])
    ).toEqual(new Map([["notes", ["index.ts", "lib/notes.ts"]]]));
  });
});
