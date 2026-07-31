const termPlan = [
  { term: "Term 1", colour: "green", modules: [
    ["Generative AI", "GENAI", 3], ["AI Web Development", "AIWEB", 3]
  ]},
  { term: "Term 2", colour: "violet", modules: [
    ["Software Development Practices", "IT43001FP", 3], ["Programming 2", "PROG2", 3],
    ["Immersive Environment Development", "IMMENV", 3], ["{TRACK} 1", "TRACK1", 2, "track"]
  ]},
  { term: "Term 3", colour: "blue", modules: [
    ["Gamification Concept", "GD43001FP", 3], ["Game Programming", "GD43002FP", 3],
    ["Game Assets Creation", "GD43003FP", 3]
  ]},
  { term: "Term 4", colour: "peach", modules: [
    ["Game Development", "GD43004FP", 3], ["Game Level Production", "GD43005FP", 3],
    ["Service Excellence Technology", "SERVTECH", 3], ["{TRACK} 2", "TRACK2", 2, "track"]
  ]},
  { term: "Terms 5 & 6", colour: "yellow", modules: [
    ["Industry Attachment", "GD53006FPE", 8]
  ]},
  { term: "Term 7", colour: "blue", modules: [
    ["Geospatial Applications", "GD53003FP", 3], ["Immersive Applications", "GD53002FP", 3],
    ["Robotic Process Automation", "RPA", 3]
  ]},
  { term: "Term 8", colour: "green", modules: [
    ["Built Environment Visualisation", "GD53001FP", 3], ["Humanoid Programming", "GD53004FP", 3],
    ["Design Thinking", "DDT", 3], ["{TRACK} 3", "TRACK3", 2, "track"]
  ]}
];

const gradeOptions = [["", "Not graded"], ["4", "A · 4.0"], ["3", "B · 3.0"], ["2", "C · 2.0"], ["1", "D · 1.0"], ["0", "F · 0.0"], ["x", "Exempt"]];
const passFailOptions = [["", "Not completed"], ["pass", "Satisfactory"], ["fail", "Unsatisfactory"]];
const examModules = new Set(["IT43001FP", "GD43001FP", "GD43002FP", "GD43003FP", "GD43004FP"]);
const STORAGE_KEY = "hf2ig-term-gpa-v2";
function readSavedState() {
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(`${STORAGE_KEY}=`));
  if (cookie) {
    try { return JSON.parse(decodeURIComponent(cookie.slice(STORAGE_KEY.length + 1))); }
    catch { /* Fall through to browser storage. */ }
  }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
const saved = readSavedState();
const state = { pathway: saved.pathway || "ppd", results: saved.results || {} };

const groupContainer = document.querySelector("#moduleGroups");
const gpaValue = document.querySelector("#gpaValue");
const completedCredits = document.querySelector("#completedCredits");
const remainingModules = document.querySelector("#remainingModules");
const progressFill = document.querySelector("#progressFill");
const scoreMessage = document.querySelector("#scoreMessage");
const searchInput = document.querySelector("#moduleSearch");
const emptyState = document.querySelector("#emptyState");
const toast = document.querySelector("#toast");
const pathwayDescription = document.querySelector("#pathwayDescription");
const targetGpaInput = document.querySelector("#targetGpa");
const targetResult = document.querySelector("#targetResult");
const scenarioModule = document.querySelector("#scenarioModule");
const scenarioGrade = document.querySelector("#scenarioGrade");
const scenarioResult = document.querySelector("#scenarioResult");

function displayModule(module) {
  const [rawName, rawCode, credits, type] = module;
  const trackName = state.pathway === "ppd" ? "PPD" : "LFS";
  return {
    name: rawName.replace("{TRACK}", trackName),
    code: type === "track" ? `${trackName}${rawCode.slice(-1)}` : rawCode,
    storageCode: rawCode,
    credits,
    hasExam: examModules.has(rawCode),
    passFail: type === "track" && state.pathway === "lfs"
  };
}

function renderModules(filter = "") {
  groupContainer.innerHTML = "";
  const query = filter.trim().toLowerCase();
  let visibleCount = 0;

  termPlan.forEach((term, termIndex) => {
    const matches = term.modules.map(displayModule).filter((module) => `${module.name} ${module.code}`.toLowerCase().includes(query));
    if (!matches.length) return;
    visibleCount += matches.length;

    const section = document.createElement("section");
    section.className = `module-group term-group term-${term.colour}`;
    section.innerHTML = `
      <div class="group-header">
        <span class="group-code">${term.term}</span>
        <span class="group-title">${matches.length} module${matches.length === 1 ? "" : "s"}</span>
        <span class="group-credits">${matches.reduce((sum, item) => sum + item.credits, 0)} curriculum credits</span>
      </div>
      <div class="module-list"></div>`;

    const list = section.querySelector(".module-list");
    matches.forEach((module, index) => {
      const options = (module.passFail ? passFailOptions : gradeOptions).map(([value, label]) =>
        `<option value="${value}" ${String(state.results[module.storageCode] ?? "") === value ? "selected" : ""}>${label}</option>`
      ).join("");
      const row = document.createElement("div");
      row.className = "module-row";
      row.innerHTML = `
        <span class="module-number">${index + 1}</span>
        <span class="module-name">${module.name}${module.hasExam ? '<small class="exam-badge">Exam</small>' : ""}${module.passFail ? '<small class="pf-badge">Satisfactory / Unsatisfactory · Not in GPA</small>' : ""}</span>
        <span class="module-credit"><b>${module.credits}</b> credit${module.credits === 1 ? "" : "s"}</span>
        <select class="grade-select ${module.passFail ? "pass-fail" : ""}" data-code="${module.storageCode}" aria-label="Result for ${module.name}">${options}</select>`;
      list.appendChild(row);
    });
    const summary = document.createElement("div");
    summary.className = "term-summary";
    summary.dataset.termIndex = termIndex;
    summary.innerHTML = `
      <span><small>Current GPA</small><b class="term-gpa">—</b></span>
      <span><small>Cumulative GPA</small><b class="cumulative-gpa">—</b></span>`;
    list.appendChild(summary);
    groupContainer.appendChild(section);
  });

  emptyState.hidden = visibleCount > 0;
  bindSelects();
  updateTermSummaries();
}

function bindSelects() {
  document.querySelectorAll(".grade-select").forEach((select) => select.addEventListener("change", (event) => {
    const { code } = event.target.dataset;
    if (event.target.value === "") delete state.results[code];
    else state.results[code] = event.target.value;
    save();
    updateScore();
  }));
}

function calculate() {
  let points = 0, credits = 0, gradedModules = 0;
  termPlan.forEach((term) => term.modules.map(displayModule).forEach((module) => {
    if (module.passFail) return;
    const result = state.results[module.storageCode];
    if (result !== undefined && result !== "" && result !== "x") {
      points += Number(result) * module.credits;
      credits += module.credits;
      gradedModules += 1;
    }
  }));
  return { gpa: credits ? points / credits : null, points, credits, gradedModules };
}

function gradedModules() {
  return termPlan.flatMap((term) => term.modules.map(displayModule)).filter((module) => !module.passFail);
}

function updateTargetPlanner() {
  const target = Number(targetGpaInput.value);
  if (!Number.isFinite(target) || target < 0 || target > 4) {
    targetResult.textContent = "Enter a target between 0.00 and 4.00.";
    return;
  }
  const current = calculate();
  const eligibleCredits = gradedModules().reduce((sum, module) => state.results[module.storageCode] === "x" ? sum : sum + module.credits, 0);
  const remainingCredits = Math.max(0, eligibleCredits - current.credits);
  const pointsNeeded = (target * eligibleCredits) - current.points;

  if (!remainingCredits) {
    targetResult.innerHTML = current.gpa !== null && current.gpa >= target
      ? `Target achieved. Final GPA: <strong>${current.gpa.toFixed(2)}</strong>`
      : `No remaining graded credits. Current GPA: <strong>${current.gpa === null ? "—" : current.gpa.toFixed(2)}</strong>`;
    return;
  }
  const requiredAverage = pointsNeeded / remainingCredits;
  if (requiredAverage <= 0) {
    targetResult.innerHTML = `Your target is already secured, even before the remaining <strong>${remainingCredits} credits</strong>.`;
  } else if (requiredAverage > 4) {
    targetResult.innerHTML = `This target is not currently reachable; it would require an average above <strong>4.00</strong>.`;
  } else {
    targetResult.innerHTML = `You need an average grade point of <strong>${requiredAverage.toFixed(2)}</strong> across ${remainingCredits} remaining credits.`;
  }
}

function populateScenarioModules() {
  const previous = scenarioModule.value;
  scenarioModule.innerHTML = gradedModules().map((module) => `<option value="${module.storageCode}">${module.name}</option>`).join("");
  if ([...scenarioModule.options].some((option) => option.value === previous)) scenarioModule.value = previous;
  updateScenario();
}

function updateScenario() {
  const module = gradedModules().find((item) => item.storageCode === scenarioModule.value);
  if (!module) { scenarioResult.textContent = "Select a module and grade."; return; }
  const possibleGrade = Number(scenarioGrade.value);
  const current = calculate();
  const currentValue = state.results[module.storageCode];
  const hasCurrentGrade = currentValue !== undefined && currentValue !== "" && currentValue !== "x";
  const projectedPoints = current.points - (hasCurrentGrade ? Number(currentValue) * module.credits : 0) + possibleGrade * module.credits;
  const projectedCredits = current.credits + (hasCurrentGrade ? 0 : module.credits);
  const projectedGpa = projectedCredits ? projectedPoints / projectedCredits : null;
  const delta = current.gpa === null || projectedGpa === null ? null : projectedGpa - current.gpa;
  const deltaText = delta === null ? "first projected result" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} change`;
  scenarioResult.innerHTML = `Projected cumulative GPA: <strong>${projectedGpa === null ? "—" : projectedGpa.toFixed(2)}</strong><br>${deltaText}`;
}

function updateTermSummaries() {
  let cumulativePoints = 0;
  let cumulativeCredits = 0;
  termPlan.forEach((term, termIndex) => {
    let termPoints = 0;
    let termCredits = 0;
    term.modules.map(displayModule).forEach((module) => {
      if (module.passFail) return;
      const result = state.results[module.storageCode];
      if (result !== undefined && result !== "" && result !== "x") {
        termPoints += Number(result) * module.credits;
        termCredits += module.credits;
      }
    });
    cumulativePoints += termPoints;
    cumulativeCredits += termCredits;
    const summary = document.querySelector(`.term-summary[data-term-index="${termIndex}"]`);
    if (!summary) return;
    summary.querySelector(".term-gpa").textContent = termCredits ? (termPoints / termCredits).toFixed(2) : "—";
    summary.querySelector(".cumulative-gpa").textContent = cumulativeCredits ? (cumulativePoints / cumulativeCredits).toFixed(2) : "—";
  });
}

function updateScore() {
  const result = calculate();
  const totalGraded = state.pathway === "ppd" ? 21 : 18;
  gpaValue.textContent = result.gpa === null ? "—" : result.gpa.toFixed(2);
  completedCredits.textContent = result.credits;
  remainingModules.textContent = Math.max(0, totalGraded - result.gradedModules);
  progressFill.style.width = `${result.gpa === null ? 0 : (result.gpa / 4) * 100}%`;
  if (result.gpa === null) scoreMessage.textContent = "Choose a grade below to begin.";
  else if (result.gpa >= 3.5) scoreMessage.textContent = "Excellent standing — keep the momentum.";
  else if (result.gpa >= 3) scoreMessage.textContent = "Strong progress toward your goal.";
  else if (result.gpa >= 2) scoreMessage.textContent = "You’re building a steady foundation.";
  else scoreMessage.textContent = "Every graded module is a chance to lift your GPA.";
  updateTermSummaries();
  updateTargetPlanner();
  updateScenario();
}

function save() {
  const payload = JSON.stringify({
    pathway: state.pathway,
    results: state.results,
    calculation: calculate(),
    savedAt: new Date().toISOString()
  });
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(payload)}; Max-Age=31536000; Path=/hf2ig-gpa-calculator/; SameSite=Lax; Secure`;
  localStorage.setItem(STORAGE_KEY, payload);
}
function showToast(message) {
  toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelectorAll('input[name="pathway"]').forEach((radio) => {
  radio.checked = radio.value === state.pathway;
  radio.addEventListener("change", (event) => {
    state.pathway = event.target.value;
    ["TRACK1", "TRACK2", "TRACK3"].forEach((code) => delete state.results[code]);
    pathwayDescription.textContent = state.pathway === "ppd" ? "PPD modules are graded and count toward your GPA." : "LFS modules use Satisfactory/Unsatisfactory and do not affect your GPA.";
    save(); renderModules(searchInput.value); populateScenarioModules(); updateScore(); showToast("Pathway updated");
  });
});

searchInput.addEventListener("input", (event) => renderModules(event.target.value));
document.querySelector("#resetButton").addEventListener("click", () => {
  state.results = {}; save(); renderModules(searchInput.value); updateScore(); showToast("All results reset");
});
document.querySelector("#copyButton").addEventListener("click", async () => {
  const result = calculate();
  const route = state.pathway === "ppd" ? "O/N Level or DPP" : "Progression";
  const summary = result.gpa === null ? `HF2IG (${route}): No grades entered yet.` : `HF2IG GPA (${route}): ${result.gpa.toFixed(2)} / 4.00 (${result.credits} graded credits)`;
  try { await navigator.clipboard.writeText(summary); showToast("GPA summary copied"); }
  catch { showToast("Could not access clipboard"); }
});

targetGpaInput.addEventListener("input", updateTargetPlanner);
scenarioModule.addEventListener("change", updateScenario);
scenarioGrade.addEventListener("change", updateScenario);

document.querySelector("#exportBackup").addEventListener("click", () => {
  const backup = {
    app: "HF2IG GPA Calculator",
    version: 3,
    pathway: state.pathway,
    results: state.results,
    calculation: calculate(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hf2ig-gpa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Backup downloaded");
});

document.querySelector("#importBackup").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (!['ppd', 'lfs'].includes(backup.pathway) || !backup.results || typeof backup.results !== "object") throw new Error("Invalid backup");
    const allowedResults = new Set(["0", "1", "2", "3", "4", "x", "pass", "fail"]);
    state.pathway = backup.pathway;
    state.results = Object.fromEntries(Object.entries(backup.results).filter(([, value]) => allowedResults.has(String(value))));
    document.querySelectorAll('input[name="pathway"]').forEach((radio) => { radio.checked = radio.value === state.pathway; });
    pathwayDescription.textContent = state.pathway === "ppd" ? "PPD modules are graded and count toward your GPA." : "LFS modules use Satisfactory/Unsatisfactory and do not affect your GPA.";
    save(); renderModules(searchInput.value); populateScenarioModules(); updateScore(); showToast("Backup restored");
  } catch {
    showToast("That backup file could not be restored");
  } finally {
    event.target.value = "";
  }
});

pathwayDescription.textContent = state.pathway === "ppd" ? "PPD modules are graded and count toward your GPA." : "LFS modules use Satisfactory/Unsatisfactory and do not affect your GPA.";
renderModules(); populateScenarioModules(); updateScore();
