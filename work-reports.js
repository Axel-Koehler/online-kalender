(() => {
  const TABLE = "work_reports";
  const STORAGE_KEY = "online-kalender-work-reports-v1";
  const VIEW_ID = "work-reports-view";
  const TAB_ID = "work-reports-tab";
  const TEMPLATE_IMAGE = "work-report-template.png";
  const TEMPLATE_WIDTH = 1190;
  const TEMPLATE_HEIGHT = 1682;
  const COLUMNS = "id,report_date,customer,report_number,data,created_at,updated_at";
  const CHECK_FIELDS = [
    { id: "wr-consent", x: 391, y: 1400 },
    { id: "wr-maintenance", x: 672, y: 1400 },
    { id: "wr-service-finished-yes", x: 391, y: 1448 },
    { id: "wr-service-finished-no", x: 445, y: 1448 },
    { id: "wr-center-yes", x: 531, y: 1448 },
    { id: "wr-center-no", x: 585, y: 1448 },
    { id: "wr-electrical-test-yes", x: 391, y: 1473 },
    { id: "wr-electrical-test-no", x: 445, y: 1473 },
    { id: "wr-acceptance-yes", x: 391, y: 1499 },
    { id: "wr-acceptance-no", x: 445, y: 1499 },
    { id: "wr-own-risk-yes", x: 391, y: 1524 },
    { id: "wr-own-risk-no", x: 445, y: 1524 },
    { id: "wr-defects-notice-yes", x: 391, y: 1550 },
    { id: "wr-defects-notice-no", x: 445, y: 1550 },
    { id: "wr-leak-test-yes", x: 391, y: 1575 },
    { id: "wr-leak-test-no", x: 445, y: 1575 }
  ];
  let channel = null;
  let editingId = null;

  const style = document.createElement("style");
  style.textContent = `
    .work-reports-view[hidden],
    .work-reports-tab[hidden] {
      display: none !important;
    }

    .work-reports-shell {
      width: 100%;
      margin: 0 auto;
      padding: clamp(14px, 2vw, 22px);
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(248, 255, 19, 0.08), transparent 18%), linear-gradient(225deg, rgba(0, 217, 255, 0.12), transparent 24%), var(--panel);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
    }

    .work-report-form {
      display: grid;
      gap: 14px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0, 217, 255, 0.24);
    }

    .work-report-template-scroll {
      width: 100%;
      overflow: auto;
      border: 1px solid rgba(0, 217, 255, 0.34);
      background: rgba(3, 6, 22, 0.48);
      -webkit-overflow-scrolling: touch;
    }

    .work-report-template-page {
      position: relative;
      width: min(100%, 1190px);
      min-width: 760px;
      aspect-ratio: 1190 / 1682;
      margin: 0 auto;
      color: #101014;
      background: #fff url("work-report-template.png") center / 100% 100% no-repeat;
    }

    .wr-template-input,
    .wr-template-textarea {
      position: absolute;
      z-index: 2;
      box-sizing: border-box;
      min-height: 0;
      border: 0;
      border-radius: 2px;
      padding: 1px 4px;
      color: #101014;
      background: rgba(255, 255, 255, 0.22);
      box-shadow: inset 0 0 0 1px rgba(0, 119, 160, 0.16);
      font-family: Arial, sans-serif;
      font-size: clamp(10px, 1.1vw, 14px);
      font-weight: 400 !important;
      line-height: 1.1;
      text-transform: none;
      text-shadow: none;
    }

    .wr-template-input:focus,
    .wr-template-textarea:focus {
      outline: 2px solid rgba(0, 119, 160, 0.82);
      background: rgba(255, 255, 255, 0.92);
    }

    .wr-template-textarea {
      resize: none;
    }

    .wr-template-check {
      position: absolute;
      z-index: 3;
      width: 1.45%;
      height: 1.05%;
      margin: 0;
      accent-color: #111;
    }

    .wr-signature {
      position: absolute;
      z-index: 4;
      background: rgba(255, 255, 255, 0.52);
      box-shadow: inset 0 0 0 1px rgba(0, 119, 160, 0.28);
      touch-action: none;
    }

    .wr-signature canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }

    .wr-signature button {
      display: none;
    }

    .work-report-extra-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
    }

    .work-report-group {
      display: grid;
      gap: 10px;
    }

    .work-report-group-title {
      color: var(--yellow);
      font-size: 0.84rem;
      text-transform: uppercase;
    }

    .work-report-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }

    .work-report-wide {
      grid-column: 1 / -1;
    }

    .work-report-checks {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }

    .work-report-checks label {
      min-height: var(--field-height, 44px);
      display: grid;
      grid-template-columns: 14px minmax(0, 1fr);
      align-items: center;
      gap: 5px;
      min-width: 0;
      padding: 0 6px;
      color: var(--text);
      background: rgba(3, 6, 22, 0.82);
      outline: 1px solid rgba(0, 217, 255, 0.48);
      outline-offset: -1px;
      font-size: 0.62rem;
      line-height: 1;
      overflow: hidden;
      text-transform: none;
      text-shadow: none;
    }

    .work-report-checks input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: var(--yellow);
    }

    .work-report-checks span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .work-report-materials {
      display: grid;
      gap: 8px;
    }

    .work-report-material-row {
      display: grid;
      grid-template-columns: minmax(98px, 0.8fr) minmax(70px, 0.55fr) minmax(180px, 2fr) minmax(90px, 0.7fr) minmax(90px, 0.7fr);
      gap: 8px;
    }

    .work-report-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .work-report-status {
      min-height: 20px;
      color: var(--muted);
      font-size: 0.82rem;
    }

    .work-reports-list {
      min-height: 120px;
      margin-top: 16px;
    }

    .work-report-table {
      display: grid;
      gap: 8px;
    }

    .work-report-row {
      display: grid;
      grid-template-columns: 0.8fr 0.8fr 1fr 1.4fr minmax(230px, auto);
      gap: 10px;
      align-items: center;
      min-height: 46px;
      padding: 9px;
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.58);
    }

    .work-report-head {
      min-height: 36px;
      color: var(--cyan);
      background: rgba(7, 11, 31, 0.96);
      font-size: 0.74rem;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(0, 217, 255, 0.58);
    }

    .work-report-row span {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .work-report-row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
      flex-wrap: wrap;
    }

    .work-reports-empty {
      min-height: 120px;
      display: grid;
      place-items: center;
      color: var(--muted);
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.42);
      text-transform: uppercase;
    }

    @media (max-width: 1100px) {
      .work-report-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .work-report-head {
        display: none;
      }

      .work-report-row span::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 3px;
        color: var(--cyan);
        font-size: 0.66rem;
        text-transform: uppercase;
      }

      .work-report-row-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }

    @media (max-width: 760px) {
      .work-report-template-page {
        min-width: 720px;
      }

      .work-report-material-row {
        grid-template-columns: 1fr 1fr;
      }

      .work-report-material-row .field:nth-child(3) {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 620px) {
      .work-report-row,
      .work-report-row-actions,
      .work-report-material-row {
        grid-template-columns: 1fr;
      }

      .work-report-actions,
      .work-report-row-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .work-report-template-page {
        min-width: 700px;
      }
    }
  `;
  document.head.append(style);

  function isLoggedIn() {
    return Boolean(elements.appShell && !elements.appShell.hidden);
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function emptyReport() {
    return {
      id: crypto.randomUUID(),
      reportDate: todayKey(),
      reportNumber: "",
      serviceOrderNumber: "",
      orderDate: "",
      customerName: "",
      company: "",
      street: "",
      postalCity: "",
      site: "",
      systemType: "",
      serialYear: "",
      manufacturer: "",
      manufacturerWarranty: "",
      oldDefects: "",
      workDescription: "",
      startTime: "",
      endTime: "",
      travelTime: "",
      workHours: "",
      overtime: "",
      technicians: "",
      drivenKm: "",
      vehicleCosts: "",
      pressureBar: "",
      consentStorage: false,
      annualMaintenance: false,
      serviceFinished: false,
      electricalTest: false,
      acceptanceDone: false,
      ownRisk: false,
      defectsNotice: false,
      leakTest: false,
      additionalSheet: false,
      netAmount: "",
      vatAmount: "",
      totalAmount: "",
      email: "",
      technicianSignature: "",
      customerSignature: "",
      checkmarks: Object.fromEntries(CHECK_FIELDS.map((field) => [field.id, false])),
      workRows: Array.from({ length: 8 }, () => ({ date: "", start: "", end: "", travel: "", hours: "", overtime: "", technicians: "" })),
      materials: Array.from({ length: 11 }, () => ({ date: "", qty: "", description: "", price: "", sum: "" }))
    };
  }

  function normalize(record) {
    const base = { ...emptyReport(), ...(record?.data || record || {}) };
    base.id = isUuid(record?.id || base.id) ? String(record?.id || base.id) : crypto.randomUUID();
    base.reportDate = String(record?.report_date || base.reportDate || todayKey());
    base.reportNumber = String(record?.report_number || base.reportNumber || "").trim();
    base.customerName = String(record?.customer || base.customerName || "").trim();
    base.checkmarks = { ...Object.fromEntries(CHECK_FIELDS.map((field) => [field.id, false])), ...(base.checkmarks || {}) };
    base.checkmarks["wr-consent"] = Boolean(base.checkmarks["wr-consent"] || base.consentStorage);
    base.checkmarks["wr-maintenance"] = Boolean(base.checkmarks["wr-maintenance"] || base.annualMaintenance);
    base.checkmarks["wr-service-finished-yes"] = Boolean(base.checkmarks["wr-service-finished-yes"] || base.serviceFinished);
    base.checkmarks["wr-electrical-test-yes"] = Boolean(base.checkmarks["wr-electrical-test-yes"] || base.electricalTest);
    base.checkmarks["wr-acceptance-yes"] = Boolean(base.checkmarks["wr-acceptance-yes"] || base.acceptanceDone);
    base.checkmarks["wr-own-risk-yes"] = Boolean(base.checkmarks["wr-own-risk-yes"] || base.ownRisk);
    base.checkmarks["wr-defects-notice-yes"] = Boolean(base.checkmarks["wr-defects-notice-yes"] || base.defectsNotice);
    base.checkmarks["wr-leak-test-yes"] = Boolean(base.checkmarks["wr-leak-test-yes"] || base.leakTest);
    base.consentStorage = base.checkmarks["wr-consent"];
    base.annualMaintenance = base.checkmarks["wr-maintenance"];
    base.serviceFinished = base.checkmarks["wr-service-finished-yes"];
    base.electricalTest = base.checkmarks["wr-electrical-test-yes"];
    base.acceptanceDone = base.checkmarks["wr-acceptance-yes"];
    base.ownRisk = base.checkmarks["wr-own-risk-yes"];
    base.defectsNotice = base.checkmarks["wr-defects-notice-yes"];
    base.leakTest = base.checkmarks["wr-leak-test-yes"];
    base.workRows = Array.isArray(base.workRows) ? base.workRows.slice(0, 8) : [];
    if (base.workRows.length === 0) {
      base.workRows.push({
        date: base.reportDate || "",
        start: base.startTime || "",
        end: base.endTime || "",
        travel: base.travelTime || "",
        hours: base.workHours || "",
        overtime: base.overtime || "",
        technicians: base.technicians || ""
      });
    }
    while (base.workRows.length < 8) base.workRows.push({ date: "", start: "", end: "", travel: "", hours: "", overtime: "", technicians: "" });
    base.workRows = base.workRows.map((row, index) => ({
      date: String(row?.date || (index === 0 ? base.reportDate : "") || ""),
      start: String(row?.start || (index === 0 ? base.startTime : "") || ""),
      end: String(row?.end || (index === 0 ? base.endTime : "") || ""),
      travel: String(row?.travel || (index === 0 ? base.travelTime : "") || ""),
      hours: String(row?.hours || (index === 0 ? base.workHours : "") || ""),
      overtime: String(row?.overtime || (index === 0 ? base.overtime : "") || ""),
      technicians: String(row?.technicians || (index === 0 ? base.technicians : "") || "")
    }));
    const firstWorkRow = base.workRows[0] || {};
    base.reportDate = firstWorkRow.date || base.reportDate;
    base.startTime = firstWorkRow.start || base.startTime;
    base.endTime = firstWorkRow.end || base.endTime;
    base.travelTime = firstWorkRow.travel || base.travelTime;
    base.workHours = firstWorkRow.hours || base.workHours;
    base.overtime = firstWorkRow.overtime || base.overtime;
    base.technicians = firstWorkRow.technicians || base.technicians;
    base.materials = Array.isArray(base.materials) ? base.materials.slice(0, 11) : [];
    while (base.materials.length < 11) base.materials.push({ date: "", qty: "", description: "", price: "", sum: "" });
    return base;
  }

  function toRow(report) {
    return {
      id: report.id,
      report_date: report.reportDate || null,
      report_number: report.reportNumber,
      customer: report.customerName || report.company || "",
      data: report
    };
  }

  function fromRow(row) {
    return normalize({ ...row.data, id: row.id, report_date: row.report_date, report_number: row.report_number, customer: row.customer });
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalize).sort(compareReports) : [];
    } catch {
      return [];
    }
  }

  function saveLocal(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.sort(compareReports)));
  }

  function compareReports(a, b) {
    return `${b.reportDate || ""} ${b.reportNumber || ""}`.localeCompare(`${a.reportDate || ""} ${a.reportNumber || ""}`);
  }

  let reports = loadLocal();

  function ensureTab() {
    let tab = document.querySelector(`#${TAB_ID}`);
    if (!tab) {
      tab = document.createElement("button");
      tab.className = "tab-button work-reports-tab";
      tab.id = TAB_ID;
      tab.type = "button";
      tab.dataset.view = "work-reports";
      tab.textContent = "Arbeitsberichte";
      document.querySelector(".view-tabs")?.append(tab);
    }
    return tab;
  }

  function ensureView() {
    let view = document.querySelector(`#${VIEW_ID}`);
    if (!view) {
      view = document.createElement("section");
      view.id = VIEW_ID;
      view.className = "calendar-view work-reports-view";
      view.setAttribute("aria-label", "Arbeitsberichte");
      view.hidden = true;
      document.querySelector(".calendar-stage")?.append(view);
    }
    if (!view.innerHTML.trim()) renderTemplateShell(view);
    return view;
  }

  function field(id, label, type = "text", options = "") {
    return `
      <label class="field">
        <span>${label}</span>
        <input id="${id}" type="${type}" ${options}>
      </label>
    `;
  }

  function check(id, label) {
    return `<label><input id="${id}" type="checkbox"><span>${label}</span></label>`;
  }

  function pos(x, y, width, height) {
    return `left:${(x / TEMPLATE_WIDTH) * 100}%;top:${(y / TEMPLATE_HEIGHT) * 100}%;width:${(width / TEMPLATE_WIDTH) * 100}%;height:${(height / TEMPLATE_HEIGHT) * 100}%;`;
  }

  function templateInput(id, x, y, width, height, type = "text", options = "") {
    return `<input class="wr-template-input" id="${id}" type="${type}" style="${pos(x, y, width, height)}" ${options}>`;
  }

  function workRowId(baseId, index) {
    return index === 0 ? baseId : `${baseId}-${index}`;
  }

  function templateWorkRow(index, y) {
    return [
      templateInput(workRowId("wr-report-date", index), 78, y, 90, 25, "date"),
      templateInput(workRowId("wr-start", index), 178, y, 100, 25, "time"),
      templateInput(workRowId("wr-end", index), 288, y, 100, 25, "time"),
      templateInput(workRowId("wr-travel", index), 410, y, 95, 25),
      templateInput(workRowId("wr-hours", index), 520, y, 95, 25),
      templateInput(workRowId("wr-overtime", index), 625, y, 65, 25),
      templateInput(workRowId("wr-technicians", index), 765, y, 60, 25, "number", "min=\"0\" step=\"1\"")
    ].join("");
  }

  function templateTextarea(id, x, y, width, height) {
    return `<textarea class="wr-template-textarea" id="${id}" style="${pos(x, y, width, height)}"></textarea>`;
  }

  function templateCheck(id, x, y) {
    return `<input class="wr-template-check" id="${id}" type="checkbox" style="${pos(x, y, 18, 18)}">`;
  }

  function signaturePad(id, x, y, width, height) {
    return `
      <div class="wr-signature" style="${pos(x, y, width, height)}">
        <canvas id="${id}"></canvas>
        <button type="button" data-clear-signature="${id}">Löschen</button>
      </div>
    `;
  }

  function renderShell(view) {
    view.innerHTML = `
      <div class="work-reports-shell">
        <form class="work-report-form" id="work-report-form">
          <div class="section-header">
            <h2>Arbeitsberichte</h2>
            <button class="primary-button" type="submit">Speichern</button>
          </div>
          <input id="work-report-id" type="hidden">

          <section class="work-report-group">
            <span class="work-report-group-title">Kunde und Auftrag</span>
            <div class="work-report-fields">
              ${field("wr-report-date", "Datum", "date")}
              ${field("wr-service-order", "Kundendienstauftrags-Nr.")}
              ${field("wr-order-date", "Auftragsdatum", "date")}
              ${field("wr-customer", "Name, Vorname")}
              ${field("wr-company", "Firma")}
              ${field("wr-street", "Straße")}
              ${field("wr-postal-city", "PLZ, Ort")}
              ${field("wr-site", "BV-Standort")}
              ${field("wr-email", "E-Mail Adresse", "email")}
            </div>
          </section>

          <section class="work-report-group">
            <span class="work-report-group-title">Anlage und Arbeiten</span>
            <div class="work-report-fields">
              ${field("wr-system-type", "Anlagentyp")}
              ${field("wr-serial-year", "Ser.-Nr. / Baujahr")}
              ${field("wr-manufacturer", "Hersteller")}
              ${field("wr-warranty", "M-Garantie ja / nein")}
              ${field("wr-old-defects", "Defektteil(e) alt")}
              <label class="field work-report-wide">
                <span>Arbeits- / Lieferbericht</span>
                <textarea id="wr-description" rows="4"></textarea>
              </label>
            </div>
          </section>

          <section class="work-report-group">
            <span class="work-report-group-title">Zeiten und Kosten</span>
            <div class="work-report-fields">
              ${field("wr-start", "Beginn", "time")}
              ${field("wr-end", "Ende", "time")}
              ${field("wr-travel", "Fahrzeit")}
              ${field("wr-hours", "Arbeitsstunden")}
              ${field("wr-overtime", "Überstunden")}
              ${field("wr-technicians", "Anzahl Monteure", "number", "min=\"0\" step=\"1\"")}
              ${field("wr-km", "Gefahrene km", "number", "min=\"0\" step=\"1\"")}
            </div>
          </section>

          <section class="work-report-group">
            <span class="work-report-group-title">Materialverbrauch / Artikelbezeichnung</span>
            <div class="work-report-materials" id="work-report-materials">
              ${Array.from({ length: 11 }, (_, index) => materialRow(index)).join("")}
            </div>
          </section>

          <section class="work-report-group">
            <span class="work-report-group-title">Prüfung und Bestätigung</span>
            <div class="work-report-checks">
              ${check("wr-consent", "Einwilligung Datenspeicherung")}
              ${check("wr-maintenance", "Jährliche Wartung erwünscht")}
              ${check("wr-service-finished", "Kundendienst beendet")}
              ${check("wr-electrical-test", "Elektroprüfung")}
              ${check("wr-acceptance", "Abnahme erfolgt")}
              ${check("wr-own-risk", "Betreiben auf eigene Verantwortung")}
              ${check("wr-defects-notice", "Mängelhinweis erfolgt")}
              ${check("wr-leak-test", "Dichtheitsprüfung")}
              ${check("wr-additional-sheet", "Zusatzblatt verwendet")}
            </div>
          </section>

          <section class="work-report-group">
            <span class="work-report-group-title">Beträge</span>
            <div class="work-report-fields">
            </div>
          </section>

          <p class="work-report-status" id="work-report-status" role="status"></p>
          <div class="work-report-actions">
            <button class="text-button" id="work-report-reset" type="button">Neu</button>
            <button class="text-button" id="work-report-clear-signatures" type="button">Unterschriften löschen</button>
            <button class="text-button" id="work-report-pdf" type="button">PDF speichern</button>
            <button class="text-button" id="work-report-mail" type="button">E-Mail</button>
          </div>
        </form>
        <div class="work-reports-list" id="work-reports-list"></div>
      </div>
    `;

    document.querySelector("#work-report-form")?.addEventListener("submit", saveReport);
    document.querySelector("#work-report-reset")?.addEventListener("click", resetForm);
    document.querySelector("#work-report-clear-signatures")?.addEventListener("click", () => {
      clearSignature("wr-technician-signature");
      clearSignature("wr-customer-signature");
    });
    document.querySelector("#work-report-pdf")?.addEventListener("click", () => downloadPdf(readForm()));
    document.querySelector("#work-report-mail")?.addEventListener("click", () => emailReport(readForm()));
    resetForm(false);
    renderList();
  }

  function renderTemplateShell(view) {
    view.innerHTML = `
      <div class="work-reports-shell">
        <form class="work-report-form" id="work-report-form">
          <div class="section-header">
            <h2>Arbeitsberichte</h2>
            <button class="primary-button" type="submit">Speichern</button>
          </div>
          <input id="work-report-id" type="hidden">
          <div class="work-report-template-scroll">
            <div class="work-report-template-page" id="work-report-template-page">
              ${templateInput("wr-customer", 210, 280, 365, 24)}
              ${templateInput("wr-company", 210, 312, 365, 24)}
              ${templateInput("wr-street", 210, 345, 365, 24)}
              ${templateInput("wr-postal-city", 210, 378, 365, 24)}
              ${templateInput("wr-service-order", 790, 74, 305, 24)}
              ${templateInput("wr-order-date", 715, 116, 392, 24, "date")}
              ${templateInput("wr-site", 715, 160, 392, 24)}
              ${templateInput("wr-km", 700, 202, 120, 24, "number", "min=\"0\" step=\"1\"")}
              ${templateInput("wr-system-type", 700, 243, 410, 25)}
              ${templateInput("wr-serial-year", 725, 289, 385, 25)}
              ${templateInput("wr-old-defects", 710, 333, 400, 25)}
              ${templateInput("wr-manufacturer", 700, 376, 190, 25)}
              ${templateInput("wr-warranty", 1010, 376, 100, 25)}
              ${[454, 488, 522, 556, 590, 624, 658, 692].map((y, index) => templateWorkRow(index, y)).join("")}
              ${Array.from({ length: 11 }, (_, index) => {
                const materialRows = [805, 845, 885, 924, 964, 1004, 1043, 1083, 1120, 1157, 1194];
                const y = materialRows[index];
                return [
                  templateInput(`wr-material-qty-${index}`, 78, y, 92, 26),
                  templateInput(`wr-material-description-${index}`, 180, y, 640, 26),
                  templateInput(`wr-material-date-${index}`, 0, 0, 1, 1, "date", "tabindex=\"-1\" aria-hidden=\"true\"")
                ].join("");
              }).join("")}
              ${templateTextarea("wr-description", 76, 1229, 1048, 161)}
              ${CHECK_FIELDS.map((field) => templateCheck(field.id, field.x, field.y)).join("")}
              ${signaturePad("wr-technician-signature", 495, 1588, 140, 48)}
              ${signaturePad("wr-customer-signature", 668, 1588, 445, 48)}
            </div>
          </div>
          <div class="work-report-extra-fields">
            ${field("wr-email", "E-Mail Adresse", "email")}
          </div>
          <p class="work-report-status" id="work-report-status" role="status"></p>
          <div class="work-report-actions">
            <button class="text-button" id="work-report-reset" type="button">Neu</button>
            <button class="text-button" id="work-report-pdf" type="button">PDF speichern</button>
            <button class="text-button" id="work-report-mail" type="button">E-Mail</button>
          </div>
        </form>
        <div class="work-reports-list" id="work-reports-list"></div>
      </div>
    `;

    document.querySelector("#work-report-form")?.addEventListener("submit", saveReport);
    document.querySelector("#work-report-reset")?.addEventListener("click", resetForm);
    document.querySelector("#work-report-pdf")?.addEventListener("click", () => downloadPdf(readForm()));
    document.querySelector("#work-report-mail")?.addEventListener("click", () => emailReport(readForm()));
    setupSignaturePads();
    resetForm(false);
    renderList();
  }

  function materialRow(index) {
    return `
      <div class="work-report-material-row" data-material-index="${index}">
        ${field(`wr-material-date-${index}`, "Datum", "date")}
        ${field(`wr-material-qty-${index}`, "Menge")}
        ${field(`wr-material-description-${index}`, "Artikelbezeichnung")}
      </div>
    `;
  }

  function value(id) {
    return document.querySelector(`#${id}`)?.value?.trim() || "";
  }

  function checked(id) {
    return Boolean(document.querySelector(`#${id}`)?.checked);
  }

  function setValue(id, nextValue) {
    const element = document.querySelector(`#${id}`);
    if (element) element.value = nextValue || "";
  }

  function setChecked(id, nextValue) {
    const element = document.querySelector(`#${id}`);
    if (element) element.checked = Boolean(nextValue);
  }

  function signatureData(id) {
    const canvas = document.querySelector(`#${id}`);
    if (!canvas || !canvas.dataset.hasInk) return "";
    return canvas.toDataURL("image/png");
  }

  function clearSignature(id) {
    const canvas = document.querySelector(`#${id}`);
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.dataset.hasInk = "";
  }

  function setSignature(id, dataUrl) {
    clearSignature(id);
    if (!dataUrl) return;
    const canvas = document.querySelector(`#${id}`);
    if (!canvas) return;
    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.dataset.hasInk = "true";
    };
    image.src = dataUrl;
  }

  function setupSignaturePads() {
    ["wr-technician-signature", "wr-customer-signature"].forEach((id) => {
      const canvas = document.querySelector(`#${id}`);
      if (!canvas) return;
      canvas.width = 600;
      canvas.height = 140;
      const context = canvas.getContext("2d");
      context.lineWidth = 4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111";
      let drawing = false;

      const point = (event) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: ((event.clientX - rect.left) / rect.width) * canvas.width,
          y: ((event.clientY - rect.top) / rect.height) * canvas.height
        };
      };

      canvas.addEventListener("pointerdown", (event) => {
        drawing = true;
        canvas.setPointerCapture(event.pointerId);
        const next = point(event);
        context.beginPath();
        context.moveTo(next.x, next.y);
        event.preventDefault();
      });
      canvas.addEventListener("pointermove", (event) => {
        if (!drawing) return;
        const next = point(event);
        context.lineTo(next.x, next.y);
        context.stroke();
        canvas.dataset.hasInk = "true";
        event.preventDefault();
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
        canvas.addEventListener(type, () => {
          drawing = false;
        });
      });
    });

    document.querySelectorAll("[data-clear-signature]").forEach((button) => {
      button.addEventListener("click", () => clearSignature(button.dataset.clearSignature));
    });
  }

  function readForm() {
    const id = value("work-report-id") || crypto.randomUUID();
    const workRows = Array.from({ length: 8 }, (_, index) => ({
      date: value(workRowId("wr-report-date", index)),
      start: value(workRowId("wr-start", index)),
      end: value(workRowId("wr-end", index)),
      travel: value(workRowId("wr-travel", index)),
      hours: value(workRowId("wr-hours", index)),
      overtime: value(workRowId("wr-overtime", index)),
      technicians: value(workRowId("wr-technicians", index))
    }));
    const firstWorkRow = workRows[0] || {};
    const checkmarks = Object.fromEntries(CHECK_FIELDS.map((field) => [field.id, checked(field.id)]));
    return normalize({
      id,
      reportDate: firstWorkRow.date || todayKey(),
      reportNumber: "",
      serviceOrderNumber: value("wr-service-order"),
      orderDate: value("wr-order-date"),
      customerName: value("wr-customer"),
      company: value("wr-company"),
      street: value("wr-street"),
      postalCity: value("wr-postal-city"),
      site: value("wr-site"),
      email: value("wr-email"),
      systemType: value("wr-system-type"),
      serialYear: value("wr-serial-year"),
      manufacturer: value("wr-manufacturer"),
      manufacturerWarranty: value("wr-warranty"),
      oldDefects: value("wr-old-defects"),
      workDescription: document.querySelector("#wr-description")?.value?.trim() || "",
      startTime: firstWorkRow.start,
      endTime: firstWorkRow.end,
      travelTime: firstWorkRow.travel,
      workHours: firstWorkRow.hours,
      overtime: firstWorkRow.overtime,
      technicians: firstWorkRow.technicians,
      drivenKm: value("wr-km"),
      vehicleCosts: "",
      pressureBar: "",
      consentStorage: checkmarks["wr-consent"],
      annualMaintenance: checkmarks["wr-maintenance"],
      serviceFinished: checkmarks["wr-service-finished-yes"],
      electricalTest: checkmarks["wr-electrical-test-yes"],
      acceptanceDone: checkmarks["wr-acceptance-yes"],
      ownRisk: checkmarks["wr-own-risk-yes"],
      defectsNotice: checkmarks["wr-defects-notice-yes"],
      leakTest: checkmarks["wr-leak-test-yes"],
      additionalSheet: checkmarks["wr-center-yes"],
      netAmount: "",
      vatAmount: "",
      totalAmount: "",
      technicianSignature: signatureData("wr-technician-signature"),
      customerSignature: signatureData("wr-customer-signature"),
      checkmarks,
      workRows,
      materials: Array.from({ length: 11 }, (_, index) => ({
        date: value(`wr-material-date-${index}`),
        qty: value(`wr-material-qty-${index}`),
        description: value(`wr-material-description-${index}`),
        price: "",
        sum: ""
      }))
    });
  }

  function fillForm(report) {
    const next = normalize(report);
    setValue("work-report-id", next.id);
    next.workRows.forEach((row, index) => {
      setValue(workRowId("wr-report-date", index), row.date);
      setValue(workRowId("wr-start", index), row.start);
      setValue(workRowId("wr-end", index), row.end);
      setValue(workRowId("wr-travel", index), row.travel);
      setValue(workRowId("wr-hours", index), row.hours);
      setValue(workRowId("wr-overtime", index), row.overtime);
      setValue(workRowId("wr-technicians", index), row.technicians);
    });
    setValue("wr-service-order", next.serviceOrderNumber);
    setValue("wr-order-date", next.orderDate);
    setValue("wr-customer", next.customerName);
    setValue("wr-company", next.company);
    setValue("wr-street", next.street);
    setValue("wr-postal-city", next.postalCity);
    setValue("wr-site", next.site);
    setValue("wr-email", next.email);
    setValue("wr-system-type", next.systemType);
    setValue("wr-serial-year", next.serialYear);
    setValue("wr-manufacturer", next.manufacturer);
    setValue("wr-warranty", next.manufacturerWarranty);
    setValue("wr-old-defects", next.oldDefects);
    const description = document.querySelector("#wr-description");
    if (description) description.value = next.workDescription;
    setValue("wr-km", next.drivenKm);
    CHECK_FIELDS.forEach((field) => setChecked(field.id, next.checkmarks[field.id]));
    setSignature("wr-technician-signature", next.technicianSignature);
    setSignature("wr-customer-signature", next.customerSignature);
    next.materials.forEach((material, index) => {
      setValue(`wr-material-date-${index}`, material.date);
      setValue(`wr-material-qty-${index}`, material.qty);
      setValue(`wr-material-description-${index}`, material.description);
    });
  }

  function resetForm(focus = true) {
    editingId = null;
    fillForm(emptyReport());
    setStatus("");
    if (focus) document.querySelector("#wr-report-date")?.focus();
  }

  function setStatus(message) {
    const status = document.querySelector("#work-report-status");
    if (status) status.textContent = message || "";
  }

  function cell(value, label) {
    const item = document.createElement("span");
    item.dataset.label = label;
    item.textContent = value || "-";
    return item;
  }

  function renderList() {
    const list = document.querySelector("#work-reports-list");
    if (!list) return;
    const sorted = [...reports].sort(compareReports);
    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "work-reports-empty";
      empty.textContent = "Keine Arbeitsberichte eingetragen.";
      list.replaceChildren(empty);
      return;
    }

    const table = document.createElement("div");
    table.className = "work-report-table";
    const head = document.createElement("div");
    head.className = "work-report-row work-report-head";
    ["Datum", "Bericht", "Kunde", "Anlage", ""].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      head.append(item);
    });
    table.append(head);

    sorted.forEach((report) => {
      const row = document.createElement("div");
      row.className = "work-report-row";
      row.append(
        cell(formatReportDate(report.reportDate), "Datum"),
        cell(report.reportNumber || report.serviceOrderNumber, "Bericht"),
        cell(report.customerName || report.company, "Kunde"),
        cell(report.systemType || report.site, "Anlage")
      );

      const actions = document.createElement("span");
      actions.className = "work-report-row-actions";
      const pdf = button("PDF", "text-button", () => downloadPdf(report));
      const mail = button("E-Mail", "text-button", () => emailReport(report));
      const edit = button("Bearbeiten", "text-button", () => editReport(report.id));
      const remove = button("Löschen", "danger-button", () => deleteReport(report.id));
      actions.append(pdf, mail, edit, remove);
      row.append(actions);
      table.append(row);
    });

    list.replaceChildren(table);
  }

  function button(label, className, handler) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = className;
    item.textContent = label;
    item.addEventListener("click", handler);
    return item;
  }

  function formatReportDate(value) {
    if (!value || !isDateKey(value)) return "-";
    return formatDate(fromDateKey(value));
  }

  function validate(report) {
    return Boolean(report.reportDate && isDateKey(report.reportDate));
  }

  async function loadRemote() {
    if (!useRemoteStorage()) {
      reports = loadLocal();
      renderList();
      return;
    }

    const { data, error } = await supabaseClient
      .from(TABLE)
      .select(COLUMNS)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setStatus("Arbeitsberichte konnten nicht geladen werden. Bitte work_reports.sql in Supabase ausführen.");
      reports = loadLocal();
      renderList();
      return;
    }

    reports = data.map(fromRow).sort(compareReports);
    saveLocal(reports);
    renderList();
  }

  async function saveReport(event) {
    event.preventDefault();
    const report = readForm();
    if (!validate(report)) {
      setStatus("Bitte ein gültiges Datum eintragen.");
      return;
    }

    let saved = report;
    if (useRemoteStorage()) {
      setStatus("Speichere...");
      const { data, error } = await supabaseClient.from(TABLE).upsert(toRow(report)).select(COLUMNS).single();
      if (error) {
        console.error(error);
        setStatus("Arbeitsbericht konnte nicht gespeichert werden. Bitte work_reports.sql in Supabase ausführen.");
        return;
      }
      saved = fromRow(data);
    }

    const existing = reports.find((item) => item.id === saved.id);
    if (existing) Object.assign(existing, saved);
    else reports.push(saved);
    saveLocal(reports);
    resetForm(false);
    renderList();
    setStatus("Arbeitsbericht gespeichert.");
  }

  function editReport(id) {
    const report = reports.find((item) => item.id === id);
    if (!report) return;
    editingId = id;
    fillForm(report);
    setStatus("Arbeitsbericht wird bearbeitet.");
    document.querySelector("#wr-report-date")?.focus();
  }

  async function deleteReport(id) {
    if (!id || !confirm("Arbeitsbericht löschen?")) return;
    if (useRemoteStorage()) {
      setStatus("Lösche...");
      const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (error) {
        console.error(error);
        setStatus("Arbeitsbericht konnte nicht gelöscht werden.");
        return;
      }
    }
    reports = reports.filter((item) => item.id !== id);
    saveLocal(reports);
    if (editingId === id) resetForm(false);
    renderList();
    setStatus("Arbeitsbericht gelöscht.");
  }

  function fileName(report) {
    const date = report.reportDate || todayKey();
    const number = (report.reportNumber || report.serviceOrderNumber || "Arbeitsbericht").replace(/[^\w-]+/g, "-");
    return `Arbeitsbericht-${date}-${number}.pdf`;
  }

  async function downloadPdf(report) {
    const blob = await createPdfBlob(normalize(report));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName(report);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);
    setStatus("PDF wurde erstellt.");
  }

  async function emailReport(report) {
    const normalized = normalize(report);
    const blob = await createPdfBlob(normalized);
    const file = new File([blob], fileName(normalized), { type: "application/pdf" });
    const subject = `Arbeitsbericht ${normalized.reportNumber || normalized.reportDate}`;
    const text = `Arbeitsbericht vom ${formatReportDate(normalized.reportDate)}\nKunde: ${normalized.customerName || normalized.company || "-"}\n`;

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ title: subject, text, files: [file] });
      setStatus("Arbeitsbericht wurde zum Versand übergeben.");
      return;
    }

    downloadPdf(normalized);
    const address = encodeURIComponent(normalized.email || "");
    window.location.href = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\nDie PDF wurde gespeichert und kann als Anhang hinzugefügt werden.`)}`;
    setStatus("PDF wurde gespeichert. Bitte die PDF in der E-Mail anhängen.");
  }

  async function createPdfBlob(report) {
    const canvas = await renderReportCanvas(report);
    const jpegBytes = await canvasToJpegBytes(canvas);
    return jpegToPdf(jpegBytes, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
  }

  async function renderReportCanvas(report) {
    report = normalize(report);
    const image = await loadImage(TEMPLATE_IMAGE);
    const canvas = document.createElement("canvas");
    canvas.width = TEMPLATE_WIDTH;
    canvas.height = TEMPLATE_HEIGHT;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
    context.fillStyle = "#111";
    context.font = "20px Arial";
    context.textBaseline = "top";

    drawCanvasText(context, report.customerName, 213, 284, 360, 20);
    drawCanvasText(context, report.company, 213, 316, 360, 20);
    drawCanvasText(context, report.street, 213, 349, 360, 20);
    drawCanvasText(context, report.postalCity, 213, 382, 360, 20);
    drawCanvasText(context, report.serviceOrderNumber, 793, 78, 300, 20);
    drawCanvasText(context, formatReportDate(report.orderDate), 718, 120, 385, 20);
    drawCanvasText(context, report.site, 718, 164, 385, 20);
    drawCanvasText(context, report.drivenKm, 703, 206, 112, 20);
    drawCanvasText(context, report.systemType, 703, 247, 400, 21);
    drawCanvasText(context, report.serialYear, 728, 293, 378, 21);
    drawCanvasText(context, report.oldDefects, 713, 337, 395, 21);
    drawCanvasText(context, report.manufacturer, 703, 380, 185, 21);
    drawCanvasText(context, report.manufacturerWarranty, 1013, 380, 95, 21);
    report.workRows.forEach((row, index) => {
      const y = 458 + index * 34;
      drawCanvasText(context, formatReportDate(row.date), 81, y, 86, 19);
      drawCanvasText(context, row.start, 181, y, 94, 19);
      drawCanvasText(context, row.end, 291, y, 94, 19);
      drawCanvasText(context, row.travel, 413, y, 90, 19);
      drawCanvasText(context, row.hours, 523, y, 90, 19);
      drawCanvasText(context, row.overtime, 628, y, 60, 19);
      drawCanvasText(context, row.technicians, 768, y, 55, 19);
    });

    report.materials.forEach((item, index) => {
      const materialRows = [809, 849, 889, 928, 968, 1008, 1047, 1087, 1124, 1161, 1198];
      const y = materialRows[index];
      drawCanvasText(context, item.qty, 81, y, 88, 20);
      drawCanvasText(context, item.description, 183, y, 632, 20);
    });

    drawCanvasParagraph(context, report.workDescription, 80, 1233, 1038, 156, 20);

    CHECK_FIELDS.forEach((field) => drawCanvasCheck(context, report.checkmarks[field.id], field.x, field.y));

    await drawSignature(context, report.technicianSignature, 495, 1588, 140, 48);
    await drawSignature(context, report.customerSignature, 668, 1588, 445, 48);
    return canvas;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function drawCanvasText(context, value, x, y, width, height) {
    const text = String(value || "").trim();
    if (!text) return;
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.fillText(text, x + 2, y + 2);
    context.restore();
  }

  function drawCanvasParagraph(context, value, x, y, width, height, lineHeight) {
    const text = String(value || "").trim();
    if (!text) return;
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    wrapText(text, Math.floor(width / 10)).slice(0, Math.floor(height / lineHeight)).forEach((line, index) => {
      context.fillText(line, x + 2, y + 2 + index * lineHeight);
    });
    context.restore();
  }

  function drawCanvasCheck(context, checkedValue, x, y) {
    if (!checkedValue) return;
    context.save();
    context.lineWidth = 3;
    context.strokeStyle = "#111";
    context.beginPath();
    context.moveTo(x + 3, y + 9);
    context.lineTo(x + 8, y + 15);
    context.lineTo(x + 17, y + 3);
    context.stroke();
    context.restore();
  }

  async function drawSignature(context, dataUrl, x, y, width, height) {
    if (!dataUrl) return;
    const image = await loadImage(dataUrl);
    context.drawImage(image, x, y, width, height);
  }

  function canvasToJpegBytes(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        resolve(new Uint8Array(await blob.arrayBuffer()));
      }, "image/jpeg", 0.9);
    });
  }

  function jpegToPdf(jpegBytes, imageWidth, imageHeight) {
    const encoder = new TextEncoder();
    const parts = [];
    let offset = 0;
    const offsets = [0];

    function addText(text) {
      const bytes = encoder.encode(text);
      parts.push(bytes);
      offset += bytes.length;
    }

    function addBytes(bytes) {
      parts.push(bytes);
      offset += bytes.length;
    }

    function object(id, body) {
      offsets[id] = offset;
      addText(`${id} 0 obj\n${body}\nendobj\n`);
    }

    addText("%PDF-1.4\n");
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>");
    offsets[4] = offset;
    addText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    addBytes(jpegBytes);
    addText("\nendstream\nendobj\n");
    const content = "q 595 0 0 842 0 0 cm /Im1 Do Q";
    object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const xref = offset;
    addText("xref\n0 6\n0000000000 65535 f \n");
    for (let id = 1; id <= 5; id += 1) {
      addText(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
    }
    addText(`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  }

  function drawReport(pdf, report) {
    pdf.text("MB Kälte Klima GmbH", 40, 810, 16);
    pdf.text("Feldstraße 44 · 06886 Lutherstadt Wittenberg", 40, 792, 9);
    pdf.text("Tel.: 03491 / 43 30 77 · Funk: 0172 / 90 54 520", 40, 779, 9);
    pdf.text("E-Mail: ub@mb-kaelteklima-gmbh.de", 40, 766, 9);
    pdf.text("Arbeits- / Lieferbericht", 335, 810, 17);
    pdf.text(`Datum: ${formatReportDate(report.reportDate)}`, 335, 788, 10);
    pdf.text(`Auftrag / KD-Bericht: ${report.reportNumber || "-"}`, 335, 773, 10);
    pdf.line(40, 750, 555, 750);

    let y = 728;
    y = section(pdf, "Kunde", y);
    y = pair(pdf, "Name, Vorname", report.customerName, "Firma", report.company, y);
    y = pair(pdf, "Straße", report.street, "PLZ, Ort", report.postalCity, y);
    y = pair(pdf, "Kundendienstauftrags-Nr.", report.serviceOrderNumber, "Auftragsdatum", formatReportDate(report.orderDate), y);
    y = pair(pdf, "BV-Standort", report.site, "E-Mail", report.email, y);

    y = section(pdf, "Anlage", y - 6);
    y = pair(pdf, "Anlagentyp", report.systemType, "Ser.-Nr. / Baujahr", report.serialYear, y);
    y = pair(pdf, "Hersteller", report.manufacturer, "M-Garantie", report.manufacturerWarranty, y);
    y = pair(pdf, "Defektteil(e) alt", report.oldDefects, "", "", y);

    y = section(pdf, "Arbeits- / Lieferbericht", y - 6);
    y = paragraph(pdf, report.workDescription || "-", 46, y, 500, 10);

    y = section(pdf, "Zeiten und Kosten", y - 6);
    y = pair(pdf, "Beginn / Ende", `${report.startTime || "-"} / ${report.endTime || "-"}`, "Fahrzeit", report.travelTime, y);
    y = pair(pdf, "Arbeitsstunden", report.workHours, "Überstunden", report.overtime, y);
    y = pair(pdf, "Anzahl Monteure", report.technicians, "Gefahrene km", report.drivenKm, y);
    y = pair(pdf, "Kfz-Kosten", euro(report.vehicleCosts), "", "", y);

    y = section(pdf, "Materialverbrauch / Artikelbezeichnung", y - 6);
    pdf.text("Datum", 46, y, 8);
    pdf.text("Menge", 112, y, 8);
    pdf.text("Artikelbezeichnung", 172, y, 8);
    y -= 12;
    report.materials.filter((item) => item.date || item.qty || item.description).forEach((item) => {
      pdf.text(formatReportDate(item.date), 46, y, 8);
      pdf.text(item.qty || "-", 112, y, 8);
      pdf.text(item.description || "-", 172, y, 8);
      y -= 13;
    });
    if (y > 650) y -= 13;

    y = section(pdf, "Prüfung und Bestätigung", y - 6);
    y = paragraph(pdf, checksText(report), 46, y, 500, 9);

    y = section(pdf, "Beträge", y - 6);

    y = Math.min(y - 16, 120);
    pdf.line(46, y, 250, y);
    pdf.line(320, y, 545, y);
    pdf.text("Monteur", 46, y - 14, 8);
    pdf.text("Datum, Stempel und Unterschrift Auftraggeber", 320, y - 14, 8);
    pdf.text("Die Arbeiten wurden ordnungsgemäß ausgeführt und durch den Auftraggeber geprüft.", 46, 54, 7);
    pdf.text("Es gelten unsere allgemeinen Verkaufs-, Liefer-, Montage- und Zahlungsbedingungen.", 46, 42, 7);
  }

  function section(pdf, title, y) {
    if (y < 120) {
      pdf.addPage();
      y = 810;
    }
    pdf.text(title, 40, y, 11);
    pdf.line(40, y - 4, 555, y - 4);
    return y - 18;
  }

  function pair(pdf, leftLabel, leftValue, rightLabel, rightValue, y) {
    pdf.text(`${leftLabel}: ${leftValue || "-"}`, 46, y, 9);
    if (rightLabel) pdf.text(`${rightLabel}: ${rightValue || "-"}`, 310, y, 9);
    return y - 14;
  }

  function paragraph(pdf, text, x, y, width, size) {
    wrapText(String(text || "-"), Math.floor(width / (size * 0.55))).forEach((line) => {
      pdf.text(line, x, y, size);
      y -= size + 3;
      if (y < 70) {
        pdf.addPage();
        y = 810;
      }
    });
    return y;
  }

  function checksText(report) {
    const items = [
      ["Einwilligung Datenspeicherung", report.consentStorage],
      ["Jährliche Wartung erwünscht", report.annualMaintenance],
      ["Kundendienst beendet", report.serviceFinished],
      ["Elektroprüfung", report.electricalTest],
      ["Abnahme erfolgt", report.acceptanceDone],
      ["Betreiben nur auf eigene Verantwortung", report.ownRisk],
      ["Mängelhinweise erfolgt", report.defectsNotice],
      ["Dichtheitsprüfung", report.leakTest],
      ["Zusatzblatt verwendet", report.additionalSheet]
    ];
    return items.map(([label, value]) => `${value ? "[x]" : "[ ]"} ${label}`).join("   ");
  }

  function euro(value) {
    if (value === "" || value === null || value === undefined) return "-";
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) ? `${number.toFixed(2).replace(".", ",")} EUR` : String(value);
  }

  function wrapText(text, max) {
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : ["-"];
  }

  class PdfBuilder {
    constructor() {
      this.pages = [];
      this.current = [];
      this.addPage();
    }

    addPage() {
      this.current = [];
      this.pages.push(this.current);
    }

    text(text, x, y, size = 10) {
      this.current.push(`BT /F1 ${size} Tf ${x} ${y} Td ${pdfString(text)} Tj ET`);
    }

    line(x1, y1, x2, y2) {
      this.current.push(`${x1} ${y1} m ${x2} ${y2} l S`);
    }

    toBlob() {
      const objects = [];
      const add = (body) => {
        objects.push(body);
        return objects.length;
      };
      const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const pageIds = [];
      const contents = this.pages.map((page) => add(`<< /Length ${page.join("\n").length} >>\nstream\n${page.join("\n")}\nendstream`));
      const pagesIdPlaceholder = "__PAGES__";
      this.pages.forEach((_, index) => {
        pageIds.push(add(`<< /Type /Page /Parent ${pagesIdPlaceholder} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contents[index]} 0 R >>`));
      });
      const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
      pageIds.forEach((id) => {
        objects[id - 1] = objects[id - 1].replace(pagesIdPlaceholder, String(pagesId));
      });
      const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let pdf = "%PDF-1.4\n";
      const offsets = [0];
      objects.forEach((body, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
      });
      const xref = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
      });
      pdf += `trailer << /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return new Blob([pdf], { type: "application/pdf" });
    }
  }

  function pdfString(text) {
    const bytes = [0xfe, 0xff];
    for (const char of String(text || "")) {
      const code = char.codePointAt(0);
      bytes.push((code >> 8) & 0xff, code & 0xff);
    }
    return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
  }

  function hideOtherViews() {
    document.querySelector("#week-view").hidden = true;
    document.querySelector("#month-view").hidden = true;
    document.querySelector("#year-view").hidden = true;
    document.querySelector("#tasks-view")?.setAttribute("hidden", "");
    document.querySelector("#orders-view")?.setAttribute("hidden", "");
    document.querySelector("#maintenance-view")?.setAttribute("hidden", "");
    document.querySelector("#inquiries-view")?.setAttribute("hidden", "");
    document.querySelector("#tasks-axel-tab")?.classList.remove("is-active");
    document.querySelector("#orders-tab")?.classList.remove("is-active");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
    document.querySelector("#inquiries-tab")?.classList.remove("is-active");
  }

  function showCalendarViews() {
    const view = ensureView();
    view.hidden = true;
    ensureTab().classList.remove("is-active");
  }

  function openWorkReports() {
    if (!isLoggedIn()) return;
    state.view = "work-reports";
    const view = ensureView();
    hideOtherViews();
    view.hidden = false;
    ensureTab().classList.add("is-active");
    elements.prevButton.hidden = true;
    elements.nextButton.hidden = true;
    elements.todayButton.hidden = true;
    elements.newEventButton.hidden = true;
    elements.rangeLabel.textContent = "Arbeitsberichte";
    subscribe();
    loadRemote();
  }

  function subscribe() {
    if (!useRemoteStorage() || channel) return;
    channel = supabaseClient
      .channel("work_reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        if (state.view === "work-reports") loadRemote();
      })
      .subscribe();
  }

  function updateVisibility() {
    ensureTab().hidden = !isLoggedIn();
    if (!isLoggedIn()) ensureView().hidden = true;
  }

  function wire() {
    const tab = ensureTab();
    ensureView();
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openWorkReports();
    }, true);

    document.querySelectorAll('.tab-button:not(#work-reports-tab)').forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (state.view !== "work-reports") showCalendarViews();
        }, 0);
      });
    });
  }

  wire();
  updateVisibility();

  const originalRender = render;
  render = function patchedWorkReportsRender() {
    const keepOpen = state.view === "work-reports";
    originalRender();
    if (keepOpen) openWorkReports();
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedWorkReportsSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      updateVisibility();
      if (authenticated) subscribe();
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedWorkReportsLogout() {
    if (channel && supabaseClient) {
      supabaseClient.removeChannel(channel);
      channel = null;
    }
    await originalLogout();
    updateVisibility();
  };

  window.addEventListener("focus", () => {
    if (state.view === "work-reports") loadRemote();
  });
})();
