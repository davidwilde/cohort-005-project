import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { courses, lessons, modules, notes } from "~/db/schema";

// ─── Notes ───
// A Note is a Student's own writing about a Lesson, private to the Student who
// wrote it. One per Student per Lesson; the unique index on
// (user_id, lesson_id) enforces that. Plain text, never rendered as Markdown.
// See GLOSSARY.md.
//
// Only the owning Student's Lesson page and Saved page may read Note bodies.
// Every function here is scoped by the Student's own user id.
//
// Every function takes the database first, so tests can hand in an in-memory
// one. Uses positional parameters (project convention).

export type Db = BetterSQLite3Database<typeof schema>;

export const MAX_NOTE_LENGTH = 2000;

type Note = typeof notes.$inferSelect;

export type SaveNoteResult =
  { ok: true; note: Note } | { ok: false; error: string };

export function getNote(db: Db, userId: number, lessonId: number) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
    .get();
}

/**
 * Creates the Student's Note on the Lesson, or replaces its body and moves
 * `updatedAt` on if one exists. `createdAt` never changes on a re-save. An
 * upsert on the unique index, so two racing saves never leave two Notes.
 */
export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
): SaveNoteResult {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Write something before saving your note." };
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `A note must be ${MAX_NOTE_LENGTH.toLocaleString("en")} characters or fewer.`,
    };
  }

  const at = now.toISOString();
  const note = db
    .insert(notes)
    .values({ userId, lessonId, body: trimmed, createdAt: at, updatedAt: at })
    .onConflictDoUpdate({
      target: [notes.userId, notes.lessonId],
      set: { body: trimmed, updatedAt: at },
    })
    .returning()
    .get();

  return { ok: true, note };
}

/** The Student's Notes, last edited first, each with its Lesson and Course. */
export function listNotes(db: Db, userId: number) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(notes)
    .innerJoin(lessons, eq(lessons.id, notes.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
}
