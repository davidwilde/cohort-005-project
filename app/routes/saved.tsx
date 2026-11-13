import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/saved";
import { db } from "~/db";
import { requireUserId } from "~/lib/access.server";
import { listBookmarks } from "~/lib/bookmarks.server";
import { listNotes } from "~/lib/notes.server";
import { Card, CardContent } from "~/components/ui/card";
import { Bookmark, NotebookPen } from "lucide-react";
import { formatRelativeTime } from "~/lib/utils";

export function meta() {
  return [
    { title: "Saved — Cadence" },
    { name: "description", content: "Your bookmarks and notes" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);

  // Only the signed-in Student's own rows: both lists are scoped by user id.
  return {
    savedBookmarks: listBookmarks(db, userId),
    savedNotes: listNotes(db, userId),
  };
}

export default function Saved({ loaderData }: Route.ComponentProps) {
  const { savedBookmarks, savedNotes } = loaderData;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved</h1>
        <p className="text-sm text-muted-foreground">
          The lessons you flagged, and what you wrote about them.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SavedSection
          title="Bookmarks"
          icon={<Bookmark className="size-4 text-muted-foreground" />}
          emptyText="No bookmarks yet."
        >
          {savedBookmarks.map((bookmark) => (
            <SavedRow key={bookmark.id} lesson={bookmark} />
          ))}
        </SavedSection>

        <SavedSection
          title="Notes"
          icon={<NotebookPen className="size-4 text-muted-foreground" />}
          emptyText="No notes yet."
        >
          {savedNotes.map((note) => (
            <SavedRow key={note.id} lesson={note}>
              {/* Plain text: a Note is never rendered as Markdown. */}
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
              <p
                suppressHydrationWarning
                className="text-xs text-muted-foreground"
              >
                Edited {formatRelativeTime(note.updatedAt)}
              </p>
            </SavedRow>
          ))}
        </SavedSection>
      </div>
    </div>
  );
}

function SavedSection({
  title,
  icon,
  emptyText,
  children,
}: {
  title: string;
  icon: ReactNode;
  emptyText: string;
  children: ReactNode[];
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

type SavedLesson = {
  lessonId: number;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
};

function SavedRow({
  lesson,
  children,
}: {
  lesson: SavedLesson;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 py-3">
        <Link
          to={`/courses/${lesson.courseSlug}/lessons/${lesson.lessonId}`}
          className="text-sm font-medium hover:underline"
        >
          {lesson.lessonTitle}
        </Link>
        <p className="text-xs text-muted-foreground">{lesson.courseTitle}</p>
        {children}
      </CardContent>
    </Card>
  );
}
