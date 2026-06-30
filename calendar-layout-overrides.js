(() => {
  const style = document.createElement("style");
  style.textContent = `
    .week-list-shell {
      position: relative;
      background: linear-gradient(135deg, rgba(248, 255, 19, 0.08), transparent 18%), linear-gradient(225deg, rgba(255, 45, 253, 0.12), transparent 24%), var(--panel);
      border: 1px solid var(--line-strong);
      box-shadow: var(--shadow), inset 0 0 24px rgba(0, 217, 255, 0.08);
      overflow: hidden;
    }

    .week-list-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(150px, 1fr));
      min-width: 980px;
      background: linear-gradient(90deg, rgba(0, 217, 255, 0.035), rgba(255, 45, 253, 0.035)), rgba(4, 7, 25, 0.72);
    }

    .week-list-day {
      min-height: 520px;
      border-right: 1px solid rgba(20, 44, 67, 0.78);
      display: grid;
      grid-template-rows: auto 1fr auto;
      background: rgba(9, 12, 34, 0.5);
    }

    .week-list-day:last-child {
      border-right: 0;
    }

    .week-list-day-head {
      min-height: 78px;
      display: grid;
      gap: 3px;
      place-items: center;
      padding: 10px 6px;
      border: 0;
      border-bottom: 1px solid rgba(20, 44, 67, 0.78);
      color: var(--text);
      background: linear-gradient(180deg, rgba(0, 217, 255, 0.12), rgba(103, 54, 255, 0.08)), rgba(7, 11, 31, 0.96);
    }

    .week-list-day-head.is-today {
      color: var(--yellow);
      box-shadow: inset 0 -3px 0 var(--yellow), 0 0 18px rgba(248, 255, 19, 0.18);
    }

    .week-list-day-head.is-holiday {
      background: linear-gradient(180deg, rgba(248, 255, 19, 0.12), rgba(255, 45, 253, 0.07)), rgba(7, 11, 31, 0.96);
    }

    .week-list-events {
      display: grid;
      align-content: start;
      gap: 8px;
      padding: 10px;
    }

    .week-list-event {
      min-height: 44px;
      margin: 0;
    }

    .week-empty {
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      opacity: 0.72;
    }

    .week-add-button {
      min-height: 34px;
      margin: 10px;
      border: 1px dashed rgba(0, 217, 255, 0.44);
      border-radius: 4px;
      color: var(--muted);
      background: rgba(9, 12, 34, 0.55);
      text-transform: uppercase;
    }

    .week-add-button:hover,
    .week-add-button:focus-visible {
      color: var(--yellow);
      border-color: rgba(248, 255, 19, 0.8);
      outline: none;
    }

    .month-day {
      overflow: auto;
    }

    .month-events {
      align-content: start;
      overflow: visible;
    }

    .month-event {
      min-height: 28px;
    }

    .month-event strong,
    .month-event span {
      white-space: normal;
    }

    @media (max-width: 620px) {
      .week-list-grid {
        grid-template-columns: repeat(7, minmax(120px, 1fr));
        min-width: 840px;
      }

      .week-list-day {
        min-height: 420px;
      }
    }
  `;
  document.head.append(style);

  renderWeek = function renderWeekAsList() {
    const weekStart = startOfWeek(state.anchorDate);
    const today = startOfDay(new Date());
    const grid = document.createElement("div");
    grid.className = "week-list-grid";

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex);
      const key = dateKey(date);
      const holiday = holidayForDate(date);
      const dayColumn = document.createElement("section");
      dayColumn.className = "week-list-day";

      const head = document.createElement("button");
      head.type = "button";
      head.className = "week-list-day-head";

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
        head.setAttribute("title", holiday.name);
      }

      head.classList.toggle("is-today", isSameDate(date, today));
      head.classList.toggle("is-holiday", Boolean(holiday));
      head.addEventListener("click", () => openEventDialog({ date: key, start: "09:00" }));

      const eventList = document.createElement("div");
      eventList.className = "week-list-events";
      const dayEvents = eventsForDate(key);
      if (dayEvents.length) {
        dayEvents.forEach((event) => eventList.append(createEventButton(event, "week-list-event")));
      } else {
        const empty = document.createElement("span");
        empty.className = "week-empty";
        empty.textContent = "Keine Termine";
        eventList.append(empty);
      }

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "week-add-button";
      addButton.textContent = "Termin hinzufügen";
      addButton.addEventListener("click", () => openEventDialog({ date: key, start: "09:00" }));

      dayColumn.append(head, eventList, addButton);
      grid.append(dayColumn);
    }

    const shell = document.createElement("div");
    shell.className = "week-list-shell";
    shell.append(grid);
    elements.weekView.replaceChildren(shell);
  };

  renderMonth = function renderMonthWithAllEvents() {
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
        const weekNumber = document.createElement("div");
        weekNumber.className = "month-week-number";
        weekNumber.setAttribute("aria-label", `Kalenderwoche ${getCalendarWeek(date)}`);
        const weekLabel = document.createElement("span");
        weekLabel.textContent = `KW ${getCalendarWeek(date)}`;
        const monthLabel = document.createElement("span");
        monthLabel.className = "month-week-month";
        monthLabel.textContent = MONTHS[monthStart.getMonth()];
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
      dayEvents.forEach((event) => {
        eventList.append(createEventButton(event, "month-event"));
      });
      day.append(eventList);
      grid.append(day);
    }

    shell.append(header, grid);
    elements.monthView.replaceChildren(shell);
  };

  render();
})();
