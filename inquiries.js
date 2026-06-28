(() => {
  const TABLE = "inquiry_records";
  const STORAGE_KEY = "online-kalender-inquiries-v1";
  const COLUMNS = "id,inquiry_date,system_type,customer_type,name,address,phone,email";
  let channel = null;
  let editingId = null;

  const style = document.createElement("style");
  style.textContent = `
    .inquiries-view[hidden],
    .inquiries-tab[hidden] {
      display: none !important;
    }

    .inquiries-shell {
      width: min(1260px, 100%);
      margin: 0 auto;
      padding: clamp(14px, 2vw, 22px);
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(248, 255, 19, 0.08), transparent 18%), linear-gradient(225deg, rgba(255, 45, 253, 0.12), transparent 24%), var(--panel);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
    }

    .inquiries-form {
      display: grid;
      gap: 14px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0, 217, 255, 0.24);
    }

    .inquiries-fields {
      display: grid;
      grid-template-columns: 0.9fr 1fr 0.95fr 1fr 1.2fr 0.9fr 1fr;
      gap: 10px;
    }

    .inquiry-type-field {
      min-width: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }

    .inquiry-checks {
      min-height: 42px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .inquiry-checks label {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      border: 1px solid rgba(0, 217, 255, 0.48);
      padding: 0 6px;
      color: var(--text);
      background: rgba(3, 6, 22, 0.82);
      font-size: 0.68rem;
      line-height: 1.05;
      text-transform: none;
    }

    .inquiry-checks input {
      width: 14px;
      height: 14px;
      flex: 0 0 14px;
      accent-color: var(--yellow);
    }

    .inquiry-checks span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .inquiries-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .inquiries-list {
      min-height: 120px;
      margin-top: 16px;
    }

    .inquiries-table {
      display: grid;
      gap: 8px;
    }

    .inquiry-row {
      display: grid;
      grid-template-columns: 0.85fr 1fr 0.75fr 1fr 1.2fr 0.9fr 1fr minmax(170px, auto);
      gap: 10px;
      align-items: center;
      min-height: 46px;
      padding: 9px;
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.58);
    }

    .inquiry-head {
      min-height: 36px;
      color: var(--cyan);
      background: rgba(7, 11, 31, 0.96);
      font-size: 0.74rem;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(0, 217, 255, 0.58);
    }

    .inquiry-row span {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .inquiry-row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
    }

    .inquiries-empty {
      min-height: 120px;
      display: grid;
      place-items: center;
      color: var(--muted);
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.42);
      text-transform: uppercase;
    }

    @media (max-width: 1100px) {
      .inquiries-fields,
      .inquiry-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .inquiry-head {
        display: none;
      }

      .inquiry-row span::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 3px;
        color: var(--cyan);
        font-size: 0.66rem;
        text-transform: uppercase;
      }

      .inquiry-row-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }

    @media (max-width: 620px) {
      .inquiries-fields,
      .inquiry-row,
      .inquiry-row-actions {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);

  function isLoggedIn() {
    return Boolean(elements.appShell && !elements.appShell.hidden);
  }

  function normalizeType(value) {
    return value === "Privat" || value === "Gewerblich" ? value : "";
  }

  function normalize(record) {
    return {
      id: isUuid(record?.id) ? String(record.id) : crypto.randomUUID(),
      inquiryDate: String(record?.inquiryDate || record?.inquiry_date || ""),
      systemType: String(record?.systemType || record?.system_type || "").trim(),
      customerType: normalizeType(record?.customerType || record?.customer_type),
      name: String(record?.name || "").trim(),
      address: String(record?.address || "").trim(),
      phone: String(record?.phone || "").trim(),
      email: String(record?.email || "").trim()
    };
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalize).sort(compareRecords) : [];
    } catch {
      return [];
    }
  }

  function saveLocal(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.sort(compareRecords)));
  }

  function compareRecords(a, b) {
    return `${a.inquiryDate || "9999-12-31"} ${a.name}`.localeCompare(`${b.inquiryDate || "9999-12-31"} ${b.name}`);
  }

  let records = loadLocal();

  function fromRow(row) {
    return normalize(row);
  }

  function toRow(record) {
    return {
      id: record.id,
      inquiry_date: record.inquiryDate || null,
      system_type: record.systemType,
      customer_type: record.customerType,
      name: record.name,
      address: record.address,
      phone: record.phone,
      email: record.email
    };
  }

  function ensureShell() {
    const view = document.querySelector("#inquiries-view");
    if (!view) return null;
    if (!view.innerHTML.trim()) {
      view.innerHTML = `
        <div class="inquiries-shell">
          <form class="inquiries-form" id="inquiries-form">
            <div class="section-header">
              <h2>Anfragen</h2>
              <button class="primary-button" type="submit">Speichern</button>
            </div>
            <input id="inquiry-id" type="hidden">
            <div class="inquiries-fields">
              <label class="field">
                <span>Datum der Anfrage</span>
                <input id="inquiry-date" type="date">
              </label>
              <label class="field">
                <span>Anlagen Typ</span>
                <input id="inquiry-system-type" type="text" autocomplete="off">
              </label>
              <fieldset class="field inquiry-type-field">
                <span>Art</span>
                <div class="inquiry-checks">
                  <label>
                    <input id="inquiry-commercial" type="checkbox" value="Gewerblich">
                    <span>Gewerblich</span>
                  </label>
                  <label>
                    <input id="inquiry-private" type="checkbox" value="Privat">
                    <span>Privat</span>
                  </label>
                </div>
              </fieldset>
              <label class="field">
                <span>Name</span>
                <input id="inquiry-name" type="text" autocomplete="name">
              </label>
              <label class="field">
                <span>Anschrift</span>
                <input id="inquiry-address" type="text" autocomplete="street-address">
              </label>
              <label class="field">
                <span>Telefonnummer</span>
                <input id="inquiry-phone" type="tel" autocomplete="tel">
              </label>
              <label class="field">
                <span>E-Mail Adresse</span>
                <input id="inquiry-email" type="email" autocomplete="email">
              </label>
            </div>
            <p class="form-error" id="inquiries-status" role="status"></p>
            <div class="inquiries-actions">
              <button class="text-button" id="inquiries-reset-button" type="button">Neu</button>
            </div>
          </form>
          <div class="inquiries-list" id="inquiries-list"></div>
        </div>
      `;
      document.querySelector("#inquiries-form")?.addEventListener("submit", saveRecord);
      document.querySelector("#inquiries-reset-button")?.addEventListener("click", resetForm);
      document.querySelector("#inquiry-commercial")?.addEventListener("change", () => syncType("Gewerblich"));
      document.querySelector("#inquiry-private")?.addEventListener("change", () => syncType("Privat"));
    }
    return view;
  }

  function setStatus(message) {
    const status = document.querySelector("#inquiries-status");
    if (status) status.textContent = message || "";
  }

  function syncType(type) {
    const commercial = document.querySelector("#inquiry-commercial");
    const privateBox = document.querySelector("#inquiry-private");
    if (type === "Gewerblich" && commercial?.checked && privateBox) privateBox.checked = false;
    if (type === "Privat" && privateBox?.checked && commercial) commercial.checked = false;
  }

  function selectedType() {
    if (document.querySelector("#inquiry-commercial")?.checked) return "Gewerblich";
    if (document.querySelector("#inquiry-private")?.checked) return "Privat";
    return "";
  }

  function cell(value, label) {
    const item = document.createElement("span");
    item.dataset.label = label;
    item.textContent = value || "-";
    return item;
  }

  function formatKey(key) {
    return isDateKey(key) ? formatDate(fromDateKey(key)) : "-";
  }

  function renderList() {
    const list = document.querySelector("#inquiries-list");
    if (!list) return;
    const sorted = [...records].sort(compareRecords);
    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "inquiries-empty";
      empty.textContent = "Keine Anfragen eingetragen.";
      list.replaceChildren(empty);
      return;
    }

    const table = document.createElement("div");
    table.className = "inquiries-table";
    const head = document.createElement("div");
    head.className = "inquiry-row inquiry-head";
    ["Datum", "Anlagen Typ", "Art", "Name", "Anschrift", "Telefon", "E-Mail", ""].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      head.append(item);
    });
    table.append(head);

    sorted.forEach((record) => {
      const row = document.createElement("div");
      row.className = "inquiry-row";
      row.append(
        cell(formatKey(record.inquiryDate), "Datum"),
        cell(record.systemType, "Anlagen Typ"),
        cell(record.customerType, "Art"),
        cell(record.name, "Name"),
        cell(record.address, "Anschrift"),
        cell(record.phone, "Telefon"),
        cell(record.email, "E-Mail")
      );

      const actions = document.createElement("span");
      actions.className = "inquiry-row-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "text-button";
      edit.textContent = "Bearbeiten";
      edit.addEventListener("click", () => editRecord(record.id));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger-button";
      remove.textContent = "Löschen";
      remove.addEventListener("click", () => deleteRecord(record.id));
      actions.append(edit, remove);
      row.append(actions);
      table.append(row);
    });
    list.replaceChildren(table);
  }

  async function loadRemote() {
    if (!useRemoteStorage()) {
      records = loadLocal();
      renderList();
      return;
    }
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select(COLUMNS)
      .order("inquiry_date", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    if (error) {
      setStatus("Anfragen konnten nicht geladen werden.");
      console.error(error);
      return;
    }
    records = data.map(fromRow).sort(compareRecords);
    saveLocal(records);
    renderList();
  }

  async function saveRecord(event) {
    event.preventDefault();
    const id = document.querySelector("#inquiry-id").value || crypto.randomUUID();
    const record = normalize({
      id,
      inquiryDate: document.querySelector("#inquiry-date").value,
      systemType: document.querySelector("#inquiry-system-type").value,
      customerType: selectedType(),
      name: document.querySelector("#inquiry-name").value,
      address: document.querySelector("#inquiry-address").value,
      phone: document.querySelector("#inquiry-phone").value,
      email: document.querySelector("#inquiry-email").value
    });

    let saved = record;
    if (useRemoteStorage()) {
      const { data, error } = await supabaseClient.from(TABLE).upsert(toRow(record)).select(COLUMNS).single();
      if (error) {
        setStatus("Anfrage konnte nicht gespeichert werden.");
        console.error(error);
        return;
      }
      saved = fromRow(data);
    }

    const existing = records.find((item) => item.id === id);
    if (existing) Object.assign(existing, saved);
    else records.push(saved);
    saveLocal(records);
    resetForm();
    renderList();
  }

  function editRecord(id) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    editingId = id;
    document.querySelector("#inquiry-id").value = record.id;
    document.querySelector("#inquiry-date").value = record.inquiryDate;
    document.querySelector("#inquiry-system-type").value = record.systemType;
    document.querySelector("#inquiry-commercial").checked = record.customerType === "Gewerblich";
    document.querySelector("#inquiry-private").checked = record.customerType === "Privat";
    document.querySelector("#inquiry-name").value = record.name;
    document.querySelector("#inquiry-address").value = record.address;
    document.querySelector("#inquiry-phone").value = record.phone;
    document.querySelector("#inquiry-email").value = record.email;
    setStatus("");
    document.querySelector("#inquiry-date").focus();
  }

  async function deleteRecord(id) {
    if (!id || !confirm("Anfrage löschen?")) return;
    if (useRemoteStorage()) {
      const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (error) {
        setStatus("Anfrage konnte nicht gelöscht werden.");
        console.error(error);
        return;
      }
    }
    records = records.filter((item) => item.id !== id);
    saveLocal(records);
    if (editingId === id) resetForm();
    renderList();
  }

  function resetForm() {
    editingId = null;
    document.querySelector("#inquiries-form")?.reset();
    const id = document.querySelector("#inquiry-id");
    if (id) id.value = "";
    setStatus("");
  }

  function hideOtherViews() {
    document.querySelector("#week-view").hidden = true;
    document.querySelector("#month-view").hidden = true;
    document.querySelector("#year-view").hidden = true;
    document.querySelector("#tasks-view")?.setAttribute("hidden", "");
    document.querySelector("#orders-view")?.setAttribute("hidden", "");
    document.querySelector("#maintenance-view")?.setAttribute("hidden", "");
    document.querySelector("#tasks-axel-tab")?.classList.remove("is-active");
    document.querySelector("#orders-tab")?.classList.remove("is-active");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
  }

  function showCalendarViews() {
    const view = ensureShell();
    if (view) view.hidden = true;
    document.querySelector("#inquiries-tab")?.classList.remove("is-active");
  }

  function openInquiries() {
    if (!isLoggedIn()) return;
    state.view = "inquiries";
    const view = ensureShell();
    hideOtherViews();
    if (view) view.hidden = false;
    document.querySelector("#inquiries-tab")?.classList.add("is-active");
    elements.prevButton.hidden = true;
    elements.nextButton.hidden = true;
    elements.todayButton.hidden = true;
    elements.newEventButton.hidden = true;
    elements.rangeLabel.textContent = "Anfragen";
    renderList();
    subscribe();
    loadRemote();
  }

  function subscribe() {
    if (!useRemoteStorage() || channel) return;
    channel = supabaseClient
      .channel("inquiry_records_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        if (state.view === "inquiries") loadRemote();
      })
      .subscribe();
  }

  function wire() {
    ensureShell();
    document.querySelector("#inquiries-tab")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openInquiries();
    }, true);

    document.querySelectorAll('.tab-button:not(#inquiries-tab)').forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (state.view !== "inquiries") showCalendarViews();
        }, 0);
      });
    });
  }

  wire();

  const originalRender = render;
  render = function patchedInquiriesRender() {
    const keepOpen = state.view === "inquiries";
    originalRender();
    if (keepOpen) openInquiries();
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedInquiriesSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      if (authenticated) subscribe();
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedInquiriesLogout() {
    if (channel && supabaseClient) {
      supabaseClient.removeChannel(channel);
      channel = null;
    }
    await originalLogout();
  };

  window.addEventListener("focus", () => {
    if (state.view === "inquiries") loadRemote();
  });
})();
