const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

/* ================= UTILS & STATE ================= */
const DATA = {
  userName: localStorage.getItem("userName") || "",
  todos: JSON.parse(localStorage.getItem("todos")) || [],
  goals: JSON.parse(localStorage.getItem("goals")) || [],
  planner: JSON.parse(localStorage.getItem("planner")) || {},
  city: localStorage.getItem("city") || "Mumbai",
};

const save = () => {
  localStorage.setItem("todos", JSON.stringify(DATA.todos));
  localStorage.setItem("goals", JSON.stringify(DATA.goals));
  localStorage.setItem("planner", JSON.stringify(DATA.planner));
  localStorage.setItem("city", DATA.city);
};

/* ================= 1. CLOCK & GREETING ================= */
function initClock() {
  const update = () => {
    const now = new Date();
    $("#time-main").textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    $("#date-display").textContent = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    $("#day-text").textContent = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();

    // Update daily planner header
    $("#daily-date").textContent = now
      .toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
    $("#goals-date-display").textContent = now
      .toLocaleDateString("en-US", { month: "long", day: "numeric" })
      .toUpperCase();
  };
  setInterval(update, 1000);
  update();
}

function initUser() {
  const modal = $("#name-modal");

  if (!DATA.userName) {
    modal.classList.add("active");
  } else {
    $("#name-output").textContent = DATA.userName;
  }

  $("#save-name-btn").onclick = () => {
    const val = $("#username-input").value.trim();
    if (val) {
      DATA.userName = val;
      localStorage.setItem("userName", val);
      $("#name-output").textContent = val;
      modal.classList.remove("active");
    }
  };

  $("#change-name-btn").onclick = () => modal.classList.add("active");
}

/* ================= 2. WEATHER API ================= */
async function fetchWeather(city) {
  if (!city) return;

  try {
    const apiKey = "eef80597f9cc450a96243415261601";
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`
    );

    if (!res.ok) throw new Error("City not found");

    const d = await res.json();

    $("#temp-display").textContent = Math.round(d.current.temp_c) + "°";
    $("#weather-cond").textContent = d.current.condition.text;
    $("#city-name").textContent = d.location.name;
    $("#humidity").textContent = d.current.humidity + "%";
    $("#wind").textContent = d.current.wind_kph + " km/h";
    $("#feels").textContent = Math.round(d.current.feelslike_c) + "°";

    DATA.city = city;
    save();
  } catch (err) {
    $("#city-name").textContent = "Not Found";
    $("#weather-cond").textContent = "--";
  }
}

/* ENTER KEY */
$("#city-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") fetchWeather(e.target.value.trim());
});

/* SEARCH ICON CLICK */
$("#weather-search").onclick = () => {
  fetchWeather($("#city-input").value.trim());
};

/* ================= 3. NAVIGATION (FULL PAGES) ================= */
$$(".nav-card").forEach((card) => {
  card.onclick = () => {
    const targetId = card.dataset.target;
    $(`#page-${targetId}`).classList.add("active");
    // Refresh specific sections on open if needed
    if (targetId === "moti") fetchQuote();
  };
});

$$(".close-btn").forEach((btn) => {
  btn.onclick = () => {
    btn.closest(".full-page").classList.remove("active");
  };
});

/* ================= 4. WORKFLOW (TODO) ================= */
function renderTodos() {
  const container = $("#todo-list");
  container.innerHTML = "";

  DATA.todos.forEach((todo, index) => {
    const div = document.createElement("div");
    div.className = `todo-item ${todo.urgent ? "urgent" : ""}`;
    div.innerHTML = `
      <div>
        <h4>${todo.summary}</h4>
        <p>${todo.desc}</p>
      </div>
      <button class="delete-todo" onclick="deleteTodo(${index})"><i class="ri-delete-bin-line"></i></button>
    `;
    container.appendChild(div);
  });
}

function deleteTodo(index) {
  DATA.todos.splice(index, 1);
  save();
  renderTodos();
}
// Expose to window for inline onclick
window.deleteTodo = deleteTodo;

$("#add-todo-btn").onclick = () => {
  const summary = $("#todo-summary").value.trim();
  const desc = $("#todo-desc").value.trim();
  const urgent = $("#todo-urgent").checked;

  if (summary) {
    DATA.todos.push({ summary, desc, urgent });
    save();
    renderTodos();
    $("#todo-summary").value = "";
    $("#todo-desc").value = "";
    $("#todo-urgent").checked = false;
  }
};

/* ================= 5. DAILY PLANNER ================= */
const TIME_SLOTS = [
  "08:00 TO 09:00",
  "09:00 TO 10:00",
  "10:00 TO 11:00",
  "11:00 TO 12:00",
  "12:00 TO 13:00",
  "13:00 TO 14:00",
  "14:00 TO 15:00",
  "15:00 TO 16:00",
];

function renderPlanner() {
  const container = $("#time-slots");
  container.innerHTML = "";

  TIME_SLOTS.forEach((slot) => {
    const div = document.createElement("div");
    div.className = "time-slot";
    const savedVal = DATA.planner[slot] || "";

    div.innerHTML = `
      <span class="slot-time">${slot}</span>
      <input class="slot-input" value="${savedVal}" placeholder="What do you have to do..." oninput="updatePlanner('${slot}', this.value)" />
    `;
    container.appendChild(div);
  });
}

window.updatePlanner = (slot, value) => {
  DATA.planner[slot] = value;
  save();
};

/* ================= 6. POMODORO ================= */
let pomoTimer = null;
let isRunning = false;

let MODES = {
  FOCUS: 25 * 60,
  ZEN: 5 * 60,
};

let currentMode = "FOCUS";
let pomoTime = MODES[currentMode];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function updatePomoDisplay() {
  $("#pomo-time").textContent = formatTime(pomoTime);
}

/* START / PAUSE */
$("#pomo-start").onclick = function () {
  if (isRunning) {
    clearInterval(pomoTimer);
    isRunning = false;
    this.textContent = "START SESSION";
  } else {
    isRunning = true;
    this.textContent = "PAUSE";

    pomoTimer = setInterval(() => {
      pomoTime--;
      updatePomoDisplay();

      if (pomoTime <= 0) {
        clearInterval(pomoTimer);
        isRunning = false;
        alert(`${currentMode} session complete`);
        pomoTime = MODES[currentMode];
        updatePomoDisplay();
        $("#pomo-start").textContent = "START SESSION";
      }
    }, 1000);
  }
};

/* RESET */
$("#pomo-reset").onclick = () => {
  clearInterval(pomoTimer);
  isRunning = false;
  pomoTime = MODES[currentMode];
  updatePomoDisplay();
  $("#pomo-start").textContent = "START SESSION";
};

/* MODE SWITCH (FOCUS / ZEN) */
document.querySelectorAll(".pomo-toggle span").forEach((btn) => {
  btn.onclick = () => {
    if (isRunning) return;

    document
      .querySelectorAll(".pomo-toggle span")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");
    currentMode = btn.textContent.trim();

    pomoTime = MODES[currentMode];
    updatePomoDisplay();
  };
});

/* INIT */
updatePomoDisplay();

/* ================= 7. GOALS ================= */
function renderGoals() {
  const list = $("#goals-ul");
  const empty = $("#goals-empty");
  const progressText = $("#progress-text");
  const progressFill = $("#progress-fill");

  list.innerHTML = "";

  if (DATA.goals.length === 0) {
    empty.style.display = "block";
    progressText.textContent = "0%";
    progressFill.style.width = "0%";
    return;
  }

  empty.style.display = "none";

  let completedCount = 0;

  DATA.goals.forEach((goal, i) => {
    if (goal.completed) completedCount++;

    const li = document.createElement("li");
    li.className = `goal-item ${goal.completed ? "completed" : ""}`;
    li.onclick = () => toggleGoal(i);
    li.innerHTML = `
  <div class="goal-checkbox"></div>
  <span>${goal.text}</span>
  <button class="delete-goal" onclick="deleteGoal(${i}, event)">
    <i class="ri-close-line"></i>
  </button>
`;
    list.appendChild(li);
  });
function deleteGoal(index, e) {
  e.stopPropagation(); // prevent toggle
  DATA.goals.splice(index, 1);
  save();
  renderGoals();
}

window.deleteGoal = deleteGoal;

  const percent = Math.round((completedCount / DATA.goals.length) * 100);
  progressText.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

function toggleGoal(index) {
  DATA.goals[index].completed = !DATA.goals[index].completed;
  save();
  renderGoals();
}

$("#goal-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim()) {
    DATA.goals.push({ text: e.target.value.trim(), completed: false });
    e.target.value = "";
    save();
    renderGoals();
  }
});

/* ================= 8. MOTIVATION ================= */
async function fetchQuote() {
  // Using a backup array in case API fails (often CORS issues with free APIs)
  const backups = [
    {
      q: "The only way to do great work is to love what you do.",
      a: "Steve Jobs",
    },
    { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
    {
      q: "Your time is limited, don't waste it living someone else's life.",
      a: "Steve Jobs",
    },
  ];

  try {
    const res = await fetch("https://api.quotable.io/random");
    if (!res.ok) throw new Error("API Fail");
    const data = await res.json();
    $("#quote-text").textContent = `"${data.content}"`;
    $("#quote-author").textContent = `- ${data.author}`;
  } catch (err) {
    const random = backups[Math.floor(Math.random() * backups.length)];
    $("#quote-text").textContent = `"${random.q}"`;
    $("#quote-author").textContent = `- ${random.a}`;
  }
}

function toggel(){
  /* ================= THEME TOGGLE ================= */
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

/* LOAD SAVED THEME */
const savedTheme = localStorage.getItem('theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

/* TOGGLE */
themeToggle.onclick = () => {
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
};

}
/* ================= INIT ================= */
window.onload = () => {
  toggel();
  initClock();
  initUser();
  fetchWeather(DATA.city);
  renderTodos();
  renderPlanner();
  renderGoals();
};
