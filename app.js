const STORAGE_KEY = "water-tracker-state-v1";
const circleLength = 427.26;

const state = loadState();

const els = {
  progressCircle: document.getElementById("progressCircle"),
  percentText: document.getElementById("percentText"),
  drunkText: document.getElementById("drunkText"),
  goalText: document.getElementById("goalText"),
  remainingText: document.getElementById("remainingText"),
  entriesCount: document.getElementById("entriesCount"),
  historyList: document.getElementById("historyList"),
  weekBars: document.getElementById("weekBars"),
  weekAverage: document.getElementById("weekAverage"),
  dateText: document.getElementById("dateText"),
  dailyGoal: document.getElementById("dailyGoal"),
  customAmount: document.getElementById("customAmount"),
  goalForm: document.getElementById("goalForm"),
  customAddForm: document.getElementById("customAddForm"),
  undoButton: document.getElementById("undoButton"),
  resetDayButton: document.getElementById("resetDayButton"),
  themeToggleButton: document.getElementById("themeToggleButton"),
};

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function loadState() {
  const fallback = { goal: 2000, days: {}, theme: "light" };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return fallback;
    return {
      goal: Number(saved.goal) || fallback.goal,
      days: saved.days && typeof saved.days === "object" ? saved.days : {},
      theme: saved.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTodayEntries() {
  const key = todayKey();
  if (!Array.isArray(state.days[key])) state.days[key] = [];
  return state.days[key];
}

function formatAmount(amount) {
  if (amount >= 1000) {
    const liters = amount / 1000;
    return `${Number.isInteger(liters) ? liters : liters.toFixed(1)} لتر`;
  }

  return `${amount} مل`;
}

function formatTime(isoDate) {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function dayLabel(date) {
  return new Intl.DateTimeFormat("ar-SA", { weekday: "short" }).format(date);
}

function sumEntries(entries) {
  return entries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function addWater(amount) {
  const cleanAmount = Math.round(Number(amount));
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) return;

  getTodayEntries().push({
    amount: cleanAmount,
    createdAt: new Date().toISOString(),
  });

  saveState();
  render();
}

function setGoal(amount) {
  const cleanGoal = Math.round(Number(amount));
  if (!Number.isFinite(cleanGoal) || cleanGoal < 250) return;

  state.goal = cleanGoal;
  saveState();
  render();
}

function resetToday() {
  state.days[todayKey()] = [];
  saveState();
  render();
}

function undoLastEntry() {
  const entries = getTodayEntries();
  entries.pop();
  saveState();
  render();
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("dark-mode", state.theme === "dark");
  els.themeToggleButton.textContent = state.theme === "dark" ? "☀" : "☾";
  els.themeToggleButton.setAttribute("aria-pressed", String(state.theme === "dark"));
  els.themeToggleButton.title = state.theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
  saveState();
}

function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function renderHistory(entries) {
  els.historyList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "لا يوجد تسجيل حتى الآن";
    els.historyList.append(empty);
    return;
  }

  entries
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${formatAmount(entry.amount)}</strong><span>${formatTime(entry.createdAt)}</span>`;
      els.historyList.append(item);
    });
}

function renderWeek() {
  els.weekBars.innerHTML = "";

  const today = new Date();
  const totals = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = todayKey(date);
    const total = sumEntries(state.days[key] || []);
    totals.push(total);

    const percent = Math.min((total / state.goal) * 100, 100);
    const bar = document.createElement("div");
    bar.className = `day-bar${total >= state.goal ? " is-complete" : ""}`;
    bar.title = `${dayLabel(date)}: ${formatAmount(total)}`;
    bar.innerHTML = `
      <div class="bar-track"><div class="bar-fill" style="height: ${Math.max(percent, 5)}%"></div></div>
      <small>${dayLabel(date)}</small>
    `;
    els.weekBars.append(bar);
  }

  const average = Math.round(totals.reduce((total, value) => total + value, 0) / totals.length);
  els.weekAverage.textContent = `متوسط ${formatAmount(average)}`;
}

function render() {
  const entries = getTodayEntries();
  const total = sumEntries(entries);
  const percent = Math.min(Math.round((total / state.goal) * 100), 100);
  const remaining = Math.max(state.goal - total, 0);
  const offset = circleLength - (circleLength * percent) / 100;

  els.progressCircle.style.strokeDashoffset = String(offset);
  els.percentText.textContent = `${percent}%`;
  els.drunkText.textContent = formatAmount(total);
  els.goalText.textContent = formatAmount(state.goal);
  els.remainingText.textContent = formatAmount(remaining);
  els.entriesCount.textContent = String(entries.length);
  els.dailyGoal.value = String(state.goal);
  els.dateText.textContent = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  els.undoButton.disabled = entries.length === 0;

  renderHistory(entries);
  renderWeek();
}

document.querySelectorAll("[data-add]").forEach((button) => {
  button.addEventListener("click", () => addWater(button.dataset.add));
});

els.customAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addWater(els.customAmount.value);
  els.customAmount.value = "";
});

els.goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setGoal(els.dailyGoal.value);
});

els.undoButton.addEventListener("click", undoLastEntry);
els.resetDayButton.addEventListener("click", resetToday);
els.themeToggleButton.addEventListener("click", toggleTheme);

setTheme(state.theme);
render();
