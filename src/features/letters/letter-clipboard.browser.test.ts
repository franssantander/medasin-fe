import { expect, test, type Page } from "@playwright/test";
import type { Letter } from "./type";

const content = JSON.stringify({
  version: 1,
  blocks: [
    {
      id: "opening",
      type: "paragraph",
      content: [
        { type: "text", text: "A bright ", styles: {} },
        { type: "text", text: "idea", styles: { bold: true } },
        { type: "text", text: " comes from ", styles: { italic: true } },
        { type: "link", href: "https://medasin.com", content: "Medasin" },
        { type: "text", text: ".", styles: {} },
      ],
    },
    { id: "heading", type: "heading", props: { level: 2 }, content: "A second thought" },
    { id: "list-item", type: "bulletListItem", content: "A listed note" },
    { id: "soft-break", type: "paragraph", content: "First line\nSecond line" },
  ],
});

async function openLetter(page: Page) {
  const letter: Letter = {
    uuid: "letter-clipboard-test",
    title: "Clipboard letter",
    subtitle: null,
    content,
    content_preview: "A bright idea",
    word_count: 15,
    read_time_minutes: 1,
    status: "draft",
    exported_at: null,
    created_at: null,
    updated_at: null,
    author: { name: "Test Author", handle: "@author" },
    latest_export: null,
  };

  await page.route("**/api-test/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api-test/v1", "");
    const data =
      path === "/auth/me"
        ? { first_name: "Test", last_name: "Author", username: "author", roles: [] }
        : path === "/letters"
          ? { current_page: 1, data: [letter], last_page: 1, per_page: 15, total: 1 }
          : path === `/letters/${letter.uuid}`
            ? letter
            : [];
    await route.fulfill({ json: { data, status: 200, message: "Saved" } });
  });

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/letters?letter=${letter.uuid}`);
  const editor = page.locator('.letter-composer-document .bn-editor[contenteditable="true"]');
  await expect(editor).toBeVisible({ timeout: 60_000 });
  return editor;
}

async function readClipboard(page: Page) {
  return page.evaluate(async () => {
    const item = (await navigator.clipboard.read())[0];
    if (!item) throw new Error("Clipboard is empty");
    const plain = await (await item.getType("text/plain")).text();
    const html = await (await item.getType("text/html")).text();
    const document = new DOMParser().parseFromString(html, "text/html");
    return {
      types: item.types,
      plain,
      html,
      hasHeading: Boolean(document.querySelector("h1, h2, h3")),
      hasList: Boolean(document.querySelector("ul, ol")),
      hasLink: Boolean(document.querySelector('a[href^="https://medasin.com"]')),
      hasBold: Boolean(document.querySelector("strong, b")),
      hasItalic: Boolean(document.querySelector("em, i")),
      hasSoftBreak: Boolean(document.querySelector("br")),
    };
  });
}

test("letter copy provides readable plain text and semantic HTML", async ({ page }) => {
  const editor = await openLetter(page);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("ControlOrMeta+C");

  const clipboard = await readClipboard(page);
  expect(clipboard.types).toEqual(expect.arrayContaining(["text/plain", "text/html"]));
  expect(clipboard.types).not.toContain("blocknote/html");
  expect(clipboard.plain).toContain("A bright idea comes from Medasin.");
  expect(clipboard.plain).toContain("\n\nA second thought\n\nA listed note");
  expect(clipboard.plain).toContain("First line\nSecond line");
  expect(clipboard.plain).not.toMatch(/\[obj\]|\uFFFC/);
  expect(clipboard.hasHeading).toBe(true);
  expect(clipboard.hasList).toBe(true);
  expect(clipboard.hasLink).toBe(true);
  expect(clipboard.hasBold).toBe(true);
  expect(clipboard.hasItalic).toBe(true);
  expect(clipboard.hasSoftBreak).toBe(true);

  await page.evaluate(() => {
    const destination = document.createElement("textarea");
    destination.dataset.clipboardDestination = "true";
    document.body.append(destination);
    destination.focus();
  });
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.locator("textarea[data-clipboard-destination]")).toHaveValue(
    clipboard.plain,
  );
});

test("letter cut writes standard formats and removes only selected text", async ({ page }) => {
  const editor = await openLetter(page);
  await editor.locator("strong").first().selectText();
  await page.keyboard.press("ControlOrMeta+X");

  const clipboard = await readClipboard(page);
  expect(clipboard.types).not.toContain("blocknote/html");
  expect(clipboard.plain).toBe("idea");
  expect(clipboard.hasBold).toBe(true);
  await expect(editor).toContainText("A bright  comes from Medasin.");
});
