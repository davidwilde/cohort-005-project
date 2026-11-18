import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "~/components/ui/card";

/**
 * The shell the Lesson page's panels share — Your notes and Questions &
 * Discussion — so the two read as one set.
 */
export function LessonPanel({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Sits at the right of the header. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="mb-8 gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-6 py-4">
        <Icon className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside && (
          <div className="ml-auto text-xs text-muted-foreground">{aside}</div>
        )}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}
