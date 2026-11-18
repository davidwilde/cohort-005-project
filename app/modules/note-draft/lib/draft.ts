export type NoteDraft = {
  /** Characters the server will store: the draft without surrounding space. */
  length: number;
  max: number;
  tooLong: boolean;
  empty: boolean;
  /** The draft matches what is already saved, so there is nothing to save. */
  unchanged: boolean;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  savedBody: string | null,
  max: number
): NoteDraft {
  const trimmed = draft.trim();
  const length = trimmed.length;
  const tooLong = length > max;
  const empty = length === 0;
  // The server stores the body trimmed, so the saved side needs no trim.
  const unchanged = trimmed === (savedBody ?? "");
  return {
    length,
    max,
    tooLong,
    empty,
    unchanged,
    canSave: !empty && !tooLong && !unchanged,
  };
}
