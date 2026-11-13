import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import { getNote, listNotes, MAX_NOTE_LENGTH, saveNote } from "./notes.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function minutesAfterNow(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2, 3].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: UserRole.Student,
    })
    .returning()
    .get();
}

describe("saving a Note", () => {
  it("creates a Note on a Lesson that has none, with the body trimmed", () => {
    const result = saveNote(db, base.user.id, lessonIds[0], "  Rewatch 3:10  ", NOW);

    expect(result.ok).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "Rewatch 3:10",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last-edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First thought", NOW);
    const later = minutesAfterNow(5);

    saveNote(db, base.user.id, lessonIds[0], "Second thought", later);

    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "Second thought",
      createdAt: NOW.toISOString(),
      updatedAt: later.toISOString(),
    });
  });

  it("never leaves a Student two Notes on the same Lesson", () => {
    saveNote(db, base.user.id, lessonIds[0], "One", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Two", minutesAfterNow(1));

    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("keeps characters like # and * exactly as typed", () => {
    saveNote(db, base.user.id, lessonIds[0], "# not a heading *not bold*", NOW);

    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe(
      "# not a heading *not bold*"
    );
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH);

    expect(saveNote(db, base.user.id, lessonIds[0], body, NOW).ok).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe(body);
  });

  it("refuses a Note over 2,000 characters and stores nothing", () => {
    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "a".repeat(MAX_NOTE_LENGTH + 1),
      NOW
    );

    expect(result).toEqual({
      ok: false,
      error: "A note must be 2,000 characters or fewer.",
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("refuses an over-long re-save and keeps the existing Note", () => {
    saveNote(db, base.user.id, lessonIds[0], "Keep me", NOW);

    saveNote(db, base.user.id, lessonIds[0], "a".repeat(MAX_NOTE_LENGTH + 1), NOW);

    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe("Keep me");
  });

  it("refuses a Note that is only whitespace", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "   ", NOW).ok).toBe(false);
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });
});

describe("listing Notes on the Saved page", () => {
  it("lists only the Student's own Notes, last edited first, with Lesson and Course", () => {
    const other = addStudent("Olive");
    saveNote(db, base.user.id, lessonIds[0], "Oldest", minutesAfterNow(0));
    saveNote(db, base.user.id, lessonIds[1], "Middle", minutesAfterNow(1));
    saveNote(db, base.user.id, lessonIds[2], "Newest", minutesAfterNow(2));
    saveNote(db, other.id, lessonIds[0], "Not yours", minutesAfterNow(3));

    expect(listNotes(db, base.user.id)).toMatchObject([
      {
        body: "Newest",
        lessonId: lessonIds[2],
        lessonTitle: "Lesson 3",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { body: "Middle", lessonId: lessonIds[1] },
      { body: "Oldest", lessonId: lessonIds[0] },
    ]);
  });

  it("puts a re-saved Note back at the top", () => {
    saveNote(db, base.user.id, lessonIds[0], "Old", minutesAfterNow(0));
    saveNote(db, base.user.id, lessonIds[1], "Newer", minutesAfterNow(1));
    saveNote(db, base.user.id, lessonIds[0], "Edited", minutesAfterNow(2));

    expect(listNotes(db, base.user.id).map((note) => note.body)).toEqual([
      "Edited",
      "Newer",
    ]);
  });
});
