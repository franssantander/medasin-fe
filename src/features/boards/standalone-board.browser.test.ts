import { expect, test, type Page } from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { Board, BoardTask } from "@/features/projects/type";

test.use({ actionTimeout: 15_000 });

const boardUuid = "41000000-0000-4000-8000-000000000001";

const task: BoardTask = {
  uuid: "61000000-0000-4000-8000-000000000001", title: "Plan the week", description: null, priority: "medium", stage: "in_progress", position: 0,
  labels: [], resources: [], notes: [], created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z",
};

const board: Board = {
  uuid: boardUuid, name: "Board 1", position: 0, task_count: 1,
  stage_counts: { backlog: 0, todos: 0, in_progress: 1, done: 0 },
  labels: [],
  stages: (["backlog", "todos", "in_progress", "done"] as const).map((key, position) => ({
    uuid: `81000000-0000-4000-8000-00000000000${position}`, key, position,
    name: { backlog: "Backlog", todos: "Todos", in_progress: "In Progress", done: "Done" }[key],
    task_count: key === "in_progress" ? 1 : 0,
    tasks: key === "in_progress" ? [task] : [],
  })),
};

async function fixture(page: Page) {
  await page.context().addCookies([{ name: "auth_token", value: "standalone-board-test", url: "http://127.0.0.1:3107" }]);
  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    let data: unknown = [];
    if (path === "/auth/me") data = { id: 1, uuid: "10000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace", username: "ada", email: "ada@example.com" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") data = idleFocusDashboard();
    else if (path === "/resource") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0, next_page_url: null };
    else if (path === "/board") data = [{ uuid: board.uuid, name: board.name, position: 0, task_count: 1, stage_counts: board.stage_counts }];
    else if (path === `/board/${boardUuid}`) data = board;
    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });
}

test("opening a task docks its details beside the standalone board", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page);
  await page.goto("/board");

  const card = page.getByRole("button", { name: /Plan the week/ });
  await card.click();
  const panel = page.getByRole("region", { name: "Plan the week", exact: true });
  await expect(panel).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Backlog", exact: true })).toBeVisible();
  await expect(card).toHaveAttribute("aria-current", "true");
  await page.screenshot({ path: testInfo.outputPath("standalone-task-panel.png") });

  await panel.getByRole("button", { name: "Close task details", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(card).toBeFocused();
});
