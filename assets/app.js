// ═══════════ BRAWL HUB — логика интерфейса ═══════════

const $ = (id) => document.getElementById(id);

/* ─────────── Вкладки шапки ─────────── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
$('logoHome').addEventListener('click', () => switchTab('home'));

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-page').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
}

/* ─────────── Вкладки настроек ─────────── */
document.querySelectorAll('.stab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.stab-page').forEach(p => p.classList.toggle('active', p.id === 'stab-' + btn.dataset.stab));
  });
});

/* ─────────── Список обновлений ─────────── */
const updatesList = $('updatesList');
BS_UPDATES.forEach(u => {
  const row = document.createElement('div');
  row.className = 'update-row';
  row.innerHTML = `
    <span class="update-ver" title="Подробное описание">${u.version}</span>
    <div class="update-info">
      <div class="update-name">${u.title}</div>
      <div class="update-date">${u.date}</div>
    </div>
    <span class="update-tag ${u.tag.cls}">${u.tag.text}</span>
    <span class="update-arrow">▶</span>`;
  // клик по номеру версии → подробное описание
  row.querySelector('.update-ver').addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(u);
  });
  // клик по строке → быстрый просмотр
  row.addEventListener('click', () => openQuick(u));
  updatesList.appendChild(row);
});

/* ─────────── Механики ─────────── */
const mechGrid = $('mechGrid');
BS_MECHANICS.forEach(m => {
  const card = document.createElement('div');
  card.className = 'mech-card';
  card.innerHTML = `<span class="mech-icon">${m.icon}</span><h3>${m.title}</h3><p>${m.text}</p>`;
  mechGrid.appendChild(card);
});

/* ─────────── Модалки ─────────── */
let currentUpdate = null;

function openQuick(u) {
  currentUpdate = u;
  $('quickArt').innerHTML = u.art();
  $('quickVersion').textContent = u.version + ' · ' + u.date;
  $('quickTitle').textContent = u.title;
  $('quickShort').textContent = u.short;
  $('quickModal').hidden = false;
}

function openDetail(u) {
  currentUpdate = u;
  $('detailArt').innerHTML = u.art();
  $('detailVersion').textContent = u.version;
  $('detailTitle').textContent = u.title;
  $('detailDate').textContent = u.date;
  $('detailContent').innerHTML = u.full;
  $('quickModal').hidden = true;
  $('detailModal').hidden = false;
}

$('quickMoreBtn').addEventListener('click', () => { if (currentUpdate) openDetail(currentUpdate); });

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => { $(btn.dataset.close).hidden = true; });
});
document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', (e) => { if (e.target === bd) bd.hidden = true; });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $('quickModal').hidden = true;
    $('detailModal').hidden = true;
  }
});

/* ─────────── Оформление: применение и сброс ───────────
   Нейросеть сохраняет изменения в localStorage('bs_design'):
   { cssVars: {"--c-yellow": "#fff", ...}, css: "body{...}" }        */

const DESIGN_KEY = 'bs_design';
const customStyleEl = document.createElement('style');
customStyleEl.id = 'ai-custom-style';
document.head.appendChild(customStyleEl);

function applyDesign(design) {
  // сначала чистим прошлые переопределения переменных
  document.documentElement.removeAttribute('style');
  if (design && design.cssVars) {
    for (const [k, v] of Object.entries(design.cssVars)) {
      if (/^--[\w-]+$/.test(k)) document.documentElement.style.setProperty(k, String(v));
    }
  }
  customStyleEl.textContent = (design && design.css) ? String(design.css) : '';
}

function loadDesign() {
  try { return JSON.parse(localStorage.getItem(DESIGN_KEY)) || null; }
  catch { return null; }
}

function saveDesign(design) {
  localStorage.setItem(DESIGN_KEY, JSON.stringify(design || {}));
}

function resetDesign() {
  localStorage.removeItem(DESIGN_KEY);
  applyDesign(null);
}

// применяем сохранённое оформление при загрузке
applyDesign(loadDesign());

$('resetDesignBtn2').addEventListener('click', () => {
  resetDesign();
  const note = $('designResetNote');
  note.hidden = false;
  setTimeout(() => { note.hidden = true; }, 2500);
});

/* ─────────── Переключатель анимаций ─────────── */
const animToggle = $('animToggle');
animToggle.checked = localStorage.getItem('bs_anim') !== 'off';
document.body.classList.toggle('no-anim', !animToggle.checked);
animToggle.addEventListener('change', () => {
  localStorage.setItem('bs_anim', animToggle.checked ? 'on' : 'off');
  document.body.classList.toggle('no-anim', !animToggle.checked);
});
