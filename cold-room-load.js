(() => {
  const TABLE = "cold_room_load_calculations";
  const STORAGE_KEY = "online-kalender-cold-room-load-v1";
  const COLUMNS = "id,calculation_date,customer,cell_type,volume,total_watts,recommended_kw,data,created_at,updated_at";
  let records = [];
  let channel = null;
  let editingId = null;

  const style = document.createElement("style");
  style.textContent = `
    .cold-room-load-view[hidden],
    .cold-room-load-tab[hidden] {
      display: none !important;
    }

    .cold-room-shell {
      width: 100%;
      margin: 0 auto;
      padding: clamp(14px, 2vw, 22px);
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(0, 217, 255, 0.09), transparent 20%), linear-gradient(225deg, rgba(248, 255, 19, 0.08), transparent 22%), var(--panel);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
    }

    .cold-room-form {
      display: grid;
      gap: 14px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0, 217, 255, 0.24);
    }

    .cold-room-section {
      display: grid;
      gap: 10px;
    }

    .cold-room-section-title {
      color: var(--yellow);
      font-size: 0.9rem;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(248, 255, 19, 0.38);
    }

    .cold-room-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }

    .cold-room-fields > .field {
      min-width: 0;
      width: 100%;
    }

    .cold-room-shell .field input,
    .cold-room-shell .field select,
    .cold-room-shell .field textarea {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .cold-room-shell .field select,
    .cold-room-shell .field input {
      min-height: var(--input-height, 44px);
      height: var(--input-height, 44px);
    }

    .cold-room-result {
      display: grid;
      grid-template-columns: repeat(6, minmax(120px, 1fr));
      gap: 10px;
    }

    .cold-room-result-item {
      min-height: 72px;
      display: grid;
      align-content: center;
      gap: 5px;
      padding: 10px;
      border: 1px solid rgba(0, 217, 255, 0.28);
      background: rgba(9, 12, 34, 0.58);
    }

    .cold-room-result-item span {
      color: var(--muted);
      font-size: 0.68rem;
      text-transform: uppercase;
    }

    .cold-room-result-item strong {
      color: var(--text);
      font-size: 1rem;
      font-weight: 400;
    }

    .cold-room-result-item.is-main strong {
      color: var(--yellow);
      font-size: 1.15rem;
      text-shadow: 0 0 10px rgba(248, 255, 19, 0.42);
    }

    .cold-room-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .cold-room-list {
      min-height: 120px;
      margin-top: 16px;
    }

    .cold-room-table {
      display: grid;
      gap: 8px;
    }

    .cold-room-row {
      display: grid;
      grid-template-columns: 0.85fr 1.15fr 0.9fr 0.75fr 0.85fr 0.85fr minmax(220px, auto);
      gap: 10px;
      align-items: center;
      min-height: 46px;
      padding: 9px;
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.58);
    }

    .cold-room-head {
      min-height: 36px;
      color: var(--cyan);
      background: rgba(7, 11, 31, 0.96);
      font-size: 0.74rem;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(0, 217, 255, 0.58);
    }

    .cold-room-row span {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .cold-room-row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
    }

    .cold-room-empty {
      min-height: 120px;
      display: grid;
      place-items: center;
      color: var(--muted);
      border: 1px solid rgba(0, 217, 255, 0.24);
      background: rgba(9, 12, 34, 0.42);
      text-transform: uppercase;
    }

    @media (max-width: 1100px) {
      .cold-room-result {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cold-room-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cold-room-head {
        display: none;
      }

      .cold-room-row span::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 3px;
        color: var(--cyan);
        font-size: 0.66rem;
        text-transform: uppercase;
      }

      .cold-room-row-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }

    @media (max-width: 620px) {
      .cold-room-fields,
      .cold-room-result,
      .cold-room-row,
      .cold-room-row-actions {
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
    const sizes = [1.2, 1.8, 2.5, 3.5, 5, 6, 7.5, 10, 12.5, 15, 20, 25, 30];
    return sizes.find((size) => size >= kw) || Math.ceil(kw);
  }

  function normalize(record) {
    const data = record?.data && typeof record.data === "object" ? record.data : record || {};
    const calc = data.calculation || {};
    return {
      id: typeof isUuid === "function" && isUuid(record?.id) ? String(record.id) : crypto.randomUUID(),
      calculationDate: String(record?.calculationDate || record?.calculation_date || data.calculationDate || today()),
      customer: String(record?.customer || data.customer || "").trim(),
      location: String(data.location || "").trim(),
      cellType: String(record?.cell_type || data.cellType || "Normalkühlung"),
      targetTemp: number(data.targetTemp, 4),
      ambientTemp: number(data.ambientTemp, 30),
      runtimeHours: number(data.runtimeHours, 18),
      length: number(data.length),
      width: number(data.width),
      height: number(data.height, 2.4),
      uValue: number(data.uValue, 0.28),
      floorUValue: number(data.floorUValue, 0.35),
      insulation: String(data.insulation || "100 mm"),
      productType: String(data.productType || "Mischware"),
      dailyProductKg: number(data.dailyProductKg),
      entryTemp: number(data.entryTemp, 12),
      pullDownHours: number(data.pullDownHours, 12),
      freezeShare: number(data.freezeShare, 0),
      doorWidth: number(data.doorWidth, 0.9),
      doorHeight: number(data.doorHeight, 2),
      openingsPerDay: number(data.openingsPerDay),
      openingSeconds: number(data.openingSeconds, 30),
      stripCurtain: String(data.stripCurtain || "ja"),
      people: number(data.people),
      lightingWatts: number(data.lightingWatts),
      evaporatorWatts: number(data.evaporatorWatts),
      devicesWatts: number(data.devicesWatts),
      defrostWatts: number(data.defrostWatts),
      safetyPercent: number(data.safetyPercent, 15),
      notes: String(data.notes || "").trim(),
      calculation: {
        volume: number(record?.volume ?? calc.volume),
        envelopeWatts: number(calc.envelopeWatts),
        productWatts: number(calc.productWatts),
        doorWatts: number(calc.doorWatts),
        internalWatts: number(calc.internalWatts),
        defrostWatts: number(calc.defrostWatts),
        subtotalWatts: number(calc.subtotalWatts),
        totalWatts: number(record?.total_watts ?? calc.totalWatts),
        recommendedKw: number(record?.recommended_kw ?? calc.recommendedKw)
      },
      createdAt: record?.created_at || "",
      updatedAt: record?.updated_at || ""
    };
  }

  function productCp(type, cellType) {
    if (cellType === "Tiefkühlung") return type === "Fleisch/Fisch" ? 1.8 : 2.0;
    return {
      "Mischware": 3.4,
      "Obst/Gemüse": 3.7,
      "Milchprodukte": 3.6,
      "Fleisch/Fisch": 3.2,
      "Getränke": 4.0
    }[type] || 3.4;
  }

  function calculate(record) {
    const delta = Math.max(0, record.ambientTemp - record.targetTemp);
    const floorArea = record.length * record.width;
    const volume = floorArea * record.height;
    const wallArea = Math.max(0, 2 * (record.length + record.width) * record.height);
    const ceilingArea = floorArea;
    const envelopeWatts = (wallArea + ceilingArea) * record.uValue * delta + floorArea * record.floorUValue * delta;
    const pullDownSeconds = Math.max(1, record.pullDownHours) * 3600;
    const cp = productCp(record.productType, record.cellType);
    const targetForSensible = record.cellType === "Tiefkühlung" ? Math.min(0, record.targetTemp) : record.targetTemp;
    const sensibleKj = Math.max(0, record.entryTemp - targetForSensible) * cp * record.dailyProductKg;
    const freezingKj = record.cellType === "Tiefkühlung" ? record.dailyProductKg * Math.max(0, record.freezeShare) / 100 * 250 : 0;
    const productWatts = (sensibleKj + freezingKj) * 1000 / pullDownSeconds;
    const doorArea = record.doorWidth * record.doorHeight;
    const openHours = record.openingsPerDay * record.openingSeconds / 3600;
    const curtainFactor = record.stripCurtain === "ja" ? 0.45 : record.stripCurtain === "teilweise" ? 0.7 : 1;
    const typeFactor = record.cellType === "Tiefkühlung" ? 1.35 : 1;
    const doorWatts = doorArea * openHours * delta * 95 * curtainFactor * typeFactor;
    const peopleWatts = record.people * (record.cellType === "Tiefkühlung" ? 220 : 160);
    const internalWatts = peopleWatts + record.lightingWatts + record.evaporatorWatts + record.devicesWatts;
    const defrostWatts = record.cellType === "Tiefkühlung" ? record.defrostWatts : record.defrostWatts * 0.35;
    const subtotalWatts = envelopeWatts + productWatts + doorWatts + internalWatts + defrostWatts;
    const totalWatts = subtotalWatts * (1 + Math.max(0, record.safetyPercent) / 100);
    const recommendedKw = recommendedSize(totalWatts);
    return {
      floorArea: round(floorArea, 2),
      volume: round(volume, 2),
      envelopeWatts: round(envelopeWatts),
      productWatts: round(productWatts),
      doorWatts: round(doorWatts),
      internalWatts: round(internalWatts),
      defrostWatts: round(defrostWatts),
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

  records = loadLocal();

  function toStoredData(record) {
    return {
      id: record.id,
      calculationDate: record.calculationDate,
      customer: record.customer,
      location: record.location,
      cellType: record.cellType,
      targetTemp: record.targetTemp,
      ambientTemp: record.ambientTemp,
      runtimeHours: record.runtimeHours,
      length: record.length,
      width: record.width,
      height: record.height,
      uValue: record.uValue,
      floorUValue: record.floorUValue,
      insulation: record.insulation,
      productType: record.productType,
      dailyProductKg: record.dailyProductKg,
      entryTemp: record.entryTemp,
      pullDownHours: record.pullDownHours,
      freezeShare: record.freezeShare,
      doorWidth: record.doorWidth,
      doorHeight: record.doorHeight,
      openingsPerDay: record.openingsPerDay,
      openingSeconds: record.openingSeconds,
      stripCurtain: record.stripCurtain,
      people: record.people,
      lightingWatts: record.lightingWatts,
      evaporatorWatts: record.evaporatorWatts,
      devicesWatts: record.devicesWatts,
      defrostWatts: record.defrostWatts,
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
      cell_type: row.cell_type,
      volume: row.volume,
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
      cell_type: record.cellType,
      volume: record.calculation.volume,
      total_watts: record.calculation.totalWatts,
      recommended_kw: record.calculation.recommendedKw,
      data
    };
  }

  function ensureShell() {
    const view = document.querySelector("#cold-room-load-view");
    if (!view) return null;
    if (!view.innerHTML.trim()) {
      view.innerHTML = `
        <div class="cold-room-shell">
          <form class="cold-room-form" id="cold-room-form">
            <div class="section-header">
              <h2>Kühllastberechnung Kühlzellen</h2>
              <button class="primary-button" type="submit">Speichern</button>
            </div>
            <input id="cold-room-id" type="hidden">

            ${section("Projektdaten", `
              ${field("cold-room-date", "Datum", "date")}
              ${field("cold-room-customer", "Kunde")}
              ${field("cold-room-location", "Standort / Kühlzelle")}
              ${select("cold-room-type", "Kühlzellentyp", ["Normalkühlung", "Tiefkühlung"])}
              ${field("cold-room-target", "Solltemperatur °C", "number", "4", "0.5")}
              ${field("cold-room-ambient", "Umgebung °C", "number", "30", "0.5")}
              ${field("cold-room-runtime", "Laufzeit h/Tag", "number", "18", "0.5")}
            `)}

            ${section("Zellabmessungen", `
              ${field("cold-room-length", "Länge m", "number", "", "0.01")}
              ${field("cold-room-width", "Breite m", "number", "", "0.01")}
              ${field("cold-room-height", "Höhe m", "number", "2.40", "0.01")}
              ${select("cold-room-insulation", "Dämmung", ["80 mm", "100 mm", "120 mm", "150 mm", "200 mm"])}
              ${field("cold-room-u", "U-Wert Wand/Decke", "number", "0.28", "0.01")}
              ${field("cold-room-floor-u", "U-Wert Boden", "number", "0.35", "0.01")}
            `)}

            ${section("Ware / Einlagerung", `
              ${select("cold-room-product", "Produktart", ["Mischware", "Obst/Gemüse", "Milchprodukte", "Fleisch/Fisch", "Getränke"])}
              ${field("cold-room-product-kg", "Einlagerung kg/Tag", "number", "", "1")}
              ${field("cold-room-entry-temp", "Eintritt Ware °C", "number", "12", "0.5")}
              ${field("cold-room-pull-hours", "Abkühlzeit h", "number", "12", "0.5")}
              ${field("cold-room-freeze-share", "Gefrieranteil %", "number", "0", "1")}
            `)}

            ${section("Tür / Luftwechsel", `
              ${field("cold-room-door-width", "Türbreite m", "number", "0.90", "0.01")}
              ${field("cold-room-door-height", "Türhöhe m", "number", "2.00", "0.01")}
              ${field("cold-room-openings", "Öffnungen/Tag", "number", "", "1")}
              ${field("cold-room-open-seconds", "Sekunden je Öffnung", "number", "30", "1")}
              ${select("cold-room-curtain", "Streifenvorhang", [["ja", "Ja"], ["teilweise", "Teilweise"], ["nein", "Nein"]])}
            `)}

            ${section("Innere Lasten", `
              ${field("cold-room-people", "Personen", "number", "", "1")}
              ${field("cold-room-lighting", "Beleuchtung W", "number", "", "1")}
              ${field("cold-room-evaporator", "Verdampferlüfter W", "number", "", "1")}
              ${field("cold-room-devices", "Geräte / Stapler W", "number", "", "1")}
              ${field("cold-room-defrost", "Abtauung W", "number", "", "1")}
              ${field("cold-room-safety", "Zuschlag %", "number", "15", "1")}
              <label class="field">
                <span>Empfehlung / Notiz</span>
                <textarea id="cold-room-notes" rows="3"></textarea>
              </label>
            `)}

            <div class="cold-room-result" id="cold-room-result"></div>
            <p class="form-error" id="cold-room-status" role="status"></p>
            <div class="cold-room-actions">
              <button class="text-button" id="cold-room-reset" type="button">Neu</button>
              <button class="text-button" id="cold-room-pdf" type="button">PDF speichern</button>
              <button class="text-button" id="cold-room-mail" type="button">E-Mail</button>
            </div>
          </form>
          <div class="cold-room-list" id="cold-room-list"></div>
        </div>
      `;
      document.querySelector("#cold-room-form")?.addEventListener("submit", saveRecord);
      document.querySelector("#cold-room-reset")?.addEventListener("click", resetForm);
      document.querySelector("#cold-room-pdf")?.addEventListener("click", () => printRecord(readForm()));
      document.querySelector("#cold-room-mail")?.addEventListener("click", () => emailRecord(readForm()));
      document.querySelector("#cold-room-type")?.addEventListener("change", applyTypeDefaults);
      document.querySelector("#cold-room-insulation")?.addEventListener("change", applyInsulationDefaults);
      document.querySelectorAll("#cold-room-form input, #cold-room-form select, #cold-room-form textarea").forEach((input) => {
        input.addEventListener("input", updateResult);
        input.addEventListener("change", updateResult);
      });
      resetForm();
    }
    return view;
  }

  function section(title, body) {
    return `<section class="cold-room-section"><span class="cold-room-section-title">${title}</span><div class="cold-room-fields">${body}</div></section>`;
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

  function value(id) {
    return document.querySelector(`#${id}`)?.value || "";
  }

  function setValue(id, value) {
    const element = document.querySelector(`#${id}`);
    if (element) element.value = value ?? "";
  }

  function applyTypeDefaults() {
    const type = value("cold-room-type");
    if (type === "Tiefkühlung") {
      setValue("cold-room-target", "-18");
      setValue("cold-room-freeze-share", "100");
      setValue("cold-room-u", "0.20");
      setValue("cold-room-floor-u", "0.25");
      setValue("cold-room-insulation", "150 mm");
      setValue("cold-room-defrost", value("cold-room-defrost") || "500");
    } else {
      setValue("cold-room-target", "4");
      setValue("cold-room-freeze-share", "0");
      setValue("cold-room-u", "0.28");
      setValue("cold-room-floor-u", "0.35");
      setValue("cold-room-insulation", "100 mm");
    }
    updateResult();
  }

  function applyInsulationDefaults() {
    const defaults = {
      "80 mm": [0.34, 0.42],
      "100 mm": [0.28, 0.35],
      "120 mm": [0.24, 0.30],
      "150 mm": [0.20, 0.25],
      "200 mm": [0.15, 0.20]
    };
    const next = defaults[value("cold-room-insulation")];
    if (next) {
      setValue("cold-room-u", next[0]);
      setValue("cold-room-floor-u", next[1]);
    }
    updateResult();
  }

  function readForm() {
    return withCalculation({
      id: value("cold-room-id") || crypto.randomUUID(),
      calculationDate: value("cold-room-date") || today(),
      customer: value("cold-room-customer"),
      location: value("cold-room-location"),
      cellType: value("cold-room-type"),
      targetTemp: value("cold-room-target"),
      ambientTemp: value("cold-room-ambient"),
      runtimeHours: value("cold-room-runtime"),
      length: value("cold-room-length"),
      width: value("cold-room-width"),
      height: value("cold-room-height"),
      uValue: value("cold-room-u"),
      floorUValue: value("cold-room-floor-u"),
      insulation: value("cold-room-insulation"),
      productType: value("cold-room-product"),
      dailyProductKg: value("cold-room-product-kg"),
      entryTemp: value("cold-room-entry-temp"),
      pullDownHours: value("cold-room-pull-hours"),
      freezeShare: value("cold-room-freeze-share"),
      doorWidth: value("cold-room-door-width"),
      doorHeight: value("cold-room-door-height"),
      openingsPerDay: value("cold-room-openings"),
      openingSeconds: value("cold-room-open-seconds"),
      stripCurtain: value("cold-room-curtain"),
      people: value("cold-room-people"),
      lightingWatts: value("cold-room-lighting"),
      evaporatorWatts: value("cold-room-evaporator"),
      devicesWatts: value("cold-room-devices"),
      defrostWatts: value("cold-room-defrost"),
      safetyPercent: value("cold-room-safety"),
      notes: value("cold-room-notes")
    });
  }

  function fillForm(record) {
    const next = withCalculation(record);
    setValue("cold-room-id", next.id);
    setValue("cold-room-date", next.calculationDate);
    setValue("cold-room-customer", next.customer);
    setValue("cold-room-location", next.location);
    setValue("cold-room-type", next.cellType);
    setValue("cold-room-target", next.targetTemp);
    setValue("cold-room-ambient", next.ambientTemp);
    setValue("cold-room-runtime", next.runtimeHours);
    setValue("cold-room-length", next.length || "");
    setValue("cold-room-width", next.width || "");
    setValue("cold-room-height", next.height || "");
    setValue("cold-room-u", next.uValue);
    setValue("cold-room-floor-u", next.floorUValue);
    setValue("cold-room-insulation", next.insulation);
    setValue("cold-room-product", next.productType);
    setValue("cold-room-product-kg", next.dailyProductKg || "");
    setValue("cold-room-entry-temp", next.entryTemp);
    setValue("cold-room-pull-hours", next.pullDownHours);
    setValue("cold-room-freeze-share", next.freezeShare || "");
    setValue("cold-room-door-width", next.doorWidth || "");
    setValue("cold-room-door-height", next.doorHeight || "");
    setValue("cold-room-openings", next.openingsPerDay || "");
    setValue("cold-room-open-seconds", next.openingSeconds || "");
    setValue("cold-room-curtain", next.stripCurtain);
    setValue("cold-room-people", next.people || "");
    setValue("cold-room-lighting", next.lightingWatts || "");
    setValue("cold-room-evaporator", next.evaporatorWatts || "");
    setValue("cold-room-devices", next.devicesWatts || "");
    setValue("cold-room-defrost", next.defrostWatts || "");
    setValue("cold-room-safety", next.safetyPercent || "");
    setValue("cold-room-notes", next.notes);
    updateResult();
  }

  function updateResult() {
    const result = document.querySelector("#cold-room-result");
    if (!result) return;
    const record = readForm();
    const calc = record.calculation;
    result.innerHTML = `
      ${resultItem("Volumen", `${round(calc.volume, 2).toLocaleString("de-DE")} m³`)}
      ${resultItem("Transmission", formatWatts(calc.envelopeWatts))}
      ${resultItem("Warenlast", formatWatts(calc.productWatts))}
      ${resultItem("Tür / Luft", formatWatts(calc.doorWatts))}
      ${resultItem("Gesamtkühllast", formatWatts(calc.totalWatts), true)}
      ${resultItem("Empfehlung", formatKw(calc.recommendedKw), true)}
    `;
  }

  function resultItem(label, value, main = false) {
    return `<div class="cold-room-result-item${main ? " is-main" : ""}"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function setStatus(message) {
    const status = document.querySelector("#cold-room-status");
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
    const list = document.querySelector("#cold-room-list");
    if (!list) return;
    const sorted = [...records].sort(compareRecords);
    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "cold-room-empty";
      empty.textContent = "Keine Kühlzellenberechnung gespeichert.";
      list.replaceChildren(empty);
      return;
    }
    const table = document.createElement("div");
    table.className = "cold-room-table";
    const head = document.createElement("div");
    head.className = "cold-room-row cold-room-head";
    ["Datum", "Kunde", "Typ", "Volumen", "Kühllast", "Leistung", ""].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      head.append(item);
    });
    table.append(head);
    sorted.forEach((record) => {
      const row = document.createElement("div");
      row.className = "cold-room-row";
      row.append(
        cell(formatKey(record.calculationDate), "Datum"),
        cell(record.customer, "Kunde"),
        cell(record.cellType, "Typ"),
        cell(`${round(record.calculation.volume, 2).toLocaleString("de-DE")} m³`, "Volumen"),
        cell(formatWatts(record.calculation.totalWatts), "Kühllast"),
        cell(formatKw(record.calculation.recommendedKw), "Leistung")
      );
      const actions = document.createElement("span");
      actions.className = "cold-room-row-actions";
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
      setStatus("Kühlzellenberechnungen konnten nicht geladen werden.");
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
    let saved = record;
    if (useRemoteStorage()) {
      setStatus("Speichere...");
      const { data, error } = await supabaseClient.from(TABLE).upsert(toRow(record)).select(COLUMNS).single();
      if (error) {
        setStatus("Kühlzellenberechnung konnte nicht gespeichert werden.");
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
    setStatus("Kühlzellenberechnung gespeichert.");
  }

  function editRecord(id) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    editingId = id;
    fillForm(record);
    setStatus("Kühlzellenberechnung wird bearbeitet.");
    document.querySelector("#cold-room-customer")?.focus();
  }

  async function deleteRecord(id) {
    if (!id || !confirm("Kühlzellenberechnung löschen?")) return;
    if (useRemoteStorage()) {
      setStatus("Lösche...");
      const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (error) {
        setStatus("Kühlzellenberechnung konnte nicht gelöscht werden.");
        console.error(error);
        return;
      }
    }
    records = records.filter((item) => item.id !== id);
    saveLocal(records);
    if (editingId === id) resetForm();
    renderList();
    setStatus("Kühlzellenberechnung gelöscht.");
  }

  function resetForm() {
    editingId = null;
    document.querySelector("#cold-room-form")?.reset();
    setValue("cold-room-id", "");
    setValue("cold-room-date", today());
    setValue("cold-room-type", "Normalkühlung");
    setValue("cold-room-target", "4");
    setValue("cold-room-ambient", "30");
    setValue("cold-room-runtime", "18");
    setValue("cold-room-height", "2.40");
    setValue("cold-room-insulation", "100 mm");
    setValue("cold-room-u", "0.28");
    setValue("cold-room-floor-u", "0.35");
    setValue("cold-room-product", "Mischware");
    setValue("cold-room-entry-temp", "12");
    setValue("cold-room-pull-hours", "12");
    setValue("cold-room-freeze-share", "0");
    setValue("cold-room-door-width", "0.90");
    setValue("cold-room-door-height", "2.00");
    setValue("cold-room-open-seconds", "30");
    setValue("cold-room-curtain", "ja");
    setValue("cold-room-safety", "15");
    setStatus("");
    updateResult();
  }

  function reportLines(record) {
    const next = withCalculation(record);
    const calc = next.calculation;
    return [
      "Kühllastberechnung Kühlzellen",
      "",
      `Datum: ${formatKey(next.calculationDate)}`,
      `Kunde: ${next.customer || "-"}`,
      `Standort: ${next.location || "-"}`,
      `Typ: ${next.cellType}`,
      `Solltemperatur: ${next.targetTemp} °C`,
      `Umgebung: ${next.ambientTemp} °C`,
      "",
      `Volumen: ${round(calc.volume, 2).toLocaleString("de-DE")} m³`,
      `Transmission: ${formatWatts(calc.envelopeWatts)}`,
      `Warenlast: ${formatWatts(calc.productWatts)}`,
      `Tür / Luftwechsel: ${formatWatts(calc.doorWatts)}`,
      `Innere Lasten: ${formatWatts(calc.internalWatts)}`,
      `Abtauung: ${formatWatts(calc.defrostWatts)}`,
      `Zwischensumme: ${formatWatts(calc.subtotalWatts)}`,
      `Gesamtkühllast: ${formatWatts(calc.totalWatts)}`,
      `Empfohlene Kälteleistung: ${formatKw(calc.recommendedKw)}`,
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
          <title>Kühlzellenberechnung</title>
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
    const subject = encodeURIComponent(`Kühlzellenberechnung ${record.customer || ""}`.trim());
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
    document.querySelector("#cooling-load-view")?.setAttribute("hidden", "");
    document.querySelector("#tasks-axel-tab")?.classList.remove("is-active");
    document.querySelector("#orders-tab")?.classList.remove("is-active");
    document.querySelector("#maintenance-page-button")?.classList.remove("is-active");
    document.querySelector("#inquiries-tab")?.classList.remove("is-active");
    document.querySelector("#work-reports-tab")?.classList.remove("is-active");
    document.querySelector("#cooling-load-tab")?.classList.remove("is-active");
  }

  function showCalendarViews() {
    const view = ensureShell();
    if (view) view.hidden = true;
    document.querySelector("#cold-room-load-tab")?.classList.remove("is-active");
  }

  function openColdRoomLoad() {
    if (!isLoggedIn()) return;
    state.view = "cold-room-load";
    const view = ensureShell();
    hideOtherViews();
    if (view) view.hidden = false;
    document.querySelector("#cold-room-load-tab")?.classList.add("is-active");
    elements.prevButton.hidden = true;
    elements.nextButton.hidden = true;
    elements.todayButton.hidden = true;
    elements.newEventButton.hidden = true;
    elements.rangeLabel.textContent = "Kühllastberechnung Kühlzellen";
    renderList();
    subscribe();
    loadRemote();
  }

  function subscribe() {
    if (!useRemoteStorage() || channel) return;
    channel = supabaseClient
      .channel("cold_room_load_calculations_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        if (state.view === "cold-room-load") loadRemote();
      })
      .subscribe();
  }

  function wire() {
    ensureShell();
    document.querySelector("#cold-room-load-tab")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openColdRoomLoad();
    }, true);
    document.querySelectorAll('.tab-button:not(#cold-room-load-tab)').forEach((button) => {
      button.addEventListener("click", () => {
        setTimeout(() => {
          if (state.view !== "cold-room-load") showCalendarViews();
        }, 0);
      });
    });
  }

  wire();

  const originalRender = render;
  render = function patchedColdRoomLoadRender() {
    const keepOpen = state.view === "cold-room-load";
    originalRender();
    if (keepOpen) openColdRoomLoad();
  };

  const originalSetAuthenticated = setAuthenticated;
  setAuthenticated = function patchedColdRoomLoadSetAuthenticated(authenticated) {
    originalSetAuthenticated(authenticated);
    setTimeout(() => {
      if (authenticated) subscribe();
    }, 0);
  };

  const originalLogout = logout;
  logout = async function patchedColdRoomLoadLogout() {
    if (channel && supabaseClient) {
      supabaseClient.removeChannel(channel);
      channel = null;
    }
    await originalLogout();
  };

  window.addEventListener("focus", () => {
    if (state.view === "cold-room-load") loadRemote();
  });
})();
