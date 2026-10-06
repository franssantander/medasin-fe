"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { journalKeys } from "@/features/journal/queries/journal-query";
import { journalService } from "@/features/journal/services/journal-service";

export function FocusJournalLink({ sessionUuid }: { sessionUuid: string }) {
  const router = useRouter();
  const openingRef = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const entry = useQuery({
    queryKey: journalKeys.focusReflection(sessionUuid),
    queryFn: ({ signal }) => journalService.findFocusReflection(sessionUuid, signal),
    enabled: false,
    retry: false,
  });

  const open = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setUnavailable(false);
    try {
      const result = await entry.refetch();
      if (result.isError || !result.data) {
        setUnavailable(true);
        return;
      }
      router.push(`/journal?entry=${encodeURIComponent(result.data.uuid)}`);
    } finally {
      openingRef.current = false;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" className="min-h-11" onClick={open} disabled={entry.isFetching}>
        {entry.isFetching
          ? <Loader2 data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />
          : <BookOpen data-icon="inline-start" />}
        {entry.isFetching ? "Opening Journal…" : unavailable ? "Retry opening entry" : "View in Journal"}
      </Button>
      {unavailable && (
        <div className="flex flex-wrap items-center gap-x-2 text-sm" role="status">
          <span className="text-muted-foreground">Saved, but this entry could not be opened.</span>
          <Link href="/journal" className={buttonVariants({ variant: "link", className: "min-h-11" })}>
            Open Journal
          </Link>
        </div>
      )}
    </div>
  );
}
