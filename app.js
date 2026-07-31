const moduleGroups = [
  {
    code: "A",
    title: "Core Modules",
    modules: [
      ["Introduction to UI/UX", "IT33002FP", 3],
      ["Web Development Essentials", "IT33003FP", 3],
      ["Software Development Practices", "IT43001FP", 3],
      ["Programming Essentials", "IT43002FP", 3],
      ["Gamification Concept", "GD43001FP", 3],
      ["Game Programming", "GD43002FP", 3],
      ["Game Asset Creation", "GD43003FP", 3],
      ["Game Development", "GD43004FP", 3],
      ["Game Level Production", "GD43005FP", 3],
      ["Built Environment Visualisation", "GD53001FP", 3],
      ["Immersive Applications", "GD53002FP", 3],
      ["Geospatial Applications", "GD53003FP", 3],
      ["Humanoid Programming", "GD53004FP", 3],
      ["Industry Attachment", "GD53006FPE", 8]
    ]
  },
  {
    code: "B1",
    title: "LifeSkills Modules",
    modules: [
      ["Personal & Professional Development 1", "LFS83004", 2],
      ["Personal & Professional Development 2", "LFS83005", 2],
      ["Personal & Professional Development 3", "LFS83006", 2]
    ]
  },
  {
    code: "B2",
    title: "Sports & Wellness",
    modules: [
      ["Sports and Wellness 1", "SW41081", 1],
      ["Sports and Wellness 2", "SW41082", 1],
      ["Sports and Wellness 3", "SW41083", 1]
    ]
  },
  {
    code: "C1",
    title: "Cross Disciplinary Core",
    modules: [
      ["Cross Disciplinary Core 1", "CDC1", 3]
    ]
  }
];

const gradeOptions = [
  ["", "Not graded"],
  ["4", "A · 4.0"],
  ["3", "B · 3.0"],
  ["2", "C · 2.0"],
  ["1", "D · 1.0"],
  ["0", "F · 0.0"],
  ["x", "Exempt"]
];

const STORAGE_KEY = "hf2ig-gpa-grades";
const grades = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
const groupContainer = document.querySelector("#moduleGroups");
const gpaValue = document.querySelector("#gpaValue");
const completedCredits = document.querySelector("#completedCredits");
const remainingModules = document.querySelector("#remainingModules");
const progressFill = document.querySelector("#progressFill");
const scoreMessage = document.querySelector("#scoreMessage");
const searchInput = document.querySelector("#moduleSearch");
const emptyState = document.querySelector("#emptyState");
const toast = document.querySelector("#toast");

function renderModules(filter = "") {
  groupContainer.innerHTML = "";
  const normalizedFilter = filter.trim().toLowerCase();
  let visibleCount = 0;

  moduleGroups.forEach((group) => {
    const matches = group.modules.filter(([name, code]) =>
      `${name} ${code}`.toLowerCase().includes(normalizedFilter)
    );
    if (!matches.length) return;

    visibleCount += matches.length;
    const section = document.createElement("section");
    section.className = "module-group";
    const credits = group.modules.reduce((sum, module) => sum + module[2], 0);

    section.innerHTML = `
      <div class="group-header">
        <span class="group-code">${group.code}</span>
        <span class="group-title">${group.title}</span>
        <span class="group-credits">${group.modules.length} modules · ${credits} credits</span>
      </div>
      <div class="module-list"></div>
    `;

    const list = section.querySelector(".module-list");
    matches.forEach(([name, code, credits], index) => {
      const row = document.createElement("div");
      row.className = "module-row";
      const options = gradeOptions.map(([value, label]) =>
        `<option value="${value}" ${String(grades[code] ?? "") === value ? "selected" : ""}>${label}</option>`
      ).join("");

      row.innerHTML = `
        <span class="module-number">${index + 1}</span>
        <span class="module-name">${name}</span>
        <span class="module-code">${code}</span>
        <span class="module-credit"><b>${credits}</b> credit${credits === 1 ? "" : "s"}</span>
        <select class="grade-select" data-code="${code}" aria-label="Grade for ${name}">
          ${options}
        </select>
      `;
      list.appendChild(row);
    });

    groupContainer.appendChild(section);
  });

  emptyState.hidden = visibleCount > 0;
  bindSelects();
}

function bindSelects() {
  document.querySelectorAll(".grade-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const { code } = event.target.dataset;
      const value = event.target.value;
      if (value === "") delete grades[code];
      else grades[code] = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(grades));
      updateScore();
    });
  });
}

function calculate() {
  let points = 0;
  let credits = 0;
  let gradedModules = 0;

  moduleGroups.forEach((group) => group.modules.forEach(([, code, moduleCredits]) => {
    const grade = grades[code];
    if (grade !== undefined && grade !== "" && grade !== "x") {
      points += Number(grade) * moduleCredits;
      credits += moduleCredits;
      gradedModules += 1;
    }
  }));

  return { gpa: credits ? points / credits : null, credits, gradedModules };
}

function updateScore() {
  const result = calculate();
  const totalModules = moduleGroups.reduce((sum, group) => sum + group.modules.length, 0);
  gpaValue.textContent = result.gpa === null ? "—" : result.gpa.toFixed(2);
  completedCredits.textContent = result.credits;
  remainingModules.textContent = totalModules - result.gradedModules;
  progressFill.style.width = `${result.gpa === null ? 0 : (result.gpa / 4) * 100}%`;

  if (result.gpa === null) scoreMessage.textContent = "Choose a grade below to begin.";
  else if (result.gpa >= 3.5) scoreMessage.textContent = "Excellent standing — keep the momentum.";
  else if (result.gpa >= 3) scoreMessage.textContent = "Strong progress toward your goal.";
  else if (result.gpa >= 2) scoreMessage.textContent = "You’re building a steady foundation.";
  else scoreMessage.textContent = "Every module is a chance to lift your GPA.";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

searchInput.addEventListener("input", (event) => renderModules(event.target.value));

document.querySelector("#resetButton").addEventListener("click", () => {
  Object.keys(grades).forEach((key) => delete grades[key]);
  localStorage.removeItem(STORAGE_KEY);
  renderModules(searchInput.value);
  updateScore();
  showToast("All grades reset");
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  const result = calculate();
  const summary = result.gpa === null
    ? "HF2IG GPA Calculator: No grades entered yet."
    : `HF2IG GPA: ${result.gpa.toFixed(2)} / 4.00 (${result.credits} graded credits)`;
  try {
    await navigator.clipboard.writeText(summary);
    showToast("GPA summary copied");
  } catch {
    showToast("Could not access clipboard");
  }
});

renderModules();
updateScore();
