const START_HOUR = 7;
const END_HOUR = 17;
const STEP_MINUTES = 15;
const STORAGE_KEY = "online-kalender-events-v1";
const AUTH_KEY = "online-kalender-auth-v1";
const LOGIN_USER = "Axel";
const LOGIN_PASSWORD_SHA256 = "3eeb46f8a8a9e028b31775b5dfc1671a74d612154280e9c9ba18ae1ba9e4fd21";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const SUPABASE_CONFIG = window.KALENDER_SUPABASE_CONFIG || {};
const COLORS = ["#2a9187", "#e2a83b", "#d76666", "#6c8f3c", "#4f77b7", "#bd6f2e"];
const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember"
];

const state = {
  view: "week",
  anchorDate: startOfDay(new Date()),
  events: loadEvents(),
  currentUser: null,
  isLoadingRemote: false
};

let supabaseClient = null;
let realtimeChannel = null;

const elements = {
  appShell: document.querySelector("#app-shell"),
  authScreen: document.querySelector("#auth-screen"),
  loginForm: document.querySelector("#login-form"),
  loginUsername: document.querySelector("#login-username"),
  loginPassword: document.querySelector("#login-password"),
  loginError: document.querySelector("#login-error"),
  rangeLabel: document.querySelector("#range-label"),
  weekView: document.querySelector("#week-view"),
  monthView: document.querySelector("#month-view"),
  yearView: document.querySelector("#year-view"),
  tabs: [...document.querySelectorAll(".tab-button")],
  prevButton: document.querySelector("#prev-button"),
  nextButton: document.querySelector("#next-button"),
  todayButton: document.querySelector("#today-button"),
  newEventButton: document.querySelector("#new-event-button"),
  logoutButton: document.querySelector("#logout-button"),
  syncStatus: document.querySelector("#sync-status"),
  exportButton: document.querySelector("#export-button"),
  importInput: document.querySelector("#import-input"),
  dialog: document.querySelector("#event-dialog"),
  form: document.querySelector("#event-form"),
  dialogTitle: document.querySelector("#dialog-title"),
  eventId: document.querySelector("#event-id"),
  eventTitle: document.querySelector("#event-title"),
  eventDate: document.querySelector("#event-date"),
  eventStart: document.querySelector("#event-start"),
  eventEnd: document.querySelector("#event-end"),
  eventNote: document.querySelector("#event-note"),
  formError: document.querySelector("#form-error"),
  deleteButton: document.querySelector("#delete-event-button"),
  closeDialogButton: document.querySelector("#close-dialog-button"),
  cancelButton: document.querySelector("#cancel-event-button")
};

function isSupabaseConfigured() {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}

function useRemoteStorage() {
  return Boolean(supabaseClient && state.currentUser);
}

function updateSyncStatus(message = "") {
  if (!elements.syncStatus) return;
  if (message) {
    elements.syncStatus.textContent = message;
    return;
  }

  if (useRemoteStorage()) {
    elements.syncStatus.textContent = "Supabase synchronisiert";
  } else if (isSupabaseConfigured()) {
    elements.syncStatus.textContent = "Supabase bereit";
  } else {
    elements.syncStatus.textContent = "Lokal";
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

async function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (supabaseClient) return supabaseClient;

  if (!window.supabase) {
    await loadScript(SUPABASE_CDN);
  }

  supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return supabaseClient;
}

function emailForUsername(username) {
  const configuredUsers = SUPABASE_CONFIG.loginUsers || {};
  if (configuredUsers[username]) return configuredUsers[username];
  return username.includes("@") ? username : "";
}

function fromSupabaseRow(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    start: String(row.start_time).slice(0, 5),
    end: String(row.end_time).slice(0, 5),
    note: row.note || "",
    color: row.color || COLORS[0]
  };
}

function toSupabaseRow(event) {
  return {
    id: event.id,
    user_id: state.currentUser.id,
    title: event.title,
    event_date: event.date,
    start_time: event.start,
    end_time: event.end,
    note: event.note || "",
    color: event.color || colorForEvent(event)
  };
}

function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

function setAuthenticated(authenticated) {
  if (!isSupabaseConfigured() && authenticated) {
    localStorage.setItem(AUTH_KEY, "true");
  } else {
    localStorage.removeItem(AUTH_KEY);
  }

  elements.authScreen.hidden = authenticated;
  elements.appShell.hidden = !authenticated;
  updateSyncStatus();
}

async function sha256(value) {
  if (!crypto.subtle) {
    throw new Error("Web Crypto is unavailable.");
  }

  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleLogin(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  updateSyncStatus("Anmeldung...");

  try {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;

    if (isSupabaseConfigured()) {
      const client = await getSupabaseClient();
      const email = emailForUsername(username);

      if (!email) {
        elements.loginError.textContent = "Benutzername ist in supabase-config.js nicht hinterlegt.";
        updateSyncStatus();
        return;
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        elements.loginError.textContent = "Benutzername oder Passwort ist falsch.";
        updateSyncStatus();
        return;
      }

      state.currentUser = data.user;
      elements.loginPassword.value = "";
      setAuthenticated(true);
      await loadRemoteEvents();
      subscribeToRemoteEvents();
      return;
    }

    const passwordHash = await sha256(password);

    if (username === LOGIN_USER && passwordHash === LOGIN_PASSWORD_SHA256) {
      elements.loginPassword.value = "";
      setAuthenticated(true);
      render();
      return;
    }

    elements.loginError.textContent = "Benutzername oder Passwort ist falsch.";
    updateSyncStatus();
  } catch {
    elements.loginError.textContent = "Login ist nur über eine sichere HTTP/HTTPS-Seite möglich.";
    updateSyncStatus("Supabase nicht erreichbar");
  }
}

function loadEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  state.events.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
}

async function loadRemoteEvents() {
  if (!useRemoteStorage() || state.isLoadingRemote) return;
  state.isLoadingRemote = true;
  updateSyncStatus("Synchronisiere...");

  const { data, error } = await supabaseClient
    .from("calendar_events")
    .select("id,title,event_date,start_time,end_time,note,color")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  state.isLoadingRemote = false;

  if (error) {
    updateSyncStatus("Supabase Fehler");
    console.error(error);
    return;
  }

  state.events = data.map(fromSupabaseRow);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  updateSyncStatus();
  render();
}

async function saveRemoteEvent(event) {
  if (!useRemoteStorage()) return null;

  const { data, error } = await supabaseClient
    .from("calendar_events")
    .upsert(toSupabaseRow(event))
    .select("id,title,event_date,start_time,end_time,note,color")
    .single();

  if (error) {
    updateSyncStatus("Speichern fehlgeschlagen");
    console.error(error);
    throw error;
  }

  updateSyncStatus();
  return fromSupabaseRow(data);
}

async function deleteRemoteEvent(id) {
  if (!useRemoteStorage()) return;

  const { error } = await supabaseClient
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) {
    updateSyncStatus("Löschen fehlgeschlagen");
    console.error(error);
    throw error;
  }

  updateSyncStatus();
}

async function replaceRemoteEvents(events) {
  if (!useRemoteStorage()) return;

  const { error: deleteError } = await supabaseClient.from("calendar_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    updateSyncStatus("Import fehlgeschlagen");
    console.error(deleteError);
    throw deleteError;
  }

  if (!events.length) return;

  const { error: insertError } = await supabaseClient.from("calendar_events").insert(events.map(toSupabaseRow));
  if (insertError) {
    updateSyncStatus("Import fehlgeschlagen");
    console.error(insertError);
    throw insertError;
  }

  updateSyncStatus();
}

function subscribeToRemoteEvents() {
  if (!useRemoteStorage() || realtimeChannel) return;

  realtimeChannel = supabaseClient
    .channel("calendar_events_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "calendar_events",
        filter: `user_id=eq.${state.currentUser.id}`
      },
      () => loadRemoteEvents()
    )
    .subscribe();
}

function unsubscribeFromRemoteEvents() {
  if (realtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(realtimeChannel);
  }
  realtimeChannel = null;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameDate(a, b) {
  return dateKey(a) === dateKey(b);
}

function startOfWeek(date) {
  const day = date.getDay() || 7;
  return addDays(startOfDay(date), 1 - day);
}

function startOfMonthGrid(date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clampTime(time, fallback = "09:00") {
  const minutes = Number.isFinite(minutesFromTime(time || "")) ? minutesFromTime(time) : minutesFromTime(fallback);
  const min = START_HOUR * 60;
  const max = END_HOUR * 60 - STEP_MINUTES;
  return timeFromMinutes(Math.min(Math.max(minutes, min), max));
}

function defaultEnd(start) {
  const minutes = minutesFromTime(start);
  return timeFromMinutes(Math.min(minutes + 60, END_HOUR * 60));
}

function formatDate(date) {
  return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTimeRange(event) {
  return `${event.start}-${event.end}`;
}

function colorForEvent(event) {
  if (event.color) return event.color;
  const source = event.title || event.id || "";
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash + source.charCodeAt(index) * (index + 1)) % COLORS.length;
  }
  return COLORS[hash];
}

function eventsForDate(key) {
  return state.events
    .filter((event) => event.date === key)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function setView(nextView) {
  state.view = nextView;
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === nextView);
  });
  elements.weekView.hidden = nextView !== "week";
  elements.monthView.hidden = nextView !== "month";
  elements.yearView.hidden = nextView !== "year";
  render();
}

function move(direction) {
  if (state.view === "week") {
    state.anchorDate = addDays(state.anchorDate, direction * 7);
  } else if (state.view === "month") {
    state.anchorDate = addMonths(state.anchorDate, direction);
  } else {
    state.anchorDate = new Date(state.anchorDate.getFullYear() + direction, state.anchorDate.getMonth(), 1);
  }
  render();
}

function updateRangeLabel() {
  if (state.view === "week") {
    const start = startOfWeek(state.anchorDate);
    const end = addDays(start, 6);
    elements.rangeLabel.textContent = `${formatDate(start)} bis ${formatDate(end)}`;
    return;
  }

  if (state.view === "month") {
    elements.rangeLabel.textContent = `${MONTHS[state.anchorDate.getMonth()]} ${state.anchorDate.getFullYear()}`;
    return;
  }

  elements.rangeLabel.textContent = String(state.anchorDate.getFullYear());
}

function render() {
  updateRangeLabel();
  renderWeek();
  renderMonth();
  renderYear();
}

function renderWeek() {
  const weekStart = startOfWeek(state.anchorDate);
  const today = startOfDay(new Date());
  const grid = document.createElement("div");
  grid.className = "week-grid";

  const corner = document.createElement("div");
  corner.className = "week-corner";
  corner.style.gridColumn = "1";
  corner.style.gridRow = "1";
  grid.append(corner);

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(weekStart, dayIndex);
    const head = document.createElement("button");
    head.type = "button";
    head.className = "week-day-head";
    head.style.gridColumn = `${dayIndex + 2}`;
    head.style.gridRow = "1";
    head.innerHTML = `<span class="weekday-name">${WEEKDAYS_LONG[dayIndex]}</span><span class="weekday-date">${date.getDate()}</span>`;
    head.classList.toggle("is-today", isSameDate(date, today));
    head.addEventListener("click", () => openEventDialog({ date: dateKey(date), start: "09:00" }));
    grid.append(head);
  }

  const totalRows = ((END_HOUR - START_HOUR) * 60) / STEP_MINUTES;
  for (let step = 0; step < totalRows; step += 1) {
    const minutes = START_HOUR * 60 + step * STEP_MINUTES;
    const row = step + 2;
    if (minutes % 60 === 0) {
      const label = document.createElement("div");
      label.className = "time-label";
      label.style.gridColumn = "1";
      label.style.gridRow = `${row} / span 4`;
      label.textContent = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`;
      grid.append(label);
    }

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "slot-cell";
      slot.style.gridColumn = `${dayIndex + 2}`;
      slot.style.gridRow = `${row}`;
      slot.setAttribute("aria-label", `${WEEKDAYS_LONG[dayIndex]} ${timeFromMinutes(minutes)}`);
      slot.addEventListener("click", () => {
        const date = dateKey(addDays(weekStart, dayIndex));
        openEventDialog({ date, start: timeFromMinutes(minutes) });
      });
      grid.append(slot);
    }
  }

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = dateKey(addDays(weekStart, dayIndex));
    eventsForDate(date).forEach((event) => {
      const startOffset = (minutesFromTime(event.start) - START_HOUR * 60) / STEP_MINUTES;
      const endOffset = (minutesFromTime(event.end) - START_HOUR * 60) / STEP_MINUTES;
      const eventButton = createEventButton(event, "week-event");
      eventButton.style.gridColumn = `${dayIndex + 2}`;
      eventButton.style.gridRow = `${startOffset + 2} / ${Math.max(endOffset + 2, startOffset + 3)}`;
      grid.append(eventButton);
    });
  }

  elements.weekView.replaceChildren(wrap("week-shell", grid));
}

function renderMonth() {
  const monthStart = new Date(state.anchorDate.getFullYear(), state.anchorDate.getMonth(), 1);
  const gridStart = startOfMonthGrid(monthStart);
  const today = startOfDay(new Date());
  const shell = document.createElement("div");
  shell.className = "month-shell";

  const header = document.createElement("div");
  header.className = "month-header";
  WEEKDAYS_SHORT.forEach((day) => {
    const cell = document.createElement("div");
    cell.className = "month-head-cell";
    cell.textContent = day;
    header.append(cell);
  });

  const grid = document.createElement("div");
  grid.className = "month-grid";
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const key = dateKey(date);
    const dayEvents = eventsForDate(key);
    const day = document.createElement("div");
    day.className = "month-day";
    day.tabIndex = 0;
    day.role = "button";
    day.setAttribute("aria-label", formatDate(date));
    day.classList.toggle("is-muted", date.getMonth() !== monthStart.getMonth());
    day.classList.toggle("is-today", isSameDate(date, today));
    day.addEventListener("click", () => openEventDialog({ date: key, start: "09:00" }));
    day.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEventDialog({ date: key, start: "09:00" });
      }
    });

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());
    day.append(number);

    const eventList = document.createElement("span");
    eventList.className = "month-events";
    dayEvents.slice(0, 3).forEach((event) => {
      eventList.append(createEventButton(event, "month-event"));
    });
    if (dayEvents.length > 3) {
      const more = document.createElement("span");
      more.className = "more-events";
      more.textContent = `+${dayEvents.length - 3}`;
      eventList.append(more);
    }
    day.append(eventList);
    grid.append(day);
  }

  shell.append(header, grid);
  elements.monthView.replaceChildren(shell);
}

function renderYear() {
  const year = state.anchorDate.getFullYear();
  const today = startOfDay(new Date());
  const shell = document.createElement("div");
  shell.className = "year-shell";
  const grid = document.createElement("div");
  grid.className = "year-grid";

  for (let month = 0; month < 12; month += 1) {
    const monthBox = document.createElement("section");
    monthBox.className = "mini-month";
    const title = document.createElement("h3");
    title.textContent = MONTHS[month];
    const weekdays = document.createElement("div");
    weekdays.className = "mini-weekdays";
    WEEKDAYS_SHORT.forEach((day) => {
      const item = document.createElement("span");
      item.textContent = day;
      weekdays.append(item);
    });

    const days = document.createElement("div");
    days.className = "mini-days";
    const gridStart = startOfMonthGrid(new Date(year, month, 1));
    for (let index = 0; index < 42; index += 1) {
      const date = addDays(gridStart, index);
      const key = dateKey(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "year-day";
      button.textContent = String(date.getDate());
      button.classList.toggle("is-muted", date.getMonth() !== month);
      button.classList.toggle("is-today", isSameDate(date, today));
      button.classList.toggle("has-event", eventsForDate(key).length > 0);
      button.addEventListener("click", () => {
        state.anchorDate = date;
        setView("week");
        openEventDialog({ date: key, start: "09:00" });
      });
      days.append(button);
    }

    monthBox.append(title, weekdays, days);
    grid.append(monthBox);
  }

  shell.append(grid);
  elements.yearView.replaceChildren(shell);
}

function wrap(className, child) {
  const wrapper = document.createElement("div");
  wrapper.className = className;
  wrapper.append(child);
  return wrapper;
}

function createEventButton(event, extraClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `calendar-event ${extraClass}`;
  button.style.setProperty("--event-color", colorForEvent(event));
  button.innerHTML = `<strong>${escapeHtml(event.title)}</strong><span>${formatTimeRange(event)}</span>`;
  button.addEventListener("click", (incomingEvent) => {
    incomingEvent.stopPropagation();
    openEventDialog({ event });
  });
  return button;
}

function openEventDialog({ date = dateKey(state.anchorDate), start = "09:00", event = null } = {}) {
  const normalizedStart = clampTime(start);
  elements.formError.textContent = "";
  elements.eventId.value = event?.id || "";
  elements.eventTitle.value = event?.title || "";
  elements.eventDate.value = event?.date || date;
  elements.eventStart.value = event?.start || normalizedStart;
  elements.eventEnd.value = event?.end || defaultEnd(normalizedStart);
  elements.eventNote.value = event?.note || "";
  elements.dialogTitle.textContent = event ? "Termin bearbeiten" : "Neuer Termin";
  elements.deleteButton.hidden = !event;
  elements.dialog.showModal();
  requestAnimationFrame(() => elements.eventTitle.focus());
}

function closeDialog() {
  elements.dialog.close();
}

async function upsertEvent(formEvent) {
  formEvent.preventDefault();
  const id = elements.eventId.value || crypto.randomUUID();
  const title = elements.eventTitle.value.trim();
  const date = elements.eventDate.value;
  const start = elements.eventStart.value;
  const end = elements.eventEnd.value;
  const note = elements.eventNote.value.trim();
  const validation = validateEvent({ title, date, start, end });

  if (validation) {
    elements.formError.textContent = validation;
    return;
  }

  const existing = state.events.find((event) => event.id === id);
  const nextEvent = {
    id,
    title,
    date,
    start,
    end,
    note,
    color: existing?.color || COLORS[state.events.length % COLORS.length]
  };

  let savedEvent = nextEvent;
  if (useRemoteStorage()) {
    try {
      updateSyncStatus("Speichere...");
      savedEvent = await saveRemoteEvent(nextEvent);
    } catch {
      elements.formError.textContent = "Termin konnte nicht in Supabase gespeichert werden.";
      return;
    }
  }

  if (existing) {
    Object.assign(existing, savedEvent);
  } else {
    state.events.push(savedEvent);
  }

  state.anchorDate = fromDateKey(date);
  if (!useRemoteStorage()) {
    saveEvents();
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  }
  closeDialog();
  render();
}

function validateEvent(event) {
  if (!event.title) return "Bitte Titel eintragen.";
  if (!event.date) return "Bitte Datum wählen.";
  if (!event.start || !event.end) return "Bitte Uhrzeit wählen.";

  const start = minutesFromTime(event.start);
  const end = minutesFromTime(event.end);
  const min = START_HOUR * 60;
  const max = END_HOUR * 60;

  if (start < min || end > max) return "Termine sind von 07:00 bis 17:00 möglich.";
  if (end <= start) return "Das Ende muss nach dem Beginn liegen.";
  return "";
}

async function deleteSelectedEvent() {
  const id = elements.eventId.value;
  if (!id) return;
  if (!confirm("Termin löschen?")) return;

  if (useRemoteStorage()) {
    try {
      updateSyncStatus("Lösche...");
      await deleteRemoteEvent(id);
    } catch {
      elements.formError.textContent = "Termin konnte nicht in Supabase gelöscht werden.";
      return;
    }
  }

  state.events = state.events.filter((event) => event.id !== id);
  if (!useRemoteStorage()) {
    saveEvents();
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  }
  closeDialog();
  render();
}

function exportEvents() {
  const data = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      events: state.events
    },
    null,
    2
  );
  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `kalender-${dateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importEvents(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const incoming = Array.isArray(parsed) ? parsed : parsed.events;
      if (!Array.isArray(incoming)) throw new Error("Invalid file");
      const sanitized = incoming
        .filter((event) => validateImportedEvent(event))
        .map((event) => ({
          id: isUuid(event.id) ? String(event.id) : crypto.randomUUID(),
          title: String(event.title),
          date: String(event.date),
          start: String(event.start),
          end: String(event.end),
          note: String(event.note || ""),
          color: COLORS.includes(event.color) ? event.color : COLORS[0]
        }));

      if (useRemoteStorage()) {
        updateSyncStatus("Importiere...");
        await replaceRemoteEvents(sanitized);
      }

      state.events = sanitized;
      saveEvents();
      render();
    } catch {
      alert("Die Datei konnte nicht importiert werden.");
    } finally {
      elements.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

function validateImportedEvent(event) {
  return (
    event &&
    typeof event.title === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(event.date || "") &&
    /^\d{2}:\d{2}$/.test(event.start || "") &&
    /^\d{2}:\d{2}$/.test(event.end || "") &&
    !validateEvent({
      title: event.title,
      date: event.date,
      start: event.start,
      end: event.end
    })
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function logout() {
  unsubscribeFromRemoteEvents();

  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }

  state.currentUser = null;
  state.events = loadEvents();
  setAuthenticated(false);
  render();
}

async function initApp() {
  updateSyncStatus();

  if (isSupabaseConfigured()) {
    try {
      const client = await getSupabaseClient();
      const { data } = await client.auth.getSession();
      state.currentUser = data.session?.user || null;

      if (state.currentUser) {
        setAuthenticated(true);
        await loadRemoteEvents();
        subscribeToRemoteEvents();
        return;
      }
    } catch {
      updateSyncStatus("Supabase nicht erreichbar");
    }
  }

  setAuthenticated(isSupabaseConfigured() ? false : isAuthenticated());
  render();
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});
elements.prevButton.addEventListener("click", () => move(-1));
elements.nextButton.addEventListener("click", () => move(1));
elements.todayButton.addEventListener("click", () => {
  state.anchorDate = startOfDay(new Date());
  render();
});
elements.newEventButton.addEventListener("click", () => openEventDialog({ date: dateKey(state.anchorDate), start: "09:00" }));
elements.loginForm.addEventListener("submit", handleLogin);
elements.logoutButton.addEventListener("click", logout);
elements.form.addEventListener("submit", upsertEvent);
elements.deleteButton.addEventListener("click", deleteSelectedEvent);
elements.closeDialogButton.addEventListener("click", closeDialog);
elements.cancelButton.addEventListener("click", closeDialog);
elements.exportButton.addEventListener("click", exportEvents);
elements.importInput.addEventListener("change", () => importEvents(elements.importInput.files[0]));
window.addEventListener("focus", () => {
  if (useRemoteStorage()) {
    loadRemoteEvents();
  }
});

initApp();
