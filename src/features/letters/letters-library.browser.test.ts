import { expect, test, type Page } from "@playwright/test";
import type { LetterSummary } from "./type";

function summary(
  uuid: string,
  title: string,
  status: LetterSummary["status"],
  preview: string,
): LetterSummary {
  return {
    uuid,
    title,
    subtitle: null,
    content_preview: preview,
    word_count: 120,
    read_time_minutes: 1,
    status,
    exported_at: null,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    author: { name: "Test Author", handle: "@author" },
    latest_export: null,
  };
}

async function libraryFixture(page: Page) {
  let letters = [
    {
      ...summary("letter-gratitude", "A note of appreciation", "exported", "Thank you for the quiet mornings."),
      latest_export: {
        uuid: "export-gratitude",
        status: "ready",
        format: "portrait",
        pages: [{ kind: "cover", cover: { hero_image_url: "http://localhost:8000/storage/letters/cover.png" } }],
      } as unknown as LetterSummary["latest_export"],
    },
    summary("letter-river", "Letters from the river", "draft", "The water was colder than expected."),
    summary("letter-winter", "Winter plans", "draft", "Notes about the long evenings ahead."),
  ];
  const deleted: string[] = [];

  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    const method = route.request().method();
    let data: unknown = [];

    if (path === "/auth/me") {
      data = { first_name: "Test", last_name: "Author", username: "author", roles: [] };
    } else if (path === "/letters" && method === "GET") {
      data = { current_page: 1, data: letters, last_page: 1, per_page: 15, total: letters.length };
    } else if (path.startsWith("/letters/") && method === "DELETE") {
      const uuid = path.split("/").at(-1)!;
      deleted.push(uuid);
      letters = letters.filter((letter) => letter.uuid !== uuid);
      data = null;
    } else if (path.startsWith("/letters/")) {
      const letter = letters.find((item) => path === `/letters/${item.uuid}`);
      data = letter
        ? { ...letter, content: JSON.stringify({ version: 1, blocks: [] }) }
        : null;
    }

    await route.fulfill({ json: { data, status: 200, message: "Letter moved to Trash." } });
  });

  return { deleted: () => deleted };
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
  await expect(rows.nth(1).locator("img")).toHaveCount(0);

  await list.getByRole("tab", { name: /Drafts/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(list.getByText("A note of appreciation")).toHaveCount(0);

  await list.getByRole("tab", { name: /Exported/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Exported");

  await list.getByRole("tab", { name: /All/ }).click();
  await list.getByRole("searchbox", { name: "Search letters" }).fill("colder");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Letters from the river");

  await list.getByRole("searchbox", { name: "Search letters" }).fill("nothing like this");
  await expect(rows).toHaveCount(0);
  await expect(list.getByText("No letters match “nothing like this”")).toBeVisible();
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
