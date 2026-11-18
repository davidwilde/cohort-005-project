import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { describeDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft };

/**
 * What the Note editor shows for the text in the box: the character count,
 * whether it is over the limit, and whether Save has anything to do.
 */
export function noteDraft(draft: string, savedBody: string | null): NoteDraft {
  return describeDraft(draft, savedBody, MAX_NOTE_LENGTH);
}
