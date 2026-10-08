import {
  expect,
  test,
  type Locator,
  type Page,
  type WebSocketRoute,
} from "@playwright/test";
import { idleFocusDashboard } from "@/test-utils/focus-fixture";
import type { PlanNotification } from "./type";

test.use({ timezoneId: "Asia/Manila", locale: "en-US", actionTimeout: 15_000 });

const noticeId = "b86b941b-f609-4e33-91ed-95bfb3c49b09";
const planId = "eb0c597d-76a4-49d5-a47f-65b7c815c519";

function makeNotice(
  index = 1,
  extra: Partial<PlanNotification> = {},
): PlanNotification {
  return {
    id:
      index === 1
        ? noticeId
        : "90000000-0000-4000-8000-" + String(index).padStart(12, "0"),
    type: "CalendarPlanReminder",
    data: {
      plan_uuid: planId,
      title: index === 1 ? "Meet the team" : `Reminder ${index}`,
      date: "2026-10-08",
      time: "14:30",
      timezone: "Asia/Manila",
    },
    read_at: null,
    created_at: new Date(
      Date.parse("2026-10-08T04:00:00Z") - index * 120_000,
    ).toISOString(),
    ...extra,
  };
}

async function fixture(
  page: Page,
  useSocket: boolean,
  options: { notices?: PlanNotification[]; dark?: boolean } = {},
) {
  await page.clock.install({ time: new Date("2026-10-08T04:00:00Z") });
  await page.context().addCookies([
    {
      name: "auth_token",
      value: "notification-test",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await page.addInitScript(
    (dark) => localStorage.setItem("theme", dark ? "dark" : "light"),
    Boolean(options.dark),
  );
  const notices = structuredClone(options.notices ?? []);
  let subscribed = false;
  let authorizations = 0;
  const sockets: WebSocketRoute[] = [];
  const requests: string[] = [];
  const failures = new Map<string, number>();
  const holds = new Map<string, Promise<void>>();

  if (useSocket) {
    await page.routeWebSocket(/\/app\/test-key(?:\?|$)/, (socket) => {
      sockets.push(socket);
      socket.onMessage((message) => {
        const frame = JSON.parse(String(message)) as {
          event: string;
          data?: { channel?: string };
        };
        if (frame.event !== "pusher:subscribe") return;
        subscribed = frame.data?.channel === "private-users.7.notifications";
        socket.send(
          JSON.stringify({
            event: "pusher_internal:subscription_succeeded",
            channel: frame.data?.channel,
            data: "{}",
          }),
        );
      });
      socket.send(
        JSON.stringify({
          event: "pusher:connection_established",
          data: JSON.stringify({ socket_id: "123.456", activity_timeout: 30 }),
        }),
      );
    });
  }

  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    const perPage = Number(url.searchParams.get("per_page") ?? 15);
    const currentPage = Number(url.searchParams.get("page") ?? 1);
    const unreadOnly = url.searchParams.get("unread_only") === "1";
    const key =
      path === "/notifications"
        ? perPage === 1
          ? "count"
          : perPage === 50
            ? "details"
            : `${unreadOnly ? "unread" : "all"}:${currentPage}`
        : path.endsWith("/read")
          ? `read:${path.split("/")[2]}`
          : path;
    requests.push(key);
    const hold = holds.get(key);
    holds.delete(key);
    if (hold) await hold;
    if ((failures.get(key) ?? 0) > 0) {
      failures.set(key, failures.get(key)! - 1);
      await route.fulfill({
        status: 500,
        json: {
          data: null,
          status: 500,
          message: "Notification request failed. Try again.",
        },
      });
      return;
    }
    let data: unknown = [];
    let status = 200;
    if (path === "/auth/me") {
      data = {
        id: 7,
        first_name: "Test",
        last_name: "User",
        username: "tester",
        roles: [],
      };
    } else if (path === "/focus") {
      data = idleFocusDashboard();
    } else if (path === "/broadcasting/auth") {
      authorizations += 1;
      await route.fulfill({ json: { auth: "test-key:signature" } });
      return;
    } else if (path === "/notifications") {
      const matches = unreadOnly
        ? notices.filter((item) => !item.read_at)
        : notices;
      data = {
        current_page: currentPage,
        data: matches.slice((currentPage - 1) * perPage, currentPage * perPage),
        last_page: Math.max(1, Math.ceil(matches.length / perPage)),
        per_page: perPage,
        total: matches.length,
      };
    } else if (path.endsWith("/read")) {
      const notice = notices.find((item) => item.id === path.split("/")[2]);
      if (notice) notice.read_at = "2026-10-08T04:00:00Z";
      data = notice;
    } else if (path === `/calendar/plans/${planId}`) {
      status = 404;
      data = null;
    }
    await route.fulfill({
      status,
      json: { data, status, message: status === 404 ? "Plan not found" : "OK" },
    });
  });

  await page.goto("/plans");
  await expect(
    page.getByRole("heading", { name: "Plans", exact: true }),
  ).toBeVisible();
  if (useSocket) await expect.poll(() => subscribed).toBe(true);
  const deliver = (notice = makeNotice()) => {
    const previous = notices.findIndex((item) => item.id === notice.id);
    if (previous >= 0) notices.splice(previous, 1);
    notices.unshift(structuredClone(notice));
  };
  return {
    sockets,
    getSubscribed: () => subscribed,
    getAuthorizations: () => authorizations,
    deliver,
    emit: (notice = makeNotice()) => {
      deliver(notice);
      sockets.at(-1)!.send(
        JSON.stringify({
          event: "calendar.plan-reminder.delivered",
          channel: "private-users.7.notifications",
          data: JSON.stringify({ notification_id: notice.id }),
        }),
      );
    },
    wasRead: () =>
      Boolean(notices.find((item) => item.id === noticeId)?.read_at),
    calls: (key: string) => requests.filter((item) => item === key),
    fail: (key: string, times = 99) => failures.set(key, times),
    holdNext: (key: string) => {
      let release!: () => void;
      holds.set(
        key,
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      return release;
    },
  };
}

async function openInbox(page: Page) {
  await page
    .getByRole("button", { name: /^Notifications(?:, \d+ unread)?$/ })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Notifications",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  return dialog;
}

function noticeRow(dialog: Locator, title: string) {
  return dialog.getByRole("listitem").filter({
    has: dialog
      .page()
      .getByRole("link", { name: `View plan: ${title}`, exact: true }),
  });
}

test("a Reverb reminder refreshes the bell and open drawer without a duplicate toast", async ({
  page,
}) => {
  const state = await fixture(page, true);
  await expect.poll(state.getSubscribed).toBe(true);
  expect(state.getAuthorizations()).toBe(1);

  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.getByText("No notifications yet")).toBeVisible();

  state.deliver();
  state.sockets[0].send(
    JSON.stringify({
      event: "calendar.plan-reminder.delivered",
      channel: "private-users.7.notifications",
      data: JSON.stringify({ notification_id: noticeId }),
    }),
  );

  await expect(page.getByText("1 unread notification")).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "Notifications" })
      .getByRole("link", { name: "View plan: Meet the team" }),
  ).toBeVisible();
  await expect(page.locator('[data-variant="plan-reminder"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(
    page.getByRole("button", { name: /Notifications, 1 unread/ }),
  ).toBeVisible();
});

test("a live reminder toast opens its plan", async ({ page }) => {
  const state = await fixture(page, true);
  await expect.poll(state.getSubscribed).toBe(true);

  state.deliver();
  const frame = JSON.stringify({
    event: "calendar.plan-reminder.delivered",
    channel: "private-users.7.notifications",
    data: JSON.stringify({ notification_id: noticeId }),
  });
  state.sockets[0].send(frame);
  state.sockets[0].send(frame);

  await expect(page.getByText("Plan reminder", { exact: true })).toBeVisible();
  await expect(page.getByText("Meet the team")).toBeVisible();
  await expect(page.getByRole("button", { name: "View plan" })).toHaveCount(1);
  await page.getByRole("button", { name: "View plan" }).click();
  await expect.poll(state.wasRead).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/plans\\?plan=${planId}`));
});

test("reconnecting refreshes reminders missed while offline", async ({
  page,
}) => {
  const state = await fixture(page, true);
  await expect.poll(state.getSubscribed).toBe(true);
  await state.sockets[0].close();
  state.deliver();

  await expect.poll(() => state.sockets.length).toBeGreaterThan(1);
  await expect(
    page.getByRole("button", { name: /Notifications, 1 unread/ }),
  ).toBeVisible();
  await expect(page.getByText("Plan reminder", { exact: true })).toHaveCount(0);
});

test("the drawer still loads reminders when Reverb is unavailable", async ({
  page,
}) => {
  const state = await fixture(page, false);
  state.deliver();

  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.getByText("Meet the team")).toBeVisible();
});

test("All and Unread use separate server filters and pagination", async ({
  page,
}) => {
  const notices = Array.from({ length: 32 }, (_, index) =>
    makeNotice(index + 1, {
      read_at: index < 16 ? "2026-10-08T03:00:00Z" : null,
    }),
  );
  const state = await fixture(page, true, { notices });
  const dialog = await openInbox(page);
  await expect(dialog.getByRole("listitem")).toHaveCount(15);
  await expect(
    dialog.getByRole("link", { name: "View plan: Reminder 17", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(dialog.getByRole("listitem")).toHaveCount(15);
  await expect(
    dialog.getByRole("link", { name: "View plan: Reminder 17", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(dialog.getByRole("listitem")).toHaveCount(16);
  expect(state.calls("unread:1").length).toBeGreaterThan(0);
  expect(state.calls("unread:2")).toHaveLength(1);
  await dialog.getByRole("button", { name: "All", exact: true }).click();
  await expect(dialog.getByRole("listitem")).toHaveCount(15);
  await expect(
    dialog.getByRole("link", { name: "View plan: Meet the team", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(dialog.getByRole("listitem")).toHaveCount(30);
  expect(state.calls("all:2")).toHaveLength(1);
});

test("read actions stay independent and opening a plan does not wait or duplicate a pending read", async ({
  page,
}) => {
  const state = await fixture(page, true, {
    notices: [makeNotice(), makeNotice(2)],
  });
  const dialog = await openInbox(page);
  const release = state.holdNext(`read:${noticeId}`);
  const first = noticeRow(dialog, "Meet the team");
  const second = noticeRow(dialog, "Reminder 2");
  await first
    .getByRole("button", { name: "Mark as read: Meet the team", exact: true })
    .click();
  await expect(first.getByRole("button")).toBeDisabled();
  await expect(first.getByText("Marking…")).toBeVisible();
  await expect(second.getByRole("button")).toBeEnabled();
  await second.getByRole("button").click();
  await expect(second.getByText("Unread", { exact: true })).toHaveCount(0);
  await expect(
    dialog.getByText("1 unread notification", { exact: true }),
  ).toBeVisible();
  await first.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/plans\\?plan=${planId}`));
  expect(state.calls(`read:${noticeId}`)).toHaveLength(1);
  expect(state.wasRead()).toBe(false);
  release();
  await expect.poll(state.wasRead).toBe(true);
  await expect(page.locator('button[aria-label="Notifications"]')).toHaveCount(
    1,
  );
});

test("a failed read keeps its unread state and offers an inline retry", async ({
  page,
}) => {
  const state = await fixture(page, true, {
    notices: [makeNotice(), makeNotice(2)],
  });
  const dialog = await openInbox(page);
  state.fail(`read:${noticeId}`, 1);
  const first = noticeRow(dialog, "Meet the team");
  await first.getByRole("button").click();
  await expect(first.getByRole("alert")).toContainText("Couldn’t mark as read");
  await expect(first.getByText("Unread", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("2 unread notifications", { exact: true }),
  ).toBeVisible();
  await expect(first.getByRole("button")).toBeEnabled();
  await first.getByRole("button").click();
  await expect(first.getByText("Unread", { exact: true })).toHaveCount(0);
  await expect(first.getByRole("alert")).toHaveCount(0);
  await expect(
    dialog.getByText("1 unread notification", { exact: true }),
  ).toBeVisible();
});

test("reading the last unread reminder shows the caught-up state and preserves history", async ({
  page,
}) => {
  await fixture(page, true, { notices: [makeNotice()] });
  const dialog = await openInbox(page);
  await dialog.getByRole("button", { name: "Unread", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Mark as read: Meet the team", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    dialog.getByText("All caught up", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await expect(page.locator('button[aria-label="Notifications"]')).toHaveCount(
    1,
  );
  await dialog
    .getByRole("button", { name: "View all notifications", exact: true })
    .click();
  await expect(
    dialog.getByRole("link", { name: "View plan: Meet the team", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Mark as read: Meet the team",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("initial loading and errors recover without an empty-state flash", async ({
  page,
}) => {
  const state = await fixture(page, true, { notices: [makeNotice()] });
  const release = state.holdNext("all:1");
  const dialog = await openInbox(page);
  await expect(
    dialog.getByRole("status", { name: "Loading notifications" }),
  ).toBeVisible();
  await expect(dialog.getByText("No notifications yet")).toHaveCount(0);
  state.fail("all:1");
  release();
  await expect(dialog.getByRole("alert")).toContainText(
    "Notifications could not be loaded",
  );
  state.fail("all:1", 0);
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    dialog.getByRole("link", { name: "View plan: Meet the team", exact: true }),
  ).toBeVisible();
});

test("refresh failures retain rows and pagination failures have their own retry", async ({
  page,
}) => {
  const state = await fixture(page, true, {
    notices: Array.from({ length: 18 }, (_, index) => makeNotice(index + 1)),
  });
  const dialog = await openInbox(page);
  await expect(dialog.getByRole("listitem")).toHaveCount(15);
  state.fail("all:1");
  state.emit(makeNotice(50));
  await expect(dialog.getByRole("alert")).toContainText(
    "Couldn’t refresh notifications",
  );
  await expect(dialog.getByRole("listitem")).toHaveCount(15);
  state.fail("all:1", 0);
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  state.fail("all:2");
  await dialog.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Couldn’t load more reminders",
  );
  await expect(dialog.getByRole("listitem")).toHaveCount(15);
  state.fail("all:2", 0);
  await dialog
    .getByRole("button", { name: "Retry loading more", exact: true })
    .click();
  await expect(dialog.getByRole("listitem")).toHaveCount(19);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});

test("missing and invalid metadata remain readable and do not create broken links", async ({
  page,
}) => {
  await fixture(page, true, {
    notices: [
      makeNotice(1, {
        data: {
          title: "All-day reminder",
          date: "2026-10-09",
          time: null,
          timezone: "Pacific/Auckland",
        },
        created_at: null,
      }),
      makeNotice(2, {
        data: {
          title: "Incomplete reminder",
          date: "2026-02-30",
          time: "30:00",
        },
        created_at: "invalid",
      }),
      makeNotice(3, { data: {} }),
    ],
  });
  const dialog = await openInbox(page);
  await expect(dialog.getByRole("listitem")).toHaveCount(3);
  await expect(
    dialog.getByText("Oct 9, 2026 · All day · Pacific/Auckland"),
  ).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(0);
  await expect(dialog.locator("time")).toHaveCount(1);
  await expect(dialog.getByText("Invalid Date")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", {
      name: "Mark as read: Plan reminder",
      exact: true,
    }),
  ).toBeEnabled();
});

test("dismissal restores focus and retains the selected inbox view", async ({
  page,
}) => {
  await fixture(page, true, { notices: [makeNotice()] });
  const bell = page.getByRole("button", {
    name: "Notifications, 1 unread",
    exact: true,
  });
  await bell.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Notifications",
    exact: true,
  });
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Unread", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(bell).toBeFocused();
  await bell.click();
  await expect(
    dialog.getByRole("button", { name: "Unread", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.mouse.click(20, 20);
  await expect(dialog).toBeHidden();
  await expect(bell).toBeFocused();
});

test("opening the inbox cancels pending reminder previews even if it closes before the lookup finishes", async ({
  page,
}) => {
  const state = await fixture(page, true);
  const release = state.holdNext("details");
  state.emit();
  await expect.poll(() => state.calls("details").length).toBe(1);
  const dialog = await openInbox(page);
  await expect(
    dialog.getByRole("link", { name: "View plan: Meet the team", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  const response = page.waitForResponse(
    (item) => new URL(item.url()).searchParams.get("per_page") === "50",
  );
  release();
  await response;
  await page.clock.runFor(1000);
  await expect(page.locator('[data-variant="plan-reminder"]')).toHaveCount(0);
  state.emit(makeNotice(2));
  await expect(page.locator('[data-variant="plan-reminder"]')).toBeVisible();
});

test("reminders arriving during the drawer exit update the bell without a delayed preview", async ({
  page,
}) => {
  const state = await fixture(page, true, { notices: [makeNotice()] });
  const dialog = await openInbox(page);
  await dialog.evaluate((element) => {
    element.style.transitionDuration = "1500ms";
  });
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.locator('[data-slot="drawer-popup"]')).toHaveAttribute(
    "data-ending-style",
    "",
  );
  state.emit(makeNotice(2));
  await expect(
    page.locator('button[aria-label="Notifications, 2 unread"]'),
  ).toHaveCount(1);
  await expect(dialog).toBeHidden();
  expect(state.calls("details")).toHaveLength(0);
  await expect(page.locator('[data-variant="plan-reminder"]')).toHaveCount(0);

  state.emit(makeNotice(3));
  await expect(page.locator('[data-variant="plan-reminder"]')).toContainText(
    "Reminder 3",
  );
});

test("a reminder without plan details opens All notifications and dismissal does not mark it read", async ({
  page,
}) => {
  const state = await fixture(page, true);
  const dialog = await openInbox(page);
  await dialog.getByRole("button", { name: "Unread", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  state.fail("details", 1);
  state.emit();
  const notice = page.locator('[data-variant="plan-reminder"]');
  await expect(notice).toContainText("You have a new plan reminder.");
  await notice
    .getByRole("button", { name: "Open notifications", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "All", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog.getByRole("link", { name: "View plan: Meet the team", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  state.emit(
    makeNotice(2, { data: { title: "A reminder with no plan link" } }),
  );
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("A reminder with no plan link");
  await notice.hover();
  await notice
    .getByRole("button", { name: "Close toast", exact: true })
    .click();
  await expect(notice).toHaveCount(0);
  expect(state.calls(`read:${noticeId}`)).toHaveLength(0);
  expect(state.calls(`read:${makeNotice(2).id}`)).toHaveLength(0);
});

test("reminder timing pauses for hover and keyboard focus and resumes afterward", async ({
  page,
}) => {
  const state = await fixture(page, true);
  state.emit();
  const notice = page.locator('[data-variant="plan-reminder"]');
  await expect(notice).toBeVisible();
  await notice.hover();
  await page.clock.runFor(6000);
  await expect(notice).toBeVisible();
  await page.keyboard.press("F6");
  await page.mouse.move(20, 100);
  await page.clock.runFor(6000);
  await expect(notice).toBeVisible();
  await page
    .getByRole("button", { name: "Notifications, 1 unread", exact: true })
    .focus();
  await page.clock.runFor(6000);
  await expect(notice).toHaveCount(0);
  expect(state.wasRead()).toBe(false);
});

test("drawer and reminder toast respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = await fixture(page, true, { notices: [makeNotice()] });
  const dialog = await openInbox(page);
  await expect(dialog).toHaveCSS("transition-property", "none");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  state.emit(makeNotice(2));
  const notice = page.locator('[data-variant="plan-reminder"]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveCSS("transition-property", "none");
});

for (const viewport of [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1440, height: 520 },
]) {
  for (const dark of [false, true]) {
    test(`notification drawer and toast fit ${viewport.width}x${viewport.height} in ${dark ? "dark" : "light"} mode`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const longTitle =
        "Review the launch plan and prepare thoughtful feedback for the team before the next planning meeting ".repeat(
          3,
        );
      const notices = Array.from({ length: 105 }, (_, index) =>
        makeNotice(
          index + 1,
          index === 0
            ? {
                data: {
                  plan_uuid: planId,
                  title: longTitle,
                  date: "2026-10-08",
                  time: "14:30",
                  timezone: "Asia/Manila",
                },
              }
            : {},
        ),
      );
      const state = await fixture(page, true, { notices, dark });
      const dialog = await openInbox(page);
      await expect(dialog.getByRole("listitem")).toHaveCount(15);
      await expect(dialog).toHaveAttribute(
        "data-swipe-direction",
        viewport.width < 768 ? "down" : "right",
      );
      const box = (await dialog.boundingBox())!;
      expect(box.width).toBeCloseTo(
        viewport.width < 768 ? viewport.width : 448,
        0,
      );
      expect(box.height).toBeCloseTo(
        viewport.width < 768 ? viewport.height * 0.85 : viewport.height,
        0,
      );
      const header = (await dialog
        .getByRole("button", { name: "Unread", exact: true })
        .boundingBox())!;
      const list = dialog.getByRole("region", {
        name: "Notification list",
        exact: true,
      });
      await list.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect(
        (await dialog
          .getByRole("button", { name: "Unread", exact: true })
          .boundingBox())!.y,
      ).toBeCloseTo(header.y, 0);
      await expect(
        dialog.getByRole("button", { name: "Load more", exact: true }),
      ).toBeVisible();
      expect(
        await list.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await list.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({
        path: testInfo.outputPath("notification-drawer.png"),
      });
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).toBeHidden();
      state.emit(
        makeNotice(200, {
          data: {
            plan_uuid: planId,
            title: longTitle,
            date: "2026-10-08",
            time: "14:30",
            timezone: "Asia/Manila",
          },
        }),
      );
      const notice = page.locator('[data-variant="plan-reminder"]');
      await expect(notice).toBeVisible();
      await notice.hover();
      const action = (await notice
        .getByRole("button", { name: "View plan", exact: true })
        .boundingBox())!;
      const description = (await notice
        .locator('[data-slot="toast-description"]')
        .boundingBox())!;
      expect(action.y).toBeGreaterThanOrEqual(
        description.y + description.height,
      );
      const toastBox = (await notice.boundingBox())!;
      expect(toastBox.x).toBeGreaterThanOrEqual(0);
      expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(viewport.width);
      expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(viewport.height);
      expect(
        await notice.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("notification-toast.png"),
      });
      await testInfo.attach("Notification drawer", {
        path: testInfo.outputPath("notification-drawer.png"),
        contentType: "image/png",
      });
      await testInfo.attach("Reminder toast", {
        path: testInfo.outputPath("notification-toast.png"),
        contentType: "image/png",
      });
    });
  }
}

test.describe("touch dismissal", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("the phone drawer can be swiped down and returns focus to the bell", async ({
    page,
  }) => {
    await fixture(page, true, { notices: [makeNotice()] });
    const dialog = await openInbox(page);
    const box = (await dialog.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + 6);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (const offset of [40, 80, 140, 220, 280])
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + offset }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", {
        name: "Notifications, 1 unread",
        exact: true,
      }),
    ).toBeFocused();
    await cdp.detach();
  });
});

test.describe("schedule timezone", () => {
  test.use({ timezoneId: "America/Los_Angeles" });
  test("the scheduled date and time remain in the stored plan timezone", async ({
    page,
  }) => {
    const state = await fixture(page, true, { notices: [makeNotice()] });
    const dialog = await openInbox(page);
    await expect(
      dialog.getByText("Oct 8, 2026 · 2:30 PM · Asia/Manila", { exact: true }),
    ).toBeVisible();
    await expect(dialog.locator("time")).toContainText(
      "Received 2 minutes ago",
    );
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
    state.emit(makeNotice(2));
    await expect(page.locator('[data-slot="toast-schedule"]')).toHaveText(
      "Oct 8, 2026 · 2:30 PM · Asia/Manila",
    );
  });
});
