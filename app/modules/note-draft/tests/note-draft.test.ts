import { describe, it, expect } from "vitest";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { noteDraft } from "../index";

describe("noteDraft", () => {
  it("cannot save an empty box", () => {
    const draft = noteDraft("", null);
    expect(draft.empty).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("has no unsaved changes in an empty box before the first note", () => {
    expect(noteDraft("", null).unchanged).toBe(true);
  });

  it("treats a box of only whitespace as empty", () => {
    const draft = noteDraft("   \n\t ", null);
    expect(draft.empty).toBe(true);
    expect(draft.length).toBe(0);
    expect(draft.canSave).toBe(false);
  });

  it("can save a first note", () => {
    const draft = noteDraft("Idempotent means safe to retry", null);
    expect(draft).toEqual({
      length: 30,
      max: MAX_NOTE_LENGTH,
      tooLong: false,
      empty: false,
      unchanged: false,
      canSave: true,
    });
  });

  it("counts characters the way the server stores them, without surrounding space", () => {
    expect(noteDraft("  abc  ", null).length).toBe(3);
  });

  it("has nothing to save when the box matches the saved note", () => {
    const draft = noteDraft("GET is safe", "GET is safe");
    expect(draft.unchanged).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding space when comparing with the saved note", () => {
    expect(noteDraft("GET is safe\n", "GET is safe").unchanged).toBe(true);
  });

  it("can save an edit to the saved note", () => {
    const draft = noteDraft("GET is safe and idempotent", "GET is safe");
    expect(draft.unchanged).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("allows a note exactly at the limit", () => {
    const draft = noteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note one character over the limit", () => {
    const draft = noteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.tooLong).toBe(true);
    expect(draft.length).toBe(MAX_NOTE_LENGTH + 1);
    expect(draft.canSave).toBe(false);
  });
});
