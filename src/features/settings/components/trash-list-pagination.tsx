import { Button } from "@/components/ui/button";

type TrashListPaginationProps = {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
};

export function TrashListPagination({
  currentPage,
  lastPage,
  onPageChange,
}: TrashListPaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t p-4 sm:px-5">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {currentPage} of {lastPage}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
}
