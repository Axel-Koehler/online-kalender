(() => {
  const ORDERS_TABLE = "customer_orders";
  const ORDERS_VIEW_ID = "orders-view";
  const ORDERS_TAB_ID = "orders-tab";
  let ordersChannel = null;
  let editingOrderId = null;

  const currencyFormatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  });

  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const style = document.createElement("style");
  style.textContent = `
    .orders-view[hidden],
    .orders-tab[hidden] {
      display: none !important;
    }

    .orders-shell {
      width: min(1120px, 100%);
      margin: 0 auto;
      padding: clamp(16px, 3vw, 28px);
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), transparent 22%), linear-gradient(225deg, rgba(248, 255, 19, 0.08), transparent 24%), var(--panel);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
    }

    .orders-shell h2 {
      color: var(--yellow);
      font-size: clamp(1.25rem, 3vw, 1.8rem);
      font-weight: 400;
      line-height: 1.1;
      text-transform: uppercase;
      text-shadow: 0 0 12px rgba(248, 255, 19, 0.42);
    }

    .orders-subtitle {
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .orders-form {
      display: grid;
      grid-template-columns: minmax(150px, 0.8fr) minmax(220px, 1.3fr) minmax(160px, 0.8fr) minmax(150px, auto) minmax(110px, auto);
      gap: 10px;
      align-items: end;
      margin-top: 22px;
    }

    .orders-form .field {
      min-width: 0;
    }

    .orders-form .field input {
      min-height: 42px;
      min-width: 0;
    }

    .orders-check {
      min-height: 42px;
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 0 10px;
      border: 1px solid rgba(0, 217, 255, 0.36);
      color: var(--cyan);
      background: rgba(3, 6, 22, 0.64);
      text-transform: uppercase;
      font-size: 0.78rem;
      white-space: nowrap;
    }

    .orders-check input {
      width: 18px;
      height: 18px;
      accent-color: var(--yellow);
    }

    .orders-status {
      min-height: 20px;
      margin-top: 14px;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .orders-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(180px, 1fr));
      gap: 10px;
      margin-top: 20px;
    }

    .orders-total {
      min-height: 72px;
      display: grid;
      gap: 5px;
      align-content: center;
      padding: 13px 14px;
      border: 1px solid rgba(0, 217, 255, 0.32);
      background: rgba(9, 12, 34, 0.58);
    }

    .orders-total span {
      color: var(--cyan);
      font-size: 0.76rem;
      text-transform: uppercase;
    }

    .orders-total strong {
      color: var(--yellow);
      font-size: 1.16rem;
      font-weight: 400;
      white-space: nowrap;
    }

    .orders-list {
      display: grid;
      gap: 9px;
      margin: 18px 0 0;
      padding: 0;
      list-style: none;
    }

    .order-item {
      display: grid;
      grid-template-columns: minmax(94px, auto) minmax(160px, 1fr) minmax(120px, auto) minmax(120px, auto) auto auto;
      gap: 10px;
      align-items: center;
      padding: 10px;
      border: 1px solid rgba(0, 217, 255, 0.28);
      background: rgba(9, 12, 34, 0.58);
    }

    .order-date {
      color: var(--muted);
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .order-customer {
      color: var(--text);
      overflow-wrap: anywhere;
    }

    .order-amount {
      color: var(--yellow);
      white-space: nowrap;
    }

    .order-awarded {
      color: var(--muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .order-awarded.is-awarded {
      color: var(--yellow);
    }

    .order-item .text-button,
    .order-item .danger-button {
      min-height: 32px;
      padding: 0 10px;
      font-size: 0.78rem;
    }

    @media (max-width: 1100px) {
      .orders-form {
        grid-template-columns: minmax(170px, 0.85fr) minmax(260px, 1.15fr);
      }

      .orders-form .field:nth-child(3),
      .orders-check,
      .orders-form .primary-button {
        grid-column: span 1;
      }

      .orders-form .primary-button {
        width: 100%;
      }
    }

    @media (max-width: 900px) {
      .orders-form,
      .order-item,
      .orders-summary {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);

  function isLoggedIn() {
    return Boolean(elements.appShell && !elements.appShell.hidden);
  }

  function canUseRemote() {
    return Boolean(useRemoteStorage());
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function ensureOrdersTab() {
    let tab = document.querySelector(`#${ORDERS_TAB_ID}`);
    if (!tab) {
      tab = document.createElement("button");
      tab.className = "tab-button orders-tab";
      tab.id = ORDERS_TAB_ID;
      tab.type = "button";
      tab.dataset.view = "orders";
      tab.textContent = "Aufträge erstellen";
      document.querySelector(".view-tabs")?.append(tab);
    }
    return tab;
  }

  function ensureOrdersView() {
    let view = document.querySelector(`#${ORDERS_VIEW_ID}`);
    if (!view) {
      view = document.createElement("section");
      view.id = ORDERS_VIEW_ID;
      view.className = "calendar-view orders-view";
      view.setAttribute("aria-label", "Aufträge erstellen");
      view.hidden = true;
      document.querySelector(".calendar-stage")?.append(view);
    }
    return view;
  }

  function setOrdersStatus(message) {
    const status = document.querySelector("#orders-status");
    if (status) status.textContent = message || "";
  }

  function setActiveOrdersTab(active) {
    document.querySelectorAll(".tab-button").forEach((tab) => {
      tab.classList.toggle("is-active", active ? tab.dataset.view === "orders" : tab.dataset.view === state.view);
    });
  }

  function showCalendarViews() {
    document.querySelector("#week-view").hidden = state.view !== "week";
    document.querySelector("#month-view").hidden = state.view !== "month";
    document.querySelector("#year-view").hidden = state.view !== "year";
    ensureOrdersView().hidden = true;
    ensureOrdersTab().classList.remove("is-active");
  }

  function showOrdersView() {
    document.querySelector("#week-view").hidden = true;
    document.querySelector("#month-view").hidden = true;
    document.querySelector("#year-view").hidden = true;
    document.querySelector("#tasks-view")?.setAttribute("hidden", "");
    ensureOrdersView().hidden = false;
    elements.rangeLabel.textContent = "Aufträge erstellen";
    setActiveOrdersTab(true);
  }

  function updateVisibility() {
    const tab = ensureOrdersTab();
    const view = ensureOrdersView();
    const visible = isLoggedIn();
    tab.hidden = !visible;
    if (!visible) {
      view.hidden = true;
      if (state.view === "orders") {
        state.view = "week";
        document.querySelector('[data-view="week"]')?.click();
      }
    }
  }

  function renderOrdersShell() {
    const view = ensureOrdersView();
    view.innerHTML = `
      <div class="orders-shell">
        <h2>Aufträge erstellen</h2>
        <p class="orders-subtitle">Datum, Kunde, Netto-Angebotssumme und Auftragsstatus online verwalten.</p>
        <form class="orders-form" id="orders-form">
          <label class="field">
            <span>Datum</span>
            <input id="order-date" type="date" required>
          </label>
          <label class="field">
            <span>Kunde</span>
            <input id="order-customer" type="text" autocomplete="off" required>
          </label>
          <label class="field">
            <span>Angebotssumme Netto</span>
            <input id="order-amount" type="number" min="0" step="0.01" inputmode="decimal" required>
          </label>
          <label class="orders-check">
            <input id="order-awarded" type="checkbox">
            <span>Auftrag erteilt</span>
          </label>
          <button class="primary-button" id="order-submit" type="submit">Speichern</button>
        </form>
        <p class="orders-status" id="orders-status" role="status"></p>
        <div class="orders-summary" aria-label="Summen">
          <div class="orders-total">
            <span>Alle Angebotssummen</span>
            <strong id="orders-total-all">0,00 €</strong>
          </div>
          <div class="orders-total">
            <span>Alle Aufträge erteilt</span>
            <strong id="orders-total-awarded">0,00 €</strong>
          </div>
        </div>
        <ul class="orders-list" id="orders-list"></ul>
      </div>
    `;

    document.querySelector("#order-date").value = todayKey();
    document.querySelector("#orders-form")?.addEventListener("submit", saveOrder);
  }

  function formatEuro(value) {
    return currencyFormatter.format(Number(value || 0));
  }

  function formatOrderDate(value) {
    if (!value) return "-";
    const parsed = fromDateKey(String(value).slice(0, 10));
    return Number.isNaN(parsed.getTime()) ? "-" : dateFormatter.format(parsed);
  }

  function updateSummary(orders) {
    const totalAll = orders.reduce((sum, order) => sum + Number(order.net_amount || 0), 0);
    const totalAwarded = orders
      .filter((order) => Boolean(order.order_awarded))
      .reduce((sum, order) => sum + Number(order.net_amount || 0), 0);

    const allField = document.querySelector("#orders-total-all");
    const awardedField = document.querySelector("#orders-total-awarded");
    if (allField) allField.textContent = formatEuro(totalAll);
    if (awardedField) awardedField.textContent = formatEuro(totalAwarded);
  }

  function orderRow(order) {
    const item = document.createElement("li");
    item.className = "order-item";
    item.dataset.orderId = order.id;

    const orderDate = document.createElement("span");
    orderDate.className = "order-date";
    orderDate.textContent = formatOrderDate(order.order_date || order.created_at);

    const customer = document.createElement("strong");
    customer.className = "order-customer";
    customer.textContent = order.customer;

    const amount = document.createElement("span");
    amount.className = "order-amount";
    amount.textContent = formatEuro(order.net_amount);

    const awarded = document.createElement("span");
    awarded.className = "order-awarded";
    awarded.classList.toggle("is-awarded", Boolean(order.order_awarded));
    awarded.textContent = order.order_awarded ? "Auftrag erteilt" : "Offen";

    const edit = document.createElement("button");
    edit.className = "text-button";
    edit.type = "button";
    edit.textContent = "Bearbeiten";
    edit.addEventListener("click", () => {
      editingOrderId = order.id;
      document.querySelector("#order-date").value = String(order.order_date || order.created_at || todayKey()).slice(0, 10);
      document.querySelector("#order-customer").value = order.customer;
      document.querySelector("#order-amount").value = Number(order.net_amount || 0).toFixed(2);
      document.querySelector("#order-awarded").checked = Boolean(order.order_awarded);
      document.querySelector("#order-submit").textContent = "Aktualisieren";
      document.querySelector("#order-date").focus();
    });

    const remove = document.createElement("button");
    remove.className = "danger-button";
    remove.type = "button";
    remove.textContent = "Löschen";
    remove.addEventListener("click", () => deleteOrder(order.id));

    item.append(orderDate, customer, amount, awarded, edit, remove);
    return item;
  }

  async function loadOrders() {
    if (!isLoggedIn()) return;
    if (!canUseRemote()) {
      setOrdersStatus("Bitte mit Supabase anmelden, damit Aufträge online gespeichert werden.");
      updateSummary([]);
      return;
    }

    setOrdersStatus("Lade Aufträge...");
    const { data, error } = await supabaseClient
      .from(ORDERS_TABLE)
      .select("id,order_date,customer,net_amount,order_awarded,created_at,updated_at")
      .order("order_date", { ascending: false })
      .order("customer", { ascending: true });

    if (error) {
      console.error(error);
      setOrdersStatus("Aufträge konnten nicht geladen werden. Prüfe, ob die Spalte order_date in customer_orders angelegt ist.");
      updateSummary([]);
      return;
    }

    const sortedOrders = [...data].sort((left, right) => {
      const dateCompare = String(right.order_date || right.created_at || "").localeCompare(String(left.order_date || left.created_at || ""));
      if (dateCompare) return dateCompare;
      return String(left.customer).localeCompare(String(right.customer), "de", { sensitivity: "base" });
    });
    const list = document.querySelector("#orders-list");
    if (!list) return;
    list.replaceChildren(...sortedOrders.map(orderRow));
    updateSummary(sortedOrders);
    setOrdersStatus(data.length ? `${data.length} Aufträge online gespeichert` : "Noch keine Aufträge vorhanden");
  }

  async function saveOrder(event) {
    event.preventDefault();
    if (!canUseRemote()) {
      setOrdersStatus("Bitte mit Supabase anmelden, damit Aufträge online gespeichert werden.");
      return;
    }

    const orderDate = document.querySelector("#order-date").value || todayKey();
    const customer = document.querySelector("#order-customer").value.trim();
    const amountValue = document.querySelector("#order-amount").value;
    const amount = Number(String(amountValue).replace(",", "."));
    const orderAwarded = document.querySelector("#order-awarded").checked;

    if (!orderDate || !customer || !Number.isFinite(amount) || amount < 0) {
      setOrdersStatus("Bitte Datum, Kunde und eine gültige Netto-Angebotssumme eintragen.");
      return;
    }

    setOrdersStatus("Speichere...");
    const payload = {
      order_date: orderDate,
      customer,
      net_amount: amount,
      order_awarded: orderAwarded,
      user_id: state.currentUser.id
    };
    const request = editingOrderId
      ? supabaseClient.from(ORDERS_TABLE).update({ order_date: orderDate, customer, net_amount: amount, order_awarded: orderAwarded }).eq("id", editingOrderId)
      : supabaseClient.from(ORDERS_TABLE).insert(payload);

    const { error } = await request;
    if (error) {
      console.error(error);
      setOrdersStatus("Auftrag konnte nicht gespeichert werden.");
      return;
    }

    editingOrderId = null;
    document.querySelector("#orders-form").reset();
    document.querySelector("#order-date").value = todayKey();
    document.querySelector("#order-submit").textContent = "Speichern";
    await loadOrders();
  }

  async function deleteOrder(id) {
    if (!confirm("Datensatz löschen?")) return;
    setOrdersStatus("Lösche...");
    const { error } = await supabaseClient.from(ORDERS_TABLE).delete().eq("id", id);
    if (error) {
      console.error(error);
      setOrdersStatus("Auftrag konnte nicht gelöscht werden.");
      return;
    }
    if (editingOrderId === id) editingOrderId = null;
    await loadOrders();
  }

  function subscribeOrders() {
    if (!canUseRemote() || ordersChannel) return;
    ordersChannel = supabaseClient
      .channel("customer_orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: ORDERS_TABLE }, () => {
        if (state.view === "orders") loadOrders();
      })
      .subscribe();
  }

  function openOrders() {
    if (!isLoggedIn()) return;
    state.view = "orders";
    showOrdersView();
    renderOrdersShell();
    subscribeOrders();
    loadOrders();
  }

  function wireOrders() {
    const tab = ensureOrdersTab();
    ensureOrdersView();
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openOrders();
    }, true);

    document.querySelectorAll('.tab-button:not(#orders-tab)').forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (state.view !== "orders") showCalendarViews();
        }, 0);
      });
    });
  }

  wireOrders();
  updateVisibility();

  const originalRender = render;
  render = function patchedOrdersRender() {
    const keepOrdersOpen = state.view === "orders";
    originalRender();
    if (keepOrdersOpen) {
      showOrdersView();
    }
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedOrdersSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      updateVisibility();
      subscribeOrders();
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedOrdersLogout() {
    if (ordersChannel && supabaseClient) {
      supabaseClient.removeChannel(ordersChannel);
      ordersChannel = null;
    }
    await originalLogout();
    updateVisibility();
  };

  window.addEventListener("focus", () => {
    updateVisibility();
    if (state.view === "orders") loadOrders();
  });
})();
