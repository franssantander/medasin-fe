import { useQuery } from "@tanstack/react-query";
import { boardService } from "../services/board-service";

export const boardKeys = {
  all: ["boards"] as const,
  list: () => [...boardKeys.all, "list"] as const,
  detail: (boardUuid: string) => [...boardKeys.all, "detail", boardUuid] as const,
};

export function useBoardsQuery() {
  return useQuery({ queryKey: boardKeys.list(), queryFn: boardService.list });
}

export function useBoardQuery(boardUuid?: string) {
  return useQuery({
    queryKey: boardKeys.detail(boardUuid ?? ""),
    queryFn: () => boardService.show(boardUuid!),
    enabled: Boolean(boardUuid),
  });
}
