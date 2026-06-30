(() => {
  const TABLE = "cooling_load_calculations";
  const STORAGE_KEY = "online-kalender-cooling-load-v1";
  const COLUMNS = "id,calculation_date,customer,room_name,area,total_watts,recommended_kw,data,created_at,updated_at";
  let channel = null;
  let editingId = null;

  const style = document.createElement("style");
  style.textContent = `
    .cooling-load-view[hidden],
    .cooling-load-tab[hidden] {
      display: none !important;
    }

    .cooling-shell {
      width: 100%;
      margin: 0 auto;
      padding: clamp(14px, 2vw, 22px);
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(248, 255, 19, 0.08), transparent 18%), linear-gradient(225deg, rgba(255, 45, 253, 0.12), transparent 24%), var(--panel);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
    }

    .cooling-form {
      display: grid;
      gap: 14px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0, 217, 255, 0.24);
    }

    .cooling-section {
      display: grid;
      gap: 10px;
    }

    .cooling-section-title {
      color: var(--yellow);
      font-size: 0.9rem;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(248, 255, 19, 0.42);
    }

    .cooling-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }

    .cooling-result {
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 10px;
    }

    .cooling-result-item {
      min-height: 72px;
      display: grid;
      align-content: center;
      gap: 5px;
      padding: 10px;
      border: 1px solid rgba(0, 217, 255, 0.28);
      background: rgba(9, 12, 34, 0.58);
    }

    .cooling-result-item span {
      color: var(--muted);
      font-size: 0.68rem;
      text-transform: uppercase;
    }

    .cooling-result-item strong {
      color: var(--text);
      font-size: 1rem;
      font-weight: 400;
    }

    .cooling-result-item.is-main strong {
      color: var(--yellow);
      font-size: 1.15rem;
      text-shadow: 0 0 10px rgba(248, 255, 19, 0.42);
    }

    .cooling-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .cooling-list {
      min-height: 120px;
      margin-top: 16px;
    }

    .cooling-table {
      display: grid;
      gap: 8px;
    }

    .cooling-row {
      display: grid;
      grid-template-columns: 0.85fr 1.1fr 1fr 0.7fr 0.75fr 0.75fr minmax(220px, auto);
      gap: 10px;
      align-items: center;
      min-height: 46px;
      padding: 9px;
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.58);
    }

    .cooling-head {
      min-height: 36px;
      color: var(--cyan);
      background: rgba(7, 11, 31, 0.96);
      font-size: 0.74rem;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(0, 217, 255, 0.58);
    }

    .cooling-row span {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .cooling-row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
    }

    .cooling-empty {
      min-height: 120px;
      display: grid;
      place-items: center;
      color: var(--muted);
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.42);
      text-transform: uppercase;
    }

    @media (max-width: 1100px) {
      .cooling-result {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cooling-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cooling-head {
        display: none;
      }

      .cooling-row span::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 3px;
        color: var(--cyan);
        font-size: 0.66rem;
        text-transform: uppercase;
      }

      .cooling-row-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }

    @media (max-width: 620px) {
      .cooling-fields,
      .cooling-result,
      .cooling-row,
      .cooling-row-actions {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);

  function isLoggedIn() {
    return Boolean(elements.appShell && !elements.appShell.hidden);
  }

  function number(value, fallback = 0) {
    const next = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(next) ? next : fallback;
  }

  function round(value, digits = 0) {
    const factor = 10 ** digits;
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function today() {
    return typeof todayKey === "function" ? todayKey() : new Date().toISOString().slice(0, 10);
  }

  function formatKey(key) {
    return typeof isDateKey === "function" && isDateKey(key) ? formatDate(fromDateKey(key)) : "-";
  }

  function formatWatts(value) {
    return `${Math.round(Number(value) || 0).toLocaleString("de-DE")} W`;
  }

  function formatKw(value) {
    return `${round(value, 2).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`;
  }

  function recommendedSize(totalWatts) {
    const kw = totalWatts / 1000;
    const sizes = [2.0, 2.5, 3.5, 5.0, 6.0, 7.0, 8.0, 10.0, 12.5, 14.0];
    return sizes.find((size) => size >= kw) || Math.ceil(kw);
  }

  function orientationFactor(value) {
    return {
      Nord: 0.65,
      Ost: 0.9,
      Süd: 1.15,
      West: 1.25
    }[value] || 1;
  }

  function insulationFactor(value) {
    return {
      schlecht: 1.28,
      mittel: 1,
      gut: 0.82,
      "sehr gut": 0.68
    }[value] || 1;
  }

  function roomTypeFactor(value) {
    return {
      Wohnzimmer: 1,
      Schlafzimmer: 0.88,
      Büro: 1.12,
      Küche: 1.18,
      Dachzimmer: 1.25
    }[value] || 1;
  }

  function normalize(record) {
    const data = record?.data && typeof record.data === "object" ? record.data : record || {};
    const calc = data.calculation || {};
    return {
      id: typeof isUuid === "function" && isUuid(record?.id) ? String(record.id) : crypto.randomUUID(),
      calculationDate: String(record?.calculationDate || record?.calculation_date || data.calculationDate || today()),
      customer: String(record?.customer || data.customer || "").trim(),
      address: String(data.address || "").trim(),
      roomName: String(record?.roomName || record?.room_name || data.roomName || "").trim(),
      roomType: String(data.roomType || "Wohnzimmer"),
      length: number(data.length),
      width: number(data.width),
      height: number(data.height, 2.5),
      targetTemp: number(data.targetTemp, 22),
      outsideTemp: number(data.outsideTemp, 35),
      wallArea: number(data.wallArea),
      windowArea: number(data.windowArea),
      orientation: String(data.orientation || "Süd"),
      shading: String(data.shading || "teilweise"),
      roofArea: number(data.roofArea),
      insulation: String(data.insulation || "mittel"),
      people: number(data.people),
      devicesWatts: number(data.devicesWatts),
      lightingWatts: number(data.lightingWatts),
      airChanges: number(data.airChanges, 0.5),
      safetyPercent: number(data.safetyPercent, 10),
      notes: String(data.notes || "").trim(),
      calculation: {
        area: number(record?.area ?? calc.area),
        volume: number(calc.volume),
        transmissionWatts: number(calc.transmissionWatts),
        windowWatts: number(calc.windowWatts),
        roofWatts: number(calc.roofWatts),
        ventilationWatts: number(calc.ventilationWatts),
        internalWatts: number(calc.internalWatts),
        subtotalWatts: number(calc.subtotalWatts),
        totalWatts: number(record?.total_watts ?? calc.totalWatts),
        recommendedKw: number(record?.recommended_kw ?? calc.recommendedKw)
      },
      createdAt: record?.created_at || "",
      updatedAt: record?.updated_at || ""
    };
  }

  function calculate(record) {
    const delta = Math.max(0, record.outsideTemp - record.targetTemp);
    const area = record.length && record.width ? record.length * record.width : record.calculation.area;
    const volume = area * (record.height || 2.5);
    const wallArea = record.wallArea || Math.max(0, (record.length + record.width) * 2 * (record.height || 2.5) - record.windowArea);
    const shadeFactor = record.shading === "ja" ? 0.55 : record.shading === "nein" ? 1 : 0.78;
    const baseFactor = insulationFactor(record.insulation) * roomTypeFactor(record.roomType);
    const transmissionWatts = wallArea * 0.8 * delta * baseFactor;
    const windowWatts = record.windowArea * 185 * orientationFactor(record.orientation) * shadeFactor;
    const roofWatts = record.roofArea * 0.9 * delta * baseFactor;
    const ventilationWatts = volume * record.airChanges * delta * 0.34;
    const internalWatts = record.people * 120 + record.devicesWatts + record.lightingWatts;
    const subtotalWatts = transmissionWatts + windowWatts + roofWatts + ventilationWatts + internalWatts;
    const totalWatts = subtotalWatts * (1 + Math.max(0, record.safetyPercent) / 100);
    const recommendedKw = recommendedSize(totalWatts);
    return {
      area: round(area, 2),
      volume: round(volume, 2),
      transmissionWatts: round(transmissionWatts),
      windowWatts: round(windowWatts),
      roofWatts: round(roofWatts),
      ventilationWatts: round(ventilationWatts),
      internalWatts: round(internalWatts),
      subtotalWatts: round(subtotalWatts),
      totalWatts: round(totalWatts),
      recommendedKw
    };
  }

  function withCalculation(record) {
    const next = normalize(record);
    next.calculation = calculate(next);
    return next;
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(withCalculation).sort(compareRecords) : [];
    } catch {
      return [];
    }
  }

  function saveLocal(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(toStoredData).sort((a, b) => compareRecords(normalize(a), normalize(b)))));
  }

  function compareRecords(a, b) {
    return `${b.calculationDate} ${b.customer}`.localeCompare(`${a.calculationDate} ${a.customer}`);
  }

  let records = loadLocal();

  function toStoredData(record) {
    return {
      id: record.id,
      calculationDate: record.calculationDate,
      customer: record.customer,
      address: record.address,
      roomName: record.roomName,
      roomType: record.roomType,
      length: record.length,
      width: record.width,
      height: record.height,
      targetTemp: record.targetTemp,
      outsideTemp: record.outsideTemp,
      wallArea: record.wallArea,
      windowArea: record.windowArea,
      orientation: record.orientation,
      shading: record.shading,
      roofArea: record.roofArea,
      insulation: record.insulation,
      people: record.people,
      devicesWatts: record.devicesWatts,
      lightingWatts: record.lightingWatts,
      airChanges: record.airChanges,
      safetyPercent: record.safetyPercent,
      notes: record.notes,
      calculation: record.calculation
    };
  }

  function fromRow(row) {
    return withCalculation({
      id: row.id,
      calculation_date: row.calculation_date,
      customer: row.customer,
      room_name: row.room_name,
      area: row.area,
      total_watts: row.total_watts,
      recommended_kw: row.recommended_kw,
      data: row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  function toRow(record) {
    const data = toStoredData(record);
    return {
      id: record.id,
      calculation_date: record.calculationDate || today(),
      customer: record.customer,
      room_name: record.roomName,
      area: record.calculation.area,
      total_watts: record.calculation.totalWatts,
      recommended_kw: record.calculation.recommendedKw,
      data
    };
  }

  function ensureShell() {
    const view = document.querySelector("#cooling-load-view");
    if (!view) return null;
    if (!view.innerHTML.trim()) {
      view.innerHTML = `
        <div class="cooling-shell">
          <form class="cooling-form" id="cooling-form">
            <div class="section-header">
              <h2>Kühllast</h2>
              <button class="primary-button" type="submit">Speichern</button>
            </div>
            <input id="cooling-id" type="hidden">

            ${section("Projektdaten", `
              ${field("cooling-date", "Datum", "date")}
              ${field("cooling-customer", "Kunde")}
              ${field("cooling-address", "Anschrift")}
              ${field("cooling-room-name", "Raum")}
              ${select("cooling-room-type", "Raumtyp", ["Wohnzimmer", "Schlafzimmer", "Büro", "Küche", "Dachzimmer"])}
              ${field("cooling-target-temp", "Raumtemperatur °C", "number", "22", "0.5")}
              ${field("cooling-outside-temp", "Außentemperatur °C", "number", "35", "0.5")}
            `)}

            ${section("Raumdaten", `
              ${field("cooling-length", "Länge m", "number", "", "0.01")}
              ${field("cooling-width", "Breite m", "number", "", "0.01")}
              ${field("cooling-height", "Höhe m", "number", "2.50", "0.01")}
              ${field("cooling-wall-area", "Außenwand m²", "number", "", "0.01")}
              ${field("cooling-window-area", "Fenster m²", "number", "", "0.01")}
              ${select("cooling-orientation", "Fenster Richtung", ["Nord", "Ost", "Süd", "West"])}
              ${select("cooling-shading", "Sonnenschutz", [["ja", "Ja"], ["teilweise", "Teilweise"], ["nein", "Nein"]])}
              ${field("cooling-roof-area", "Dachfläche m²", "number", "", "0.01")}
              ${select("cooling-insulation", "Dämmung", [["schlecht", "Schlecht"], ["mittel", "Mittel"], ["gut", "Gut"], ["sehr gut", "Sehr gut"]])}
            `)}

            ${section("Innere Lasten", `
              ${field("cooling-people", "Personen", "number", "", "1")}
              ${field("cooling-devices", "Geräte W", "number", "", "1")}
              ${field("cooling-lighting", "Beleuchtung W", "number", "", "1")}
              ${field("cooling-air-changes", "Luftwechsel 1/h", "number", "0.5", "0.1")}
              ${field("cooling-safety", "Zuschlag %", "number", "10", "1")}
              <label class="field">
                <span>Empfehlung / Notiz</span>
                <textarea id="cooling-notes" rows="3"></textarea>
              </label>
            `)}

            <div class="cooling-result" id="cooling-result"></div>
            <p class="form-error" id="cooling-status" role="status"></p>
            <div class="cooling-actions">
              <button class="text-button" id="cooling-reset" type="button">Neu</button>
              <button class="text-button" id="cooling-pdf" type="button">PDF speichern</button>
              <button class="text-button" id="cooling-mail" type="button">E-Mail</button>
            </div>
          </form>
          <div class="cooling-list" id="cooling-list"></div>
        </div>
      `;
      document.querySelector("#cooling-form")?.addEventListener("submit", saveRecord);
      document.querySelector("#cooling-reset")?.addEventListener("click", resetForm);
      document.querySelector("#cooling-pdf")?.addEventListener("click", () => printRecord(readForm()));
      document.querySelector("#cooling-mail")?.addEventListener("click", () => emailRecord(readForm()));
      document.querySelectorAll("#cooling-form input, #cooling-form select, #cooling-form textarea").forEach((input) => {
        input.addEventListener("input", updateResult);
        input.addEventListener("change", updateResult);
      });
      resetForm();
    }
    return view;
  }

  function section(title, body) {
    return `<section class="cooling-section"><span class="cooling-section-title">${title}</span><div class="cooling-fields">${body}</div></section>`;
  }

  function field(id, label, type = "text", value = "", step = "") {
    const stepAttr = step ? ` step="${step}"` : "";
    return `<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${value}"${stepAttr}></label>`;
  }

  function select(id, label, options) {
    const items = options.map((option) => {
      const value = Array.isArray(option) ? option[0] : option;
      const text = Array.isArray(option) ? option[1] : option;
      return `<option value="${value}">${text}</option>`;
    }).join("");
    return `<label class="field"><span>${label}</span><select id="${id}">${items}</select></label>`;
  }

  function setValue(id, value) {
    const element = document.querySelector(`#${id}`);
    if (element) element.value = value ?? "";
  }

  function value(id) {
    return document.querySelector(`#${id}`)?.value || "";
  }

  function readForm() {
    return withCalculation({
      id: value("cooling-id") || crypto.randomUUID(),
      calculationDate: value("cooling-date") || today(),
      customer: value("cooling-customer"),
      address: value("cooling-address"),
      roomName: value("cooling-room-name"),
      roomType: value("cooling-room-type"),
      length: value("cooling-length"),
      width: value("cooling-width"),
      height: value("cooling-height"),
      targetTemp: value("cooling-target-temp"),
      outsideTemp: value("cooling-outside-temp"),
      wallArea: value("cooling-wall-area"),
      windowArea: value("cooling-window-area"),
      orientation: value("cooling-orientation"),
      shading: value("cooling-shading"),
      roofArea: value("cooling-roof-area"),
      insulation: value("cooling-insulation"),
      people: value("cooling-people"),
      devicesWatts: value("cooling-devices"),
      lightingWatts: value("cooling-lighting"),
      airChanges: value("cooling-air-changes"),
      safetyPercent: value("cooling-safety"),
      notes: value("cooling-notes")
    });
  }

  function fillForm(record) {
    const next = withCalculation(record);
    setValue("cooling-id", next.id);
    setValue("cooling-date", next.calculationDate);
    setValue("cooling-customer", next.customer);
    setValue("cooling-address", next.address);
    setValue("cooling-room-name", next.roomName);
    setValue("cooling-room-type", next.roomType);
    setValue("cooling-length", next.length || "");
    setValue("cooling-width", next.width || "");
    setValue("cooling-height", next.height || "");
    setValue("cooling-target-temp", next.targetTemp || "");
    setValue("cooling-outside-temp", next.outsideTemp || "");
    setValue("cooling-wall-area", next.wallArea || "");
    setValue("cooling-window-area", next.windowArea || "");
    setValue("cooling-orientation", next.orientation);
    setValue("cooling-shading", next.shading);
    setValue("cooling-roof-area", next.roofArea || "");
    setValue("cooling-insulation", next.insulation);
    setValue("cooling-people", next.people || "");
    setValue("cooling-devices", next.devicesWatts || "");
    setValue("cooling-lighting", next.lightingWatts || "");
    setValue("cooling-air-changes", next.airChanges || "");
    setValue("cooling-safety", next.safetyPercent || "");
    setValue("cooling-notes", next.notes);
    updateResult();
  }

  function updateResult() {
    const result = document.querySelector("#cooling-result");
    if (!result) return;
    const record = readForm();
    const calc = record.calculation;
    result.innerHTML = `
      ${resultItem("Fläche", `${round(calc.area, 2).toLocaleString("de-DE")} m²`)}
      ${resultItem("Volumen", `${round(calc.volume, 2).toLocaleString("de-DE")} m³`)}
      ${resultItem("Gesamtkühllast", formatWatts(calc.totalWatts), true)}
      ${resultItem("Gerätegröße", formatKw(calc.recommendedKw), true)}
      ${resultItem("Sicherheitszuschlag", `${record.safetyPercent.toLocaleString("de-DE")} %`)}
    `;
  }

  function resultItem(label, value, main = false) {
    return `<div class="cooling-result-item${main ? " is-main" : ""}"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function setStatus(message) {
    const status = document.querySelector("#cooling-status");
    if (status) status.textContent = message || "";
  }

  function cell(text, label) {
    const item = document.createElement("span");
    item.dataset.label = label;
    item.textContent = text || "-";
    return item;
  }

  function button(label, className, handler) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = className;
    item.textContent = label;
    item.addEventListener("click", handler);
    return item;
  }

  function renderList() {
    const list = document.querySelector("#cooling-list");
    if (!list) return;
    const sorted = [...records].sort(compareRecords);
    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "cooling-empty";
      empty.textContent = "Keine Kühllastberechnung gespeichert.";
      list.replaceChildren(empty);
      return;
    }

    const table = document.createElement("div");
    table.className = "cooling-table";
    const head = document.createElement("div");
    head.className = "cooling-row cooling-head";
    ["Datum", "Kunde", "Raum", "Fläche", "Kühllast", "Gerät", ""].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      head.append(item);
    });
    table.append(head);

    sorted.forEach((record) => {
      const row = document.createElement("div");
      row.className = "cooling-row";
      row.append(
        cell(formatKey(record.calculationDate), "Datum"),
        cell(record.customer, "Kunde"),
        cell(record.roomName, "Raum"),
        cell(`${round(record.calculation.area, 2).toLocaleString("de-DE")} m²`, "Fläche"),
        cell(formatWatts(record.calculation.totalWatts), "Kühllast"),
        cell(formatKw(record.calculation.recommendedKw), "Gerät")
      );
      const actions = document.createElement("span");
      actions.className = "cooling-row-actions";
      actions.append(
        button("PDF", "text-button", () => printRecord(record)),
        button("E-Mail", "text-button", () => emailRecord(record)),
        button("Bearbeiten", "text-button", () => editRecord(record.id)),
        button("Löschen", "danger-button", () => deleteRecord(record.id))
      );
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
      .order("calculation_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setStatus("Kühllastberechnungen konnten nicht geladen werden.");
      console.error(error);
      records = loadLocal();
      renderList();
      return;
    }
    records = data.map(fromRow).sort(compareRecords);
    saveLocal(records);
    renderList();
  }

  async function saveRecord(event) {
    event.preventDefault();
    const record = readForm();
    if (!record.calculationDate) {
      setStatus("Bitte Datum eintragen.");
      return;
    }
    let saved = record;
    if (useRemoteStorage()) {
      setStatus("Speichere...");
      const { data, error } = await supabaseClient.from(TABLE).upsert(toRow(record)).select(COLUMNS).single();
      if (error) {
        setStatus("Kühllastberechnung konnte nicht gespeichert werden.");
        console.error(error);
        return;
      }
      saved = fromRow(data);
    }
    const existing = records.find((item) => item.id === saved.id);
    if (existing) Object.assign(existing, saved);
    else records.push(saved);
    saveLocal(records);
    resetForm();
    renderList();
    setStatus("Kühllastberechnung gespeichert.");
  }

  function editRecord(id) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    editingId = id;
    fillForm(record);
    setStatus("Kühllastberechnung wird bearbeitet.");
    document.querySelector("#cooling-customer")?.focus();
  }

  async function deleteRecord(id) {
    if (!id || !confirm("Kühllastberechnung löschen?")) return;
    if (useRemoteStorage()) {
      setStatus("Lösche...");
      const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (error) {
        setStatus("Kühllastberechnung konnte nicht gelöscht werden.");
        console.error(error);
        return;
      }
    }
    records = records.filter((item) => item.id !== id);
    saveLocal(records);
    if (editingId === id) resetForm();
    renderList();
    setStatus("Kühllastberechnung gelöscht.");
  }

  function resetForm() {
    editingId = null;
    document.querySelector("#cooling-form")?.reset();
    setValue("cooling-id", "");
    setValue("cooling-date", today());
    setValue("cooling-height", "2.50");
    setValue("cooling-target-temp", "22");
    setValue("cooling-outside-temp", "35");
    setValue("cooling-air-changes", "0.5");
    setValue("cooling-safety", "10");
    setValue("cooling-room-type", "Wohnzimmer");
    setValue("cooling-orientation", "Süd");
    setValue("cooling-shading", "teilweise");
    setValue("cooling-insulation", "mittel");
    setStatus("");
    updateResult();
  }

  function reportLines(record) {
    const next = withCalculation(record);
    const calc = next.calculation;
    return [
      "Kühllastberechnung",
      "",
      `Datum: ${formatKey(next.calculationDate)}`,
      `Kunde: ${next.customer || "-"}`,
      `Anschrift: ${next.address || "-"}`,
      `Raum: ${next.roomName || "-"} (${next.roomType})`,
      "",
      `Fläche: ${round(calc.area, 2).toLocaleString("de-DE")} m²`,
      `Volumen: ${round(calc.volume, 2).toLocaleString("de-DE")} m³`,
      `Außentemperatur: ${next.outsideTemp} °C`,
      `Raumtemperatur: ${next.targetTemp} °C`,
      "",
      `Gebäudehülle: ${formatWatts(calc.transmissionWatts)}`,
      `Fenster / Sonne: ${formatWatts(calc.windowWatts)}`,
      `Dach: ${formatWatts(calc.roofWatts)}`,
      `Lüftung: ${formatWatts(calc.ventilationWatts)}`,
      `Innere Lasten: ${formatWatts(calc.internalWatts)}`,
      `Zwischensumme: ${formatWatts(calc.subtotalWatts)}`,
      `Gesamtkühllast: ${formatWatts(calc.totalWatts)}`,
      `Empfohlene Gerätegröße: ${formatKw(calc.recommendedKw)}`,
      "",
      `Notiz: ${next.notes || "-"}`
    ];
  }

  function printRecord(record) {
    const lines = reportLines(record);
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.write(`
      <!doctype html>
      <html lang="de">
        <head>
          <meta charset="utf-8">
          <title>Kühllastberechnung</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 28px; color: #111; }
            pre { white-space: pre-wrap; font: 14px/1.5 Arial, sans-serif; }
          </style>
        </head>
        <body><pre>${lines.map(escapeHtml).join("\n")}</pre></body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function emailRecord(record) {
    const subject = encodeURIComponent(`Kühllastberechnung ${record.customer || record.roomName || ""}`.trim());
    const body = encodeURIComponent(reportLines(record).join("\n"));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function hideOtherViews() {
    document.querySelectorAll(".tab-button.is-active").forEach((tab) => tab.classList.remove("is-active"));
    document.querySelector("#week-view").hidden = true;
    document.querySelector("#month-view").hidden = true;
    document.querySelector("#year-view").hidden = true;
    document.querySelector("#tasks-view")?.setAttribute("hidden", "");
    document.querySelector("#orders-view")?.setAttribute("hidden", "");
    document.querySelector("#maintenance-view")?.setAttribute("hidden", "");
    document.querySelector("#inquiries-view")?.setAttribute("hidden", "");
    document.querySelector("#work-reports-view")?.setAttribute("hidden", "");
    document.querySelector("#tasks-axel-tab")?.classList.remove("is-active");
    document.querySelector("#orders-tab")?.classList.remove("is-active");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
    document.querySelector("#inquiries-tab")?.classList.remove("is-active");
    document.querySelector("#work-reports-tab")?.classList.remove("is-active");
  }

  function showCalendarViews() {
    const view = ensureShell();
    if (view) view.hidden = true;
    document.querySelector("#cooling-load-tab")?.classList.remove("is-active");
  }

  function openCoolingLoad() {
    if (!isLoggedIn()) return;
    state.view = "cooling-load";
    const view = ensureShell();
    hideOtherViews();
    if (view) view.hidden = false;
    document.querySelector("#cooling-load-tab")?.classList.add("is-active");
    elements.prevButton.hidden = true;
    elements.nextButton.hidden = true;
    elements.todayButton.hidden = true;
    elements.newEventButton.hidden = true;
    elements.rangeLabel.textContent = "Kühllast";
    renderList();
    subscribe();
    loadRemote();
  }

  function subscribe() {
    if (!useRemoteStorage() || channel) return;
    channel = supabaseClient
      .channel("cooling_load_calculations_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        if (state.view === "cooling-load") loadRemote();
      })
      .subscribe();
  }

  function wire() {
    ensureShell();
    document.querySelector("#cooling-load-tab")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openCoolingLoad();
    }, true);

    document.querySelectorAll('.tab-button:not(#cooling-load-tab)').forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (state.view !== "cooling-load") showCalendarViews();
        }, 0);
      });
    });
  }

  wire();

  const originalRender = render;
  render = function patchedCoolingLoadRender() {
    const keepOpen = state.view === "cooling-load";
    originalRender();
    if (keepOpen) openCoolingLoad();
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedCoolingLoadSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      if (authenticated) subscribe();
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedCoolingLoadLogout() {
    if (channel && supabaseClient) {
      supabaseClient.removeChannel(channel);
      channel = null;
    }
    await originalLogout();
  };

  window.addEventListener("focus", () => {
    if (state.view === "cooling-load") loadRemote();
  });
})();
