import { expect, test, type Page } from "@playwright/test";
import type { LetterSummary } from "./type";

function summary(
  uuid: string,
  title: string,
  doneAt: string | null,
  preview: string,
): LetterSummary {
  return {
    uuid,
    title,
    subtitle: null,
    content_preview: preview,
    word_count: 120,
    read_time_minutes: 1,
    status: "draft",
    exported_at: null,
    done_at: doneAt,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    author: { name: "Test Author", handle: "@author" },
    latest_export: null,
  };
}

async function libraryFixture(page: Page) {
  let letters: LetterSummary[] = [
    {
      ...summary("letter-gratitude", "A note of appreciation", "2026-10-02T10:00:00Z", "Thank you for the quiet mornings."),
      status: "exported",
      latest_export: {
        uuid: "export-gratitude",
        status: "ready",
        format: "portrait",
        pages: [{ kind: "cover", cover: { hero_image_url: "http://localhost:8000/storage/letters/cover.png" } }],
      } as unknown as LetterSummary["latest_export"],
    },
    summary("letter-river", "Letters from the river", null, "The water was colder than expected."),
    summary("letter-winter", "Winter plans", null, "Notes about the long evenings ahead."),
  ];
  const deleted: string[] = [];
  const listRequests: URLSearchParams[] = [];
  const updates: { uuid: string; body: Record<string, unknown> }[] = [];

  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = route.request().method();
    let data: unknown = [];

    if (path === "/auth/me") {
      data = { first_name: "Test", last_name: "Author", username: "author", roles: [] };
    } else if (path === "/letters" && method === "GET") {
      listRequests.push(url.searchParams);
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search")?.toLocaleLowerCase();
      const matching = letters.filter(
        (letter) =>
          !search ||
          [letter.title, letter.subtitle, letter.content_preview].some((value) =>
            value?.toLocaleLowerCase().includes(search),
          ),
      );
      const done = matching.filter((letter) => letter.done_at).length;
      const rows = matching.filter(
        (letter) =>
          !status || (status === "done" ? letter.done_at : !letter.done_at),
      );
      data = {
        current_page: 1,
        data: rows,
        last_page: 1,
        per_page: 15,
        total: rows.length,
        counts: { all: matching.length, draft: matching.length - done, done },
      };
    } else if (path.startsWith("/letters/") && method === "DELETE") {
      const uuid = path.split("/").at(-1)!;
      deleted.push(uuid);
      letters = letters.filter((letter) => letter.uuid !== uuid);
      data = null;
    } else if (path.startsWith("/letters/") && method === "PATCH") {
      const uuid = path.split("/").at(-1)!;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      updates.push({ uuid, body });
      letters = letters.map((letter) =>
        letter.uuid === uuid && "done" in body
          ? { ...letter, done_at: body.done ? "2026-10-11T10:00:00Z" : null }
          : letter,
      );
      const letter = letters.find((item) => item.uuid === uuid);
      data = { ...letter, content: JSON.stringify({ version: 1, blocks: [] }) };
    } else if (path.startsWith("/letters/")) {
      const letter = letters.find((item) => path === `/letters/${item.uuid}`);
      data = letter
        ? { ...letter, content: JSON.stringify({ version: 1, blocks: [] }) }
        : null;
    }

    await route.fulfill({ json: { data, status: 200, message: "Letter moved to Trash." } });
  });

  return {
    deleted: () => deleted,
    lastList: () => listRequests.at(-1),
    updates: () => updates,
  };
}

test("the library filters by status, searches, and deletes letters", async ({ page }) => {
  const state = await libraryFixture(page);
  await page.goto("/letters");

  const list = page.getByRole("region", { name: "Your letters" });
  const rows = list.getByRole("listitem");
  await expect(rows).toHaveCount(3, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "New letter" })).toHaveAttribute("href", "/letters/new");
  await expect(list.getByRole("link", { name: "Open A note of appreciation" })).toHaveAttribute(
    "href",
    "/letters/letter-gratitude",
  );
  await expect(rows.first().locator("img")).toHaveAttribute("src", "/storage/letters/cover.png");
  await expect(rows.first()).toContainText("Done");
  await expect(rows.first()).toContainText("Exported · IG portrait");
  await expect(rows.nth(1)).toContainText("Draft");
  await expect(rows.nth(1).locator("img")).toHaveCount(0);
  await expect(list.getByRole("tab", { name: "All 3" })).toBeVisible();
  await expect(list.getByRole("tab", { name: "Drafts 2" })).toBeVisible();
  await expect(list.getByRole("tab", { name: "Done 1" })).toBeVisible();

  await list.getByRole("tab", { name: /Drafts/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(list.getByText("A note of appreciation")).toHaveCount(0);
  expect(state.lastList()?.get("status")).toBe("draft");

  await list.getByRole("tab", { name: /Done/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("A note of appreciation");
  expect(state.lastList()?.get("status")).toBe("done");

  await list.getByRole("tab", { name: /All/ }).click();
  await list.getByRole("searchbox", { name: "Search letters" }).fill("colder");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Letters from the river");
  expect(state.lastList()?.get("search")).toBe("colder");
  expect(state.lastList()?.has("status")).toBe(false);
  await expect(list.getByRole("tab", { name: "All 1" })).toBeVisible();
  await expect(list.getByRole("tab", { name: "Done 0" })).toBeVisible();

  await list.getByRole("searchbox", { name: "Search letters" }).fill("nothing like this");
  await expect(list.getByText("No letters match “nothing like this”")).toBeVisible();
  await expect(rows).toHaveCount(0);
  await list.getByRole("button", { name: "Show all letters" }).click();
  await expect(rows).toHaveCount(3);

  await list.getByRole("button", { name: "Actions for Winter plans" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete letter?" });
  await expect(confirm).toContainText("“Winter plans” will move to Trash");
  await confirm.getByRole("button", { name: "Delete letter" }).click();
  await expect(confirm).toBeHidden();
  await expect(rows).toHaveCount(2);
  expect(state.deleted()).toEqual(["letter-winter"]);
});

test("a letter can be marked done from the library menu", async ({ page }) => {
  const state = await libraryFixture(page);
  await page.goto("/letters");

  const list = page.getByRole("region", { name: "Your letters" });
  await expect(list.getByRole("listitem")).toHaveCount(3, { timeout: 60_000 });

  await list.getByRole("button", { name: "Actions for Winter plans" }).click();
  await page.getByRole("menuitem", { name: "Mark as done" }).click();
  await expect(list.getByRole("tab", { name: "Done 2" })).toBeVisible();
  expect(state.updates()).toEqual([{ uuid: "letter-winter", body: { done: true } }]);

  await list.getByRole("tab", { name: /Done/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await list.getByRole("button", { name: "Actions for Winter plans" }).click();
  await page.getByRole("menuitem", { name: "Move to drafts" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("tab", { name: "Drafts 2" })).toBeVisible();
  expect(state.updates().at(-1)).toEqual({ uuid: "letter-winter", body: { done: false } });
});

test("the editor marks a letter done and back to draft", async ({ page }) => {
  const state = await libraryFixture(page);
  await page.goto("/letters/letter-river");

  const markDone = page.getByRole("button", { name: "Mark as done" });
  await expect(markDone).toBeVisible({ timeout: 60_000 });
  await markDone.click();
  const done = page.getByRole("button", { name: "Done, move back to drafts" });
  await expect(done).toBeVisible();
  expect(state.updates()).toContainEqual({ uuid: "letter-river", body: { done: true } });

  await done.click();
  await expect(page.getByRole("button", { name: "Mark as done" })).toBeVisible();
  expect(state.updates().at(-1)).toEqual({ uuid: "letter-river", body: { done: false } });
});

test("old letter links redirect to the letter editor", async ({ page }) => {
  await libraryFixture(page);
  await page.goto("/letters?letter=letter-river");

  await expect(page).toHaveURL(/\/letters\/letter-river$/, { timeout: 60_000 });
  await expect(page.getByRole("textbox", { name: "Letter title" })).toHaveValue(
    "Letters from the river",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page).toHaveURL(/\/letters$/);
  await expect(page.getByRole("heading", { name: "Letters", level: 1 })).toBeVisible();
});
