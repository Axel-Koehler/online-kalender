(() => {
  const TASKS_TABLE = "axel_tasks";
  const TASKS_VIEW_ID = "tasks-view";
  const TASKS_TAB_ID = "tasks-axel-tab";
  let tasksChannel = null;
  let editingTaskId = null;

  const style = document.createElement("style");
  style.textContent = `
    .tasks-view[hidden],
    .tasks-axel-tab[hidden] {
      display: none !important;
    }

    .tasks-shell {
      position: relative;
      width: 100%;
      margin: 0 auto;
      padding: clamp(16px, 3vw, 28px);
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(248, 255, 19, 0.08), transparent 18%), linear-gradient(225deg, rgba(255, 45, 253, 0.12), transparent 24%), var(--panel);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
    }

    .tasks-shell h2 {
      color: var(--yellow);
      font-size: clamp(1.25rem, 3vw, 1.8rem);
      font-weight: 400;
      line-height: 1.1;
      text-transform: uppercase;
      text-shadow: 0 0 12px rgba(248, 255, 19, 0.42);
    }

    .tasks-subtitle {
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .tasks-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      margin-top: 22px;
    }

    .tasks-form input {
      min-height: 42px;
      width: 100%;
      border: 1px solid rgba(0, 217, 255, 0.48);
      border-radius: 0;
      padding: 10px 12px;
      color: var(--text);
      background: rgba(3, 6, 22, 0.82);
      box-shadow: inset 0 0 14px rgba(0, 217, 255, 0.08);
    }

    .tasks-list {
      display: grid;
      gap: 9px;
      margin: 22px 0 0;
      padding: 0;
      list-style: none;
    }

    .task-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 8px;
      align-items: center;
      padding: 10px;
      border: 1px solid rgba(0, 217, 255, 0.28);
      background: rgba(9, 12, 34, 0.58);
    }

    .task-text {
      color: var(--text);
      overflow-wrap: anywhere;
    }

    .tasks-status {
      min-height: 20px;
      margin-top: 14px;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .task-item .text-button,
    .task-item .danger-button {
      min-height: 32px;
      padding: 0 10px;
      font-size: 0.78rem;
    }

    @media (max-width: 620px) {
      .tasks-form,
      .task-item {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);

  function axelEmail() {
    return String(SUPABASE_CONFIG.loginUsers?.Axel || "").toLowerCase();
  }

  function isAxelUser() {
    return Boolean(state.currentUser?.email && state.currentUser.email.toLowerCase() === axelEmail());
  }

  function ensureTasksTab() {
    let tab = document.querySelector(`#${TASKS_TAB_ID}`);
    if (!tab) {
      tab = document.createElement("button");
      tab.className = "tab-button tasks-axel-tab";
      tab.id = TASKS_TAB_ID;
      tab.type = "button";
      tab.dataset.view = "tasks";
      tab.textContent = "Aufgaben Axel";
      document.querySelector(".view-tabs")?.append(tab);
    }
    return tab;
  }

  function ensureTasksView() {
    let view = document.querySelector(`#${TASKS_VIEW_ID}`);
    if (!view) {
      view = document.createElement("section");
      view.id = TASKS_VIEW_ID;
      view.className = "calendar-view tasks-view";
      view.setAttribute("aria-label", "Aufgaben Axel");
      view.hidden = true;
      document.querySelector(".calendar-stage")?.append(view);
    }
    return view;
  }

  function setTasksStatus(message) {
    const status = document.querySelector("#tasks-status");
    if (status) status.textContent = message || "";
  }

  function setActiveTasksTab(active) {
    document.querySelectorAll(".tab-button").forEach((tab) => {
      tab.classList.toggle("is-active", active ? tab.dataset.view === "tasks" : tab.dataset.view === state.view);
    });
  }

  function hideOrdersView() {
    const ordersView = document.querySelector("#orders-view");
    const ordersTab = document.querySelector("#orders-tab");
    if (ordersView) ordersView.hidden = true;
    if (ordersTab) ordersTab.classList.remove("is-active");
  }

  function showCalendarViews() {
    document.querySelector("#week-view").hidden = state.view !== "week";
    document.querySelector("#month-view").hidden = state.view !== "month";
    document.querySelector("#year-view").hidden = state.view !== "year";
    document.querySelector("#maintenance-view")?.setAttribute("hidden", "");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
    ensureTasksView().hidden = true;
    ensureTasksTab().classList.remove("is-active");
    hideOrdersView();
  }

  function showTasksView() {
    document.querySelector("#week-view").hidden = true;
    document.querySelector("#month-view").hidden = true;
    document.querySelector("#year-view").hidden = true;
    document.querySelector("#maintenance-view")?.setAttribute("hidden", "");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
    hideOrdersView();
    ensureTasksView().hidden = false;
    elements.rangeLabel.textContent = "Aufgaben Axel";
    setActiveTasksTab(true);
  }

  function updateVisibility() {
    const tab = ensureTasksTab();
    const view = ensureTasksView();
    const visible = isAxelUser();
    tab.hidden = !visible;
    if (!visible) {
      view.hidden = true;
      if (state.view === "tasks") {
        state.view = "week";
        document.querySelector('[data-view="week"]')?.click();
      }
    }
  }

  function renderTasksShell() {
    const view = ensureTasksView();
    view.innerHTML = `
      <div class="tasks-shell">
        <h2>Aufgaben Axel</h2>
        <p class="tasks-subtitle">Eine Zeile eintragen, speichern und online auf allen Geräten wiederfinden.</p>
        <form class="tasks-form" id="tasks-form">
          <input id="task-input" type="text" autocomplete="off" placeholder="Neue Aufgabe eingeben" required>
          <button class="primary-button" id="task-submit" type="submit">Speichern</button>
        </form>
        <p class="tasks-status" id="tasks-status" role="status"></p>
        <ul class="tasks-list" id="tasks-list"></ul>
      </div>
    `;

    document.querySelector("#tasks-form")?.addEventListener("submit", saveTask);
  }

  function taskRow(task) {
    const item = document.createElement("li");
    item.className = "task-item";
    item.dataset.taskId = task.id;

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.body;

    const edit = document.createElement("button");
    edit.className = "text-button";
    edit.type = "button";
    edit.textContent = "Bearbeiten";
    edit.addEventListener("click", () => {
      editingTaskId = task.id;
      document.querySelector("#task-input").value = task.body;
      document.querySelector("#task-input").focus();
      document.querySelector("#task-submit").textContent = "Aktualisieren";
    });

    const remove = document.createElement("button");
    remove.className = "danger-button";
    remove.type = "button";
    remove.textContent = "Löschen";
    remove.addEventListener("click", () => deleteTask(task.id));

    item.append(text, edit, remove);
    return item;
  }

  async function loadTasks() {
    if (!isAxelUser() || !useRemoteStorage()) return;
    setTasksStatus("Lade Aufgaben...");
    const { data, error } = await supabaseClient
      .from(TASKS_TABLE)
      .select("id,body,created_at,updated_at")
      .order("body", { ascending: true });

    if (error) {
      console.error(error);
      setTasksStatus("Aufgaben konnten nicht geladen werden. Prüfe, ob die Tabelle axel_tasks angelegt ist.");
      return;
    }

    const sortedTasks = [...data].sort((left, right) => String(left.body).localeCompare(String(right.body), "de", { sensitivity: "base" }));
    const list = document.querySelector("#tasks-list");
    if (!list) return;
    list.replaceChildren(...sortedTasks.map(taskRow));
    setTasksStatus(data.length ? `${data.length} Aufgaben online gespeichert` : "Noch keine Aufgaben vorhanden");
  }

  async function saveTask(event) {
    event.preventDefault();
    if (!isAxelUser() || !useRemoteStorage()) {
      setTasksStatus("Bitte als Axel mit Supabase anmelden.");
      return;
    }

    const input = document.querySelector("#task-input");
    const body = input.value.trim();
    if (!body) return;

    setTasksStatus("Speichere...");
    const payload = { body, user_id: state.currentUser.id };
    const request = editingTaskId
      ? supabaseClient.from(TASKS_TABLE).update({ body }).eq("id", editingTaskId)
      : supabaseClient.from(TASKS_TABLE).insert(payload);

    const { error } = await request;
    if (error) {
      console.error(error);
      setTasksStatus("Aufgabe konnte nicht gespeichert werden.");
      return;
    }

    editingTaskId = null;
    input.value = "";
    document.querySelector("#task-submit").textContent = "Speichern";
    await loadTasks();
  }

  async function deleteTask(id) {
    if (!confirm("Aufgabe löschen?")) return;
    setTasksStatus("Lösche...");
    const { error } = await supabaseClient.from(TASKS_TABLE).delete().eq("id", id);
    if (error) {
      console.error(error);
      setTasksStatus("Aufgabe konnte nicht gelöscht werden.");
      return;
    }
    if (editingTaskId === id) editingTaskId = null;
    await loadTasks();
  }

  function subscribeTasks() {
    if (!isAxelUser() || !useRemoteStorage() || tasksChannel) return;
    tasksChannel = supabaseClient
      .channel("axel_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TASKS_TABLE }, () => {
        if (state.view === "tasks") loadTasks();
      })
      .subscribe();
  }

  function openTasks() {
    if (!isAxelUser()) return;
    state.view = "tasks";
    showTasksView();
    renderTasksShell();
    subscribeTasks();
    loadTasks();
  }

  function wireTasks() {
    const tab = ensureTasksTab();
    ensureTasksView();
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTasks();
    }, true);

    document.querySelectorAll('.tab-button:not(#tasks-axel-tab)').forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (state.view !== "tasks" && state.view !== "maintenance") showCalendarViews();
        }, 0);
      });
    });
  }

  wireTasks();
  updateVisibility();

  const originalRender = render;
  render = function patchedRender() {
    const keepTasksOpen = state.view === "tasks";
    originalRender();
    if (keepTasksOpen) {
      showTasksView();
    }
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      updateVisibility();
      subscribeTasks();
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedLogout() {
    if (tasksChannel && supabaseClient) {
      supabaseClient.removeChannel(tasksChannel);
      tasksChannel = null;
    }
    await originalLogout();
    updateVisibility();
  };

  window.addEventListener("focus", () => {
    updateVisibility();
    if (state.view === "tasks") loadTasks();
  });
})();
