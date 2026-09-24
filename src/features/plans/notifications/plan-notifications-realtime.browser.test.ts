import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";

const noticeId = "b86b941b-f609-4e33-91ed-95bfb3c49b09";
const planId = "eb0c597d-76a4-49d5-a47f-65b7c815c519";

async function fixture(page: Page, useSocket: boolean) {
  let delivered = false;
  let subscribed = false;
  let authorizations = 0;
  const sockets: WebSocketRoute[] = [];

  if (useSocket) {
    await page.routeWebSocket(/\/app\/test-key(?:\?|$)/, (socket) => {
      sockets.push(socket);
      socket.onMessage((message) => {
        const frame = JSON.parse(String(message)) as { event: string; data?: { channel?: string } };
        if (frame.event !== "pusher:subscribe") return;

        subscribed = frame.data?.channel === "private-users.7.notifications";
        socket.send(JSON.stringify({
          event: "pusher_internal:subscription_succeeded",
          channel: frame.data?.channel,
          data: "{}",
        }));
      });
      socket.send(JSON.stringify({
        event: "pusher:connection_established",
        data: JSON.stringify({ socket_id: "123.456", activity_timeout: 30 }),
      }));
    });
  }

  await page.route("**/api-test/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api-test/v1", "");
    let data: unknown = [];

    if (path === "/auth/me") {
      data = { id: 7, first_name: "Test", last_name: "User", username: "tester", roles: [] };
    } else if (path === "/broadcasting/auth") {
      authorizations += 1;
      data = { auth: "test-key:signature" };
      await route.fulfill({ json: data });
      return;
    } else if (path === "/notifications") {
      const notice = {
        id: noticeId,
        type: "App\\Notifications\\CalendarPlanReminder",
        data: { plan_uuid: planId, title: "Meet the team", date: "2026-09-25", time: "14:30", timezone: "Asia/Manila" },
        read_at: null,
        created_at: "2026-09-24T00:00:00.000Z",
      };
      const notices = delivered ? [notice] : [];
      data = { current_page: 1, data: notices, last_page: 1, per_page: 15, total: notices.length };
    }

    await route.fulfill({ json: { data, status: 200, message: "OK" } });
  });

  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Plans" })).toBeVisible();

  return {
    sockets,
    getSubscribed: () => subscribed,
    getAuthorizations: () => authorizations,
    deliver: () => { delivered = true; },
  };
}

test("a Reverb reminder refreshes the bell and open sheet", async ({ page }) => {
  const state = await fixture(page, true);
  await expect.poll(state.getSubscribed).toBe(true);
  expect(state.getAuthorizations()).toBe(1);

  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(page.getByText("All caught up")).toBeVisible();

  state.deliver();
  state.sockets[0].send(JSON.stringify({
    event: "calendar.plan-reminder.delivered",
    channel: "private-users.7.notifications",
    data: JSON.stringify({ notification_id: noticeId }),
  }));

  await expect(page.getByText("1 unread notification")).toBeVisible();
  await expect(page.getByText("Meet the team")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: /Notifications, 1 unread/ })).toBeVisible();
});

test("reconnecting refreshes reminders missed while offline", async ({ page }) => {
  const state = await fixture(page, true);
  await expect.poll(state.getSubscribed).toBe(true);
  await state.sockets[0].close();
  state.deliver();

  await expect.poll(() => state.sockets.length).toBeGreaterThan(1);
  await expect(page.getByRole("button", { name: /Notifications, 1 unread/ })).toBeVisible();
});

test("the sheet still loads reminders when Reverb is unavailable", async ({ page }) => {
  const state = await fixture(page, false);
  state.deliver();

  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(page.getByText("Meet the team")).toBeVisible();
});
