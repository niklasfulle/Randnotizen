const topicTabs = document.querySelector('#topic-tabs');
const topicForm = document.querySelector('#topic-form');
const topicInput = document.querySelector('#topic-input');
const topicCount = document.querySelector('#topic-count');
const topicOverview = document.querySelector('#topic-overview');
const activeTopicTitle = document.querySelector('#active-topic-title');
const topicProgressBar = document.querySelector('#topic-progress-bar');
const topicProgressLabel = document.querySelector('#topic-progress-label');
const topicProgressDetail = document.querySelector('#topic-progress-detail');
const deleteTopicButton = document.querySelector('#delete-topic-button');
const listForm = document.querySelector('#list-form');
const listInput = document.querySelector('#list-input');
const listCount = document.querySelector('#list-count');
const listsElement = document.querySelector('#lists');
const listTemplate = document.querySelector('#list-template');
const itemTemplate = document.querySelector('#item-template');
const settingsOverlay = document.querySelector('#settings-overlay');
const settingsForm = document.querySelector('#settings-form');
const displaySelect = document.querySelector('#display-select');
const sideSelect = document.querySelector('#side-select');
const designSelect = document.querySelector('#design-select');
const fontSelect = document.querySelector('#font-select');
const languageSetting = document.querySelector('#language-setting');
const autostartCheckbox = document.querySelector('#autostart-checkbox');
const keepVisibleCheckbox = document.querySelector('#keep-visible-checkbox');
const versionLabel = document.querySelector('#version-label');
const saveStatus = document.querySelector('#save-status');
const closeSettingsButton = document.querySelector('#close-settings-button');
const confirmOverlay = document.querySelector('#confirm-overlay');
const confirmTitle = document.querySelector('#confirm-title');
const confirmMessage = document.querySelector('#confirm-message');
const cancelConfirmButton = document.querySelector('#cancel-confirm-button');
const acceptConfirmButton = document.querySelector('#accept-confirm-button');
const todayLabel = document.querySelector('#today-label');
const themeColor = document.querySelector('#theme-color');

const {
  normalizeLanguage,
  normalizeDesign,
  themeForDesign,
  normalizeFont,
  translate,
} = globalThis.RandnotizenI18n;
let currentLanguage = 'de';
let currentDesign = 'paper';
let currentFont = 'segoe';
let settingsLanguage = 'de';
let settingsDesign = 'paper';
let settingsFont = 'segoe';
let availableDisplays = [];
let openedSettings = null;
let workspace = createDefaultWorkspace();
let resolveConfirmation = null;
let selectedShortcutListId = null;
let selectedShortcutItemId = null;

function t(key, variables) {
  return translate(currentLanguage, key, variables);
}

function localizeElements(root = document) {
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of root.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
  for (const element of root.querySelectorAll('[data-i18n-title]')) {
    element.title = t(element.dataset.i18nTitle);
  }
  for (const element of root.querySelectorAll('[data-i18n-aria-label]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  }
}

function updateDate() {
  const locale = currentLanguage === 'en' ? 'en-US' : 'de-DE';
  todayLabel.textContent = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date()).toUpperCase();
}

function applyLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  document.documentElement.lang = currentLanguage;
  localizeElements();
  updateDate();
}

function applyDesign(design) {
  currentDesign = normalizeDesign(design);
  const theme = themeForDesign(currentDesign);
  document.documentElement.dataset.design = currentDesign;
  document.documentElement.dataset.theme = theme;
  themeColor.content = theme === 'dark' ? '#111720' : '#f3ead7';
}

function applyFont(font) {
  currentFont = normalizeFont(font);
  document.documentElement.dataset.font = currentFont;
}

function settingsT(key) {
  return translate(settingsLanguage, key);
}

function localizeSettingsPopover() {
  for (const element of settingsOverlay.querySelectorAll('[data-i18n]')) {
    element.textContent = settingsT(element.dataset.i18n);
  }
  for (const element of settingsOverlay.querySelectorAll('[data-i18n-aria-label]')) {
    element.setAttribute('aria-label', settingsT(element.dataset.i18nAriaLabel));
  }
  const languageOptions = languageSetting.querySelectorAll('span');
  languageOptions[0].classList.toggle('active', settingsLanguage === 'de');
  languageOptions[1].classList.toggle('active', settingsLanguage === 'en');
  languageSetting.setAttribute('aria-label', settingsT('switchLanguage'));
}

function renderSettingsDisplays(selectedId) {
  displaySelect.replaceChildren();
  const automatic = document.createElement('option');
  automatic.value = 'primary';
  automatic.textContent = settingsT('primaryAuto');
  displaySelect.append(automatic);
  for (const display of availableDisplays) {
    const option = document.createElement('option');
    const primaryMarker = display.primary ? ` · ${settingsT('primary')}` : '';
    option.value = display.id;
    option.textContent = `${display.label}${primaryMarker} · ${display.size}`;
    displaySelect.append(option);
  }
  displaySelect.value = [...displaySelect.options].some((option) => option.value === selectedId)
    ? selectedId
    : 'primary';
}

async function openSettingsPopover() {
  const [settings, displays, autostart, version] = await Promise.all([
    globalThis.notesApp.getSettings(),
    globalThis.notesApp.listDisplays(),
    globalThis.notesApp.getAutostart(),
    globalThis.notesApp.getVersion(),
  ]);
  settingsLanguage = normalizeLanguage(settings.language);
  settingsDesign = normalizeDesign(settings.design);
  settingsFont = normalizeFont(settings.font);
  availableDisplays = displays;
  openedSettings = settings;
  sideSelect.value = settings.side;
  designSelect.value = settingsDesign;
  fontSelect.value = settingsFont;
  autostartCheckbox.checked = autostart;
  keepVisibleCheckbox.checked = Boolean(settings.keepVisible);
  versionLabel.textContent = version;
  saveStatus.textContent = '';
  localizeSettingsPopover();
  renderSettingsDisplays(settings.displayId);
  settingsOverlay.hidden = false;
  requestAnimationFrame(() => closeSettingsButton.focus());
}

function closeSettingsPopover() {
  if (openedSettings) {
    globalThis.notesApp.previewPosition({
      displayId: openedSettings.displayId,
      side: openedSettings.side,
    });
    document.documentElement.dataset.side = openedSettings.side;
  }
  settingsOverlay.hidden = true;
  document.querySelector('#open-settings-button').focus();
}

function createId() {
  return crypto.randomUUID();
}

function createDefaultWorkspace() {
  const topicId = createId();
  return {
    version: 3,
    activeTopicId: topicId,
    topics: [{ id: topicId, title: t('general'), lists: [] }],
  };
}

function migrateStep(step) {
  if (!step || typeof step.text !== 'string' || !step.text.trim()) return null;
  return {
    id: typeof step.id === 'string' ? step.id : createId(),
    text: step.text.trim(),
    completed: Boolean(step.completed),
  };
}

function migrateItem(item) {
  if (!item || typeof item.text !== 'string' || !item.text.trim()) return null;
  return {
    id: typeof item.id === 'string' ? item.id : createId(),
    text: item.text.trim(),
    completed: Boolean(item.completed),
    details: typeof item.details === 'string' ? item.details.trim() : '',
    steps: Array.isArray(item.steps) ? item.steps.map(migrateStep).filter(Boolean) : [],
  };
}

function migrateList(list) {
  if (!list || typeof list.title !== 'string') return null;
  return {
    id: typeof list.id === 'string' ? list.id : createId(),
    title: list.title.trim() || t('untitled'),
    items: Array.isArray(list.items) ? list.items.map(migrateItem).filter(Boolean) : [],
  };
}

function migrateTopic(topic) {
  if (!topic || typeof topic.title !== 'string') return null;
  return {
    id: typeof topic.id === 'string' ? topic.id : createId(),
    title: topic.title.trim() || t('untitled'),
    lists: Array.isArray(topic.lists) ? topic.lists.map(migrateList).filter(Boolean) : [],
  };
}

function migrateWorkspace(loaded) {
  if (loaded && !Array.isArray(loaded) && Array.isArray(loaded.topics)) {
    const topics = loaded.topics.map(migrateTopic).filter(Boolean);

    if (!topics.length) return createDefaultWorkspace();
    return {
      version: 3,
      activeTopicId: topics.some((topic) => topic.id === loaded.activeTopicId)
        ? loaded.activeTopicId
        : topics[0].id,
      topics,
    };
  }

  if (Array.isArray(loaded) && loaded.length) {
    const topicId = createId();
    return {
      version: 3,
      activeTopicId: topicId,
      topics: [{
        id: topicId,
        title: t('imported'),
        lists: [{
          id: createId(),
          title: t('oldNotes'),
          items: loaded.map((note) => ({
            id: createId(),
            text: [note?.title, note?.content].filter(Boolean).join(' — ') || t('note'),
            completed: false,
            details: '',
            steps: [],
          })),
        }],
      }],
    };
  }

  return createDefaultWorkspace();
}

function activeTopic() {
  return workspace.topics.find((topic) => topic.id === workspace.activeTopicId) || null;
}

function selectShortcutList(listId) {
  selectedShortcutListId = listId;
  selectedShortcutItemId = null;
  for (const row of listsElement.querySelectorAll('.checklist-item.keyboard-selected')) {
    row.classList.remove('keyboard-selected');
  }
  for (const card of listsElement.querySelectorAll('.checklist-card')) {
    card.classList.toggle('keyboard-active', card.dataset.listId === listId);
  }
}

function selectShortcutItem(index, clampToBounds = false) {
  const selectedCard = listsElement.querySelector('.checklist-card.keyboard-active');
  const rows = [...(selectedCard?.querySelectorAll('.checklist-item') || [])];
  if (!rows.length) return;
  const targetIndex = clampToBounds ? Math.max(0, Math.min(index, rows.length - 1)) : index;
  const row = rows[targetIndex];
  if (!row) return;
  selectedShortcutItemId = row.dataset.itemId;
  for (const candidate of rows) {
    candidate.classList.toggle('keyboard-selected', candidate === row);
  }
  row.querySelector('.task-checkbox').focus();
}

function calculateProgress(items) {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function topicProgress(topic) {
  return calculateProgress(topic.lists.flatMap((list) => list.items));
}

function cardStyle(id) {
  const value = [...id].reduce((sum, character) => sum + character.codePointAt(0), 0);
  return `style-${value % 4}`;
}

async function persist() {
  await globalThis.notesApp.saveWorkspace(workspace);
}

function askToDelete(title, message) {
  if (resolveConfirmation) resolveConfirmation(false);
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOverlay.hidden = false;
  requestAnimationFrame(() => cancelConfirmButton.focus());
  return new Promise((resolve) => {
    resolveConfirmation = resolve;
  });
}

function finishConfirmation(accepted) {
  if (!resolveConfirmation) return;
  const resolve = resolveConfirmation;
  resolveConfirmation = null;
  confirmOverlay.hidden = true;
  resolve(accepted);
}

async function loadPanelSettings() {
  const settings = await globalThis.notesApp.getSettings();
  applyLanguage(settings.language);
  applyDesign(settings.design);
  applyFont(settings.font);
  document.documentElement.dataset.side = settings.side;
  return settings;
}

function renderTopics() {
  topicTabs.replaceChildren();
  topicCount.textContent = `${workspace.topics.length}`;

  for (const topic of workspace.topics) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `topic-tab ${cardStyle(topic.id)}`;
    button.classList.toggle('active', topic.id === workspace.activeTopicId);
    button.textContent = topic.title;
    button.addEventListener('click', async () => {
      workspace.activeTopicId = topic.id;
      await persist();
      render();
    });
    topicTabs.append(button);
  }
}

function createStepElement(item, step) {
  const row = document.createElement('li');
  row.className = 'substep-item';
  row.classList.toggle('completed', step.completed);
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  const text = document.createElement('span');
  const removeButton = document.createElement('button');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox substep-checkbox';
  checkbox.checked = step.completed;
  text.className = 'substep-text';
  text.textContent = step.text;
  removeButton.type = 'button';
  removeButton.className = 'remove-substep-button';
  removeButton.textContent = '×';
  removeButton.setAttribute('aria-label', t('deleteStep'));
  removeButton.title = t('deleteStep');
  label.append(checkbox, text);
  row.append(label, removeButton);

  checkbox.addEventListener('change', async () => {
    step.completed = checkbox.checked;
    await persist();
    render();
  });
  removeButton.addEventListener('click', async () => {
    item.steps = item.steps.filter((candidate) => candidate.id !== step.id);
    await persist();
    render();
  });
  return row;
}

function createItemElement(topic, list, item) {
  const row = itemTemplate.content.querySelector('.checklist-item').cloneNode(true);
  localizeElements(row);
  const checkbox = row.querySelector('.task-checkbox');
  const number = row.querySelector('.item-number');
  const text = row.querySelector('.item-text');
  const detailsToggle = row.querySelector('.item-details-toggle');
  const detailsPanel = row.querySelector('.item-details');
  const description = row.querySelector('.item-description');
  const stepsElement = row.querySelector('.substep-items');
  const stepForm = row.querySelector('.substep-form');
  const stepInput = stepForm.querySelector('input');
  checkbox.checked = item.completed;
  row.dataset.itemId = item.id;
  number.textContent = `${list.items.indexOf(item) + 1}.`;
  text.textContent = item.text;
  row.classList.toggle('completed', item.completed);
  row.classList.toggle('keyboard-selected', item.id === selectedShortcutItemId);
  description.value = item.details;
  detailsPanel.hidden = !(item.details || item.steps.length);
  detailsToggle.setAttribute('aria-expanded', String(!detailsPanel.hidden));
  for (const step of item.steps) stepsElement.append(createStepElement(item, step));
  const itemNumber = list.items.indexOf(item) + 1;
  if (list.id === selectedShortcutListId && itemNumber <= 9) {
    checkbox.setAttribute('aria-keyshortcuts', `Control+${itemNumber} Space`);
  }

  row.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    selectShortcutList(list.id);
    selectShortcutItem(itemNumber - 1);
  });

  detailsToggle.addEventListener('click', () => {
    detailsPanel.hidden = !detailsPanel.hidden;
    detailsToggle.setAttribute('aria-expanded', String(!detailsPanel.hidden));
    if (!detailsPanel.hidden) description.focus();
  });

  description.addEventListener('change', async () => {
    item.details = description.value.trim();
    await persist();
  });

  stepForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const stepText = stepInput.value.trim();
    if (!stepText) return stepInput.focus();
    item.steps.push({ id: createId(), text: stepText, completed: false });
    await persist();
    render();
    const updatedRow = listsElement.querySelector(`[data-item-id="${item.id}"]`);
    updatedRow?.querySelector('.substep-form input')?.focus();
  });

  checkbox.addEventListener('change', async () => {
    item.completed = checkbox.checked;
    await persist();
    render();
  });

  row.querySelector('.remove-item-button').addEventListener('click', async () => {
    list.items = list.items.filter((candidate) => candidate.id !== item.id);
    await persist();
    render();
  });
  return row;
}

function createListElement(topic, list) {
  const fragment = listTemplate.content.cloneNode(true);
  localizeElements(fragment);
  const card = fragment.querySelector('.checklist-card');
  const itemsElement = fragment.querySelector('.checklist-items');
  const progress = calculateProgress(list.items);
  card.classList.add(cardStyle(list.id));
  card.classList.toggle('keyboard-active', list.id === selectedShortcutListId);
  card.dataset.listId = list.id;
  card.addEventListener('pointerdown', () => selectShortcutList(list.id));
  fragment.querySelector('h3').textContent = list.title;
  fragment.querySelector('.list-progress .progress-track span').style.width = `${progress.percent}%`;
  fragment.querySelector('.list-progress strong').textContent = `${progress.completed}/${progress.total}`;

  if (list.items.length) {
    for (const item of list.items) itemsElement.append(createItemElement(topic, list, item));
  } else {
    const empty = document.createElement('li');
    empty.className = 'empty-list';
    empty.textContent = t('emptyList');
    itemsElement.append(empty);
  }

  fragment.querySelector('.delete-list-button').addEventListener('click', async () => {
    const accepted = await askToDelete(
      t('detachListTitle'),
      t('detachListMessage', { title: list.title }),
    );
    if (!accepted) return;
    topic.lists = topic.lists.filter((candidate) => candidate.id !== list.id);
    await persist();
    render();
  });

  const itemForm = fragment.querySelector('.item-form');
  const itemInput = itemForm.querySelector('input');
  const shortcutNumber = topic.lists.indexOf(list) + 1;
  if (shortcutNumber <= 9) {
    itemInput.setAttribute('aria-keyshortcuts', `Alt+${shortcutNumber}`);
    itemInput.title = t('addTaskShortcut', { number: shortcutNumber });
  }
  itemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = itemInput.value.trim();
    if (!text) return itemInput.focus();
    list.items.push({ id: createId(), text, completed: false, details: '', steps: [] });
    await persist();
    render();
    const updatedCard = [...listsElement.querySelectorAll('.checklist-card')]
      .find((candidate) => candidate.dataset.listId === list.id);
    updatedCard?.querySelector('.item-form input')?.focus();
  });
  return fragment;
}

function renderActiveTopic() {
  const topic = activeTopic();
  const hasTopic = Boolean(topic);
  topicOverview.hidden = !hasTopic;
  listForm.hidden = !hasTopic;
  listsElement.replaceChildren();

  if (!topic) {
    listCount.textContent = '0';
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = t('firstTopic');
    listsElement.append(empty);
    return;
  }

  const progress = topicProgress(topic);
  if (!topic.lists.some((list) => list.id === selectedShortcutListId)) {
    selectedShortcutListId = topic.lists[0]?.id || null;
  }
  activeTopicTitle.textContent = topic.title;
  topicProgressBar.style.width = `${progress.percent}%`;
  topicProgressLabel.textContent = `${progress.percent}%`;
  topicProgressDetail.textContent = progress.total
    ? t('tasksProgress', { completed: progress.completed, total: progress.total })
    : t('noTasks');
  listCount.textContent = `${topic.lists.length} ${t(topic.lists.length === 1 ? 'listOne' : 'listMany')}`;

  if (!topic.lists.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = t('emptyTopic');
    listsElement.append(empty);
    return;
  }

  for (const list of topic.lists) listsElement.append(createListElement(topic, list));
}

function render() {
  renderTopics();
  renderActiveTopic();
}

topicForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = topicInput.value.trim();
  if (!title) return topicInput.focus();
  const topic = { id: createId(), title, lists: [] };
  workspace.topics.push(topic);
  workspace.activeTopicId = topic.id;
  topicInput.value = '';
  await persist();
  render();
  listInput.focus();
});

listForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const topic = activeTopic();
  const title = listInput.value.trim();
  if (!topic || !title) return listInput.focus();
  topic.lists.push({ id: createId(), title, items: [] });
  listInput.value = '';
  await persist();
  render();
  listsElement.querySelector('.checklist-card:last-child .item-form input')?.focus();
});

deleteTopicButton.addEventListener('click', async () => {
  const topic = activeTopic();
  if (!topic) return;
  const accepted = await askToDelete(
    t('detachTopicTitle'),
    t('detachTopicMessage', { title: topic.title }),
  );
  if (!accepted) return;
  workspace.topics = workspace.topics.filter((candidate) => candidate.id !== topic.id);
  workspace.activeTopicId = workspace.topics[0]?.id || null;
  await persist();
  render();
});

languageSetting.addEventListener('click', () => {
  const selectedDisplay = displaySelect.value;
  settingsLanguage = settingsLanguage === 'de' ? 'en' : 'de';
  localizeSettingsPopover();
  renderSettingsDisplays(selectedDisplay);
});

designSelect.addEventListener('change', () => {
  settingsDesign = normalizeDesign(designSelect.value);
});

fontSelect.addEventListener('change', () => {
  settingsFont = normalizeFont(fontSelect.value);
});

function previewPanelPosition() {
  document.documentElement.dataset.side = sideSelect.value;
  globalThis.notesApp.previewPosition({
    displayId: displaySelect.value,
    side: sideSelect.value,
  });
}

displaySelect.addEventListener('change', previewPanelPosition);
sideSelect.addEventListener('change', previewPanelPosition);

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const [updatedSettings] = await Promise.all([
    globalThis.notesApp.updateSettings({
      displayId: displaySelect.value,
      side: sideSelect.value,
      language: settingsLanguage,
      design: settingsDesign,
      font: settingsFont,
      keepVisible: keepVisibleCheckbox.checked,
    }),
    globalThis.notesApp.setAutostart(autostartCheckbox.checked),
  ]);
  applyLanguage(updatedSettings.language);
  applyDesign(updatedSettings.design);
  applyFont(updatedSettings.font);
  document.documentElement.dataset.side = updatedSettings.side;
  openedSettings = updatedSettings;
  render();
  saveStatus.textContent = settingsT('settingsSaved');
});

closeSettingsButton.addEventListener('click', closeSettingsPopover);
settingsOverlay.addEventListener('click', (event) => {
  if (event.target === settingsOverlay) closeSettingsPopover();
});

cancelConfirmButton.addEventListener('click', () => finishConfirmation(false));
acceptConfirmButton.addEventListener('click', () => finishConfirmation(true));
confirmOverlay.addEventListener('click', (event) => {
  if (event.target === confirmOverlay) finishConfirmation(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!confirmOverlay.hidden) finishConfirmation(false);
  else if (!settingsOverlay.hidden) closeSettingsPopover();
});

function matchesModifiers(event, { control = false, alt = false, shift = false }) {
  return event.ctrlKey === control && event.altKey === alt && event.shiftKey === shift;
}

function inputShortcutTarget(event) {
  if (event.ctrlKey && event.shiftKey && !event.altKey && event.code === 'KeyT') {
    return topicInput;
  }
  if (event.ctrlKey && event.shiftKey && !event.altKey && event.code === 'KeyL') {
    return listInput;
  }
  if (!matchesModifiers(event, { alt: true }) || !/^Digit[1-9]$/.test(event.code)) return null;
  const index = Number(event.code.slice(-1)) - 1;
  const card = listsElement.querySelectorAll('.checklist-card')[index] || null;
  if (!card) return null;
  selectShortcutList(card.dataset.listId);
  return card.querySelector('.item-form input');
}

function handleTaskNumberShortcut(event) {
  if (!matchesModifiers(event, { control: true }) || !/^Digit[1-9]$/.test(event.code)) return false;
  event.preventDefault();
  selectShortcutItem(Number(event.code.slice(-1)) - 1);
  return true;
}

function navigationStartIndex(currentIndex, direction, rowCount) {
  if (currentIndex !== -1) return currentIndex + direction;
  if (direction === 1) return 0;
  return rowCount - 1;
}

function handleTaskNavigationShortcut(event) {
  const isArrow = event.code === 'ArrowUp' || event.code === 'ArrowDown';
  if (!matchesModifiers(event, { control: true }) || !isArrow) return false;
  const selectedCard = listsElement.querySelector('.checklist-card.keyboard-active');
  const rows = [...(selectedCard?.querySelectorAll('.checklist-item') || [])];
  if (!rows.length) return true;
  const currentIndex = rows.findIndex((row) => row.dataset.itemId === selectedShortcutItemId);
  const direction = event.code === 'ArrowDown' ? 1 : -1;
  event.preventDefault();
  selectShortcutItem(navigationStartIndex(currentIndex, direction, rows.length), true);
  return true;
}

function isTypingTarget(target) {
  return Boolean(target.closest?.('input:not(.task-checkbox), textarea, select, button'));
}

function handleTaskToggleShortcut(event) {
  if (!matchesModifiers(event, {}) || event.code !== 'Space' || isTypingTarget(event.target)) return false;
  const selected = listsElement.querySelector('.checklist-item.keyboard-selected > .item-main-row .task-checkbox');
  if (!selected) return true;
  event.preventDefault();
  selected.click();
  return true;
}

function focusShortcutTarget(event, target) {
  if (!target || target.hidden || target.closest('[hidden]')) return;
  event.preventDefault();
  target.focus();
  target.select();
}

document.addEventListener('keydown', (event) => {
  if (!confirmOverlay.hidden || !settingsOverlay.hidden) return;
  if (handleTaskNumberShortcut(event)) return;
  if (handleTaskNavigationShortcut(event)) return;
  if (handleTaskToggleShortcut(event)) return;

  focusShortcutTarget(event, inputShortcutTarget(event));
});

document.querySelector('#hide-button').addEventListener('click', globalThis.notesApp.hide);
document.querySelector('#open-settings-button').addEventListener('click', openSettingsPopover);

globalThis.notesApp.onPanelState(({ open }) => {
  if (!open) {
    settingsOverlay.hidden = true;
    if (openedSettings) document.documentElement.dataset.side = openedSettings.side;
  }
  if (open && !workspace.topics.length) setTimeout(() => topicInput.focus(), 100);
});
globalThis.notesApp.onLanguageChanged((language) => {
  applyLanguage(language);
  render();
});
globalThis.notesApp.onDesignChanged(applyDesign);

async function initialize() {
  await loadPanelSettings();
  const loaded = await globalThis.notesApp.loadWorkspace();
  workspace = migrateWorkspace(loaded);
  await persist();
  render();
}

document.addEventListener('DOMContentLoaded', initialize, { once: true });
