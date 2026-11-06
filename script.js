const STORAGE_KEY = "ironLogWorkouts";

const exercises = [
  "ベンチプレス",
  "スクワット",
  "デッドリフト",
  "インクラインダンベルプレス",
  "ダンベルフライ",
  "ラットプルダウン",
  "シーテッドロー",
  "ショルダープレス",
  "レッグプレス",
  "その他"
];

const homeScreen = document.getElementById("homeScreen");
const workoutScreen = document.getElementById("workoutScreen");
const exerciseList = document.getElementById("exerciseList");
const workoutDate = document.getElementById("workoutDate");

let workoutNumber = 0;

function getWorkouts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function showHome() {
  homeScreen.hidden = false;
  workoutScreen.hidden = true;
}

function showWorkout() {
  homeScreen.hidden = true;
  workoutScreen.hidden = false;
}
function getPreviousExercise(name) {
  const workouts = getWorkouts();

  const matches = workouts
    .filter(workout =>
      workout.date <= workoutDate.value &&
      workout.exercises.some(exercise => exercise.name === name)
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  if (matches.length === 0) return null;

  const workout = matches[0];

  return {
    date: workout.date,
    exercise: workout.exercises.find(exercise => exercise.name === name)
  };
}

function updatePreviousRecord(card) {
  const name = card.querySelector(".exercise-name").value;
  const display = card.querySelector(".previous-record");
  const previous = getPreviousExercise(name);

  display.replaceChildren();

  const heading = document.createElement("div");
  heading.className = "previous-heading";
  const title = document.createElement("h3");
  title.textContent = "前回の記録";
  heading.appendChild(title);
  display.appendChild(heading);

  if (!previous) {
    const empty = document.createElement("p");
    empty.className = "previous-empty";
    empty.textContent = "前回の記録なし";
    display.appendChild(empty);
    return;
  }

  const date = document.createElement("time");
  date.dateTime = previous.date;
  date.textContent = previous.date.replaceAll("-", "/");
  heading.appendChild(date);

  const table = document.createElement("table");
  table.className = "previous-table";
  const caption = document.createElement("caption");
  caption.className = "sr-only";
  caption.textContent = name + "の前回の記録";
  table.appendChild(caption);
  const head = table.createTHead().insertRow();
  ["セット", "重量", "回数"].forEach(label => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    head.appendChild(cell);
  });
  const body = table.createTBody();
  previous.exercise.sets.forEach((set, index) => {
    const row = body.insertRow();
    [String(index + 1).padStart(2, "0"), set.weight + " kg", set.reps + " 回"].forEach(value => {
      row.insertCell().textContent = value;
    });
  });
  display.appendChild(table);
}

function createExercise() {
  const card = document.createElement("div");
  card.className = "exercise-card";

  const options = exercises.map(name =>
    `<option value="${name}">${name}</option>`
  ).join("");

  card.innerHTML = `
    <div class="exercise-title">
      <select class="exercise-name" aria-label="種目">${options}</select>
      <button class="remove-button remove-exercise">削除</button>
    </div>
    <section class="previous-record" aria-live="polite"></section>
    <div class="current-record">
      <h3>今回の記録 <span>入力</span></h3>
      <p class="input-help">今回の重量と回数を入力してください。</p>
      <div class="sets"></div>
    </div>
    <button class="secondary-button add-set">
      ＋ セットを追加
    </button>
  `;

  exerciseList.appendChild(card);
  addSet(card);
  updatePreviousRecord(card);
}

function addSet(card) {
  const sets = card.querySelector(".sets");
  const number = sets.children.length + 1;

  const row = document.createElement("div");
  row.className = "set-row";

  row.innerHTML = `
    <span class="set-number">${number}</span>
    <label class="set-field">重量 <span class="unit">kg</span>
      <input class="weight" type="number" inputmode="decimal"
        min="0" step="0.5" placeholder="0">
    </label>
    <label class="set-field">回数 <span class="unit">回</span>
      <input class="reps" type="number" inputmode="numeric"
        min="1" step="1" placeholder="0">
    </label>
    <button class="remove-button remove-set" aria-label="セットを削除">×</button>
  `;

  sets.appendChild(row);
}

function updateHistory() {
  const workouts = getWorkouts();

  document.getElementById("historyCount").textContent =
    workouts.length + " 回";

  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  if (workouts.length === 0) {
    historyList.textContent = "まだ記録がありません。";
    historyList.className = "muted";
    return;
  }

  historyList.className = "";

  workouts.slice().reverse().slice(0, 10).forEach(workout => {
    const item = document.createElement("div");
    item.className = "history-item";

    const date = document.createElement("strong");
    date.textContent = workout.date;

    const detail = document.createElement("p");
    detail.textContent = workout.exercises
      .map(exercise => {
        const sets = exercise.sets
          .map(set => `${set.weight}kg × ${set.reps}回`)
          .join(" / ");
        return `${exercise.name}: ${sets}`;
      })
      .join(" | ");

    item.append(date, detail);
    historyList.appendChild(item);
  });
}

exerciseList.addEventListener("change", event => {
  if (event.target.classList.contains("exercise-name")) {
    const card = event.target.closest(".exercise-card");
    updatePreviousRecord(card);
  }
});

workoutDate.addEventListener("change", () => {
  exerciseList.querySelectorAll(".exercise-card").forEach(card => {
    updatePreviousRecord(card);
  });
});
document.getElementById("startButton").addEventListener("click", () => {
  exerciseList.innerHTML = "";
  workoutDate.value = new Date().toLocaleDateString("en-CA");
  createExercise();
  showWorkout();
});

document.getElementById("backButton").addEventListener("click", showHome);

document.getElementById("addExerciseButton").addEventListener("click", () => {
  createExercise();
});

exerciseList.addEventListener("click", event => {
  const card = event.target.closest(".exercise-card");
  if (!card) return;

  if (event.target.classList.contains("add-set")) {
    addSet(card);
  }

  if (event.target.classList.contains("remove-set")) {
    event.target.closest(".set-row").remove();

    card.querySelectorAll(".set-row .set-number").forEach((span, index) => {
      span.textContent = index + 1;
    });
  }

  if (event.target.classList.contains("remove-exercise")) {
    card.remove();
  }
});

document.getElementById("saveButton").addEventListener("click", () => {
  const cards = [...exerciseList.querySelectorAll(".exercise-card")];

  if (!workoutDate.value || cards.length === 0) {
    alert("日付と種目を入力してください。");
    return;
  }

  const recordedExercises = [];

  for (const card of cards) {
    const name = card.querySelector(".exercise-name").value;
    const rows = [...card.querySelectorAll(".set-row")];

    const sets = [];

    for (const row of rows) {
      const weight = row.querySelector(".weight").value;
      const reps = row.querySelector(".reps").value;

      if (weight === "" || reps === "" ||
          Number(weight) < 0 || Number(reps) <= 0) {
        alert(`${name}の重量と回数を正しく入力してください。`);
        return;
      }

      sets.push({
        weight: Number(weight),
        reps: Number(reps)
      });
    }

    if (sets.length === 0) {
      alert(`${name}にセットを追加してください。`);
      return;
    }

    recordedExercises.push({ name, sets });
  }

  const workouts = getWorkouts();

  workouts.push({
    id: Date.now(),
    date: workoutDate.value,
    exercises: recordedExercises
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    alert("保存できませんでした。ブラウザの空き容量を確認してください。");
    return;
  }

  alert("トレーニング記録を保存しました！");
  updateHistory();
  showHome();
});

updateHistory();