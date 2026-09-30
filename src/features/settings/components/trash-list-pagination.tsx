import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

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
    <CardFooter className="shrink-0 flex-wrap justify-between gap-3 border-t p-5 sm:p-6">
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
    </CardFooter>
  );
}
