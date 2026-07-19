// ═══════════ Нейро-ассистент: настройки, чат, управление дизайном ═══════════

const AI_SETTINGS_KEY = 'bs_ai_settings';
const AI_HISTORY_KEY = 'bs_ai_history';

const DEFAULT_INSTRUCTION =
  'Будь ассистентом сайта, который может менять дизайн и оформление сайта. ' +
  'Отвечай дружелюбно и кратко, на языке пользователя. Помогай с вопросами про Brawl Stars и про сайт.';

const DEFAULT_SETTINGS = {
  name: 'Нейро-ассистент',
  url: 'https://api.openai.com/v1/chat/completions',
  key: '',
  model: 'gpt-4o-mini',
  instruction: DEFAULT_INSTRUCTION
};

/* ─────────── Настройки ─────────── */
function loadAiSettings() {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(AI_SETTINGS_KEY)) || {}) }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}
function saveAiSettings(s) { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(s)); }

function fillSettingsForm() {
  const s = loadAiSettings();
  $('aiName').value = s.name;
  $('aiUrl').value = s.url;
  $('aiKey').value = s.key;
  $('aiModel').value = s.model;
  $('aiInstruction').value = s.instruction;
  $('chatAiName').textContent = s.name || 'Нейро-ассистент';
}
fillSettingsForm();

$('saveAiBtn').addEventListener('click', () => {
  saveAiSettings({
    name: $('aiName').value.trim() || DEFAULT_SETTINGS.name,
    url: $('aiUrl').value.trim() || DEFAULT_SETTINGS.url,
    key: $('aiKey').value.trim(),
    model: $('aiModel').value.trim() || DEFAULT_SETTINGS.model,
    instruction: $('aiInstruction').value.trim() || DEFAULT_INSTRUCTION
  });
  $('chatAiName').textContent = loadAiSettings().name;
  flashNote('aiSavedNote');
});

$('restoreInstructionBtn').addEventListener('click', () => {
  $('aiInstruction').value = DEFAULT_INSTRUCTION;
});

function flashNote(id) {
  const el = $(id);
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 2500);
}

/* ─────────── История чата ─────────── */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(AI_HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(h) {
  // храним не больше 40 последних сообщений
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(h.slice(-40)));
}
function clearHistory() {
  localStorage.removeItem(AI_HISTORY_KEY);
  renderChat();
  addBubble('sys', '🧠 История очищена — я всё забыл!');
}

$('resetChatBtn').addEventListener('click', () => {
  clearHistory();
  flashNote('chatResetNote');
});
$('chatClearBtn').addEventListener('click', clearHistory);

/* ─────────── UI чата ─────────── */
const chatPanel = $('chatPanel');
const chatMessages = $('chatMessages');

$('chatFab').addEventListener('click', () => {
  chatPanel.hidden = false;
  $('chatFab').style.display = 'none';
  renderChat();
  if (loadHistory().length === 0) {
    addBubble('sys', '👋 Привет! Я ассистент сайта. Могу рассказать про обновления Brawl Stars или поменять оформление сайта — например: «сделай сайт в красных тонах» или «сделай фон темнее».' +
      (loadAiSettings().key ? '' : '\n\n⚙️ Сначала подключи нейросеть: Настройки → Нейросеть.'));
  }
});
$('chatCloseBtn').addEventListener('click', () => {
  chatPanel.hidden = true;
  $('chatFab').style.display = '';
});

$('resetDesignBtn').addEventListener('click', () => {
  resetDesign();
  addBubble('sys', '↩️ Оформление сайта возвращено к исходному!');
});

function renderChat() {
  chatMessages.innerHTML = '';
  loadHistory().forEach(m => addBubble(m.role === 'user' ? 'user' : 'ai', stripDesignBlocks(m.content), false));
  scrollChat();
}

function addBubble(kind, text, scroll = true) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + kind;
  div.textContent = text;
  chatMessages.appendChild(div);
  if (scroll) scrollChat();
  return div;
}

function scrollChat() { chatMessages.scrollTop = chatMessages.scrollHeight; }

/* ─────────── Протокол управления дизайном ───────────
   Нейросеть может вставить в ответ блок:
   ```design
   { "cssVars": { "--c-yellow": "#ff00aa" }, "css": "body{...}" , "reset": false }
   ```
   Блоки применяются к сайту и сохраняются, из текста ответа вырезаются. */

const DESIGN_BLOCK_RE = /```design\s*([\s\S]*?)```/g;

function stripDesignBlocks(text) {
  return String(text).replace(DESIGN_BLOCK_RE, '').trim();
}

function extractAndApplyDesign(text) {
  let applied = false;
  let match;
  const re = new RegExp(DESIGN_BLOCK_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    try {
      const cmd = JSON.parse(match[1]);
      if (cmd.reset) {
        resetDesign();
        applied = true;
        continue;
      }
      const prev = loadDesign() || {};
      const design = {
        cssVars: { ...(prev.cssVars || {}), ...(cmd.cssVars || {}) },
        css: (cmd.css !== undefined) ? String(cmd.css) : (prev.css || '')
      };
      saveDesign(design);
      applyDesign(design);
      applied = true;
    } catch (e) {
      console.warn('Не удалось применить design-блок:', e);
    }
  }
  return applied;
}

/* ─────────── Системный промпт ─────────── */
function buildSystemPrompt() {
  const s = loadAiSettings();
  return `${s.instruction}

Ты встроен в фан-сайт «BRAWL HUB» про обновления и механики Brawl Stars (тёмно-синий фон, жёлтые акценты, мультяшный стиль игры).

Ты умеешь менять оформление сайта. Когда пользователь просит изменить дизайн, добавь в конец ответа блок:
\`\`\`design
{"cssVars": {"--имя": "значение"}, "css": "произвольный CSS"}
\`\`\`
Правила:
- Блок должен содержать корректный JSON. Поля необязательные: "cssVars" (переопределяет CSS-переменные темы), "css" (дополнительный CSS, ЗАМЕНЯЕТ прошлый доп. CSS целиком), "reset": true (полный сброс оформления к исходному).
- Доступные переменные темы: --c-yellow (осн. акцент), --c-yellow-dark, --c-red, --c-blue, --c-purple, --bg-top (верх фона), --bg-bottom (низ фона), --card (фон карточек), --card-2, --text, --muted, --border (цвет обводок/теней), --font-head, --font-body, --radius.
- Меняй только то, что просили. Для смены цветовой гаммы обычно достаточно cssVars.
- В обычном тексте ответа кратко скажи, что поменял. Не показывай пользователю сам JSON.
- Если просят вернуть как было — используй {"reset": true}.

Отвечай кратко и по делу.`;
}

/* ─────────── Отправка сообщений ─────────── */
const chatForm = $('chatForm');
const chatInput = $('chatInput');
let sending = false;

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || sending) return;

  const s = loadAiSettings();
  if (!s.key) {
    addBubble('err', '⚙️ Сначала укажи API-ключ: Настройки → Нейросеть');
    return;
  }

  chatInput.value = '';
  addBubble('user', text);
  const history = loadHistory();
  history.push({ role: 'user', content: text });
  saveHistory(history);

  sending = true;
  const typing = addBubble('typing', '⭐ Печатает…');

  try {
    const reply = await callAi(s, history);
    typing.remove();

    const designApplied = extractAndApplyDesign(reply);
    const visible = stripDesignBlocks(reply);

    if (visible) addBubble('ai', visible);
    if (designApplied) addBubble('sys', '🎨 Оформление сайта обновлено!');

    const h = loadHistory();
    h.push({ role: 'assistant', content: reply });
    saveHistory(h);
  } catch (err) {
    typing.remove();
    addBubble('err', '❌ Ошибка: ' + (err.message || err));
  } finally {
    sending = false;
  }
});

async function callAi(settings, history) {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...history.map(m => ({ role: m.role, content: m.content }))
  ];

  const resp = await fetch(settings.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + settings.key
    },
    body: JSON.stringify({ model: settings.model, messages })
  });

  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json()).error?.message || ''; } catch {}
    throw new Error(`API вернул ${resp.status}. ${detail}`.trim());
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Пустой ответ от нейросети.');
  return content;
}
