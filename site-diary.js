(() => {
  const TABLE = "site_diary";
  const BUCKET = "site-diary-photos";
  const STATUSES = ["Offen", "In Bearbeitung", "Abgeschlossen"];
  const TEXT_FIELDS = {
    project: "Baustelle / Projekt", address: "Anschrift", editor: "Bearbeiter",
    technicians: "Anwesende Monteure", companies: "Beteiligte Firmen", system_type: "Anlagen Typ",
    work: "Durchgeführte Arbeiten", issues: "Mängel / Behinderungen / Besonderheiten", next_steps: "Offene Arbeiten / nächste Schritte"
  };
  const $ = (id) => document.getElementById(`diary-${id}`);
  let records = [];
  let photos = [];
  let originalPhotos = [];
  let busy = false;
  let channel = null;
  let loadSequence = 0;
  const previews = new Map();

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "site-diary.css?v=20261031-1";
  document.head.append(css);
  const tab = document.createElement("button");
  tab.id = "site-diary-tab";
  tab.className = "tab-button";
  tab.type = "button";
  tab.dataset.view = "site-diary";
  tab.textContent = "Bautagebuch";
  document.querySelector(".view-tabs").append(tab);
  const view = document.createElement("section");
  view.id = "site-diary-view";
  view.className = "calendar-view diary-view";
  view.setAttribute("aria-label", "Bautagebuch");
  view.hidden = true;
  document.querySelector(".calendar-stage").append(view);

  function field(id, label, type = "text", required = false) {
    return `<label class="field"><span>${label}</span><input id="diary-${id}" type="${type}" ${required ? "required" : ""}></label>`;
  }
  view.innerHTML = `<div class="diary-shell">
    <form id="diary-form">
      <div class="section-header"><h2>Bautagebuch</h2></div>
      <input id="diary-id" type="hidden">
      <div class="diary-grid">
        ${field("project", TEXT_FIELDS.project, "text", true)}
        ${field("entry_date", "Datum", "date", true)}
        ${field("editor", TEXT_FIELDS.editor)}
        ${field("address", TEXT_FIELDS.address)}
        ${field("start_time", "Arbeitszeit von", "time")}
        ${field("end_time", "Arbeitszeit bis", "time")}
        ${field("technicians", TEXT_FIELDS.technicians)}
        ${field("companies", TEXT_FIELDS.companies)}
        ${field("system_type", TEXT_FIELDS.system_type)}
        ${["work", "issues", "next_steps"].map((id) => `<label class="field diary-wide"><span>${TEXT_FIELDS[id]}</span><textarea id="diary-${id}" rows="3"></textarea></label>`).join("")}
        <label class="field"><span>Status</span><select id="diary-status">${STATUSES.map((s) => `<option>${s}</option>`).join("")}</select></label>
      </div>
      <h3>Verbautes Material</h3>
      <div id="diary-materials"></div>
      <button id="diary-add-material" class="text-button" type="button">Material ergänzen</button>
      <h3>Fotos</h3>
      <label class="field diary-upload"><span>Fotos hinzufügen</span><input id="diary-upload" type="file" accept="image/*" multiple></label>
      <div id="diary-photos" class="diary-photos"></div>
      <p id="diary-message" class="diary-status" role="status" aria-live="polite"></p>
      <div class="diary-actions">
        <button class="primary-button" id="diary-save" type="submit">Speichern</button>
        <button class="text-button" id="diary-reset" type="button">Neu</button>
        <button class="text-button" id="diary-pdf" type="button">PDF speichern</button>
      </div>
    </form>
    <h3>Gespeicherte Einträge</h3>
    <div class="diary-filters">
      ${field("search", "Suche / Baustelle", "search")}
      ${field("from", "Datum von", "date")}${field("to", "Datum bis", "date")}
      <label class="field"><span>Status</span><select id="diary-filter-status"><option value="">Alle</option>${STATUSES.map((s) => `<option>${s}</option>`).join("")}</select></label>
    </div>
    <p id="diary-list-message" role="status"></p>
    <div id="diary-list" class="diary-table-wrap"></div>
    <div id="diary-detail" class="diary-detail" hidden></div>
  </div>
  <dialog id="diary-lightbox" class="diary-lightbox"><button type="button" class="text-button" id="diary-close-photo">Schließen</button><img alt="Baustellenfoto"></dialog>`;

  function message(text) { $("message").textContent = text; }
  function requireRemote() {
    if (!useRemoteStorage()) throw new Error("Bitte online anmelden, um das Bautagebuch zu nutzen.");
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dateLabel(value) { return value ? value.split("-").reverse().join(".") : "–"; }
  function setBusy(value) {
    busy = value;
    $("form").querySelectorAll("button,input,select,textarea").forEach((el) => { el.disabled = value; });
  }
  function button(label, action, danger = false) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = danger ? "danger-button" : "text-button";
    el.textContent = label;
    el.addEventListener("click", action);
    return el;
  }
  function addMaterial(material = {}) {
    const row = document.createElement("div");
    row.className = "diary-material";
    row.innerHTML = '<label class="field"><span>Menge</span><input type="text" class="diary-qty"></label><label class="field"><span>Bezeichnung</span><input type="text" class="diary-name"></label>';
    row.querySelector(".diary-qty").value = material.qty || "";
    row.querySelector(".diary-name").value = material.name || "";
    const remove = button("×", () => row.remove());
    remove.title = "Material entfernen";
    remove.setAttribute("aria-label", "Material entfernen");
    row.append(remove);
    $("materials").append(row);
  }
  function readForm() {
    const record = { id: $("id").value || crypto.randomUUID(), status: $("status").value };
    [...Object.keys(TEXT_FIELDS), "entry_date", "start_time", "end_time"].forEach((key) => { record[key] = $(key).value.trim(); });
    record.start_time ||= null;
    record.end_time ||= null;
    record.materials = [...$("materials").children].map((row) => ({ qty: row.querySelector(".diary-qty").value.trim(), name: row.querySelector(".diary-name").value.trim() })).filter((m) => m.qty || m.name);
    return record;
  }
  function reset() {
    if (busy) return;
    $("form").reset();
    $("id").value = "";
    $("entry_date").value = today();
    photos = [];
    originalPhotos = [];
    $("materials").replaceChildren();
    addMaterial();
    renderPhotos();
    message("");
    $("save").textContent = "Speichern";
  }

  async function photoUrl(photo) {
    if (photo.url) return photo.url;
    const cached = previews.get(photo.path);
    if (cached && cached.expires > Date.now()) return cached.url;
    requireRemote();
    const { data, error } = await supabaseClient.storage.from(BUCKET).createSignedUrl(photo.path, 3600);
    if (error) throw error;
    previews.set(photo.path, { url: data.signedUrl, expires: Date.now() + 3500_000 });
    return data.signedUrl;
  }
  async function renderPhotos(target = $("photos"), items = photos, editable = true) {
    const generation = Symbol();
    target.diaryGeneration = generation;
    target.replaceChildren();
    for (const photo of items) {
      if (target.diaryGeneration !== generation) return;
      const fig = document.createElement("figure");
      fig.className = "diary-photo";
      const img = document.createElement("img");
      img.alt = photo.name || "Baustellenfoto";
      fig.append(img);
      target.append(fig);
      try { img.src = await photoUrl(photo); }
      catch { img.alt = "Foto konnte nicht geladen werden"; }
      img.addEventListener("click", async () => {
        try {
          $("lightbox").querySelector("img").src = await photoUrl(photo);
          $("lightbox").showModal();
        } catch { message("Foto konnte nicht geöffnet werden."); }
      });
      if (editable) fig.append(button("Entfernen", () => {
        if (busy) return;
        photos = photos.filter((item) => item !== photo);
        renderPhotos();
      }));
    }
  }
  async function compress(file) {
    if (file.size > 20 * 1024 * 1024) throw new Error("Ein Foto darf höchstens 20 MB groß sein.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
      if (!blob) throw new Error("Foto konnte nicht verarbeitet werden.");
      return { name: file.name, blob, url: canvas.toDataURL("image/jpeg", .82) };
    } catch (error) {
      throw new Error(error.message.startsWith("Foto") ? error.message : "Fotoformat nicht lesbar. Bitte JPEG oder PNG verwenden.");
    } finally { URL.revokeObjectURL(url); }
  }
  async function addPhotos() {
    if (busy) return;
    const files = [...$("upload").files];
    if (files.length + photos.length > 12) { message("Maximal 12 Fotos je Eintrag."); $("upload").value = ""; return; }
    setBusy(true);
    message("Fotos werden verarbeitet …");
    try {
      for (const file of files) photos.push(await compress(file));
      message("");
    } catch (error) { message(error.message); }
    finally { $("upload").value = ""; setBusy(false); await renderPhotos(); }
  }

  async function load() {
    const sequence = ++loadSequence;
    try {
      requireRemote();
      const { data, error } = await supabaseClient.from(TABLE).select("*").order("entry_date", { ascending: false });
      if (error) throw error;
      if (sequence !== loadSequence || elements.appShell.hidden) return;
      records = data;
      renderList();
    } catch { $("list-message").textContent = "Einträge konnten nicht geladen werden. Bitte Anmeldung und Verbindung prüfen."; }
  }
  async function cleanup(paths) {
    if (!paths.length) return;
    const { error } = await supabaseClient.storage.from(BUCKET).remove(paths);
    if (error) throw new Error("Eintrag gespeichert, aber alte Fotos konnten nicht entfernt werden.");
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const record = readForm();
    if (!record.project || !record.entry_date) { message("Bitte Baustelle und Datum eintragen."); return; }
    if (record.start_time && record.end_time && record.end_time < record.start_time) { message("Die Endzeit muss nach der Anfangszeit liegen."); return; }
    const uploaded = [];
    let committed = false;
    setBusy(true);
    message("Wird gespeichert …");
    try {
      requireRemote();
      record.photos = [];
      for (const photo of photos) {
        if (photo.path) { record.photos.push({ path: photo.path, name: photo.name }); continue; }
        const path = `${record.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabaseClient.storage.from(BUCKET).upload(path, photo.blob, { contentType: "image/jpeg" });
        if (error) throw error;
        uploaded.push(path);
        record.photos.push({ path, name: photo.name });
      }
      const { data, error } = await supabaseClient.from(TABLE).upsert(record).select("*").single();
      if (error) throw error;
      committed = true;
      const removed = originalPhotos.filter((photo) => !record.photos.some((item) => item.path === photo.path)).map((photo) => photo.path);
      records = [data, ...records.filter((r) => r.id !== record.id)];
      setBusy(false);
      reset();
      $("detail").hidden = true;
      renderList();
      message("Eintrag gespeichert.");
      await cleanup(removed);
    } catch (error) {
      if (!committed && uploaded.length) {
        try { await cleanup(uploaded); } catch { /* Failed uploads can be cleaned up from Storage later. */ }
      }
      message(committed ? error.message : "Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen. Ihre Eingaben bleiben erhalten.");
    } finally { setBusy(false); }
  }
  function edit(record) {
    if (busy) return;
    $("id").value = record.id;
    [...Object.keys(TEXT_FIELDS), "entry_date", "start_time", "end_time", "status"].forEach((key) => { $(key).value = (record[key] || "").toString().slice(0, ["start_time", "end_time"].includes(key) ? 5 : undefined); });
    photos = (record.photos || []).map((p) => ({ ...p }));
    originalPhotos = [...photos];
    $("materials").replaceChildren();
    (record.materials?.length ? record.materials : [{}]).forEach(addMaterial);
    $("save").textContent = "Änderungen speichern";
    renderPhotos();
    message("");
    $("form").scrollIntoView({ behavior: "smooth", block: "start" });
    $("project").focus({ preventScroll: true });
  }
  async function remove(record) {
    if (busy || !confirm(`Bautagebucheintrag „${record.project}“ vom ${dateLabel(record.entry_date)} löschen?`)) return;
    setBusy(true);
    try {
      requireRemote();
      const { error } = await supabaseClient.from(TABLE).delete().eq("id", record.id);
      if (error) throw error;
      records = records.filter((r) => r.id !== record.id);
      setBusy(false);
      if ($("id").value === record.id) reset();
      $("detail").hidden = true;
      renderList();
      message("Eintrag gelöscht.");
      try { await cleanup((record.photos || []).map((p) => p.path)); }
      catch { message("Eintrag gelöscht. Zugehörige Fotos konnten nicht vollständig entfernt werden."); }
    } catch { message("Löschen fehlgeschlagen. Bitte erneut versuchen."); }
    finally { setBusy(false); }
  }
  function renderList() {
    const query = $("search").value.trim().toLocaleLowerCase("de");
    const shown = records.filter((r) => (!query || [...Object.keys(TEXT_FIELDS), "status"].some((key) => (r[key] || "").toLocaleLowerCase("de").includes(query))) && (!$("from").value || r.entry_date >= $("from").value) && (!$("to").value || r.entry_date <= $("to").value) && (!$("filter-status").value || r.status === $("filter-status").value)).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    $("list-message").textContent = shown.length ? `${shown.length} Einträge` : "Keine Einträge gefunden.";
    const table = document.createElement("table");
    table.className = "diary-table";
    const labels = ["Datum", "Baustelle / Projekt", "Bearbeiter", "Status", "Arbeiten", "Aktionen"];
    table.innerHTML = `<thead><tr>${labels.map((l) => `<th scope="col">${l}</th>`).join("")}</tr></thead><tbody></tbody>`;
    shown.forEach((record) => {
      const row = document.createElement("tr");
      [dateLabel(record.entry_date), record.project, record.editor, record.status, record.work].forEach((value, index) => {
        const td = document.createElement("td");
        td.dataset.label = labels[index];
        const text = document.createElement("div");
        text.textContent = value || "–";
        if (index === 4) text.className = "diary-summary";
        td.append(text);
        row.append(td);
      });
      const td = document.createElement("td");
      td.dataset.label = "Aktionen";
      const actions = document.createElement("div");
      actions.className = "diary-actions";
      actions.append(button("Öffnen", () => detail(record)), button("Bearbeiten", () => edit(record)), button("PDF", () => exportPdf(record, record.photos || [])), button("Löschen", () => remove(record), true));
      td.append(actions);
      row.append(td);
      table.tBodies[0].append(row);
    });
    $("list").replaceChildren(table);
  }
  function detail(record) {
    const target = $("detail");
    target.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = `${record.project} · ${dateLabel(record.entry_date)}`;
    const dl = document.createElement("dl");
    const values = { ...Object.fromEntries(Object.entries(TEXT_FIELDS).map(([key, label]) => [label, record[key]])), Arbeitszeit: `${record.start_time?.slice(0, 5) || "–"} – ${record.end_time?.slice(0, 5) || "–"}`, Status: record.status, Material: (record.materials || []).map((m) => `${m.qty} ${m.name}`).join("\n") };
    Object.entries(values).forEach(([label, value]) => {
      const dt = document.createElement("dt"); dt.textContent = label;
      const dd = document.createElement("dd"); dd.textContent = value || "–";
      dl.append(dt, dd);
    });
    const images = document.createElement("div"); images.className = "diary-photos";
    target.append(heading, button("Schließen", () => { target.hidden = true; }), dl, images);
    target.hidden = false;
    renderPhotos(images, record.photos || [], false);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Raster pages preserve German characters and photos without loading a PDF library.
  async function exportPdf(record, images) {
    if (busy) return;
    setBusy(true);
    message("PDF wird erstellt …");
    try {
      const pages = [];
      let canvas, ctx, y;
      function page() {
        canvas = document.createElement("canvas"); canvas.width = 1240; canvas.height = 1754;
        ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1240, 1754);
        ctx.fillStyle = "#202020"; ctx.font = "24px Arial";
        ctx.fillText("MB Kälte Klima GmbH · Bautagebuch", 70, 65);
        ctx.font = "18px Arial"; ctx.fillText(`${record.project.slice(0, 80)} · ${dateLabel(record.entry_date)}`, 70, 100);
        ctx.fillText(`Seite ${pages.length + 1}`, 70, 1710);
        pages.push(canvas); y = 155;
      }
      function line(text) {
        if (y > 1610) page();
        ctx.font = "22px Arial"; ctx.fillText(text, 70, y); y += 31;
      }
      function paragraph(label, value) {
        line(label);
        for (const raw of String(value || "–").split("\n")) {
          let current = "";
          for (const char of raw) {
            if (ctx.measureText(current + char).width > 1080) { line(current); current = ""; }
            current += char;
          }
          line(current);
        }
        y += 16;
      }
      page();
      paragraph("Datum", dateLabel(record.entry_date));
      for (const [key, label] of Object.entries(TEXT_FIELDS)) paragraph(label, record[key]);
      paragraph("Arbeitszeit", `${record.start_time?.slice(0, 5) || "–"} – ${record.end_time?.slice(0, 5) || "–"}`);
      paragraph("Status", record.status);
      paragraph("Verbautes Material", (record.materials || []).map((m) => `${m.qty} ${m.name}`).join("\n"));
      for (const photo of images) {
        const img = new Image(); img.crossOrigin = "anonymous"; img.src = await photoUrl(photo); await img.decode();
        page();
        paragraph("Foto", photo.name || "Baustellenfoto");
        const scale = Math.min(1100 / img.naturalWidth, (1620 - y) / img.naturalHeight);
        ctx.drawImage(img, 70, y, img.naturalWidth * scale, img.naturalHeight * scale);
      }
      const blob = makePdf(pages);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `Bautagebuch-${record.entry_date}-${record.project.replace(/[^a-z0-9äöüß_-]/gi, "_").slice(0, 60)}.pdf`;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
      message("PDF gespeichert.");
    } catch { message("PDF konnte nicht erstellt werden. Bitte prüfen, ob alle Fotos geladen werden können."); }
    finally { setBusy(false); }
  }
  function makePdf(pages) {
    const encoder = new TextEncoder();
    const parts = [];
    const offsets = [0];
    let length = 0;
    const add = (value) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; parts.push(bytes); length += bytes.length; };
    const object = (id, value) => { offsets[id] = length; add(`${id} 0 obj\n${value}\nendobj\n`); };
    add("%PDF-1.4\n");
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`);
    pages.forEach((canvas, i) => {
      const id = 3 + i * 3;
      const jpeg = Uint8Array.from(atob(canvas.toDataURL("image/jpeg", .88).split(",")[1]), (c) => c.charCodeAt(0));
      object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
      offsets[id + 1] = length;
      add(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
      add(jpeg); add("\nendstream\nendobj\n");
      const commands = "q 595 0 0 842 0 0 cm /Im Do Q\n";
      object(id + 2, `<< /Length ${commands.length} >>\nstream\n${commands}endstream`);
    });
    const xref = length;
    add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    offsets.slice(1).forEach((offset) => add(`${String(offset).padStart(10, "0")} 00000 n \n`));
    add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  }

  function show() {
    elements.appShell.classList.add("diary-active");
    document.querySelectorAll(".calendar-stage > section").forEach((section) => { section.hidden = section !== view; });
    document.querySelectorAll(".tab-button").forEach((el) => { el.classList.toggle("is-active", el === tab); });
    [elements.prevButton, elements.nextButton, elements.todayButton, elements.newEventButton].forEach((el) => { el.hidden = true; });
    elements.rangeLabel.textContent = "Bautagebuch";
  }
  function open(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (elements.appShell.hidden) return;
    state.view = "site-diary";
    show();
    load();
    if (useRemoteStorage() && !channel) channel = supabaseClient.channel("site_diary_changes").on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => { if (state.view === "site-diary") load(); }).subscribe();
  }
  tab.addEventListener("click", open, true);
  document.addEventListener("click", (event) => {
    const next = event.target.closest?.(".tab-button");
    if (next && next !== tab) { view.hidden = true; tab.classList.remove("is-active"); elements.appShell.classList.remove("diary-active"); }
  }, true);
  const previousRender = render;
  render = function diaryRender() { const keep = state.view === "site-diary"; previousRender(); if (keep && !elements.appShell.hidden) show(); };
  const previousLogout = logout;
  logout = async function diaryLogout() {
    ++loadSequence;
    if (channel && supabaseClient) { supabaseClient.removeChannel(channel); channel = null; }
    records = []; previews.clear(); reset(); view.hidden = true; $("detail").replaceChildren(); $("list").replaceChildren();
    elements.appShell.classList.remove("diary-active");
    $("lightbox").close(); $("lightbox").querySelector("img").removeAttribute("src");
    await previousLogout();
  };
  $("form").addEventListener("submit", save);
  $("reset").addEventListener("click", reset);
  $("add-material").addEventListener("click", () => addMaterial());
  $("upload").addEventListener("change", addPhotos);
  $("close-photo").addEventListener("click", () => $("lightbox").close());
  $("pdf").addEventListener("click", () => { if ($("form").reportValidity()) exportPdf(readForm(), photos); });
  ["search", "from", "to", "filter-status"].forEach((id) => $(id).addEventListener("input", renderList));
  window.addEventListener("focus", () => { if (state.view === "site-diary" && !elements.appShell.hidden) load(); });
  reset();
})();
