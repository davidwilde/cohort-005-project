import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Lock, NotebookPen } from "lucide-react";
import { cn, formatRelativeTime } from "~/lib/utils";
import { LessonPanel } from "~/components/lesson-panel";
import { noteDraft, type NoteDraft } from "~/modules/note-draft";

export function LessonNote({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const draft = noteDraft(body, note?.body ?? null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const isSaving = fetcher.state !== "idle";
  // A failed save's error is about the text that was sent; once the box is
  // edited it no longer applies.
  const error = body === submitted ? fetcher.data?.error : undefined;

  return (
    <LessonPanel icon={NotebookPen} title="Your notes" aside={<PrivateLabel />}>
      <fetcher.Form
        method="post"
        className="space-y-2"
        onSubmit={() => setSubmitted(body)}
      >
        <input type="hidden" name="intent" value="save-note" />
        <Textarea
          name="body"
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Jot down what you want to remember from this lesson..."
          aria-label="Your notes"
          className="resize-y"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isSaving || !draft.canSave}>
            {isSaving ? "Saving..." : "Save note"}
          </Button>
          <NoteStatus
            error={error}
            unchanged={draft.unchanged}
            updatedAt={note?.updatedAt ?? null}
          />
          <NoteCounter draft={draft} />
        </div>
      </fetcher.Form>
    </LessonPanel>
  );
}

function NoteStatus({
  error,
  unchanged,
  updatedAt,
}: {
  error: string | undefined;
  unchanged: boolean;
  updatedAt: string | null;
}) {
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (!unchanged)
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  if (!updatedAt) return null;
  return (
    <span suppressHydrationWarning className="text-xs text-muted-foreground">
      Saved {formatRelativeTime(updatedAt)}
    </span>
  );
}

function PrivateLabel() {
  return (
    <span className="flex items-center gap-1">
      <Lock className="size-3" aria-hidden />
      Only you can see these
    </span>
  );
}

function NoteCounter({ draft }: { draft: NoteDraft }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs",
        draft.tooLong ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {draft.length} / {draft.max}
    </span>
  );
}
