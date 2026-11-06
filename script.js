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

let activeDate = "";
let baseline = "";
let savedDay = false;

function setValues(card) {
  return JSON.stringify([...card.querySelectorAll(".set-row")].map(row => [row.querySelector(".weight").value, row.querySelector(".reps").value]));
}

function draftValues() {
  return JSON.stringify([...exerciseList.children].map(card => [card.dataset.name, setValues(card)]));
}

function initializeSets(card, savedExercise = null) {
  const previous = getPreviousExercise(card.querySelector(".exercise-name").value);
  const source = savedExercise?.sets ?? previous?.exercise.sets;
  card.querySelector(".sets").replaceChildren();
  (source?.length ? source : [null]).forEach(set => {
    addSet(card);
    const row = card.querySelector(".sets").lastElementChild;
    row.querySelector(".weight").value = set?.weight ?? "";
    row.querySelector(".reps").value = savedExercise ? (set?.reps ?? "") : "";
  });
  card.dataset.name = card.querySelector(".exercise-name").value;
  card.dataset.baseline = setValues(card);
  updatePreviousRecord(card);
}

function renderDate(names = [exercises[0]]) {
  const records = getWorkouts().filter(workout => workout.date === workoutDate.value);
  savedDay = records.length > 0;
  exerciseList.replaceChildren();
  if (savedDay) {
    records.forEach(workout => workout.exercises.forEach(exercise => createExercise(exercise.name, exercise)));
  } else {
    names.forEach(name => createExercise(name));
  }
  exerciseList.querySelectorAll("input, select, button").forEach(control => { control.disabled = savedDay; });
  document.getElementById("addExerciseButton").disabled = savedDay;
  document.getElementById("saveButton").disabled = savedDay;
  document.getElementById("workoutNotice").textContent = savedDay
    ? "この日付には保存済みの記録があります。既存の当日記録を参照表示しています。重複保存・上書きはできません。新しい記録は別の日付を選択してください。"
    : "前回のセット数と重量を引き継いでいます。今回の回数を入力してください。";
  if (savedDay) {
    exerciseList.querySelectorAll(".current-record h3").forEach(title => { title.textContent = "保存済みの当日記録"; });
    exerciseList.querySelectorAll(".input-help").forEach(help => { help.textContent = "保存済み記録の参照表示です。"; });
    exerciseList.querySelectorAll(".reps-current .reps-caption").forEach(label => { label.textContent = "当日"; });
  }
  activeDate = workoutDate.value;
  baseline = draftValues();
}


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
      workout.date < workoutDate.value &&
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

function updatePreviousReps(card, previous = getPreviousExercise(card.querySelector(".exercise-name").value)) {
  card.querySelectorAll(".set-row").forEach((row, index) => {
    const reps = previous?.exercise.sets[index]?.reps;
    const display = row.querySelector(".previous-reps");
    display.textContent = reps ?? "－";
    display.setAttribute("aria-label", (index + 1) + "セット目の前回の回数：" + (reps == null ? "記録なし" : reps + "回"));
  });
}

function updatePreviousRecord(card) {
  const name = card.querySelector(".exercise-name").value;
  const display = card.querySelector(".previous-record");
  const previous = getPreviousExercise(name);

  updatePreviousReps(card, previous);
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

function createExercise(name = exercises[0], savedExercise = null) {
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
  const select = card.querySelector(".exercise-name");
  if (![...select.options].some(option => option.value === name)) {
    select.add(new Option(name, name));
  }
  select.value = name;
  initializeSets(card, savedExercise);
}

function addSet(card) {
  const sets = card.querySelector(".sets");
  const number = sets.children.length + 1;
  const previousWeight = sets.lastElementChild?.querySelector(".weight").value ?? "";

  const row = document.createElement("div");
  row.className = "set-row";

  row.innerHTML = `
    <span class="set-number">${number}</span>
    <label class="set-field">重量 <span class="unit">kg</span>
      <input class="weight" type="number" inputmode="decimal"
        min="0" step="0.5" placeholder="0">
    </label>
    <div class="set-field reps-field">回数 <span class="unit">回</span>
      <div class="reps-split">
        <div class="reps-reference"><span class="reps-caption">前回</span><span class="previous-reps">－</span></div>
        <label class="reps-current"><span class="reps-caption">今回</span>
          <input class="reps" type="number" inputmode="numeric"
            min="1" step="1" placeholder="0">
        </label>
      </div>
    </div>
    <button class="remove-button remove-set" aria-label="セットを削除">×</button>
  `;

  row.querySelector(".weight").value = previousWeight;
  sets.appendChild(row);
  updatePreviousReps(card);
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

  const historySnapshot = JSON.stringify(workouts);
  workouts.map((workout, index) => ({ workout, index })).reverse().slice(0, 10).forEach(({ workout, index }) => {
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

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "small-button edit-history";
    edit.textContent = "編集";
    edit.setAttribute("aria-label", workout.date + "のトレーニング記録を編集");
    edit.addEventListener("click", () => openHistoryEditor(index, historySnapshot));
    item.append(date, detail, edit);
    historyList.appendChild(item);
  });
}

exerciseList.addEventListener("change", event => {
  if (!event.target.classList.contains("exercise-name")) return;
  const card = event.target.closest(".exercise-card");
  if (setValues(card) !== card.dataset.baseline &&
      !confirm("種目を変更すると、この種目の入力内容とセット構成を置き換えます。変更しますか？")) {
    event.target.value = card.dataset.name;
    return;
  }
  initializeSets(card);
});

workoutDate.addEventListener("change", () => {
  if (workoutDate.value === activeDate) return;
  if (!workoutDate.value || (!savedDay && draftValues() !== baseline &&
      !confirm("日付を変更すると、入力中の内容とセット構成を置き換えます。変更しますか？"))) {
    workoutDate.value = activeDate;
    return;
  }
  const names = [...exerciseList.children].map(card => card.dataset.name);
  renderDate(names.length ? names : [exercises[0]]);
});
document.getElementById("startButton").addEventListener("click", () => {
  if (!activeDate) {
    workoutDate.value = new Date().toLocaleDateString("en-CA");
    renderDate();
  }
  showWorkout();
});

document.getElementById("backButton").addEventListener("click", showHome);

document.getElementById("addExerciseButton").addEventListener("click", () => {
  if (!savedDay) createExercise();
});

exerciseList.addEventListener("click", event => {
  const card = event.target.closest(".exercise-card");
  if (!card || savedDay) return;

  if (event.target.classList.contains("add-set")) {
    addSet(card);
  }

  if (event.target.classList.contains("remove-set")) {
    event.target.closest(".set-row").remove();

    card.querySelectorAll(".set-row .set-number").forEach((span, index) => {
      span.textContent = index + 1;
    });
    updatePreviousReps(card);
  }

  if (event.target.classList.contains("remove-exercise")) {
    card.remove();
  }
});

document.getElementById("saveButton").addEventListener("click", () => {
  if (getWorkouts().some(workout => workout.date === workoutDate.value)) {
    alert("この日付には保存済みの記録があります。重複保存・上書きは行いません。入力内容は保持しています。");
    return;
  }
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
  activeDate = "";
  showHome();
});

// Backups read storage directly so read failures are not mistaken for empty history.
function createBackup() {
  let workouts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    workouts = JSON.parse(raw);
    if (!Array.isArray(workouts)) throw new Error("Invalid workout data");
  } catch {
    throw new Error("保存データを読み取れませんでした。ブラウザのアクセス制限やデータの状態を確認してください。元のデータは変更していません。");
  }
  if (workouts.length === 0) return null;
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const payload = { app: "IRON-LOG", formatVersion: 1, exportedAt: now.toISOString(), workouts };
  return {
    filename: "IRON-LOG-backup-" + date + ".json",
    blob: new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  };
}

function downloadBackup(backup) {
  const url = URL.createObjectURL(backup.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backup.filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Safari may read the Blob after the click handler has returned.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

async function exportBackup(preferShare) {
  const status = document.getElementById("backupStatus");
  const buttons = [document.getElementById("backupButton"), document.getElementById("downloadBackupButton")];
  buttons.forEach(button => { button.disabled = true; });
  status.textContent = "";
  try {
    const backup = createBackup();
    if (!backup) {
      status.textContent = "バックアップできる保存済みのトレーニング記録がありません。";
      return;
    }
    let file;
    let canShare = false;
    if (preferShare && window.isSecureContext && typeof File === "function" &&
        typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      try {
        file = new File([backup.blob], backup.filename, { type: "application/json" });
        canShare = navigator.canShare({ files: [file] });
      } catch {
        canShare = false;
      }
    }
    if (canShare) {
      try {
        await navigator.share({ files: [file] });
        status.textContent = "共有操作が完了しました。保存先にJSONファイルがあることを確認してください。";
      } catch (error) {
        status.textContent = error.name === "AbortError"
          ? "共有がキャンセルされたか、共有先を利用できませんでした。再度保存するか「JSONをダウンロード」をお試しください。"
          : "共有できませんでした。「JSONをダウンロード」から保存できます。";
      }
    } else {
      downloadBackup(backup);
      status.textContent = "JSONのダウンロードを開始しました。保存先を確認してください。内容が表示された場合は共有メニューから「ファイルに保存」を選んでください。";
    }
  } catch (error) {
    status.textContent = error.message || "バックアップを書き出せませんでした。もう一度お試しください。";
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}

document.getElementById("backupButton").addEventListener("click", () => exportBackup(true));
document.getElementById("downloadBackupButton").addEventListener("click", () => exportBackup(false));

const restoreFile = document.getElementById("restoreFile");
const restorePreview = document.getElementById("restorePreview");
const restoreConfirm = document.getElementById("restoreConfirmButton");
const restoreAck = document.getElementById("restoreAcknowledged");
const restoreCancel = document.getElementById("restoreCancelButton");
const restoreStatus = document.getElementById("restoreStatus");
let pendingRestore = null;
let restoreReadVersion = 0;

function validateBackup(data) {
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  const invalid = () => { throw new Error("対応していない形式、または記録データに不備があるバックアップです。"); };
  if (!object(data) || data.app !== "IRON-LOG" || data.formatVersion !== 1 ||
      typeof data.exportedAt !== "string" || !Number.isFinite(Date.parse(data.exportedAt)) ||
      new Date(data.exportedAt).toISOString() !== data.exportedAt || !Array.isArray(data.workouts)) invalid();
  for (const workout of data.workouts) {
    if (!object(workout) || !Number.isSafeInteger(workout.id) || workout.id < 0 || !date(workout.date) ||
        !Array.isArray(workout.exercises) || workout.exercises.length === 0) invalid();
    for (const exercise of workout.exercises) {
      if (!object(exercise) || typeof exercise.name !== "string" || exercise.name.trim() === "" ||
          !Array.isArray(exercise.sets) || exercise.sets.length === 0) invalid();
      for (const set of exercise.sets) {
        if (!object(set) || typeof set.weight !== "number" || !Number.isFinite(set.weight) || set.weight < 0 ||
            !Number.isSafeInteger(set.reps) || set.reps <= 0) invalid();
      }
    }
  }
  return data;
}

function resetRestore(message = "") {
  restoreReadVersion++;
  pendingRestore = null;
  restoreFile.value = "";
  restorePreview.hidden = true;
  restoreAck.checked = false;
  restoreConfirm.disabled = true;
  restoreCancel.hidden = true;
  restoreStatus.textContent = message;
}

restoreFile.addEventListener("change", async () => {
  const file = restoreFile.files[0];
  resetRestore();
  if (!file) return;
  const version = restoreReadVersion;
  restoreCancel.hidden = false;
  restoreStatus.textContent = "バックアップを読み込んでいます…";
  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("ファイルを読み込めませんでした。もう一度選択してください。"));
      reader.onabort = () => reject(new Error("ファイルの読み込みを中止しました。"));
      reader.readAsText(file, "UTF-8");
    });
    if (version !== restoreReadVersion) return;
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("JSONとして読み込めません。ファイルが破損していないか確認してください。"); }
    validateBackup(data);
    const original = localStorage.getItem(STORAGE_KEY);
    const current = original === null ? [] : JSON.parse(original);
    if (!Array.isArray(current)) throw new Error("現在の保存データを確認できないため、復元を中止しました。");
    pendingRestore = { data, original };
    const summary = document.getElementById("restoreSummary");
    summary.replaceChildren();
    [["バックアップ日時", new Date(data.exportedAt).toLocaleString("ja-JP")], ["現在の記録", current.length + " 件"], ["復元対象の記録", data.workouts.length + " 件"]].forEach(([label, value]) => {
      const term = document.createElement("dt"); term.textContent = label;
      const detail = document.createElement("dd"); detail.textContent = value;
      summary.append(term, detail);
    });
    restorePreview.hidden = false;
    restoreStatus.textContent = "検証が完了しました。まだ保存データは変更していません。";
  } catch (error) {
    if (version === restoreReadVersion) resetRestore((error.message || "読み込みに失敗しました。") + " 既存データは変更していません。");
  }
});
restoreAck.addEventListener("change", () => {
  restoreConfirm.disabled = !pendingRestore || restorePreview.hidden || !restoreAck.checked;
});
restoreCancel.addEventListener("click", () => resetRestore("復元をキャンセルしました。既存データは変更していません。"));
restoreFile.addEventListener("cancel", () => resetRestore("ファイル選択をキャンセルしました。既存データは変更していません。"));
restoreConfirm.addEventListener("click", () => {
  if (!pendingRestore || restorePreview.hidden || !restoreAck.checked) return;
  if (!confirm("最終確認：現在の全記録をバックアップの内容で置き換えます。この操作で元の記録と入力途中の内容は失われます。現在のバックアップが必要ならキャンセルしてください。復元を実行しますか？")) return;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== pendingRestore.original) {
      resetRestore("確認中に保存データが変わりました。安全のため中止しました。ファイルを選び直してください。");
      return;
    }
    // setItem is atomic: if it throws, the previous value remains unchanged.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingRestore.data.workouts));
  } catch {
    restoreStatus.textContent = "復元を書き込めませんでした。成功していません。既存データは変更していません。容量やブラウザのアクセス制限を確認してください。";
    return;
  }
  activeDate = "";
  baseline = "";
  savedDay = false;
  exerciseList.replaceChildren();
  updateHistory();
  showHome();
  resetRestore("復元が完了しました。履歴を更新しました。");
});

const historyEditor = document.getElementById("historyEditor");
const editExercises = document.getElementById("historyEditExercises");
const editStatus = document.getElementById("historyEditStatus");
let historyEdit = null;

function editValues() {
  return JSON.stringify([...editExercises.children].map(card => [...card.querySelectorAll(".set-row")].map(row =>
    [row.querySelector(".weight").value, row.querySelector(".reps").value])));
}

function addHistoryEditSet(card, set = null) {
  const rows = card.querySelector(".edit-sets");
  const lastWeight = rows.lastElementChild?.querySelector(".weight").value ?? "";
  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML = '<span class="set-number"></span><label class="set-field">重量 kg<input class="weight" type="number" inputmode="decimal" min="0" step="0.5"></label><label class="set-field">回数<input class="reps" type="number" inputmode="numeric" min="1" step="1"></label><button class="remove-button edit-remove-set" type="button" aria-label="セットを削除">×</button>';
  row.querySelector(".weight").value = set ? set.weight : lastWeight;
  row.querySelector(".reps").value = set ? set.reps : "";
  rows.appendChild(row);
  rows.querySelectorAll(".set-number").forEach((number, index) => { number.textContent = index + 1; });
}

function openHistoryEditor(index, expectedSnapshot) {
  try {
    const original = localStorage.getItem(STORAGE_KEY);
    const workouts = JSON.parse(original);
    if (!Array.isArray(workouts) || JSON.stringify(workouts) !== expectedSnapshot || !workouts[index]) {
      alert("履歴が変更されています。最新の履歴を確認してから編集してください。");
      updateHistory();
      return;
    }
    historyEdit = { original, workouts, index };
    editExercises.replaceChildren();
    editStatus.textContent = "";
    document.getElementById("historyEditDate").textContent = "編集対象の日付：" + workouts[index].date;
    workouts[index].exercises.forEach(exercise => {
      const card = document.createElement("section"); card.className = "exercise-card";
      const title = document.createElement("h3"); title.textContent = exercise.name;
      const sets = document.createElement("div"); sets.className = "edit-sets";
      const add = document.createElement("button"); add.type = "button"; add.className = "secondary-button edit-add-set"; add.textContent = "＋ セットを追加";
      card.append(title, sets, add); editExercises.appendChild(card);
      exercise.sets.forEach(set => addHistoryEditSet(card, set));
    });
    historyEdit.baseline = editValues();
    historyEditor.showModal();
  } catch {
    historyEdit = null;
    alert("記録を読み込めませんでした。保存データは変更していません。");
  }
}

function cancelHistoryEdit() {
  if (historyEdit && editValues() !== historyEdit.baseline && !confirm("編集内容を破棄して閉じますか？保存済みの記録は変更されません。")) return;
  historyEditor.close();
}
historyEditor.addEventListener("cancel", event => { event.preventDefault(); cancelHistoryEdit(); });
historyEditor.addEventListener("close", () => { historyEdit = null; });
document.getElementById("historyEditCancel").addEventListener("click", cancelHistoryEdit);
window.addEventListener("beforeunload", event => {
  if (historyEdit && editValues() !== historyEdit.baseline) { event.preventDefault(); event.returnValue = ""; }
});
editExercises.addEventListener("click", event => {
  const card = event.target.closest(".exercise-card");
  if (!card) return;
  if (event.target.classList.contains("edit-add-set")) addHistoryEditSet(card);
  if (event.target.classList.contains("edit-remove-set")) {
    event.target.closest(".set-row").remove();
    card.querySelectorAll(".set-number").forEach((number, index) => { number.textContent = index + 1; });
  }
});
document.getElementById("historyEditSave").addEventListener("click", () => {
  if (!historyEdit || !historyEditor.open) return;
  editStatus.textContent = "";
  const target = historyEdit.workouts[historyEdit.index];
  const updated = { ...target, exercises: [] };
  for (const [index, card] of [...editExercises.children].entries()) {
    const sets = [];
    for (const row of card.querySelectorAll(".set-row")) {
      const weight = row.querySelector(".weight").value;
      const reps = row.querySelector(".reps").value;
      if (weight === "" || reps === "" || !Number.isFinite(Number(weight)) || Number(weight) < 0 ||
          !Number.isSafeInteger(Number(reps)) || Number(reps) <= 0) {
        editStatus.textContent = "重量は0以上、回数は1以上の整数で入力してください。空欄のセットは保存できません。";
        return;
      }
      sets.push({ ...target.exercises[index].sets[sets.length], weight: Number(weight), reps: Number(reps) });
    }
    if (!sets.length) { editStatus.textContent = "各種目に1セット以上必要です。"; return; }
    updated.exercises.push({ ...target.exercises[index], sets });
  }
  try {
    if (localStorage.getItem(STORAGE_KEY) !== historyEdit.original) {
      editStatus.textContent = "編集中に保存データが変更されました。上書きせず中止しました。編集内容は画面に保持しています。必要な値を控え、閉じて最新の履歴から編集し直してください。";
      return;
    }
    const workouts = historyEdit.workouts.slice();
    workouts[historyEdit.index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    editStatus.textContent = "保存できませんでした。元の記録は変更していません。編集内容は保持しています。容量やアクセス制限を確認してください。";
    return;
  }
  historyEditor.close();
  updateHistory();
  if (activeDate) {
    if (savedDay) {
      renderDate();
    } else if (draftValues() === baseline) {
      exerciseList.querySelectorAll(".exercise-card").forEach(card => initializeSets(card));
      baseline = draftValues();
    } else {
      exerciseList.querySelectorAll(".exercise-card").forEach(card => updatePreviousRecord(card));
    }
  }
});

updateHistory();