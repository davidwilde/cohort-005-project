import { describe, expect, it } from "vitest";
import { addedExemptions, parseJsonc } from "./check-lint-allowlists";

const config = (files: string[], rules: Record<string, unknown>) => ({
  overrides: [{ files, rules }],
});

describe("addedExemptions", () => {
  it("reports a file newly exempt from a size rule", () => {
    expect(
      addedExemptions(
        config(["a.ts"], { "max-lines-per-function": "off" }),
        config(["a.ts", "b.ts"], { "max-lines-per-function": "off" })
      )
    ).toEqual([{ rule: "max-lines-per-function", file: "b.ts" }]);
  });

  it("allows removing an exemption", () => {
    expect(
      addedExemptions(
        config(["a.ts", "b.ts"], { "max-lines": "off" }),
        config(["a.ts"], { "max-lines": "off" })
      )
    ).toEqual([]);
  });

  it("reports a new override that turns a size rule off", () => {
    expect(
      addedExemptions(
        { overrides: [] },
        config(["c.ts"], { "max-depth": "off" })
      )
    ).toEqual([{ rule: "max-depth", file: "c.ts" }]);
  });

  it("ignores overrides for rules other than the size rules", () => {
    expect(
      addedExemptions(
        { overrides: [] },
        config(["app/routes/**"], { "import/no-default-export": "off" })
      )
    ).toEqual([]);
  });
});

describe("parseJsonc", () => {
  it("reads a config with comments", () => {
    expect(
      parseJsonc(`{
        // a comment
        "overrides": []
      }`)
    ).toEqual({ overrides: [] });
  });
});
