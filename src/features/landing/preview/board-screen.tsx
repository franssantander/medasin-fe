import { previewBoardStages } from "./preview-fixtures";
import { PreviewBoard } from "./preview-board";
import { PreviewPageHeader } from "./preview-page-header";

// standalone-kanban.tsx: the personal board, with the same toolbar and columns as a project board.
export default function BoardScreen() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <PreviewPageHeader title="Board" description="Give your ideas somewhere to move, not just somewhere to sit." />
      <PreviewBoard name="Personal" stages={previewBoardStages} fill search={false} className="min-h-0 flex-1" />
    </div>
  );
}
