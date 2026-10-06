import { expect, test, type Page } from "@playwright/test";
import type { JournalEntry } from "@/features/journal/type";
import type { FocusMood, FocusSession, FocusSessionType, FocusSettings, FocusTask } from "./type";

test.use({ actionTimeout: 15_000 });

const taskUuid = "20000000-0000-4000-8000-000000000001";
const secondTaskUuid = "20000000-0000-4000-8000-000000000002";
const initialTasks: FocusTask[] = [
  { uuid: taskUuid, title: "Review research notes", linked: false, source: null, completed_at: null, session_count: 3, position: 0 },
  { uuid: secondTaskUuid, title: "Build the project dashboard", linked: true, source: { task_uuid: "board-task", project: "Product launch", board: "Development", stage: "In progress" }, completed_at: null, session_count: 1, position: 1 },
];
const initialSettings: FocusSettings = {
  focus_minutes: 25, short_break_minutes: 5, long_break_minutes: 15,
  sessions_before_long_break: 4, ask_before_next_session: true, ask_for_reflection: true, ambient_sound: "off",
};
const earlierEntry: JournalEntry = {
  uuid: "50000000-0000-4000-8000-000000000001", title: "Weekly notes", content_preview: "Earlier journal notes",
  content: JSON.stringify({ version: 1, blocks: [{ type: "paragraph", content: "Earlier journal notes" }] }),
  created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", resources: [], source: null,
};
type ApiRequest = { path: string; method: string; body: Record<string, unknown> | null; params: Record<string, string> };
type ApiOptions = { settings?: Partial<FocusSettings>; tasks?: FocusTask[]; active?: { type: FocusSessionType; paused?: boolean; remaining?: number }; journalOffset?: number; suggested?: FocusSessionType };

async function mockFocus(page: Page, options: ApiOptions = {}) {
  await page.clock.install({ time: new Date() });
  let virtualNow: number | null = null;
  const now = () => virtualNow ?? Date.now();
  const iso = () => new Date(now()).toISOString();
  let settings = { ...initialSettings, ...options.settings };
  let tasks = structuredClone(options.tasks ?? initialTasks);
  let active: FocusSession | null = null;
  let seeded = false;
  let sessionCount = 0;
  let suggested = options.suggested ?? "focus";
  const sessions = new Map<string, FocusSession>();
  const counted = new Set<string>();
  let today = { completed_focus_sessions: 3, focused_seconds: 4500 };
  const journal = [structuredClone(earlierEntry)];
  const requests: ApiRequest[] = [];
  const failures = new Map<string, number>();
  const holds = new Map<string, Promise<void>>();
  const makeSession = (type: FocusSessionType, uuid?: string, paused = false, remaining?: number) => {
    const duration = (type === "focus" ? settings.focus_minutes : type === "short_break" ? settings.short_break_minutes : settings.long_break_minutes) * 60;
    const task = tasks.find((item) => item.uuid === uuid);
    const session: FocusSession = {
      uuid: "30000000-0000-4000-8000-" + String(++sessionCount).padStart(12, "0"),
      type, status: paused ? "paused" : "running", duration_seconds: duration, remaining_seconds: remaining ?? duration,
      task: task ? { uuid: task.uuid, title: task.title } : null,
      started_at: iso(), ends_at: paused ? null : new Date(now() + (remaining ?? duration) * 1000).toISOString(),
      server_now: iso(), completed_at: null, mood: null, reflection_note: null,
    };
    sessions.set(session.uuid, session);
    active = session;
    return session;
  };
  const serialize = (session: FocusSession) => ({
    ...session, server_now: iso(),
    remaining_seconds: session.status === "running" && session.ends_at ? Math.max(0, Math.ceil((new Date(session.ends_at).getTime() - now()) / 1000)) : session.remaining_seconds,
  });
  const complete = (session: FocusSession) => {
    session.status = "completed";
    session.remaining_seconds = 0;
    session.ends_at = null;
    session.completed_at ??= iso();
    if (session.type === "focus" && !counted.has(session.uuid)) {
      counted.add(session.uuid);
      today = { completed_focus_sessions: today.completed_focus_sessions + 1, focused_seconds: today.focused_seconds + session.duration_seconds };
      const task = tasks.find((item) => item.uuid === session.task?.uuid);
      if (task) task.session_count += 1;
    }
    suggested = session.type === "focus" ? options.suggested ?? "short_break" : "focus";
    if (active?.uuid === session.uuid) active = null;
  };
  await page.route("**/api-test/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api-test/v1", "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    requests.push({ path, method, body, params: Object.fromEntries(url.searchParams) });
    const key = method + " " + path;
    if ((failures.get(key) ?? 0) > 0) {
      failures.set(key, failures.get(key)! - 1);
      await route.fulfill({ status: 500, json: { status: 500, message: "Request failed. Try again." } });
      return;
    }
    const hold = holds.get(key);
    holds.delete(key);
    if (hold) await hold;
    let data: unknown = null;
    if (path === "/auth/me") data = { id: 1, uuid: "user", first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", username: "ada", status: "active", font_family: "manrope" };
    else if (path === "/notifications") data = { current_page: 1, data: [], last_page: 1, per_page: 15, total: 0 };
    else if (path === "/focus") {
      if (!seeded) {
        seeded = true;
        if (options.active) makeSession(options.active.type, options.active.type === "focus" ? tasks[0]?.uuid : undefined, options.active.paused, options.active.remaining);
      }
      if (active?.status === "running" && active.ends_at && new Date(active.ends_at).getTime() <= now()) complete(active);
      data = { settings, tasks: tasks.filter((task) => !task.completed_at), active_session: active && serialize(active), today, suggested_next_type: suggested };
    } else if (path === "/focus/settings") { settings = body as FocusSettings; data = settings; }
    else if (path === "/focus/tasks" && method === "GET") data = tasks.filter((task) => url.searchParams.get("status") === "completed" ? task.completed_at : !task.completed_at);
    else if (path === "/focus/tasks" && method === "POST") {
      const linked = Boolean(body?.board_task_uuid);
      const task: FocusTask = { uuid: "20000000-0000-4000-8000-" + String(tasks.length + 10).padStart(12, "0"), title: linked ? "Draft dashboard layout" : String(body?.title), linked, source: null, completed_at: null, session_count: 0, position: tasks.length };
      tasks.push(task);
      data = task;
    } else if (path.startsWith("/focus/tasks/")) {
      const uuid = path.split("/").at(-1);
      const task = tasks.find((item) => item.uuid === uuid)!;
      if (method === "DELETE") tasks = tasks.filter((item) => item.uuid !== uuid);
      else { task.completed_at = body?.completed ? iso() : null; data = task; }
    } else if (path === "/focus/linkable-tasks") data = [{ uuid: "board-task-new", title: "Draft dashboard layout", project: "Product launch", board: "Development", stage: "In progress" }];
    else if (path === "/focus/sessions") data = serialize(makeSession(body?.type as FocusSessionType, body?.focus_task_uuid as string | undefined));
    else if (path.startsWith("/focus/sessions/")) {
      const parts = path.split("/");
      const session = sessions.get(parts[3])!;
      const action = parts[4];
      if (action === "pause") { session.remaining_seconds = serialize(session).remaining_seconds; session.status = "paused"; session.ends_at = null; }
      else if (action === "resume") { session.status = "running"; session.ends_at = new Date(now() + session.remaining_seconds * 1000).toISOString(); }
      else if (action === "cancel") { session.status = "cancelled"; session.ends_at = null; active = null; }
      else if (action === "complete") complete(session);
      else if (action === "reflection") {
        session.mood = body?.mood as FocusMood | null;
        session.reflection_note = typeof body?.note === "string" ? body.note.trim() : null;
        if (session.mood || session.reflection_note) {
          const existing = journal.find((item) => item.source?.session_uuid === session.uuid);
          const entry: JournalEntry = {
            uuid: existing?.uuid ?? "50000000-0000-4000-8000-000000000002", title: "Focus reflection — " + session.task?.title,
            content: JSON.stringify({ version: 1, blocks: [{ type: "paragraph", content: session.reflection_note ?? "" }] }),
            content_preview: session.reflection_note ?? "", created_at: iso(), updated_at: iso(), resources: [],
            source: { type: "focus_reflection", session_uuid: session.uuid, task_title: session.task?.title ?? null, completed_at: session.completed_at, mood: session.mood },
          };
          if (existing) Object.assign(existing, entry);
          else journal.unshift(entry);
        }
      }
      data = serialize(session);
    } else if (path === "/journal") {
      const offset = journal[0]?.source && options.journalOffset ? Array.from({ length: options.journalOffset }, (_, index) => ({ ...earlierEntry, uuid: "other-" + index, title: "Earlier reflection " + index })) : [];
      const ordered = [...offset, ...journal];
      const current = Number(url.searchParams.get("page") ?? 1);
      data = { current_page: current, data: ordered.slice((current - 1) * 15, current * 15), last_page: Math.ceil(ordered.length / 15), per_page: 15, total: ordered.length };
    } else if (path.startsWith("/journal/")) {
      const entry = journal.find((item) => item.uuid === path.split("/").at(-1));
      if (method === "PATCH" && entry) Object.assign(entry, body);
      data = entry;
    }
    await route.fulfill({ json: { data, status: 200, message: "Saved." } });
  });
  return {
    requests,
    calls: (path: string, method?: string) => requests.filter((item) => item.path === path && (!method || item.method === method)),
    reflections: () => requests.filter((item) => item.path.endsWith("/reflection") && item.method === "PUT"),
    failNext: (path: string, method: string, count = 1) => failures.set(method + " " + path, count),
    holdNext: (path: string, method: string) => {
      let release!: () => void;
      holds.set(method + " " + path, new Promise<void>((resolve) => { release = resolve; }));
      return release;
    },
    currentSession: () => active,
    entries: () => journal,
    expire: async () => {
      await page.clock.runFor(1000);
      const session = active!;
      const target = new Date(session.ends_at!).getTime() + 1000;
      virtualNow = target;
      await page.clock.fastForward(Math.max(1000, target - await page.evaluate(() => Date.now())));
    },
    reconcileExpired: async () => {
      await page.clock.runFor(1000);
      const target = new Date(active!.ends_at!).getTime() + 1000;
      virtualNow = target;
      await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 10);
      await page.clock.setSystemTime(target);
      const response = page.waitForResponse((item) => new URL(item.url()).pathname === "/api-test/v1/focus");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await response;
      await page.clock.runFor(1);
      await expect.poll(() => requests.filter((item) => item.path.endsWith("/complete")).length).toBe(1);
      await page.clock.resume();
    },
  };
}

async function openFocus(page: Page) {
  await page.goto("/focus");
  await expect(page.getByRole("heading", { name: "Focus Timer", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
}

async function completionDialog(page: Page) {
  const dialog = page.getByRole("dialog", { name: /^(Focus session|Break) complete$/ });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("opacity", "1");
  return dialog;
}

test("timer selection and phase controls work with keyboard and show readable daily totals", async ({ page }) => {
  await mockFocus(page);
  await openFocus(page);
  const timer = page.getByLabel("Focus timer", { exact: true });
  await expect(timer.getByRole("timer")).toHaveAttribute("aria-label", "Focus, 25:00 remaining");
  await expect(timer).toContainText("Sessions today3");
  await expect(timer).toContainText("Time focused1h 15m");
  const task = page.getByRole("button", { name: "Focus on Build the project dashboard", exact: true });
  await task.focus();
  await task.press("Space");
  await expect(timer.getByRole("heading", { name: initialTasks[1].title })).toBeVisible();
  const focus = timer.getByRole("button", { name: /^Focus\s*25 min$/ });
  await focus.focus();
  await focus.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(timer.getByRole("button", { name: "Start short break", exact: true })).toBeVisible();
  await expect(timer.getByRole("timer")).toHaveAttribute("aria-label", "Short break, 05:00 remaining");
});

test("empty Focus can add a validated task and select it without starting a session", async ({ page }) => {
  const api = await mockFocus(page, { tasks: [] });
  await openFocus(page);
  await page.getByRole("button", { name: "Add a task", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add focus task" });
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog.getByLabel("Task title", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Task title", { exact: true })).toBeFocused();
  await dialog.getByLabel("Task title", { exact: true }).fill("Read the next chapter");
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel("Focus timer", { exact: true }).getByRole("heading", { name: "Read the next chapter" })).toBeVisible();
  expect(api.calls("/focus/sessions", "POST")).toHaveLength(0);
  expect(api.calls("/focus/tasks", "POST")[0].body).toEqual({ title: "Read the next chapter" });
});

test("project task search has retry feedback, debounces typing, and links the chosen task", async ({ page }) => {
  const api = await mockFocus(page);
  api.failNext("/focus/linkable-tasks", "GET", 2);
  await openFocus(page);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add focus task" });
  await dialog.getByRole("tab", { name: "Project task", exact: true }).click();
  await expect(dialog.getByText("Project tasks could not be loaded.")).toBeVisible();
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Draft dashboard layout/ })).toBeVisible();
  await dialog.getByLabel("Search Project Board tasks", { exact: true }).pressSequentially("dashboard", { delay: 10 });
  await expect.poll(() => api.calls("/focus/linkable-tasks").filter((item) => item.params.search === "dashboard").length).toBe(1);
  expect(api.calls("/focus/linkable-tasks").some((item) => ["d", "da", "das"].includes(item.params.search))).toBe(false);
  await dialog.getByRole("button", { name: /Draft dashboard layout/ }).click();
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.calls("/focus/tasks", "POST")[0].body).toEqual({ board_task_uuid: "board-task-new" });
});

test("completed tasks load on demand and task completion and reopening are separate from selection", async ({ page }) => {
  const api = await mockFocus(page);
  await openFocus(page);
  expect(api.calls("/focus/tasks", "GET")).toHaveLength(0);
  await page.getByRole("button", { name: "Complete Review research notes", exact: true }).click();
  await expect(page.getByLabel("Focus timer", { exact: true }).getByRole("heading", { name: initialTasks[1].title })).toBeVisible();
  api.failNext("/focus/tasks", "GET", 2);
  await page.getByRole("tab", { name: "Completed", exact: true }).click();
  await expect(page.getByText("Completed tasks could not be loaded.")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "Reopen Review research notes", exact: true }).click();
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  await expect(page.getByRole("button", { name: "Focus on Review research notes", exact: true })).toBeVisible();
});

test("running and paused timers restore after reload and lock phase and task changes", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus", remaining: 900 } });
  await openFocus(page);
  await expect(page.getByRole("button", { name: "Focus on Build the project dashboard", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Focus timer", { exact: true }).getByRole("button", { name: /^Short break/ })).toBeDisabled();
  await page.getByRole("button", { name: "Actions for Review research notes", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Remove", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  const remaining = api.currentSession()!.remaining_seconds;
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(api.currentSession()!.remaining_seconds).toBe(remaining);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("Reset confirms cancellation and keeps completed statistics unchanged", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  const uuid = api.currentSession()!.uuid;
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Reset this session?" });
  await dialog.getByRole("button", { name: "Keep session", exact: true }).click();
  expect(api.calls("/focus/sessions/" + uuid + "/cancel", "POST")).toHaveLength(0);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await dialog.getByRole("button", { name: "Reset session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start focus", exact: true })).toBeVisible();
  await expect(page.getByLabel("Focus timer", { exact: true })).toContainText("Sessions today3");
  expect(api.reflections()).toHaveLength(0);
});

for (const askReflection of [false, true]) {
  for (const askNext of [false, true]) {
    test(`focus completion respects reflection=${askReflection} and ask next=${askNext}`, async ({ page }) => {
      const api = await mockFocus(page, { active: { type: "focus" }, settings: { ask_for_reflection: askReflection, ask_before_next_session: askNext } });
      await openFocus(page);
      await api.expire();
      if (askReflection) {
        const dialog = await completionDialog(page);
        await expect(dialog.getByLabel("Reflection note", { exact: false })).toBeVisible();
        await dialog.getByRole("button", { name: "Calm", exact: true }).click();
        await dialog.getByRole("button", { name: "Save to Journal", exact: true }).click();
        await expect.poll(() => api.reflections().length).toBe(1);
      }
      if (askNext) {
        const dialog = await completionDialog(page);
        await expect(dialog.getByLabel("Reflection note", { exact: false })).toHaveCount(0);
        expect(api.calls("/focus/sessions", "POST")).toHaveLength(0);
        await dialog.getByRole("button", { name: "Start short break", exact: true }).click();
      }
      await expect(page.getByRole("dialog", { name: "Focus session complete" })).toBeHidden();
      await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
      expect(api.calls("/focus/sessions", "POST")).toHaveLength(1);
      expect(api.calls("/focus/sessions", "POST")[0].body?.type).toBe("short_break");
      expect(api.reflections()).toHaveLength(askReflection ? 1 : 0);
    });
  }
}

for (const type of ["short_break", "long_break"] as const) {
  for (const askNext of [false, true]) {
    test(`${type} completion does not ask for reflection and respects ask next=${askNext}`, async ({ page }) => {
      const api = await mockFocus(page, { active: { type }, settings: { ask_before_next_session: askNext } });
      await openFocus(page);
      await page.getByRole("button", { name: "Focus on Build the project dashboard", exact: true }).click();
      await api.expire();
      if (askNext) {
        const dialog = await completionDialog(page);
        await expect(dialog.getByLabel("Reflection note", { exact: false })).toHaveCount(0);
        await dialog.getByRole("button", { name: "Start focus", exact: true }).click();
      }
      await expect(page.getByRole("dialog", { name: "Break complete" })).toBeHidden();
      await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
      expect(api.calls("/focus/sessions", "POST")[0].body).toEqual({ type: "focus", focus_task_uuid: secondTaskUuid });
      expect(api.reflections()).toHaveLength(0);
    });
  }
}

for (const content of ["mood", "note", "both"] as const) {
  test(`a ${content} reflection can save and finish without starting another session`, async ({ page }) => {
    const api = await mockFocus(page, { active: { type: "focus" }, settings: { ask_before_next_session: false } });
    await openFocus(page);
    await api.expire();
    const dialog = await completionDialog(page);
    if (content !== "note") await dialog.getByRole("button", { name: "Calm", exact: true }).click();
    if (content !== "mood") await dialog.getByLabel("Reflection note", { exact: false }).fill("  Clear progress today.  ");
    await dialog.getByRole("button", { name: "Save & finish", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Saved to Journal", { exact: true })).toBeVisible();
    expect(api.reflections()).toHaveLength(1);
    expect(api.reflections()[0].body).toEqual({ mood: content === "note" ? null : "calm", note: content === "mood" ? null : "Clear progress today." });
    expect(api.calls("/focus/sessions", "POST")).toHaveLength(0);
    expect(api.entries().filter((entry) => entry.source)).toHaveLength(1);
  });
}

test("empty reflections skip without creating a Journal entry and draft dismissal asks before discarding", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByLabel("Reflection note", { exact: false }).fill("Keep this draft");
  await dialog.getByRole("button", { name: "Skip reflection", exact: true }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard this reflection?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep writing", exact: true }).click();
  await expect(dialog.getByLabel("Reflection note", { exact: false })).toHaveValue("Keep this draft");
  await page.keyboard.press("Escape");
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Discard & finish", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.reflections()).toHaveLength(0);
  expect(api.calls("/focus/sessions", "POST")).toHaveLength(0);
});

test("skipping an empty reflection follows automatic transition settings without Journal writes", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" }, settings: { ask_before_next_session: false } });
  await openFocus(page);
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByRole("button", { name: "Skip reflection", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  expect(api.reflections()).toHaveLength(0);
  expect(api.entries().filter((entry) => entry.source)).toHaveLength(0);
});

test("failed saves retain the draft and retrying a failed next start does not save twice", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" }, settings: { ask_before_next_session: false } });
  await openFocus(page);
  const uuid = api.currentSession()!.uuid;
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByRole("button", { name: "Tired", exact: true }).click();
  await dialog.getByLabel("Reflection note", { exact: false }).fill("A slower pace next time.");
  api.failNext("/focus/sessions/" + uuid + "/reflection", "PUT");
  await dialog.getByRole("button", { name: "Save to Journal", exact: true }).click();
  await expect(dialog.getByText("Request failed. Try again.")).toBeVisible();
  await expect(dialog.getByLabel("Reflection note", { exact: false })).toHaveValue("A slower pace next time.");
  await expect(dialog.getByRole("button", { name: "Tired", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(api.calls("/focus/sessions", "POST")).toHaveLength(0);
  api.failNext("/focus/sessions", "POST");
  await dialog.getByRole("button", { name: "Save to Journal", exact: true }).click();
  await expect(dialog.getByText("Saved to Journal", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Request failed. Try again.")).toBeVisible();
  await dialog.getByRole("button", { name: "Start short break", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.reflections()).toHaveLength(2);
  expect(api.calls("/focus/sessions", "POST")).toHaveLength(2);
  expect(api.entries().filter((entry) => entry.source)).toHaveLength(1);
});

test("pending reflection saves block dismissal and duplicate submissions", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  const uuid = api.currentSession()!.uuid;
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByLabel("Reflection note", { exact: false }).fill("Keep this reflection.");
  const release = api.holdNext("/focus/sessions/" + uuid + "/reflection", "PUT");
  await dialog.getByRole("button", { name: "Save to Journal", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release();
  await expect(dialog.getByText("Saved to Journal", { exact: true })).toBeVisible();
  expect(api.reflections()).toHaveLength(1);
});

test("a failed completion can retry and a visibility refresh does not lose the reflection prompt", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  const uuid = api.currentSession()!.uuid;
  api.failNext("/focus/sessions/" + uuid + "/complete", "POST");
  await api.expire();
  await expect(page.getByText("Session completion could not be confirmed")).toBeVisible();
  await page.getByRole("button", { name: "Retry completion", exact: true }).click();
  const dialog = await completionDialog(page);
  await expect(dialog.getByLabel("Reflection note", { exact: false })).toBeVisible();
  expect(api.calls("/focus/sessions/" + uuid + "/complete", "POST")).toHaveLength(2);
});

test("server reconciliation before the timer tick still opens exactly one reflection prompt", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  const uuid = api.currentSession()!.uuid;
  await api.reconcileExpired();
  await completionDialog(page);
  expect(api.calls("/focus/sessions/" + uuid + "/complete", "POST")).toHaveLength(1);
});

test("a warm Journal cache refreshes and a saved reflection opens its exact editable entry", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await page.goto("/journal?entry=" + earlierEntry.uuid);
  await expect(page.getByLabel("Journal entry title")).toHaveValue(earlierEntry.title);
  await page.locator('a[href="/focus"]').first().click();
  await expect(page.getByRole("timer")).toBeVisible();
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByRole("button", { name: "Calm", exact: true }).click();
  await dialog.getByLabel("Reflection note", { exact: false }).fill("Made steady progress.");
  await dialog.getByRole("button", { name: "Save & finish", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "View in Journal", exact: true }).click();
  const saved = api.entries().find((entry) => entry.source)!;
  await expect(page).toHaveURL(new RegExp("/journal\\?entry=" + saved.uuid));
  await expect(page.getByLabel("Journal entry title")).toHaveValue(saved.title);
  await expect(page.getByRole("region", { name: "Journal entry editor" }).getByText("Made steady progress.", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Journal entry editor" }).getByText("calm", { exact: true })).toBeVisible();
  expect(api.calls("/journal", "GET").length).toBeGreaterThan(1);
});

test("Journal lookup walks pagination and lookup failure can retry without resaving", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" }, journalOffset: 15 });
  await openFocus(page);
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByLabel("Reflection note", { exact: false }).fill("A reflection to find.");
  await dialog.getByRole("button", { name: "Save & finish", exact: true }).click();
  await expect(dialog).toBeHidden();
  api.failNext("/journal", "GET");
  await page.getByRole("button", { name: "View in Journal", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open Journal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry opening entry", exact: true }).click();
  await expect(page.getByLabel("Journal entry title")).toHaveValue("Focus reflection — " + initialTasks[0].title);
  expect(api.calls("/journal", "GET").some((item) => item.params.page === "2")).toBe(true);
  expect(api.reflections()).toHaveLength(1);
});

test("automatic transitions stop when no active task remains", async ({ page }) => {
  const api = await mockFocus(page, { tasks: [], active: { type: "short_break" }, settings: { ask_before_next_session: false } });
  await openFocus(page);
  await api.expire();
  const dialog = await completionDialog(page);
  await expect(dialog.getByRole("button", { name: "Start focus", exact: true })).toBeDisabled();
  await expect(dialog.getByText("Add an active task to start another focus session.")).toBeVisible();
  expect(api.calls("/focus/sessions", "POST")).toHaveLength(0);
  await dialog.getByRole("button", { name: "Finish for now", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add a task", exact: true })).toBeVisible();
});

test("long breaks follow the server suggestion after focus completion", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" }, suggested: "long_break" });
  await openFocus(page);
  await api.expire();
  const dialog = await completionDialog(page);
  await dialog.getByRole("button", { name: "Skip reflection", exact: true }).click();
  await dialog.getByRole("button", { name: "Start long break", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.calls("/focus/sessions", "POST")[0].body?.type).toBe("long_break");
});

test("settings validate inline and do not change the duration of the active session", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Timer settings" });
  await expect(dialog.getByText("Save an optional mood and short note to your Journal.")).toBeVisible();
  await expect(dialog.getByRole("switch", { name: /Reflect after focus sessions/ })).toBeChecked();
  await dialog.getByLabel("Focus session", { exact: true }).fill("121");
  await dialog.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(dialog.getByText("Choose 120 minutes or fewer.")).toBeVisible();
  await expect(dialog.getByLabel("Focus session", { exact: true })).toBeFocused();
  await expect(dialog.getByLabel("Focus session", { exact: true })).toHaveAccessibleDescription("1–120 minutes Choose 120 minutes or fewer.");
  expect(api.calls("/focus/settings", "PUT")).toHaveLength(0);
  await dialog.getByLabel("Focus session", { exact: true }).fill("30");
  await dialog.getByLabel("Sessions before long break", { exact: true }).fill("2.5");
  await dialog.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(dialog.getByText("Enter a whole number.")).toBeVisible();
  await dialog.getByLabel("Sessions before long break", { exact: true }).fill("4");
  api.failNext("/focus/settings", "PUT");
  await dialog.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(dialog.getByText("Request failed. Try again.")).toBeVisible();
  await expect(dialog.getByLabel("Focus session", { exact: true })).toHaveValue("30");
  await dialog.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(api.currentSession()!.duration_seconds).toBe(1500);
  await page.getByLabel("Sound", { exact: true }).click();
  await page.getByRole("option", { name: "Brown noise", exact: true }).click();
  await expect(page.getByLabel("Sound", { exact: true })).toContainText("Brown noise");
  await expect.poll(() => api.calls("/focus/settings", "PUT").at(-1)?.body?.ambient_sound).toBe("brown");
});

test("manual session requests and reset cancellation expose retries without losing the timer", async ({ page }) => {
  const api = await mockFocus(page);
  await openFocus(page);
  api.failNext("/focus/sessions", "POST");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(page.getByText("Request failed. Try again.")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  const uuid = api.currentSession()!.uuid;
  api.failNext("/focus/sessions/" + uuid + "/pause", "POST");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Request failed. Try again.")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  api.failNext("/focus/sessions/" + uuid + "/cancel", "POST");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Reset this session?" });
  await dialog.getByRole("button", { name: "Reset session", exact: true }).click();
  await expect(dialog.getByText("Request failed. Try again.")).toBeVisible();
  await dialog.getByRole("button", { name: "Reset session", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Start focus", exact: true })).toBeVisible();
});

test("background refresh failures retain the active timer and can retry", async ({ page }) => {
  const api = await mockFocus(page, { active: { type: "focus" } });
  await openFocus(page);
  api.failNext("/focus", "GET", 2);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Focus could not be refreshed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Focus could not be refreshed", { exact: true })).toBeHidden();
});

for (const width of [390, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`Focus and settings stay usable at ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const tasks = Array.from({ length: 25 }, (_, index) => ({ ...initialTasks[0], uuid: "task-" + index, title: index === 0 ? "Review the detailed research notes and plan the next improvements to the project" : "Prepare the next project milestone " + index }));
      await mockFocus(page, { tasks });
      await openFocus(page);
      const start = page.getByRole("button", { name: "Start focus", exact: true });
      const bounds = (await start.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(width === 390 ? 844 : 1000);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`focus-${width}-${theme}.png`) });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Timer settings" });
      await expect(dialog).toBeVisible();
      const save = (await dialog.getByRole("button", { name: "Save settings", exact: true }).boundingBox())!;
      expect(save.height).toBeGreaterThanOrEqual(44);
      expect(save.y + save.height).toBeLessThanOrEqual(width === 390 ? 844 : 1000);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`focus-settings-${width}-${theme}.png`) });
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).toBeHidden();
    });

    test(`reflections stay usable at ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      const api = await mockFocus(page, { active: { type: "focus" } });
      await openFocus(page);
      await api.expire();
      const dialog = await completionDialog(page);
      await dialog.getByLabel("Reflection note", { exact: false }).fill("A useful session. I know what to do next.");
      await dialog.getByRole("button", { name: "Calm", exact: true }).click();
      const finish = (await dialog.getByRole("button", { name: "Save & finish", exact: true }).boundingBox())!;
      expect(finish.height).toBeGreaterThanOrEqual(44);
      expect(finish.y + finish.height).toBeLessThanOrEqual(width === 390 ? 844 : 1000);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`focus-reflection-${width}-${theme}.png`) });
      await dialog.getByRole("button", { name: "Save & finish", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.locator("#focus-primary-action")).toBeFocused();
    });
  }
}
