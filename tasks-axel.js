(() => {
  const TASK_PAGES = [
    { key: "tasks", name: "Axel", table: "axel_tasks", tabId: "tasks-axel-tab", viewId: "tasks-view" },
    { key: "tasks-uwe", name: "Uwe", table: "uwe_tasks", tabId: "tasks-uwe-tab", viewId: "tasks-uwe-view" },
    { key: "tasks-kevin", name: "Kevin", table: "kevin_tasks", tabId: "tasks-kevin-tab", viewId: "tasks-kevin-view" },
    { key: "tasks-holger", name: "Holger", table: "holger_tasks", tabId: "tasks-holger-tab", viewId: "tasks-holger-view" }
  ];

  const taskState = new Map(TASK_PAGES.map((page) => [page.key, { channel: null, editingId: null }]));
  let activePage = TASK_PAGES[0];

  const style = document.createElement("style");
  style.textContent = `
    .tasks-view[hidden],
    .tasks-page-tab[hidden],
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
      height: var(--field-height, 44px);
      min-height: var(--field-height, 44px);
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

  function pageTitle(page) {
    return `Aufgaben ${page.name}`;
  }

  function pageForView(view) {
    return TASK_PAGES.find((page) => page.key === view) || null;
  }

  function isTaskView(view) {
    return Boolean(pageForView(view));
  }

  function idFor(page, suffix) {
    return `${page.key}-${suffix}`;
  }

  function ensureTasksTab(page) {
    let tab = document.querySelector(`#${page.tabId}`);
    if (!tab) {
      tab = document.createElement("button");
      tab.id = page.tabId;
      tab.type = "button";
      tab.dataset.view = page.key;
      tab.textContent = pageTitle(page);
      const nav = document.querySelector(".view-tabs");
      const pageIndex = TASK_PAGES.findIndex((item) => item.key === page.key);
      const previousTaskTab = pageIndex > 0 ? document.querySelector(`#${TASK_PAGES[pageIndex - 1].tabId}`) : null;
      if (previousTaskTab?.parentElement === nav) {
        previousTaskTab.after(tab);
      } else {
        nav?.append(tab);
      }
    }

    tab.classList.add("tab-button", "tasks-page-tab");
    if (page.key === "tasks") tab.classList.add("tasks-axel-tab");
    tab.dataset.view = page.key;
    tab.textContent = pageTitle(page);
    tab.hidden = false;
    return tab;
  }

  function ensureTasksView(page) {
    let view = document.querySelector(`#${page.viewId}`);
    if (!view) {
      view = document.createElement("section");
      view.id = page.viewId;
      view.className = "calendar-view tasks-view";
      view.hidden = true;
      document.querySelector(".calendar-stage")?.append(view);
    }

    view.classList.add("calendar-view", "tasks-view");
    view.setAttribute("aria-label", pageTitle(page));
    return view;
  }

  function ensureTaskPages() {
    TASK_PAGES.forEach((page) => {
      ensureTasksTab(page);
      ensureTasksView(page);
    });
  }

  function setTasksStatus(page, message) {
    const status = document.querySelector(`#${idFor(page, "status")}`);
    if (status) status.textContent = message || "";
  }

  function hideOrdersView() {
    const ordersView = document.querySelector("#orders-view");
    const ordersTab = document.querySelector("#orders-tab");
    if (ordersView) ordersView.hidden = true;
    if (ordersTab) ordersTab.classList.remove("is-active");
  }

  function hideTaskPages() {
    TASK_PAGES.forEach((page) => {
      ensureTasksView(page).hidden = true;
      ensureTasksTab(page).classList.remove("is-active");
    });
  }

  function showTasksView(page) {
    document.querySelector("#week-view").hidden = true;
    document.querySelector("#month-view").hidden = true;
    document.querySelector("#year-view").hidden = true;
    document.querySelector("#maintenance-view")?.setAttribute("hidden", "");
    document.querySelector("#inquiries-view")?.setAttribute("hidden", "");
    document.querySelector("#work-reports-view")?.setAttribute("hidden", "");
    document.querySelector("#cooling-load-view")?.setAttribute("hidden", "");
    document.querySelector("#cold-room-load-view")?.setAttribute("hidden", "");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
    document.querySelector("#inquiries-tab")?.classList.remove("is-active");
    document.querySelector("#work-reports-tab")?.classList.remove("is-active");
    document.querySelector("#cooling-load-tab")?.classList.remove("is-active");
    document.querySelector("#cold-room-load-tab")?.classList.remove("is-active");
    hideOrdersView();
    TASK_PAGES.forEach((item) => {
      ensureTasksView(item).hidden = item.key !== page.key;
      ensureTasksTab(item).classList.toggle("is-active", item.key === page.key);
    });
    document.querySelectorAll(".tab-button.is-active").forEach((tab) => {
      if (!TASK_PAGES.some((item) => item.tabId === tab.id)) tab.classList.remove("is-active");
    });
    elements.prevButton.hidden = true;
    elements.nextButton.hidden = true;
    elements.todayButton.hidden = true;
    elements.newEventButton.hidden = true;
    elements.rangeLabel.textContent = pageTitle(page);
  }

  function renderTasksShell(page) {
    const view = ensureTasksView(page);
    view.innerHTML = `
      <div class="tasks-shell">
        <h2>${pageTitle(page)}</h2>
        <p class="tasks-subtitle">Eine Zeile eintragen, speichern und online auf allen Geräten wiederfinden.</p>
        <form class="tasks-form" id="${idFor(page, "form")}">
          <input id="${idFor(page, "input")}" type="text" autocomplete="off" placeholder="Neue Aufgabe eingeben" required>
          <button class="primary-button" id="${idFor(page, "submit")}" type="submit">Speichern</button>
        </form>
        <p class="tasks-status" id="${idFor(page, "status")}" role="status"></p>
        <ul class="tasks-list" id="${idFor(page, "list")}"></ul>
      </div>
    `;

    document.querySelector(`#${idFor(page, "form")}`)?.addEventListener("submit", (event) => saveTask(event, page));
  }

  function taskRow(page, task) {
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
      taskState.get(page.key).editingId = task.id;
      document.querySelector(`#${idFor(page, "input")}`).value = task.body;
      document.querySelector(`#${idFor(page, "input")}`).focus();
      document.querySelector(`#${idFor(page, "submit")}`).textContent = "Aktualisieren";
    });

    const remove = document.createElement("button");
    remove.className = "danger-button";
    remove.type = "button";
    remove.textContent = "Löschen";
    remove.addEventListener("click", () => deleteTask(page, task.id));

    item.append(text, edit, remove);
    return item;
  }

  async function loadTasks(page) {
    if (!useRemoteStorage()) return;
    setTasksStatus(page, "Lade Aufgaben...");
    const { data, error } = await supabaseClient
      .from(page.table)
      .select("id,body,created_at,updated_at")
      .order("body", { ascending: true });

    if (error) {
      console.error(error);
      setTasksStatus(page, `Aufgaben konnten nicht geladen werden. Prüfe, ob die Tabelle ${page.table} angelegt ist.`);
      return;
    }

    const sortedTasks = [...data].sort((left, right) => String(left.body).localeCompare(String(right.body), "de", { sensitivity: "base" }));
    const list = document.querySelector(`#${idFor(page, "list")}`);
    if (!list) return;
    list.replaceChildren(...sortedTasks.map((task) => taskRow(page, task)));
    setTasksStatus(page, data.length ? `${data.length} Aufgaben online gespeichert` : "Noch keine Aufgaben vorhanden");
  }

  async function saveTask(event, page) {
    event.preventDefault();
    if (!useRemoteStorage()) {
      setTasksStatus(page, "Bitte mit Supabase anmelden.");
      return;
    }

    const pageState = taskState.get(page.key);
    const input = document.querySelector(`#${idFor(page, "input")}`);
    const body = input.value.trim();
    if (!body) return;

    setTasksStatus(page, "Speichere...");
    const payload = { body, user_id: state.currentUser.id };
    const request = pageState.editingId
      ? supabaseClient.from(page.table).update({ body }).eq("id", pageState.editingId)
      : supabaseClient.from(page.table).insert(payload);

    const { error } = await request;
    if (error) {
      console.error(error);
      setTasksStatus(page, "Aufgabe konnte nicht gespeichert werden.");
      return;
    }

    pageState.editingId = null;
    input.value = "";
    document.querySelector(`#${idFor(page, "submit")}`).textContent = "Speichern";
    await loadTasks(page);
  }

  async function deleteTask(page, id) {
    if (!confirm("Aufgabe löschen?")) return;
    setTasksStatus(page, "Lösche...");
    const { error } = await supabaseClient.from(page.table).delete().eq("id", id);
    if (error) {
      console.error(error);
      setTasksStatus(page, "Aufgabe konnte nicht gelöscht werden.");
      return;
    }
    const pageState = taskState.get(page.key);
    if (pageState.editingId === id) pageState.editingId = null;
    await loadTasks(page);
  }

  function subscribeTasks(page) {
    const pageState = taskState.get(page.key);
    if (!useRemoteStorage() || pageState.channel) return;
    pageState.channel = supabaseClient
      .channel(`${page.table}_changes`)
      .on("postgres_changes", { event: "*", schema: "public", table: page.table }, () => {
        if (state.view === page.key) loadTasks(page);
      })
      .subscribe();
  }

  function openTasks(page) {
    if (!elements.appShell || elements.appShell.hidden) return;
    activePage = page;
    state.view = page.key;
    showTasksView(page);
    renderTasksShell(page);
    subscribeTasks(page);
    loadTasks(page);
  }

  function wireTasks() {
    ensureTaskPages();
    TASK_PAGES.forEach((page) => {
      ensureTasksTab(page).addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openTasks(page);
      }, true);
    });

    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".tab-button");
      if (!button || TASK_PAGES.some((page) => page.tabId === button.id)) return;
      setTimeout(() => {
        if (!isTaskView(state.view)) hideTaskPages();
      }, 0);
    }, true);
  }

  wireTasks();

  const originalRender = render;
  render = function patchedRender() {
    const openPage = pageForView(state.view);
    originalRender();
    if (openPage) {
      activePage = openPage;
      showTasksView(openPage);
    }
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      ensureTaskPages();
      if (authenticated) TASK_PAGES.forEach(subscribeTasks);
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedLogout() {
    TASK_PAGES.forEach((page) => {
      const pageState = taskState.get(page.key);
      if (pageState.channel && supabaseClient) {
        supabaseClient.removeChannel(pageState.channel);
        pageState.channel = null;
      }
    });
    await originalLogout();
    hideTaskPages();
  };

  window.addEventListener("focus", () => {
    ensureTaskPages();
    const openPage = pageForView(state.view) || activePage;
    if (state.view === openPage.key) loadTasks(openPage);
  });
})();
