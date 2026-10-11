// 오늘의 격언 목록(영어): 영어 속담과 저작권이 만료된 고전의 말만 사용. 불분명하면 "Anonymous"
const QUOTES = [
  { text: "Well begun is half done.", author: "Anonymous" },
  { text: "Many a little makes a mickle.", author: "Anonymous" },
  { text: "Constant dripping wears away the stone.", author: "Anonymous" },
  { text: "A rolling stone gathers no moss.", author: "Anonymous" },
  { text: "Slow and steady wins the race.", author: "Anonymous" },
  { text: "Make haste slowly.", author: "Anonymous" },
  { text: "Strike while the iron is hot.", author: "Anonymous" },
  { text: "If at first you don't succeed, try, try again.", author: "Anonymous" },
  { text: "Rome was not built in a day.", author: "Anonymous" },
  { text: "Many hands make light work.", author: "Anonymous" },
  { text: "Practice makes perfect.", author: "Anonymous" },
  { text: "Little strokes fell great oaks.", author: "Anonymous" },
  { text: "A stitch in time saves nine.", author: "Anonymous" },
  { text: "Look before you leap.", author: "Anonymous" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "A tower nine stories high begins with a heap of earth.", author: "Lao Tzu" },
  { text: "Without accumulating small steps, you cannot travel a thousand miles.", author: "Xunzi" },
  { text: "Learning must never stop.", author: "Xunzi" },
  { text: "Is it not a pleasure to learn and to practice what you have learned?", author: "Confucius" },
  { text: "Learning without thought is labor lost; thought without learning is perilous.", author: "Confucius" },
  { text: "When three people walk together, one of them is sure to be my teacher.", author: "Confucius" },
  { text: "The wise person is slow to speak and quick to act.", author: "Confucius" },
  { text: "He who does not think about the distant future will find trouble close at hand.", author: "Confucius" },
  { text: "To know what you know and what you do not know, that is true knowledge.", author: "Confucius" },
  { text: "Digging a well nine fathoms deep is useless if you stop before reaching water.", author: "Mencius" },
  { text: "Youth does not come twice, and a day has no second dawn.", author: "Tao Yuanming" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Life is short, and the art is long.", author: "Hippocrates" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { text: "Remember that time is money.", author: "Benjamin Franklin" },
  { text: "Knowledge is power.", author: "Francis Bacon" },
  { text: "Blue is derived from the indigo plant, yet is bluer than indigo.", author: "Xunzi" },
];

// 상태: 이벤트 → state 변경 → render() 한 방향 흐름
const state = {
  categories: defaultCategories(),
  todos: [],
  ui: { filter: "all", lastCategoryId: "c1", quote: null },
};

// 처음 실행하거나 데이터가 손상됐을 때 쓰는 기본 카테고리
function defaultCategories() {
  return [
    { id: "c1", name: "업무", color: "#3b6fd4" },
    { id: "c2", name: "개인", color: "#2e9e6b" },
    { id: "c3", name: "공부", color: "#8a5cd0" },
  ];
}

const MAX_TEXT = 100;

// 현재 편집 중인 항목 (한 번에 하나): { id, listId }
let editing = null;
// 렌더 후 포커스를 돌려줄 대상: { listId, id, action }
let pendingFocus = null;
let todayIds = new Set();

// 브라우저 로컬 날짜를 YYYY-MM-DD로 반환 (toISOString은 UTC라 쓰지 않음)
function todayString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// randomUUID가 없는 환경(비보안 http)에서는 시간+난수로 대체
function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// 할 일 추가: 성공하면 true
function addTodo(text, categoryId, planToday) {
  const trimmed = String(text).trim().slice(0, MAX_TEXT);
  if (!trimmed) return false;
  state.todos.push({
    id: makeId(),
    text: trimmed,
    categoryId,
    done: false,
    plannedDate: planToday ? todayString() : null,
    createdAt: Date.now(),
    completedAt: null,
  });
  return true;
}

// 완료 토글: 완료 시각 기록/해제
function toggleDone(id) {
  const t = state.todos.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.completedAt = t.done ? Date.now() : null;
}

// 오늘 영역에 보이는 항목이면 빼고(null), 아니면 오늘 날짜로 지정
function toggleToday(id) {
  const t = state.todos.find((x) => x.id === id);
  if (!t) return;
  const inToday = getTodayTodos().some((x) => x.id === id);
  t.plannedDate = inToday ? null : todayString();
}

// 텍스트·카테고리 수정: 텍스트가 비면 아무것도 바꾸지 않고 false
function updateTodo(id, patch) {
  const t = state.todos.find((x) => x.id === id);
  if (!t) return false;
  let text = t.text;
  if (patch.text !== undefined) {
    text = String(patch.text).trim().slice(0, MAX_TEXT);
    if (!text) return false;
  }
  t.text = text;
  if (patch.categoryId !== undefined && state.categories.some((c) => c.id === patch.categoryId)) {
    t.categoryId = patch.categoryId;
  }
  return true;
}

// 확인 없이 즉시 삭제
function deleteTodo(id) {
  state.todos = state.todos.filter((x) => x.id !== id);
}

// 새 카테고리용 색 8가지 (기본 3개와 겹치지 않음, 흰 글씨 대비 4.5:1 이상)
const CATEGORY_COLORS = [
  "#c2410c", "#b4235a", "#0e7490", "#a16207",
  "#4d7c0f", "#be123c", "#4338ca", "#475569",
];
const MAX_CATEGORIES = 10;
const MAX_CATEGORY_NAME = 10;

// 비교용 이름: 공백 제거 + 소문자
function normalizeName(name) {
  return name.replace(/\s+/g, "").toLowerCase();
}

// 이름 규칙 검사: 문제가 있으면 이유 문자열, 없으면 null (exceptId는 자기 자신 제외)
function checkCategoryName(name, exceptId) {
  if (!name) return "카테고리 이름을 입력해 주세요.";
  if (name.length > MAX_CATEGORY_NAME) return `이름은 ${MAX_CATEGORY_NAME}자까지 쓸 수 있어요.`;
  const key = normalizeName(name);
  if (state.categories.some((c) => c.id !== exceptId && normalizeName(c.name) === key)) {
    return "이미 있는 카테고리 이름이에요.";
  }
  return null;
}

// 아직 쓰지 않은 색을 순서대로 배정 (모두 쓰였으면 순환)
function nextCategoryColor() {
  const used = new Set(state.categories.map((c) => c.color));
  return CATEGORY_COLORS.find((c) => !used.has(c)) ||
    CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length];
}

// 카테고리 추가: { ok, error }
function addCategory(name) {
  const trimmed = String(name).trim();
  if (state.categories.length >= MAX_CATEGORIES) {
    return { ok: false, error: `카테고리는 ${MAX_CATEGORIES}개까지 만들 수 있어요.` };
  }
  const error = checkCategoryName(trimmed, null);
  if (error) return { ok: false, error };
  state.categories.push({ id: "c" + makeId(), name: trimmed, color: nextCategoryColor() });
  return { ok: true };
}

function renameCategory(id, name) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return { ok: false, error: "카테고리를 찾을 수 없어요." };
  const trimmed = String(name).trim();
  const error = checkCategoryName(trimmed, id);
  if (error) return { ok: false, error };
  cat.name = trimmed;
  return { ok: true };
}

// 카테고리에 속한 항목 수 (없는 카테고리 항목은 첫 번째 카테고리 소속으로 계산)
function countInCategory(id) {
  return state.todos.filter((t) => getCategory(t.categoryId).id === id).length;
}

function deleteCategory(id) {
  if (state.categories.length <= 1) {
    return { ok: false, error: "카테고리는 최소 1개 남겨야 해요." };
  }
  const n = countInCategory(id);
  if (n > 0) return { ok: false, error: `이 카테고리에 항목 ${n}개가 있어요` };
  state.categories = state.categories.filter((c) => c.id !== id);
  if (state.ui.filter === id) state.ui.filter = "all";
  return { ok: true };
}

// 완료 항목 일괄 삭제: 삭제한 개수 반환
function clearDone() {
  const before = state.todos.length;
  state.todos = state.todos.filter((t) => !t.done);
  return before - state.todos.length;
}

// 진행률: scope는 "today", "all", 카테고리 id
function getProgress(scope) {
  let items;
  if (scope === "today") items = getTodayTodos();
  else if (scope === "all") items = state.todos;
  else items = state.todos.filter((t) => getCategory(t.categoryId).id === scope);
  const total = items.length;
  const done = items.filter((t) => t.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// 필터 탭에 맞는 항목인지
function matchesFilter(todo) {
  return state.ui.filter === "all" || getCategory(todo.categoryId).id === state.ui.filter;
}

// 오늘의 격언: 오늘 날짜에 저장된 번호가 범위 안이면 그대로, 아니면 무작위로 뽑아 저장
function getDailyQuote() {
  const q = state.ui.quote;
  const today = todayString();
  if (q && q.date === today && Number.isInteger(q.index) && q.index >= 0 && q.index < QUOTES.length) {
    return QUOTES[q.index];
  }
  const index = Math.floor(Math.random() * QUOTES.length);
  state.ui.quote = { date: today, index };
  save();
  return QUOTES[index];
}

// [다른 격언]: 현재와 다른 격언으로 바꾸고 그날은 유지
function nextQuote() {
  if (QUOTES.length < 2) return;
  const current = getDailyQuote();
  const cur = QUOTES.indexOf(current);
  let index;
  do {
    index = Math.floor(Math.random() * QUOTES.length);
  } while (index === cur);
  state.ui.quote = { date: todayString(), index };
  save();
  render();
}

// 오늘 계획 항목 + 지난 날짜의 미완료(이월) 항목
function getTodayTodos() {
  const today = todayString();
  return state.todos.filter(
    (t) => t.plannedDate === today || (t.plannedDate && t.plannedDate < today && !t.done)
  );
}

function getCategory(id) {
  // 없는 카테고리는 첫 번째로 대체
  return state.categories.find((c) => c.id === id) || state.categories[0];
}

// ---- 저장·복원 (localStorage 접근은 모두 try/catch) ----
const STORAGE_KEY = "todo-app:v1";
const BACKUP_KEY = "todo-app:v1:backup";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function showStorageWarning(show) {
  const el = document.getElementById("storage-warning");
  if (el) el.hidden = !show;
}

// state를 JSON으로 저장. 실패하면 경고 배너를 띄우고 메모리로 계속 동작
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      categories: state.categories,
      todos: state.todos,
      ui: {
        filter: state.ui.filter,
        lastCategoryId: state.ui.lastCategoryId,
        quote: state.ui.quote,
      },
    }));
    showStorageWarning(false);
  } catch (err) {
    showStorageWarning(true);
  }
}

// 저장 데이터를 검사·정리. 구조가 틀리면 null, 정리 중 버린 항목이 있으면 dropped=true
function sanitize(data) {
  if (!data || typeof data !== "object" || data.version !== 1) return null;
  if (!Array.isArray(data.categories) || !Array.isArray(data.todos)) return null;
  const categories = data.categories.filter((c) =>
    c && typeof c.id === "string" && c.id && typeof c.name === "string" && c.name &&
    typeof c.color === "string"
  ).map((c) => ({ id: c.id, name: c.name, color: c.color }));
  if (categories.length === 0) return null;
  const firstId = categories[0].id;
  const ids = new Set();
  let dropped = categories.length !== data.categories.length;
  const todos = [];
  data.todos.forEach((t) => {
    const text = t && typeof t.text === "string" ? t.text.trim().slice(0, MAX_TEXT) : "";
    if (!text || typeof t.id !== "string" || !t.id || ids.has(t.id)) { dropped = true; return; }
    ids.add(t.id);
    todos.push({
      id: t.id,
      text,
      // 없는 카테고리는 첫 번째로 이동
      categoryId: categories.some((c) => c.id === t.categoryId) ? t.categoryId : firstId,
      done: t.done === true,
      plannedDate: typeof t.plannedDate === "string" && DATE_RE.test(t.plannedDate) ? t.plannedDate : null,
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
      completedAt: t.done === true && Number.isFinite(t.completedAt) ? t.completedAt : null,
    });
  });
  const ui = data.ui && typeof data.ui === "object" ? data.ui : {};
  const has = (id) => categories.some((c) => c.id === id);
  return {
    dropped,
    data: {
      categories,
      todos,
      ui: {
        filter: ui.filter === "all" || has(ui.filter) ? ui.filter : "all",
        lastCategoryId: has(ui.lastCategoryId) ? ui.lastCategoryId : firstId,
        // 격언 번호·날짜 형식이 틀리면 버리고 새로 뽑게 함
        quote: ui.quote && typeof ui.quote.date === "string" && DATE_RE.test(ui.quote.date) &&
          Number.isInteger(ui.quote.index)
          ? { date: ui.quote.date, index: ui.quote.index } : null,
      },
    },
  };
}

function backupRaw(raw) {
  try { localStorage.setItem(BACKUP_KEY, raw); } catch (err) { /* 보관 실패는 무시 */ }
}

// localStorage에서 state 복원. 저장값이 없거나 손상되면 기본값으로 시작
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    showStorageWarning(true); // 저장소 접근 자체가 불가능
  }
  let result = null;
  if (raw !== null) {
    try { result = sanitize(JSON.parse(raw)); } catch (err) { result = null; }
    // 손상됐거나 일부를 버렸다면 원본을 보관
    if (!result || result.dropped) backupRaw(raw);
  }
  const data = result ? result.data
    : { categories: defaultCategories(), todos: [], ui: { filter: "all", lastCategoryId: "c1", quote: null } };
  state.categories = data.categories;
  state.todos = data.todos;
  state.ui.filter = data.ui.filter;
  state.ui.lastCategoryId = data.ui.lastCategoryId;
  state.ui.quote = data.ui.quote;
  editing = null;
  renamingCatId = null;
}

const els = {
  todayLabel: document.getElementById("today-label"),
  form: document.getElementById("add-form"),
  input: document.getElementById("todo-input"),
  select: document.getElementById("category-select"),
  planToday: document.getElementById("plan-today"),
  todayList: document.getElementById("today-list"),
  allList: document.getElementById("all-list"),
  todayCount: document.getElementById("today-count"),
  todayProgressText: document.getElementById("today-progress-text"),
  todayBar: document.getElementById("today-bar"),
  todayBarFill: document.getElementById("today-bar-fill"),
  allDoneMsg: document.getElementById("all-done-msg"),
  allProgressText: document.getElementById("all-progress-text"),
  categoryProgress: document.getElementById("category-progress"),
  tabs: document.getElementById("filter-tabs"),
  manageBtn: document.getElementById("cat-manage-btn"),
  catPanel: document.getElementById("cat-panel"),
  catForm: document.getElementById("cat-form"),
  catInput: document.getElementById("cat-input"),
  catMsg: document.getElementById("cat-msg"),
  catList: document.getElementById("cat-list"),
  clearDone: document.getElementById("clear-done"),
  quoteText: document.getElementById("quote-text"),
  quoteAuthor: document.getElementById("quote-author"),
  quoteNext: document.getElementById("quote-next"),
  exportBtn: document.getElementById("export-btn"),
  notice: document.getElementById("notice"),
  importBtn: document.getElementById("import-btn"),
  importFile: document.getElementById("import-file"),
};

const BEFORE_IMPORT_KEY = "todo-app:v1:before-import";
const MAX_IMPORT_BYTES = 1024 * 1024;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// 가져올 데이터 검사: 통과하면 { ok: true, data }(정해진 필드만 복사), 아니면 { ok: false, error }
function validateImport(data) {
  const fail = (error) => ({ ok: false, error });
  if (!data || typeof data !== "object" || Array.isArray(data)) return fail("최상위가 객체가 아님");
  if (data.version !== 1) return fail("version이 1이 아님");
  if (!Array.isArray(data.categories) || !Array.isArray(data.todos)) {
    return fail("categories 또는 todos가 배열이 아님");
  }
  if (data.categories.length < 1 || data.categories.length > MAX_CATEGORIES) {
    return fail(`카테고리 개수 오류: ${data.categories.length}개`);
  }
  const categories = [];
  const catIds = new Set();
  for (const [i, c] of data.categories.entries()) {
    if (!c || typeof c !== "object") return fail(`categories[${i}]가 객체가 아님`);
    if (typeof c.id !== "string" || !c.id || catIds.has(c.id)) return fail(`categories[${i}].id 오류 또는 중복`);
    if (typeof c.name !== "string" || c.name.length < 1 || c.name.length > MAX_CATEGORY_NAME) {
      return fail(`categories[${i}].name 길이 오류`);
    }
    if (typeof c.color !== "string" || !COLOR_RE.test(c.color)) return fail(`categories[${i}].color 형식 오류`);
    catIds.add(c.id);
    categories.push({ id: c.id, name: c.name, color: c.color });
  }
  const todos = [];
  const todoIds = new Set();
  for (const [i, t] of data.todos.entries()) {
    if (!t || typeof t !== "object") return fail(`todos[${i}]가 객체가 아님`);
    if (typeof t.id !== "string" || !t.id || todoIds.has(t.id)) return fail(`todos[${i}].id 오류 또는 중복`);
    if (typeof t.text !== "string" || t.text.length < 1 || t.text.length > MAX_TEXT) {
      return fail(`todos[${i}].text 길이 오류`);
    }
    if (typeof t.categoryId !== "string") return fail(`todos[${i}].categoryId가 문자열이 아님`);
    if (typeof t.done !== "boolean") return fail(`todos[${i}].done이 불리언이 아님`);
    if (t.plannedDate !== null && !(typeof t.plannedDate === "string" && DATE_RE.test(t.plannedDate))) {
      return fail(`todos[${i}].plannedDate 형식 오류`);
    }
    if (!Number.isFinite(t.createdAt)) return fail(`todos[${i}].createdAt이 숫자가 아님`);
    if (t.completedAt !== null && !Number.isFinite(t.completedAt)) return fail(`todos[${i}].completedAt 오류`);
    todoIds.add(t.id);
    todos.push({
      id: t.id,
      text: t.text,
      // 파일에 없는 카테고리는 첫 번째로 이동
      categoryId: catIds.has(t.categoryId) ? t.categoryId : categories[0].id,
      done: t.done,
      plannedDate: t.plannedDate,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    });
  }
  return { ok: true, data: { categories, todos } };
}

const IMPORT_FAIL_MESSAGE =
  "가져오기에 실패했어요. 내보내기로 만든 todo-backup 파일인지 확인해 주세요. 현재 데이터는 그대로예요.";

// 파일에서 데이터를 읽어 검사하고, 확인을 받아 현재 데이터를 모두 교체
async function importData(file) {
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error(`파일이 1MB 초과: ${file.size}바이트`);
    const result = validateImport(JSON.parse(await file.text()));
    if (!result.ok) throw new Error(`구조 검사 실패: ${result.error}`);
    const { categories, todos } = result.data;

    const summary = `항목 ${todos.length}개, 카테고리 ${categories.length}개`;
    if (!confirm(`현재 데이터를 이 파일의 내용으로 모두 바꿉니다. 계속할까요? (${summary})`)) return;

    // 바꾸기 직전 데이터를 한 번 보관 (보관 실패해도 가져오기는 진행)
    try {
      localStorage.setItem(BEFORE_IMPORT_KEY, JSON.stringify({
        version: 1,
        categories: state.categories,
        todos: state.todos,
        ui: state.ui,
      }));
    } catch (err) {
      console.warn("가져오기 전 데이터를 보관하지 못했어요:", err);
    }

    state.categories = categories;
    state.todos = todos;
    // ui는 그대로 두되 없는 카테고리를 가리키면 되돌림
    if (state.ui.filter !== "all" && !categories.some((c) => c.id === state.ui.filter)) {
      state.ui.filter = "all";
    }
    editing = null;
    renamingCatId = null;
    save();
    render();
    showNotice(`${summary}를 가져왔어요`, false);
  } catch (err) {
    console.error("가져오기 실패:", err);
    showNotice(IMPORT_FAIL_MESSAGE, true);
  }
}

// 하단 안내 문구를 3초간 보여 줌 (isError이면 오류 색)
let noticeTimer = null;
function showNotice(message, isError) {
  els.notice.textContent = message;
  els.notice.classList.toggle("error", Boolean(isError));
  els.notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { els.notice.hidden = true; }, 3000);
}

// 카테고리와 할 일을 JSON 파일로 내려받기 (ui는 제외, 저장소와 무관하게 메모리 데이터 사용)
function exportData() {
  let url = null;
  let link = null;
  try {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: state.categories,
      todos: state.todos,
    };
    const json = JSON.stringify(data, null, 2);
    const fileName = `todo-backup-${todayString()}.json`;
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    url = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    showNotice(`${fileName} 파일을 다운로드 폴더에 저장했어요. (브라우저 설정에 따라 위치가 다를 수 있어요)`, false);
  } catch (err) {
    showNotice("내보내기에 실패했어요. 브라우저의 다운로드 허용 설정을 확인해 주세요.", true);
  } finally {
    if (link) link.remove();
    // 다운로드가 시작될 시간을 준 뒤 임시 주소 해제
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// 카테고리 패널 상태: 안내 문구, 이름 변경 중인 카테고리 id
let catMessage = "";
let renamingCatId = null;
// 렌더 후 패널·탭에서 포커스를 돌려줄 대상 선택자
let pendingPanelFocus = null;

const fmt = (p) => `${p.done}/${p.total} (${p.percent}%)`;

function makeButton(action, id, label, symbol, pressed) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn-icon btn-${action}`;
  b.dataset.action = action;
  b.dataset.id = id;
  b.setAttribute("aria-label", label);
  b.textContent = symbol;
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  return b;
}

// 편집 상태 항목: 텍스트 입력창 + 카테고리 드롭다운
function createEditItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item editing";
  li.dataset.id = todo.id;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-text";
  input.maxLength = MAX_TEXT;
  input.value = todo.text;
  input.dataset.editField = "text";
  input.setAttribute("aria-label", "할 일 수정");

  const select = document.createElement("select");
  select.className = "edit-category";
  select.dataset.editField = "category";
  select.setAttribute("aria-label", "카테고리 수정");
  state.categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.append(opt);
  });
  select.value = getCategory(todo.categoryId).id;

  li.append(input, select);
  return li;
}

// 배경색 위에서 대비가 더 높은 글자색(흰색/검은색) 선택 (WCAG 상대 휘도)
function badgeTextColor(hex) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // 흰색 대비 1.05/(lum+0.05), 검은색 대비 (lum+0.05)/0.05
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? "#fff" : "#111";
}

function createItem(todo, listId, today) {
  if (editing && editing.id === todo.id && editing.listId === listId) {
    return createEditItem(todo);
  }
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.done ? " done" : "");
  li.dataset.id = todo.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = todo.done;
  check.id = `${listId}-${todo.id}`;
  check.dataset.action = "toggle";
  check.dataset.id = todo.id;

  // 체크박스를 감싸는 44px label(터치 영역). 글자는 스크린리더용, 보이는 텍스트는 더블클릭 수정용
  const label = document.createElement("label");
  label.className = "check";
  label.htmlFor = check.id;
  const labelText = document.createElement("span");
  labelText.className = "sr-only";
  labelText.textContent = `완료: ${todo.text}`;
  label.append(check, labelText);

  const text = document.createElement("span");
  text.className = "todo-text";
  text.dataset.action = "edit-text";
  text.dataset.id = todo.id;
  text.textContent = todo.text;

  const cat = getCategory(todo.categoryId);
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.style.background = cat.color;
  badge.style.color = badgeTextColor(cat.color);
  badge.textContent = cat.name;

  li.append(label, text, badge);

  // 오늘보다 이전 날짜로 계획한 미완료 항목은 이월 표시
  if (todo.plannedDate && todo.plannedDate < today && !todo.done) {
    const carry = document.createElement("span");
    carry.className = "badge badge-carry";
    carry.textContent = "이월";
    li.append(carry);
  }

  const inToday = todayIds.has(todo.id);
  li.append(
    makeButton("today", todo.id, inToday ? "오늘 할 일에서 빼기" : "오늘 할 일에 넣기", inToday ? "★" : "☆", inToday),
    makeButton("edit", todo.id, "수정", "✎"),
    makeButton("delete", todo.id, "삭제", "✕")
  );
  return li;
}

function renderList(ul, todos, emptyMessage, today) {
  if (todos.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyMessage;
    ul.replaceChildren(li);
    return;
  }
  // 조각에 모아 한 번에 교체 (항목이 많아도 갱신을 빠르게)
  const frag = document.createDocumentFragment();
  todos.forEach((t) => frag.append(createItem(t, ul.id, today)));
  ul.replaceChildren(frag);
}

function renderSelect() {
  els.select.replaceChildren();
  state.categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    els.select.append(opt);
  });
  state.ui.lastCategoryId = getCategory(state.ui.lastCategoryId).id;
  els.select.value = state.ui.lastCategoryId;
}

// 필터 탭: 전체 + 카테고리들
function renderTabs() {
  els.tabs.replaceChildren();
  const items = [{ id: "all", name: "전체" }, ...state.categories];
  items.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab" + (state.ui.filter === c.id ? " active" : "");
    b.dataset.filter = c.id;
    b.setAttribute("aria-pressed", String(state.ui.filter === c.id));
    b.textContent = c.name;
    els.tabs.append(b);
  });
}

// 카테고리 관리 패널: 안내 문구와 목록
function renderPanel() {
  els.catMsg.textContent = catMessage;
  els.catList.replaceChildren();
  state.categories.forEach((c) => {
    const li = document.createElement("li");
    li.className = "cat-item";
    li.dataset.catId = c.id;

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = c.color;
    li.append(swatch);

    if (renamingCatId === c.id) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "cat-rename";
      input.maxLength = MAX_CATEGORY_NAME;
      input.value = c.name;
      input.setAttribute("aria-label", `${c.name} 새 이름`);
      li.append(input);
    } else {
      const name = document.createElement("span");
      name.className = "cat-name";
      name.textContent = c.name;
      const count = document.createElement("span");
      count.className = "cat-count";
      count.textContent = `${countInCategory(c.id)}개`;
      li.append(name, count);
      const rename = document.createElement("button");
      rename.type = "button";
      rename.className = "btn-secondary";
      rename.dataset.catAction = "rename";
      rename.textContent = "이름 변경";
      rename.setAttribute("aria-label", `${c.name} 이름 변경`);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-secondary";
      del.dataset.catAction = "delete";
      del.textContent = "삭제";
      del.setAttribute("aria-label", `${c.name} 삭제`);
      li.append(rename, del);
    }
    els.catList.append(li);
  });
}

// 진행률: 오늘(크게) / 전체 / 카테고리별. 필터와 무관하게 전체 데이터 기준
function renderProgress() {
  const today = getProgress("today");
  els.todayProgressText.textContent = fmt(today);
  els.todayBar.setAttribute("aria-valuenow", String(today.percent));
  els.todayBarFill.style.width = `${today.percent}%`;
  const complete = today.total > 0 && today.percent === 100;
  els.todayBar.classList.toggle("complete", complete);
  els.allDoneMsg.hidden = !complete;
  els.todayCount.textContent = `${today.done}/${today.total}`;
  els.allProgressText.textContent = fmt(getProgress("all"));
  els.categoryProgress.textContent = state.categories
    .map((c) => {
      const p = getProgress(c.id);
      return `${c.name} ${p.done}/${p.total}`;
    })
    .join(" · ");
}

function render() {
  // 편집 중이던 항목이 사라졌으면 편집 해제
  if (editing && !state.todos.some((t) => t.id === editing.id)) editing = null;

  const today = todayString();
  const todayTodos = getTodayTodos();
  todayIds = new Set(todayTodos.map((t) => t.id));

  // 다시 그리기 전 키보드 포커스 위치 기억
  const a = document.activeElement;
  const ul = a && a.closest ? a.closest("ul") : null;
  if (!pendingFocus && ul && a.dataset.action) {
    pendingFocus = { listId: ul.id, id: a.dataset.id, action: a.dataset.action };
  }

  // 탭·패널 포커스 기억 (다시 그린 뒤 복원)
  if (!pendingPanelFocus && a && a.dataset && a.dataset.filter && els.tabs.contains(a)) {
    pendingPanelFocus = `[data-filter="${a.dataset.filter}"]`;
  }

  els.todayLabel.textContent = today;
  const quote = getDailyQuote();
  els.quoteText.textContent = quote.text;
  els.quoteAuthor.textContent = ` — ${quote.author}`;
  // 진행률은 필터와 무관, 목록만 필터로 거름
  const shownToday = todayTodos.filter(matchesFilter);
  const shownAll = state.todos.filter(matchesFilter);
  const emptyFor = (shown, source, defaultMsg) =>
    shown.length === 0 && source.length > 0 ? "이 카테고리에는 할 일이 없어요" : defaultMsg;
  renderSelect();
  renderTabs();
  renderPanel();
  renderProgress();
  renderList(
    els.todayList, shownToday,
    emptyFor(shownToday, todayTodos, "오늘 할 일이 없어요. 아래 전체 목록에서 ★를 눌러 오늘에 넣어 보세요."), today
  );
  renderList(
    els.allList, shownAll,
    emptyFor(shownAll, state.todos, "아직 할 일이 없어요. 위에서 첫 할 일을 추가해 보세요."), today
  );
  els.clearDone.disabled = !state.todos.some((t) => t.done);

  if (pendingPanelFocus) {
    const target = els.tabs.querySelector(pendingPanelFocus) || els.catList.querySelector(pendingPanelFocus);
    if (target) target.focus();
    pendingPanelFocus = null;
  }

  // 편집 입력창 또는 이전 포커스 복원
  if (editing) {
    const input = document.getElementById(editing.listId)
      .querySelector(`[data-id="${editing.id}"] .edit-text`);
    if (input) { input.focus(); input.select(); }
  } else if (pendingFocus) {
    const sel = `[data-id="${pendingFocus.id}"][data-action="${pendingFocus.action}"]`;
    const target = document.getElementById(pendingFocus.listId).querySelector(sel);
    if (target) target.focus();
  }
  pendingFocus = null;
}

// 편집 종료 (저장/취소 공통): 수정 버튼으로 포커스 복귀
function stopEdit() {
  if (editing) pendingFocus = { listId: editing.listId, id: editing.id, action: "edit" };
  editing = null;
}

// 새 편집 시작: 앞의 편집은 자동 취소됨
function startEdit(id, listId) {
  editing = { id, listId };
  pendingFocus = null;
}

// 목록 이벤트 위임: data-action으로 구분
function onListClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case "toggle": editing = null; toggleDone(id); break;
    case "today": editing = null; toggleToday(id); break;
    case "edit": startEdit(id, e.currentTarget.id); break;
    case "delete": editing = null; deleteTodo(id); break;
    default: return;
  }
  save();
  render();
}

// 텍스트 더블클릭으로 수정 시작
function onListDblClick(e) {
  const el = e.target.closest('[data-action="edit-text"]');
  if (!el) return;
  startEdit(el.dataset.id, e.currentTarget.id);
  render();
}

// 편집 중 Enter 저장, Esc 취소
function onListKeydown(e) {
  if (!editing || !e.target.dataset || !e.target.dataset.editField) return;
  if (e.key === "Escape") {
    e.preventDefault();
    stopEdit();
    render();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const li = e.target.closest("li");
    // 텍스트가 비면 updateTodo가 false → 취소와 같이 원래 내용 유지
    updateTodo(editing.id, {
      text: li.querySelector(".edit-text").value,
      categoryId: li.querySelector(".edit-category").value,
    });
    save();
    stopEdit();
    render();
  }
}

[els.todayList, els.allList].forEach((ul) => {
  ul.addEventListener("click", onListClick);
  ul.addEventListener("dblclick", onListDblClick);
  ul.addEventListener("keydown", onListKeydown);
});

// 추가 이벤트: Enter와 [추가] 버튼 모두 submit으로 처리
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const categoryId = els.select.value;
  state.ui.lastCategoryId = categoryId;
  if (addTodo(els.input.value, categoryId, els.planToday.checked)) {
    els.input.value = "";
    save();
    render();
  }
  els.input.focus();
});

els.select.addEventListener("change", () => {
  state.ui.lastCategoryId = els.select.value;
  save();
});

// 필터 탭 클릭
els.tabs.addEventListener("click", (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  state.ui.filter = b.dataset.filter;
  pendingPanelFocus = `[data-filter="${b.dataset.filter}"]`;
  save();
  render();
});

// 카테고리 관리 패널 열기/닫기
els.manageBtn.addEventListener("click", () => {
  const open = els.catPanel.hidden;
  els.catPanel.hidden = !open;
  els.manageBtn.setAttribute("aria-expanded", String(open));
  if (open) els.catInput.focus();
});

// 패널 안에서 Esc를 누르면 닫고 [카테고리 관리] 버튼으로 포커스 복귀 (이름 변경 중이면 그 취소가 우선)
els.catPanel.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || renamingCatId) return;
  els.catPanel.hidden = true;
  els.manageBtn.setAttribute("aria-expanded", "false");
  els.manageBtn.focus();
});

// 결과를 패널 안내 문구로 반영 (성공하면 문구 비움)
function showCatResult(result) {
  catMessage = result.ok ? "" : result.error;
  return result.ok;
}

els.catForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (showCatResult(addCategory(els.catInput.value))) els.catInput.value = "";
  save();
  render();
  els.catInput.focus();
});

// 패널 목록 이벤트 위임: 이름 변경 시작, 삭제
els.catList.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat-action]");
  if (!b) return;
  const id = b.closest("li").dataset.catId;
  if (b.dataset.catAction === "rename") {
    renamingCatId = id;
    catMessage = "";
    render();
    const input = els.catList.querySelector(".cat-rename");
    if (input) { input.focus(); input.select(); }
  } else if (b.dataset.catAction === "delete") {
    showCatResult(deleteCategory(id));
    save();
    render();
  }
});

// 이름 변경 입력: Enter 저장, Esc 취소
els.catList.addEventListener("keydown", (e) => {
  if (!renamingCatId || !e.target.classList.contains("cat-rename")) return;
  const id = renamingCatId;
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation(); // 패널 닫기로 번지지 않게
    renamingCatId = null;
    catMessage = "";
  } else if (e.key === "Enter") {
    e.preventDefault();
    // 실패하면 편집 상태를 유지하고 이유를 알림
    const ok = showCatResult(renameCategory(id, e.target.value));
    save();
    if (ok) renamingCatId = null;
    else { render(); const i = els.catList.querySelector(".cat-rename"); if (i) i.focus(); return; }
  } else {
    return;
  }
  render();
  const li = els.catList.querySelector(`[data-cat-id="${id}"] [data-cat-action="rename"]`);
  if (li) li.focus();
});

// 완료 항목 정리: 확인 후 수동으로만 삭제
els.clearDone.addEventListener("click", () => {
  const n = state.todos.filter((t) => t.done).length;
  if (n === 0) return;
  if (!confirm(`완료된 항목 ${n}개를 모두 삭제할까요?`)) return;
  clearDone();
  save();
  render();
});

els.quoteNext.addEventListener("click", nextQuote);
els.exportBtn.addEventListener("click", exportData);
els.importBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files[0];
  if (file) await importData(file);
  els.importFile.value = ""; // 같은 파일을 다시 고를 수 있게 비움
});

// 다른 탭에서 데이터가 바뀌면 다시 읽어 반영
window.addEventListener("storage", (e) => {
  if (e.key !== null && e.key !== STORAGE_KEY) return;
  load();
  render();
});

// 탭이 다시 보일 때 날짜를 다시 계산해 자정 이후의 오늘 영역을 갱신
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") render();
});

// 서비스 워커 등록: HTTPS 또는 localhost에서만. 실패해도 일반 웹 페이지로 동작
function registerServiceWorker() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const host = location.hostname;
    const secure = location.protocol === "https:" ||
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    if (!secure) return;
    const register = () => {
      navigator.serviceWorker.register("./sw.js")
        .then(requestPersistence)
        .catch(() => { /* 등록 실패는 조용히 무시 */ });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
  } catch (err) { /* 지원되지 않아도 오류를 띄우지 않음 */ }
}

// 브라우저가 저장 데이터를 임의로 지우지 않도록 요청 (거부돼도 안내 없음)
function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch (err) { /* 무시 */ }
}

load();
render();
registerServiceWorker();
