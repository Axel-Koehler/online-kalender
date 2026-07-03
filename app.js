const START_HOUR = 7;
const END_HOUR = 17;
const STEP_MINUTES = 15;
const STORAGE_KEY = "online-kalender-events-v1";
const MAINTENANCE_STORAGE_KEY = "online-kalender-maintenance-v1";
const AUTH_KEY = "online-kalender-auth-v1";
const LOGIN_USER = "Axel";
const LOGIN_PASSWORD_SHA256 = "3eeb46f8a8a9e028b31775b5dfc1671a74d612154280e9c9ba18ae1ba9e4fd21";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const SUPABASE_CONFIG = window.KALENDER_SUPABASE_CONFIG || {};
const SUPABASE_COLUMNS = "id,title,event_date,end_date,start_time,end_time,note,color";
const SUPABASE_COLUMNS_LEGACY = "id,title,event_date,start_time,end_time,note,color";
const MAINTENANCE_COLUMNS = "id,customer,address,system,customer_type,has_maintenance_contract,appointment_scheduled,phone,last_maintenance,next_maintenance";
const MAINTENANCE_COLUMNS_LEGACY = "id,customer,address,system,customer_type,has_maintenance_contract,phone,last_maintenance,next_maintenance";
const END_DATE_NOTE_PATTERN = /^\[\[online-kalender:end_date=(\d{4}-\d{2}-\d{2})\]\]\n?/;
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
const FIXED_HOLIDAYS_SAXONY_ANHALT = [
  { month: 0, day: 1, name: "Neujahr" },
  { month: 0, day: 6, name: "Heilige Drei Könige" },
  { month: 4, day: 1, name: "Tag der Arbeit" },
  { month: 9, day: 3, name: "Tag der Deutschen Einheit" },
  { month: 9, day: 31, name: "Reformationstag" },
  { month: 11, day: 25, name: "1. Weihnachtstag" },
  { month: 11, day: 26, name: "2. Weihnachtstag" }
];
const EASTER_HOLIDAYS_SAXONY_ANHALT = [
  { offset: -2, name: "Karfreitag" },
  { offset: 1, name: "Ostermontag" },
  { offset: 39, name: "Christi Himmelfahrt" },
  { offset: 50, name: "Pfingstmontag" }
];

const state = {
  page: "calendar",
  view: "week",
  anchorDate: startOfDay(new Date()),
  events: loadEvents(),
  maintenance: loadMaintenanceRecords(),
  currentUser: null,
  isLoadingRemote: false
};

let supabaseClient = null;
let realtimeChannel = null;
let remoteSupportsEndDate = null;
let remoteSupportsMaintenanceAppointment = null;
const holidaysByYear = new Map();

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
  maintenanceView: document.querySelector("#maintenance-view"),
  tabs: [...document.querySelectorAll(".tab-button")],
  viewTabs: [...document.querySelectorAll('[data-view="week"], [data-view="month"], [data-view="year"]')],
  maintenancePageButton: document.querySelector("#maintenance-page-button"),
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
  eventEndDate: document.querySelector("#event-end-date"),
  eventStart: document.querySelector("#event-start"),
  eventEnd: document.querySelector("#event-end"),
  eventNote: document.querySelector("#event-note"),
  formError: document.querySelector("#form-error"),
  deleteButton: document.querySelector("#delete-event-button"),
  closeDialogButton: document.querySelector("#close-dialog-button"),
  cancelButton: document.querySelector("#cancel-event-button"),
  maintenanceForm: document.querySelector("#maintenance-form"),
  maintenanceId: document.querySelector("#maintenance-id"),
  maintenanceCustomer: document.querySelector("#maintenance-customer"),
  maintenanceAddress: document.querySelector("#maintenance-address"),
  maintenanceSystem: document.querySelector("#maintenance-system"),
  maintenancePrivate: document.querySelector("#maintenance-private"),
  maintenanceCommercial: document.querySelector("#maintenance-commercial"),
  maintenanceContract: document.querySelector("#maintenance-contract"),
  maintenanceAppointment: document.querySelector("#maintenance-appointment"),
  maintenancePhone: document.querySelector("#maintenance-phone"),
  maintenanceLastDate: document.querySelector("#maintenance-last-date"),
  maintenanceNextDate: document.querySelector("#maintenance-next-date"),
  maintenanceError: document.querySelector("#maintenance-error"),
  maintenanceResetButton: document.querySelector("#maintenance-reset-button"),
  maintenanceList: document.querySelector("#maintenance-list")
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

function isMissingEndDateColumn(error) {
  const message = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return message.includes("end_date") || message.includes("PGRST204") || message.includes("42703");
}

function isMissingMaintenanceAppointmentColumn(error) {
  const message = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return message.includes("appointment_scheduled") || message.includes("PGRST204") || message.includes("42703");
}

function unpackStoredNote(note) {
  const cleanNote = String(note || "");
  const match = cleanNote.match(END_DATE_NOTE_PATTERN);
  if (!match) {
    return { note: cleanNote, endDate: "" };
  }

  return {
    note: cleanNote.replace(END_DATE_NOTE_PATTERN, ""),
    endDate: match[1]
  };
}

function packStoredNote(event, includeEndDateColumn) {
  const cleanNote = String(event.note || "").replace(END_DATE_NOTE_PATTERN, "");
  if (includeEndDateColumn || !isMultiDayEvent(event)) {
    return cleanNote;
  }

  return `[[online-kalender:end_date=${getEventEndDate(event)}]]\n${cleanNote}`;
}

function fromSupabaseRow(row) {
  const storedNote = unpackStoredNote(row.note);
  const endDate = row.end_date || storedNote.endDate || row.event_date;
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    endDate,
    start: String(row.start_time).slice(0, 5),
    end: String(row.end_time).slice(0, 5),
    note: storedNote.note,
    color: row.color || COLORS[0]
  };
}

function toSupabaseRow(event, includeEndDateColumn = true) {
  const row = {
    id: event.id,
    user_id: state.currentUser.id,
    title: event.title,
    event_date: event.date,
    start_time: event.start,
    end_time: event.end,
    note: packStoredNote(event, includeEndDateColumn),
    color: event.color || colorForEvent(event)
  };

  if (includeEndDateColumn) {
    row.end_date = getEventEndDate(event);
  }

  return row;
}

function fromMaintenanceRow(row) {
  return normalizeMaintenanceRecord({
    id: row.id,
    customer: row.customer,
    address: row.address,
    system: row.system,
    customerType: row.customer_type,
    hasMaintenanceContract: row.has_maintenance_contract,
    appointmentScheduled: row.appointment_scheduled,
    phone: row.phone,
    lastMaintenance: row.last_maintenance,
    nextMaintenance: row.next_maintenance
  });
}

function toMaintenanceRow(record, includeAppointmentColumn = true) {
  const row = {
    id: record.id,
    customer: record.customer,
    address: record.address,
    system: record.system,
    customer_type: record.customerType,
    has_maintenance_contract: record.hasMaintenanceContract,
    phone: record.phone,
    last_maintenance: record.lastMaintenance,
    next_maintenance: record.nextMaintenance
  };

  if (includeAppointmentColumn) {
    row.appointment_scheduled = record.appointmentScheduled;
  }

  return row;
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
      await loadRemoteMaintenanceRecords();
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
    return Array.isArray(parsed)
      ? parsed
          .map((event, index) => normalizeEvent(event, COLORS[index % COLORS.length]))
          .filter((event) => validateImportedEvent(event))
      : [];
  } catch {
    return [];
  }
}

function loadMaintenanceRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MAINTENANCE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeMaintenanceRecord)
          .filter(validateMaintenanceRecord)
          .sort(compareMaintenanceRecords)
      : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  state.events.sort((a, b) => `${a.date} ${a.start} ${getEventEndDate(a)}`.localeCompare(`${b.date} ${b.start} ${getEventEndDate(b)}`));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
}

function saveMaintenanceRecords() {
  state.maintenance.sort(compareMaintenanceRecords);
  localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(state.maintenance));
}

async function loadRemoteEvents() {
  if (!useRemoteStorage() || state.isLoadingRemote) return;
  state.isLoadingRemote = true;
  updateSyncStatus("Synchronisiere...");

  const selectColumns = remoteSupportsEndDate === false ? SUPABASE_COLUMNS_LEGACY : SUPABASE_COLUMNS;
  let { data, error } = await supabaseClient
    .from("calendar_events")
    .select(selectColumns)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error && remoteSupportsEndDate !== false && isMissingEndDateColumn(error)) {
    remoteSupportsEndDate = false;
    ({ data, error } = await supabaseClient
      .from("calendar_events")
      .select(SUPABASE_COLUMNS_LEGACY)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true }));
  } else if (!error) {
    remoteSupportsEndDate = remoteSupportsEndDate !== false;
  }

  state.isLoadingRemote = false;

  if (error) {
    updateSyncStatus("Supabase Fehler");
    console.error(error);
    return;
  }

  state.events = data.map(fromSupabaseRow).map((event, index) => normalizeEvent(event, COLORS[index % COLORS.length]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  updateSyncStatus();
  render();
}

async function loadRemoteMaintenanceRecords() {
  if (!useRemoteStorage()) return;

  let includeAppointmentColumn = remoteSupportsMaintenanceAppointment !== false;
  let { data, error } = await supabaseClient
    .from("maintenance_records")
    .select(includeAppointmentColumn ? MAINTENANCE_COLUMNS : MAINTENANCE_COLUMNS_LEGACY)
    .order("next_maintenance", { ascending: true })
    .order("customer", { ascending: true });

  if (error && includeAppointmentColumn && isMissingMaintenanceAppointmentColumn(error)) {
    remoteSupportsMaintenanceAppointment = false;
    ({ data, error } = await supabaseClient
      .from("maintenance_records")
      .select(MAINTENANCE_COLUMNS_LEGACY)
      .order("next_maintenance", { ascending: true })
      .order("customer", { ascending: true }));
  } else if (!error) {
    remoteSupportsMaintenanceAppointment = includeAppointmentColumn;
  }

  if (error) {
    updateSyncStatus("Supabase Fehler");
    console.error(error);
    return;
  }

  state.maintenance = data.map(fromMaintenanceRow).filter(validateMaintenanceRecord).sort(compareMaintenanceRecords);
  localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(state.maintenance));
  updateSyncStatus();
  renderMaintenance();
}

async function saveRemoteEvent(event) {
  if (!useRemoteStorage()) return null;

  let includeEndDateColumn = remoteSupportsEndDate !== false;
  let { data, error } = await supabaseClient
    .from("calendar_events")
    .upsert(toSupabaseRow(event, includeEndDateColumn))
    .select(includeEndDateColumn ? SUPABASE_COLUMNS : SUPABASE_COLUMNS_LEGACY)
    .single();

  if (error && includeEndDateColumn && isMissingEndDateColumn(error)) {
    remoteSupportsEndDate = false;
    includeEndDateColumn = false;
    ({ data, error } = await supabaseClient
      .from("calendar_events")
      .upsert(toSupabaseRow(event, false))
      .select(SUPABASE_COLUMNS_LEGACY)
      .single());
  } else if (!error) {
    remoteSupportsEndDate = includeEndDateColumn;
  }

  if (error) {
    updateSyncStatus("Speichern fehlgeschlagen");
    console.error(error);
    throw error;
  }

  updateSyncStatus();
  return fromSupabaseRow(data);
}

async function saveRemoteMaintenanceRecord(record) {
  if (!useRemoteStorage()) return null;

  let includeAppointmentColumn = remoteSupportsMaintenanceAppointment !== false;
  let { data, error } = await supabaseClient
    .from("maintenance_records")
    .upsert(toMaintenanceRow(record, includeAppointmentColumn))
    .select(includeAppointmentColumn ? MAINTENANCE_COLUMNS : MAINTENANCE_COLUMNS_LEGACY)
    .single();

  if (error && includeAppointmentColumn && isMissingMaintenanceAppointmentColumn(error)) {
    remoteSupportsMaintenanceAppointment = false;
    ({ data, error } = await supabaseClient
      .from("maintenance_records")
      .upsert(toMaintenanceRow(record, false))
      .select(MAINTENANCE_COLUMNS_LEGACY)
      .single());
  } else if (!error) {
    remoteSupportsMaintenanceAppointment = includeAppointmentColumn;
  }

  if (error) {
    updateSyncStatus("Speichern fehlgeschlagen");
    console.error(error);
    throw error;
  }

  updateSyncStatus();
  return fromMaintenanceRow(data);
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

async function deleteRemoteMaintenanceRecord(id) {
  if (!useRemoteStorage()) return;

  const { error } = await supabaseClient
    .from("maintenance_records")
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

  let includeEndDateColumn = remoteSupportsEndDate !== false;
  let { error: insertError } = await supabaseClient.from("calendar_events").insert(events.map((event) => toSupabaseRow(event, includeEndDateColumn)));
  if (insertError && includeEndDateColumn && isMissingEndDateColumn(insertError)) {
    remoteSupportsEndDate = false;
    includeEndDateColumn = false;
    ({ error: insertError } = await supabaseClient.from("calendar_events").insert(events.map((event) => toSupabaseRow(event, false))));
  } else if (!insertError) {
    remoteSupportsEndDate = includeEndDateColumn;
  }

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
        },
      () => loadRemoteEvents()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "maintenance_records",
        },
      () => loadRemoteMaintenanceRecords()
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

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function compareDateKeys(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

function getEventEndDate(event) {
  const endDate = isDateKey(event?.endDate) ? event.endDate : event?.date;
  return compareDateKeys(endDate, event?.date) >= 0 ? endDate : event?.date;
}

function isMultiDayEvent(event) {
  return compareDateKeys(getEventEndDate(event), event?.date) > 0;
}

function eventIncludesDate(event, key) {
  return compareDateKeys(key, event.date) >= 0 && compareDateKeys(key, getEventEndDate(event)) <= 0;
}

function eventSegmentForDate(event, key) {
  return {
    start: key === event.date ? event.start : timeFromMinutes(START_HOUR * 60),
    end: key === getEventEndDate(event) ? event.end : timeFromMinutes(END_HOUR * 60)
  };
}

function normalizeEvent(event, fallbackColor = COLORS[0]) {
  const date = String(event?.date || "");
  const rawEndDate = String(event?.endDate || date);
  const endDate = compareDateKeys(rawEndDate, date) >= 0 ? rawEndDate : date;
  return {
    id: isUuid(event?.id) ? String(event.id) : crypto.randomUUID(),
    title: String(event?.title || ""),
    date,
    endDate,
    start: String(event?.start || ""),
    end: String(event?.end || ""),
    note: String(event?.note || "").replace(END_DATE_NOTE_PATTERN, ""),
    color: COLORS.includes(event?.color) ? event.color : fallbackColor
  };
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

function getCalendarWeek(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function holidaysForYear(year) {
  if (holidaysByYear.has(year)) return holidaysByYear.get(year);

  const holidays = new Map();
  FIXED_HOLIDAYS_SAXONY_ANHALT.forEach((holiday) => {
    holidays.set(dateKey(new Date(year, holiday.month, holiday.day)), holiday);
  });

  const easterSunday = getEasterSunday(year);
  EASTER_HOLIDAYS_SAXONY_ANHALT.forEach((holiday) => {
    holidays.set(dateKey(addDays(easterSunday, holiday.offset)), holiday);
  });

  holidaysByYear.set(year, holidays);
  return holidays;
}

function holidayForDate(date) {
  return holidaysForYear(date.getFullYear()).get(dateKey(date)) || null;
}

function holidayForKey(key) {
  return isDateKey(key) ? holidayForDate(fromDateKey(key)) : null;
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

function formatDateShort(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`;
}

function formatTimeRange(event) {
  if (isMultiDayEvent(event)) {
    return `${formatDateShort(fromDateKey(event.date))} bis ${formatDateShort(fromDateKey(getEventEndDate(event)))} ${event.start}-${event.end}`;
  }

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
    .filter((event) => eventIncludesDate(event, key))
    .sort((a, b) => `${a.start} ${a.date}`.localeCompare(`${b.start} ${b.date}`));
}

function clearActiveTabs() {
  document.querySelectorAll(".tab-button.is-active").forEach((tab) => tab.classList.remove("is-active"));
}

function setPage(nextPage) {
  if (nextPage === "maintenance") {
    state.view = "maintenance";
  }

  if (nextPage === "calendar") {
    elements.weekView.hidden = state.view !== "week";
    elements.monthView.hidden = state.view !== "month";
    elements.yearView.hidden = state.view !== "year";
    elements.maintenanceView.hidden = true;
  } else {
    elements.weekView.hidden = true;
    elements.monthView.hidden = true;
    elements.yearView.hidden = true;
    elements.maintenanceView.hidden = false;
  }

  document.querySelector("#tasks-view")?.setAttribute("hidden", "");
  document.querySelector("#orders-view")?.setAttribute("hidden", "");
  document.querySelector("#inquiries-view")?.setAttribute("hidden", "");
  document.querySelector("#work-reports-view")?.setAttribute("hidden", "");
  document.querySelector("#cooling-load-view")?.setAttribute("hidden", "");
  document.querySelector("#cold-room-load-view")?.setAttribute("hidden", "");
  clearActiveTabs();
  if (nextPage === "calendar") {
    document.querySelector(`.tab-button[data-view="${state.view}"]`)?.classList.add("is-active");
  }
  if (nextPage === "maintenance") {
    elements.maintenancePageButton.classList.add("is-active");
  }
  elements.prevButton.hidden = nextPage !== "calendar";
  elements.nextButton.hidden = nextPage !== "calendar";
  elements.todayButton.hidden = nextPage !== "calendar";
  elements.newEventButton.hidden = nextPage !== "calendar";
  render();
}

function setView(nextView) {
  state.view = nextView;
  clearActiveTabs();
  document.querySelector(`.tab-button[data-view="${nextView}"]`)?.classList.add("is-active");
  elements.weekView.hidden = nextView !== "week";
  elements.monthView.hidden = nextView !== "month";
  elements.yearView.hidden = nextView !== "year";
  elements.maintenanceView.hidden = true;
  document.querySelector("#tasks-view")?.setAttribute("hidden", "");
  document.querySelector("#orders-view")?.setAttribute("hidden", "");
  document.querySelector("#inquiries-view")?.setAttribute("hidden", "");
  document.querySelector("#work-reports-view")?.setAttribute("hidden", "");
  document.querySelector("#cooling-load-view")?.setAttribute("hidden", "");
  document.querySelector("#cold-room-load-view")?.setAttribute("hidden", "");
  document.querySelector("#tasks-axel-tab")?.classList.remove("is-active");
  document.querySelector("#orders-tab")?.classList.remove("is-active");
  document.querySelector("#inquiries-tab")?.classList.remove("is-active");
  document.querySelector("#work-reports-tab")?.classList.remove("is-active");
  document.querySelector("#cooling-load-tab")?.classList.remove("is-active");
  document.querySelector("#cold-room-load-tab")?.classList.remove("is-active");
  elements.prevButton.hidden = false;
  elements.nextButton.hidden = false;
  elements.todayButton.hidden = false;
  elements.newEventButton.hidden = false;
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
  if (state.view === "maintenance") {
    elements.rangeLabel.textContent = "Wartungsliste";
    return;
  }

  if (state.view === "week") {
    const start = startOfWeek(state.anchorDate);
    const end = addDays(start, 6);
    const weekLabel = document.createElement("span");
    weekLabel.className = "calendar-week-label";
    weekLabel.textContent = `KW ${getCalendarWeek(start)}`;

    const dateLabel = document.createElement("span");
    dateLabel.textContent = `${formatDate(start)} bis ${formatDate(end)}`;
    elements.rangeLabel.replaceChildren(weekLabel, dateLabel);
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
  if (state.view === "maintenance") {
    renderMaintenance();
  } else {
    renderWeek();
    renderMonth();
    renderYear();
  }
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
  const cornerLabel = document.createElement("span");
  cornerLabel.textContent = "KW";
  const cornerNumber = document.createElement("strong");
  cornerNumber.textContent = String(getCalendarWeek(weekStart));
  corner.append(cornerLabel, cornerNumber);
  grid.append(corner);

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(weekStart, dayIndex);
    const holiday = holidayForDate(date);
    const head = document.createElement("button");
    head.type = "button";
    head.className = "week-day-head";
    head.style.gridColumn = `${dayIndex + 2}`;
    head.style.gridRow = "1";
    const weekdayName = document.createElement("span");
    weekdayName.className = "weekday-name";
    weekdayName.textContent = WEEKDAYS_LONG[dayIndex];
    const weekdayDate = document.createElement("span");
    weekdayDate.className = "weekday-date";
    weekdayDate.textContent = String(date.getDate());
    head.append(weekdayName, weekdayDate);
    if (holiday) {
      const holidayLabel = document.createElement("span");
      holidayLabel.className = "weekday-holiday";
      holidayLabel.textContent = holiday.name;
      head.append(holidayLabel);
    }
    head.classList.toggle("is-today", isSameDate(date, today));
    head.classList.toggle("is-holiday", Boolean(holiday));
    if (holiday) {
      head.setAttribute("title", holiday.name);
    }
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
      const segment = eventSegmentForDate(event, date);
      const startOffset = (minutesFromTime(segment.start) - START_HOUR * 60) / STEP_MINUTES;
      const endOffset = (minutesFromTime(segment.end) - START_HOUR * 60) / STEP_MINUTES;
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
  const weekHead = document.createElement("div");
  weekHead.className = "month-head-cell month-week-head";
  weekHead.textContent = "KW";
  header.append(weekHead);
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
    if (index % 7 === 0) {
      const rowMonths = [...new Set(Array.from({ length: 7 }, (_, offset) => MONTHS[addDays(date, offset).getMonth()]))].join(" / ");
      const weekNumber = document.createElement("div");
      weekNumber.className = "month-week-number";
      weekNumber.setAttribute("aria-label", `Kalenderwoche ${getCalendarWeek(date)}, ${rowMonths}`);
      const weekLabel = document.createElement("span");
      weekLabel.textContent = `KW ${getCalendarWeek(date)}`;
      const monthLabel = document.createElement("span");
      monthLabel.className = "month-week-month";
      monthLabel.textContent = rowMonths;
      weekNumber.append(weekLabel, monthLabel);
      grid.append(weekNumber);
    }

    const key = dateKey(date);
    const holiday = holidayForDate(date);
    const dayEvents = eventsForDate(key);
    const day = document.createElement("div");
    day.className = "month-day";
    day.tabIndex = 0;
    day.role = "button";
    day.setAttribute("aria-label", holiday ? `${formatDate(date)}, ${holiday.name}` : formatDate(date));
    day.classList.toggle("is-muted", date.getMonth() !== monthStart.getMonth());
    day.classList.toggle("is-today", isSameDate(date, today));
    day.classList.toggle("is-holiday", Boolean(holiday));
    if (holiday) {
      day.setAttribute("title", holiday.name);
    }
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

    if (holiday) {
      const holidayLabel = document.createElement("span");
      holidayLabel.className = "month-holiday";
      holidayLabel.textContent = holiday.name;
      day.append(holidayLabel);
    }

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
      const holiday = holidayForDate(date);
      const isCurrentMonth = date.getMonth() === month;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "year-day";
      button.textContent = String(date.getDate());
      button.classList.toggle("is-muted", !isCurrentMonth);
      button.classList.toggle("is-today", isSameDate(date, today));
      button.classList.toggle("has-event", eventsForDate(key).length > 0);
      button.classList.toggle("is-holiday", Boolean(holiday) && isCurrentMonth);
      if (holiday && isCurrentMonth) {
        button.setAttribute("title", holiday.name);
        button.setAttribute("aria-label", `${formatDate(date)}, ${holiday.name}`);
      }
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
  button.classList.toggle("is-multi-day", isMultiDayEvent(event));
  button.style.setProperty("--event-color", colorForEvent(event));
  button.innerHTML = `<strong>${escapeHtml(event.title)}</strong><span>${formatTimeRange(event)}</span>`;
  button.setAttribute("aria-label", `${event.title} ${formatTimeRange(event)}`);
  button.addEventListener("click", (incomingEvent) => {
    incomingEvent.stopPropagation();
    openEventDialog({ event });
  });
  return button;
}

function renderMaintenance() {
  const records = [...state.maintenance].sort(compareMaintenanceRecords);
  const list = document.createElement("div");
  list.className = "maintenance-table";

  if (!records.length) {
    const empty = document.createElement("div");
    empty.className = "maintenance-empty";
    empty.textContent = "Keine Wartungen eingetragen.";
    elements.maintenanceList.replaceChildren(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "maintenance-row maintenance-head";
  ["Kunde", "Anschrift", "Anlage", "Art", "Vertrag", "Telefon", "Letzte Wartung", "Nächste Wartung", ""].forEach((label) => {
    const cell = document.createElement("span");
    cell.textContent = label;
    header.append(cell);
  });
  header.replaceChildren();
  ["Kunde", "Anschrift", "Anlage", "Art", "Vertrag", "Termin", "Telefon", "Letzte Wartung", "Nächste Wartung", ""].forEach((label) => {
    const cell = document.createElement("span");
    cell.textContent = label;
    header.append(cell);
  });
  list.append(header);

  records.forEach((record) => {
    const row = document.createElement("div");
    row.className = "maintenance-row";
    row.append(
      maintenanceCell(record.customer, "Kunde"),
      maintenanceCell(record.address, "Anschrift"),
      maintenanceCell(record.system, "Anlage"),
      maintenanceCell(record.customerType, "Art"),
      maintenanceCell(record.hasMaintenanceContract ? "Wartungsvertrag" : "", "Vertrag"),
      maintenanceCell(record.appointmentScheduled ? "Termin vereinbart" : "", "Termin"),
      maintenanceCell(record.phone, "Telefon"),
      maintenanceCell(formatDateFromKey(record.lastMaintenance), "Letzte Wartung"),
      maintenanceCell(formatDateFromKey(record.nextMaintenance), "Nächste Wartung")
    );

    const actions = document.createElement("span");
    actions.className = "maintenance-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "text-button";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => editMaintenanceRecord(record.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button";
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => deleteMaintenanceRecord(record.id));

    actions.append(editButton, deleteButton);
    row.append(actions);
    list.append(row);
  });

  elements.maintenanceList.replaceChildren(list);
}

function maintenanceCell(value, label) {
  const cell = document.createElement("span");
  cell.dataset.label = label;
  cell.textContent = value || "-";
  return cell;
}

function formatDateFromKey(key) {
  return isDateKey(key) ? formatDate(fromDateKey(key)) : "-";
}

function normalizeMaintenanceType(value) {
  return value === "Privat" || value === "Gewerblich" ? value : "";
}

function selectedMaintenanceType() {
  if (elements.maintenancePrivate.checked) return "Privat";
  if (elements.maintenanceCommercial.checked) return "Gewerblich";
  return "";
}

function syncMaintenanceType(source) {
  if (source === elements.maintenancePrivate && source.checked) {
    elements.maintenanceCommercial.checked = false;
  }
  if (source === elements.maintenanceCommercial && source.checked) {
    elements.maintenancePrivate.checked = false;
  }
}

function addOneYearDateKey(key) {
  if (!isDateKey(key)) return "";
  const date = fromDateKey(key);
  const next = new Date(date);
  next.setFullYear(date.getFullYear() + 1);
  return dateKey(next);
}

function normalizeMaintenanceRecord(record) {
  return {
    id: isUuid(record?.id) ? String(record.id) : crypto.randomUUID(),
    customer: String(record?.customer || "").trim(),
    address: String(record?.address || "").trim(),
    system: String(record?.system || "").trim(),
    customerType: normalizeMaintenanceType(record?.customerType || record?.customer_type),
    hasMaintenanceContract: Boolean(record?.hasMaintenanceContract ?? record?.has_maintenance_contract),
    appointmentScheduled: Boolean(record?.appointmentScheduled ?? record?.appointment_scheduled),
    phone: String(record?.phone || "").trim(),
    lastMaintenance: String(record?.lastMaintenance || ""),
    nextMaintenance: String(record?.nextMaintenance || "")
  };
}

function validateMaintenanceRecord(record) {
  return Boolean(
    record &&
      record.customer &&
      record.address &&
      isDateKey(record.lastMaintenance) &&
      isDateKey(record.nextMaintenance)
  );
}

function compareMaintenanceRecords(a, b) {
  return `${a.nextMaintenance} ${a.customer}`.localeCompare(`${b.nextMaintenance} ${b.customer}`);
}

function resetMaintenanceForm() {
  elements.maintenanceId.value = "";
  elements.maintenanceCustomer.value = "";
  elements.maintenanceAddress.value = "";
  elements.maintenanceSystem.value = "";
  elements.maintenancePrivate.checked = false;
  elements.maintenanceCommercial.checked = false;
  elements.maintenanceContract.checked = false;
  elements.maintenanceAppointment.checked = false;
  elements.maintenancePhone.value = "";
  elements.maintenanceLastDate.value = "";
  elements.maintenanceNextDate.value = "";
  elements.maintenanceError.textContent = "";
  elements.maintenanceCustomer.focus();
}

function syncNextMaintenanceDate() {
  const nextDate = addOneYearDateKey(elements.maintenanceLastDate.value);
  if (nextDate) {
    elements.maintenanceNextDate.value = nextDate;
  }
}

function editMaintenanceRecord(id) {
  const record = state.maintenance.find((item) => item.id === id);
  if (!record) return;

  elements.maintenanceId.value = record.id;
  elements.maintenanceCustomer.value = record.customer;
  elements.maintenanceAddress.value = record.address;
  elements.maintenanceSystem.value = record.system;
  elements.maintenancePrivate.checked = record.customerType === "Privat";
  elements.maintenanceCommercial.checked = record.customerType === "Gewerblich";
  elements.maintenanceContract.checked = Boolean(record.hasMaintenanceContract);
  elements.maintenanceAppointment.checked = Boolean(record.appointmentScheduled);
  elements.maintenancePhone.value = record.phone;
  elements.maintenanceLastDate.value = record.lastMaintenance;
  elements.maintenanceNextDate.value = record.nextMaintenance;
  elements.maintenanceError.textContent = "";
  elements.maintenanceCustomer.focus();
}

async function upsertMaintenanceRecord(event) {
  event.preventDefault();
  const id = elements.maintenanceId.value || crypto.randomUUID();
  const nextRecord = normalizeMaintenanceRecord({
    id,
    customer: elements.maintenanceCustomer.value,
    address: elements.maintenanceAddress.value,
    system: elements.maintenanceSystem.value,
    customerType: selectedMaintenanceType(),
    hasMaintenanceContract: elements.maintenanceContract.checked,
    appointmentScheduled: elements.maintenanceAppointment.checked,
    phone: elements.maintenancePhone.value,
    lastMaintenance: elements.maintenanceLastDate.value,
    nextMaintenance: elements.maintenanceNextDate.value
  });

  if (!validateMaintenanceRecord(nextRecord)) {
    elements.maintenanceError.textContent = "Bitte Kunde, Anschrift und Wartungsdaten ausfüllen.";
    return;
  }

  let savedRecord = nextRecord;
  if (useRemoteStorage()) {
    try {
      updateSyncStatus("Speichere...");
      savedRecord = await saveRemoteMaintenanceRecord(nextRecord);
    } catch {
      elements.maintenanceError.textContent = "Wartung konnte nicht in Supabase gespeichert werden.";
      return;
    }
  }

  const existing = state.maintenance.find((record) => record.id === id);
  if (existing) {
    Object.assign(existing, savedRecord);
  } else {
    state.maintenance.push(savedRecord);
  }

  saveMaintenanceRecords();
  resetMaintenanceForm();
  renderMaintenance();
}

async function deleteMaintenanceRecord(id) {
  if (!id) return;
  if (!confirm("Wartung löschen?")) return;

  if (useRemoteStorage()) {
    try {
      updateSyncStatus("Lösche...");
      await deleteRemoteMaintenanceRecord(id);
    } catch {
      elements.maintenanceError.textContent = "Wartung konnte nicht in Supabase gelöscht werden.";
      return;
    }
  }

  state.maintenance = state.maintenance.filter((record) => record.id !== id);
  saveMaintenanceRecords();
  if (elements.maintenanceId.value === id) {
    resetMaintenanceForm();
  }
  renderMaintenance();
}

function openEventDialog({ date = dateKey(state.anchorDate), start = "09:00", event = null } = {}) {
  const normalizedStart = clampTime(start);
  elements.formError.textContent = "";
  elements.eventId.value = event?.id || "";
  elements.eventTitle.value = event?.title || "";
  elements.eventDate.value = event?.date || date;
  elements.eventEndDate.value = event ? getEventEndDate(event) : date;
  elements.eventEndDate.min = elements.eventDate.value;
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

function syncEndDateInput() {
  if (!elements.eventDate.value) return;
  elements.eventEndDate.min = elements.eventDate.value;
  if (!elements.eventEndDate.value || compareDateKeys(elements.eventEndDate.value, elements.eventDate.value) < 0) {
    elements.eventEndDate.value = elements.eventDate.value;
  }
}

async function upsertEvent(formEvent) {
  formEvent.preventDefault();
  const id = elements.eventId.value || crypto.randomUUID();
  const title = elements.eventTitle.value.trim();
  const date = elements.eventDate.value;
  const endDate = elements.eventEndDate.value || date;
  const start = elements.eventStart.value;
  const end = elements.eventEnd.value;
  const note = elements.eventNote.value.trim();
  const validation = validateEvent({ title, date, endDate, start, end });

  if (validation) {
    elements.formError.textContent = validation;
    return;
  }

  const existing = state.events.find((event) => event.id === id);
  const nextEvent = {
    id,
    title,
    date,
    endDate,
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
  if (!event.date || !event.endDate) return "Bitte Datum waehlen.";
  if (!isDateKey(event.date) || !isDateKey(event.endDate)) return "Bitte gueltiges Datum waehlen.";
  if (compareDateKeys(event.endDate, event.date) < 0) return "Das Bis-Datum darf nicht vor dem Von-Datum liegen.";
  if (!event.start || !event.end) return "Bitte Uhrzeit waehlen.";

  const start = minutesFromTime(event.start);
  const end = minutesFromTime(event.end);
  const min = START_HOUR * 60;
  const max = END_HOUR * 60;

  if (start < min || end > max) return "Termine sind von 07:00 bis 17:00 moeglich.";
  if (event.date === event.endDate && end <= start) return "Das Ende muss nach dem Beginn liegen.";
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
        .map((event, index) => normalizeEvent(event, COLORS[index % COLORS.length]));

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
  const endDate = event?.endDate || event?.date;
  return (
    event &&
    typeof event.title === "string" &&
    isDateKey(event.date || "") &&
    isDateKey(endDate || "") &&
    /^\d{2}:\d{2}$/.test(event.start || "") &&
    /^\d{2}:\d{2}$/.test(event.end || "") &&
    !validateEvent({
      title: event.title,
      date: event.date,
      endDate,
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
  state.maintenance = loadMaintenanceRecords();
  state.view = "week";
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
        await loadRemoteMaintenanceRecords();
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

elements.viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});
elements.maintenancePageButton.addEventListener("click", () => setPage("maintenance"));
elements.prevButton.addEventListener("click", () => move(-1));
elements.nextButton.addEventListener("click", () => move(1));
elements.todayButton.addEventListener("click", () => {
  state.anchorDate = startOfDay(new Date());
  render();
});
elements.newEventButton.addEventListener("click", () => openEventDialog({ date: dateKey(state.anchorDate), start: "09:00" }));
elements.loginForm.addEventListener("submit", handleLogin);
elements.logoutButton.addEventListener("click", logout);
elements.eventDate.addEventListener("change", syncEndDateInput);
elements.form.addEventListener("submit", upsertEvent);
elements.deleteButton.addEventListener("click", deleteSelectedEvent);
elements.closeDialogButton.addEventListener("click", closeDialog);
elements.cancelButton.addEventListener("click", closeDialog);
elements.maintenanceForm.addEventListener("submit", upsertMaintenanceRecord);
elements.maintenanceResetButton.addEventListener("click", resetMaintenanceForm);
elements.maintenancePrivate.addEventListener("change", () => syncMaintenanceType(elements.maintenancePrivate));
elements.maintenanceCommercial.addEventListener("change", () => syncMaintenanceType(elements.maintenanceCommercial));
elements.maintenanceLastDate.addEventListener("input", syncNextMaintenanceDate);
elements.maintenanceLastDate.addEventListener("change", syncNextMaintenanceDate);
elements.exportButton?.addEventListener("click", exportEvents);
elements.importInput?.addEventListener("change", () => importEvents(elements.importInput.files[0]));
window.addEventListener("focus", () => {
  if (useRemoteStorage()) {
    loadRemoteEvents();
    loadRemoteMaintenanceRecords();
  }
});

initApp();
