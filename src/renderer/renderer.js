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
const settingsGroups = [...settingsForm.querySelectorAll('.settings-group')];
const displaySelect = document.querySelector('#display-select');
const sideSelect = document.querySelector('#side-select');
const designOptions = [...document.querySelectorAll('input[name="design"]')];
const fontSelect = document.querySelector('#font-select');
const languageSetting = document.querySelector('#language-setting');
const autostartCheckbox = document.querySelector('#autostart-checkbox');
const keepVisibleCheckbox = document.querySelector('#keep-visible-checkbox');
const versionLabel = document.querySelector('#version-label');
const installPathLabel = document.querySelector('#install-path-label');
const saveStatus = document.querySelector('#save-status');
const backupStatus = document.querySelector('#backup-status');
const trashCount = document.querySelector('#trash-count');
const trashList = document.querySelector('#trash-list');
const exportButton = document.querySelector('#export-button');
const importButton = document.querySelector('#import-button');
const undoButton = document.querySelector('#undo-button');
const emptyTrashButton = document.querySelector('#empty-trash-button');
const closeSettingsButton = document.querySelector('#close-settings-button');
const confirmOverlay = document.querySelector('#confirm-overlay');
const confirmTitle = document.querySelector('#confirm-title');
const confirmMessage = document.querySelector('#confirm-message');
const cancelConfirmButton = document.querySelector('#cancel-confirm-button');
const acceptConfirmButton = document.querySelector('#accept-confirm-button');
const todayLabel = document.querySelector('#today-label');
const themeColor = document.querySelector('#theme-color');
const shortcutDock = document.querySelector('#shortcut-dock');
const shortcutDockToggle = document.querySelector('#shortcut-dock-toggle');
const panelElement = document.querySelector('.panel');

const {
  normalizeLanguage,
  normalizeDesign,
  themeForDesign,
  normalizeFont,
  translate,
} = globalThis.RandnotizenI18n;
let currentLanguage = 'de';
let currentDesign = 'paper';
let currentFont = 'inter';
let settingsLanguage = 'de';
let settingsDesign = 'paper';
let settingsFont = 'inter';
let availableDisplays = [];
let openedSettings = null;
let workspace = createDefaultWorkspace();
let resolveConfirmation = null;
let selectedShortcutListId = null;
let selectedShortcutItemId = null;
let dragState = null;
let renderMotion = null;
let hasPlayedPanelOpening = false;
const collapsedDescriptionItemIds = new Set();
const collapsedDetailItemIds = new Set();

function textScaleForHeight(viewportHeight) {
  return Math.min(1.42, Math.max(1.25, 1.05 + (viewportHeight / 6000)));
}

function updateTextScale() {
  const viewportHeight = document.documentElement.clientHeight || 1080;
  const scale = textScaleForHeight(viewportHeight);
  document.documentElement.style.setProperty('--text-scale', scale.toFixed(3));
  document.documentElement.dataset.textScale = scale.toFixed(3);
}

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
  const themeColors = {
    paper: '#f3ead7', dark: '#111720', blueprint: '#082c5b', sunset: '#fff0c7',
    pastel: '#fff4fa', newspaper: '#e8e2d5', neon: '#100b21', minimal: '#fcfcfa',
  };
  document.documentElement.dataset.design = currentDesign;
  document.documentElement.dataset.theme = theme;
  themeColor.content = themeColors[currentDesign];
}

function applyFont(font) {
  currentFont = normalizeFont(font);
  document.documentElement.dataset.font = currentFont;
}

function selectSettingsDesign(design) {
  settingsDesign = normalizeDesign(design);
  for (const option of designOptions) option.checked = option.value === settingsDesign;
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

function trashEntryLabel(entry) {
  const typeKey = `deleted${entry.type[0].toUpperCase()}${entry.type.slice(1)}`;
  return `${settingsT(typeKey)} · ${entry.value.title || entry.value.text}`;
}

function renderTrash() {
  const entries = [...workspace.trash].reverse();
  trashCount.textContent = `${entries.length}`;
  trashList.replaceChildren();
  undoButton.disabled = !entries.length;
  emptyTrashButton.disabled = !entries.length;
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'trash-empty';
    empty.textContent = settingsT('trashEmpty');
    trashList.append(empty);
    return;
  }
  for (const entry of entries) {
    const row = document.createElement('div');
    const label = document.createElement('span');
    const restoreButton = document.createElement('button');
    row.className = 'trash-entry';
    label.textContent = trashEntryLabel(entry);
    restoreButton.type = 'button';
    restoreButton.className = 'text-button';
    restoreButton.textContent = settingsT('restore');
    restoreButton.addEventListener('click', () => restoreDeletedEntry(entry.id));
    row.append(label, restoreButton);
    trashList.append(row);
  }
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
  const [settings, displays, autostart, version, installPath] = await Promise.all([
    globalThis.notesApp.getSettings(),
    globalThis.notesApp.listDisplays(),
    globalThis.notesApp.getAutostart(),
    globalThis.notesApp.getVersion(),
    globalThis.notesApp.getInstallPath(),
  ]);
  settingsLanguage = normalizeLanguage(settings.language);
  selectSettingsDesign(settings.design);
  settingsFont = normalizeFont(settings.font);
  availableDisplays = displays;
  openedSettings = settings;
  sideSelect.value = settings.side;
  fontSelect.value = settingsFont;
  autostartCheckbox.checked = autostart;
  keepVisibleCheckbox.checked = Boolean(settings.keepVisible);
  versionLabel.textContent = version;
  installPathLabel.textContent = installPath;
  saveStatus.textContent = '';
  localizeSettingsPopover();
  renderSettingsDisplays(settings.displayId);
  renderTrash();
  for (const group of settingsGroups) group.open = false;
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
    applyDesign(openedSettings.design);
    applyFont(openedSettings.font);
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
    version: 4,
    activeTopicId: topicId,
    topics: [{ id: topicId, title: t('general'), lists: [] }],
    trash: [],
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
    priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'none',
    archived: Boolean(item.archived),
    steps: Array.isArray(item.steps) ? item.steps.map(migrateStep).filter(Boolean) : [],
  };
}

function migrateTrashEntry(entry) {
  if (!entry || !['topic', 'list', 'item', 'step'].includes(entry.type)) return null;
  const migrations = { topic: migrateTopic, list: migrateList, item: migrateItem, step: migrateStep };
  const value = migrations[entry.type](entry.value);
  if (!value) return null;
  return {
    id: typeof entry.id === 'string' ? entry.id : createId(),
    type: entry.type,
    parentId: typeof entry.parentId === 'string' ? entry.parentId : null,
    index: Number.isInteger(entry.index) && entry.index >= 0 ? entry.index : 0,
    deletedAt: typeof entry.deletedAt === 'string' ? entry.deletedAt : new Date().toISOString(),
    value,
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
      version: 4,
      activeTopicId: topics.some((topic) => topic.id === loaded.activeTopicId)
        ? loaded.activeTopicId
        : topics[0].id,
      topics,
      trash: Array.isArray(loaded.trash) ? loaded.trash.map(migrateTrashEntry).filter(Boolean) : [],
    };
  }

  if (Array.isArray(loaded) && loaded.length) {
    const topicId = createId();
    return {
      version: 4,
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
            priority: 'none',
            archived: false,
            steps: [],
          })),
        }],
      }],
      trash: [],
    };
  }

  return createDefaultWorkspace();
}

function activeTopic() {
  return workspace.topics.find((topic) => topic.id === workspace.activeTopicId) || null;
}

function findList(listId) {
  return workspace.topics.flatMap((topic) => topic.lists)
    .find((list) => list.id === listId) || null;
}

function findItem(itemId) {
  return workspace.topics.flatMap((topic) => topic.lists)
    .flatMap((list) => list.items)
    .find((item) => item.id === itemId) || null;
}

function moveToTrash(type, value, parentId, index) {
  workspace.trash.push({
    id: createId(),
    type,
    parentId,
    index,
    deletedAt: new Date().toISOString(),
    value: structuredClone(value),
  });
}

function insertAt(items, index, value) {
  items.splice(Math.min(index, items.length), 0, value);
}

function restoreTrashEntry(entry) {
  if (entry.type === 'topic') {
    insertAt(workspace.topics, entry.index, entry.value);
    workspace.activeTopicId ||= entry.value.id;
    return true;
  }
  if (entry.type === 'list') {
    const topic = workspace.topics.find((candidate) => candidate.id === entry.parentId);
    if (!topic) return false;
    insertAt(topic.lists, entry.index, entry.value);
    return true;
  }
  if (entry.type === 'item') {
    const list = findList(entry.parentId);
    if (!list) return false;
    insertAt(list.items, entry.index, entry.value);
    return true;
  }
  const item = findItem(entry.parentId);
  if (!item) return false;
  insertAt(item.steps, entry.index, entry.value);
  return true;
}

async function restoreDeletedEntry(entryId) {
  const index = workspace.trash.findIndex((entry) => entry.id === entryId);
  if (index < 0) return false;
  const [entry] = workspace.trash.splice(index, 1);
  if (!restoreTrashEntry(entry)) {
    workspace.trash.splice(index, 0, entry);
    backupStatus.textContent = settingsT('restoreFailed');
    return false;
  }
  await persist();
  render();
  renderTrash();
  return true;
}

async function undoLastDelete() {
  const lastEntry = workspace.trash.at(-1);
  if (lastEntry) await restoreDeletedEntry(lastEntry.id);
}

function moveArrayEntry(items, sourceId, targetId) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false;
  const [source] = items.splice(sourceIndex, 1);
  items.splice(targetIndex, 0, source);
  return true;
}

function configureSortable(element, { type, parentId, id, items }) {
  element.draggable = true;
  element.addEventListener('dragstart', (event) => {
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `${type}:${parentId}:${id}`);
    }
    dragState = { type, parentId, id };
    element.classList.add('dragging');
  });
  element.addEventListener('dragover', (event) => {
    if (dragState?.type !== type || dragState.parentId !== parentId) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    element.classList.add('drag-over');
  });
  element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
  element.addEventListener('drop', async (event) => {
    event.stopPropagation();
    event.preventDefault();
    element.classList.remove('drag-over');
    if (dragState?.type !== type || dragState.parentId !== parentId) return;
    if (moveArrayEntry(items, dragState.id, id)) {
      await persist();
      render();
    }
  });
  element.addEventListener('dragend', (event) => {
    event.stopPropagation();
    dragState = null;
    element.classList.remove('dragging');
    for (const candidate of document.querySelectorAll('.drag-over')) candidate.classList.remove('drag-over');
  });
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
  return calculateProgress(topic.lists.flatMap((list) => list.items.filter((item) => !item.archived)));
}

function cardStyle(id) {
  const value = [...id].reduce((sum, character) => sum + character.codePointAt(0), 0);
  return `style-${value % 4}`;
}

async function persist() {
  await globalThis.notesApp.saveWorkspace(workspace);
}

function askToDelete(title, message, acceptKey = 'delete') {
  if (resolveConfirmation) resolveConfirmation(false);
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  acceptConfirmButton.textContent = t(acceptKey);
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
    button.classList.toggle('motion-enter', renderMotion?.type === 'topic-change' && topic.id === workspace.activeTopicId);
    button.textContent = topic.title;
    configureSortable(button, {
      type: 'topic', parentId: 'workspace', id: topic.id, items: workspace.topics,
    });
    button.addEventListener('click', async () => {
      workspace.activeTopicId = topic.id;
      selectedShortcutItemId = null;
      renderMotion = { type: 'topic-change' };
      await persist();
      render();
    });
    topicTabs.append(button);
  }
}

function createStepElement(item, step) {
  const row = document.createElement('li');
  row.className = 'substep-item';
  row.dataset.stepId = step.id;
  row.classList.toggle('completed', step.completed);
  row.classList.toggle('motion-enter', renderMotion?.type === 'step-add' && renderMotion.id === step.id);
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  const text = document.createElement('span');
  const removeButton = document.createElement('button');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox substep-checkbox';
  checkbox.checked = step.completed;
  checkbox.disabled = item.completed;
  text.className = 'substep-text';
  text.textContent = step.text;
  removeButton.type = 'button';
  removeButton.className = 'remove-substep-button';
  removeButton.textContent = '×';
  removeButton.disabled = item.completed;
  removeButton.setAttribute('aria-label', t('deleteStep'));
  removeButton.title = t('deleteStep');
  label.append(checkbox, text);
  row.append(label, removeButton);
  configureSortable(row, {
    type: 'step', parentId: item.id, id: step.id, items: item.steps,
  });

  checkbox.addEventListener('change', async () => {
    if (item.completed) return;
    step.completed = checkbox.checked;
    await persist();
    render();
  });
  removeButton.addEventListener('click', async () => {
    if (item.completed) return;
    moveToTrash('step', step, item.id, item.steps.indexOf(step));
    item.steps = item.steps.filter((candidate) => candidate.id !== step.id);
    await persist();
    render();
  });
  return row;
}

function closePriorityMenus() {
  for (const menu of document.querySelectorAll('.priority-menu:not([hidden])')) {
    menu.hidden = true;
    menu.closest('.priority-control')?.querySelector('.priority-sticker')
      ?.setAttribute('aria-expanded', 'false');
  }
}

function createItemElement(topic, list, item, itemNumber) {
  const row = itemTemplate.content.querySelector('.checklist-item').cloneNode(true);
  localizeElements(row);
  const checkbox = row.querySelector('.task-checkbox');
  const number = row.querySelector('.item-number');
  const text = row.querySelector('.item-text');
  const priorityControl = row.querySelector('.priority-control');
  const prioritySticker = row.querySelector('.priority-sticker');
  const priorityMenu = row.querySelector('.priority-menu');
  const detailsToggle = row.querySelector('.item-details-toggle');
  const detailsPanel = row.querySelector('.item-details');
  const descriptionToggle = row.querySelector('.item-description-toggle');
  const description = row.querySelector('.item-description');
  const stepsElement = row.querySelector('.substep-items');
  const stepForm = row.querySelector('.substep-form');
  const stepInput = stepForm.querySelector('input');
  const stepSubmitButton = stepForm.querySelector('button');
  checkbox.checked = item.completed;
  row.dataset.itemId = item.id;
  number.textContent = `${itemNumber}.`;
  text.textContent = item.text;
  prioritySticker.className = `priority-sticker priority-${item.priority}`;
  prioritySticker.textContent = item.priority === 'none'
    ? t('priority')
    : t(`priority${item.priority[0].toUpperCase()}${item.priority.slice(1)}`);
  row.classList.toggle('completed', item.completed);
  row.classList.toggle('keyboard-selected', item.id === selectedShortcutItemId);
  row.classList.toggle('motion-enter', renderMotion?.type === 'item-add' && renderMotion.id === item.id);
  description.value = item.details;
  description.disabled = item.completed;
  stepInput.disabled = item.completed;
  stepSubmitButton.disabled = item.completed;
  description.hidden = collapsedDescriptionItemIds.has(item.id);
  descriptionToggle.textContent = description.hidden ? '+' : '−';
  descriptionToggle.setAttribute('aria-label', t(description.hidden ? 'showTaskNotes' : 'hideTaskNotes'));
  descriptionToggle.setAttribute('aria-expanded', String(!description.hidden));
  detailsPanel.hidden = collapsedDetailItemIds.has(item.id) || !(item.details || item.steps.length);
  detailsToggle.setAttribute('aria-expanded', String(!detailsPanel.hidden));
  for (const step of item.steps) stepsElement.append(createStepElement(item, step));
  if (list.id === selectedShortcutListId && itemNumber <= 9) {
    checkbox.setAttribute('aria-keyshortcuts', `Control+${itemNumber} Space`);
  }

  row.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    selectShortcutList(list.id);
    selectShortcutItem(itemNumber - 1);
  });
  configureSortable(row, {
    type: 'item', parentId: list.id, id: item.id, items: list.items,
  });

  priorityControl.addEventListener('pointerdown', (event) => event.stopPropagation());
  prioritySticker.addEventListener('click', () => {
    const shouldOpen = priorityMenu.hidden;
    closePriorityMenus();
    priorityMenu.hidden = !shouldOpen;
    prioritySticker.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) {
      priorityMenu.querySelector(`[data-priority="${item.priority}"]`)?.focus();
    }
  });
  priorityControl.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || priorityMenu.hidden) return;
    event.preventDefault();
    closePriorityMenus();
    prioritySticker.focus();
  });
  for (const option of priorityMenu.querySelectorAll('[data-priority]')) {
    option.addEventListener('click', async () => {
      item.priority = option.dataset.priority;
      closePriorityMenus();
      await persist();
      render();
    });
  }

  detailsToggle.addEventListener('click', () => {
    detailsPanel.hidden = !detailsPanel.hidden;
    detailsPanel.classList.toggle('motion-reveal', !detailsPanel.hidden);
    if (detailsPanel.hidden) collapsedDetailItemIds.add(item.id);
    else collapsedDetailItemIds.delete(item.id);
    detailsToggle.setAttribute('aria-expanded', String(!detailsPanel.hidden));
    if (!detailsPanel.hidden) {
      (description.hidden ? descriptionToggle : description).focus();
    }
  });

  descriptionToggle.addEventListener('click', () => {
    description.hidden = !description.hidden;
    description.classList.toggle('motion-reveal', !description.hidden);
    if (description.hidden) collapsedDescriptionItemIds.add(item.id);
    else collapsedDescriptionItemIds.delete(item.id);
    descriptionToggle.textContent = description.hidden ? '+' : '−';
    descriptionToggle.setAttribute('aria-label', t(description.hidden ? 'showTaskNotes' : 'hideTaskNotes'));
    descriptionToggle.setAttribute('aria-expanded', String(!description.hidden));
    if (!description.hidden) description.focus();
  });

  description.addEventListener('change', async () => {
    if (item.completed) {
      description.value = item.details;
      return;
    }
    item.details = description.value.trim();
    await persist();
  });

  stepForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (item.completed) return;
    const stepText = stepInput.value.trim();
    if (!stepText) return stepInput.focus();
    const step = { id: createId(), text: stepText, completed: false };
    item.steps.push(step);
    renderMotion = { type: 'step-add', id: step.id };
    await persist();
    render();
    const updatedRow = listsElement.querySelector(`[data-item-id="${item.id}"]`);
    updatedRow?.querySelector('.substep-form input')?.focus();
  });

  checkbox.addEventListener('change', async () => {
    item.completed = checkbox.checked;
    if (item.completed) collapsedDetailItemIds.add(item.id);
    else collapsedDetailItemIds.delete(item.id);
    await persist();
    render();
  });

  row.querySelector('.remove-item-button').addEventListener('click', async () => {
    moveToTrash('item', item, list.id, list.items.indexOf(item));
    list.items = list.items.filter((candidate) => candidate.id !== item.id);
    await persist();
    render();
  });
  return row;
}

function createArchivedItem(list, item) {
  const row = document.createElement('li');
  const text = document.createElement('span');
  const restoreButton = document.createElement('button');
  row.className = 'archive-item';
  text.textContent = item.text;
  restoreButton.type = 'button';
  restoreButton.className = 'text-button';
  restoreButton.textContent = t('restore');
  restoreButton.setAttribute('aria-label', t('restoreTask'));
  restoreButton.addEventListener('click', async () => {
    item.archived = false;
    await persist();
    render();
  });
  row.append(text, restoreButton);
  return row;
}

function createListElement(topic, list, listIndex = 0) {
  const fragment = listTemplate.content.cloneNode(true);
  localizeElements(fragment);
  const card = fragment.querySelector('.checklist-card');
  const itemsElement = fragment.querySelector('.checklist-items');
  const archiveItemsElement = fragment.querySelector('.archive-items');
  const archiveCompletedButton = fragment.querySelector('.archive-completed-button');
  const activeItems = list.items.filter((item) => !item.archived);
  const archivedItems = list.items.filter((item) => item.archived);
  const progress = calculateProgress(activeItems);
  card.classList.add(cardStyle(list.id));
  card.classList.toggle('keyboard-active', list.id === selectedShortcutListId);
  const animateCard = renderMotion?.type === 'topic-change'
    || (renderMotion?.type === 'list-add' && renderMotion.id === list.id);
  card.classList.toggle('motion-enter', animateCard);
  if (animateCard) card.style.setProperty('--motion-index', `${listIndex}`);
  card.dataset.listId = list.id;
  card.addEventListener('pointerdown', () => selectShortcutList(list.id));
  configureSortable(card, {
    type: 'list', parentId: topic.id, id: list.id, items: topic.lists,
  });
  fragment.querySelector('h3').textContent = list.title;
  fragment.querySelector('.list-progress .progress-track span').style.width = `${progress.percent}%`;
  fragment.querySelector('.list-progress strong').textContent = `${progress.completed}/${progress.total}`;

  if (activeItems.length) {
    activeItems.forEach((item, index) => itemsElement.append(createItemElement(topic, list, item, index + 1)));
  } else {
    const empty = document.createElement('li');
    empty.className = 'empty-list';
    empty.textContent = t('emptyList');
    itemsElement.append(empty);
  }

  fragment.querySelector('.archive-count').textContent = `${archivedItems.length}`;
  if (archivedItems.length) {
    for (const item of archivedItems) archiveItemsElement.append(createArchivedItem(list, item));
  } else {
    const empty = document.createElement('li');
    empty.className = 'archive-empty';
    empty.textContent = t('archiveEmpty');
    archiveItemsElement.append(empty);
  }
  archiveCompletedButton.disabled = !activeItems.some((item) => item.completed);
  archiveCompletedButton.addEventListener('click', async () => {
    for (const item of activeItems) {
      if (item.completed) item.archived = true;
    }
    selectedShortcutItemId = null;
    await persist();
    render();
  });

  fragment.querySelector('.delete-list-button').addEventListener('click', async () => {
    const accepted = await askToDelete(
      t('detachListTitle'),
      t('detachListMessage', { title: list.title }),
    );
    if (!accepted) return;
    moveToTrash('list', list, topic.id, topic.lists.indexOf(list));
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
    const item = {
      id: createId(), text, completed: false, details: '', priority: 'none', archived: false, steps: [],
    };
    list.items.push(item);
    renderMotion = { type: 'item-add', id: item.id };
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

  topic.lists.forEach((list, index) => listsElement.append(createListElement(topic, list, index)));
}

function render() {
  renderTopics();
  renderActiveTopic();
  renderMotion = null;
}

topicForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = topicInput.value.trim();
  if (!title) return topicInput.focus();
  const topic = { id: createId(), title, lists: [] };
  workspace.topics.push(topic);
  workspace.activeTopicId = topic.id;
  renderMotion = { type: 'topic-change' };
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
  const list = { id: createId(), title, items: [] };
  topic.lists.push(list);
  renderMotion = { type: 'list-add', id: list.id };
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
  moveToTrash('topic', topic, null, workspace.topics.indexOf(topic));
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
  renderTrash();
});

exportButton.addEventListener('click', async () => {
  backupStatus.textContent = '';
  try {
    await persist();
    const result = await globalThis.notesApp.exportWorkspace();
    backupStatus.textContent = settingsT(result.canceled ? 'backupCanceled' : 'backupSaved');
  } catch {
    backupStatus.textContent = settingsT('backupFailed');
  }
});

importButton.addEventListener('click', async () => {
  const accepted = await askToDelete(
    settingsT('backupRestoreTitle'),
    settingsT('backupRestoreMessage'),
    'restore',
  );
  if (!accepted) return;
  try {
    const result = await globalThis.notesApp.importWorkspace();
    if (result.canceled) {
      backupStatus.textContent = settingsT('backupCanceled');
      return;
    }
    workspace = migrateWorkspace(result.workspace);
    selectedShortcutItemId = null;
    selectedShortcutListId = null;
    await persist();
    render();
    renderTrash();
    backupStatus.textContent = settingsT('backupRestored');
  } catch {
    backupStatus.textContent = settingsT('backupFailed');
  }
});

undoButton.addEventListener('click', undoLastDelete);
emptyTrashButton.addEventListener('click', async () => {
  const accepted = await askToDelete(
    settingsT('emptyTrashTitle'),
    settingsT('emptyTrashMessage'),
  );
  if (!accepted) return;
  workspace.trash = [];
  await persist();
  renderTrash();
});

for (const option of designOptions) {
  option.addEventListener('change', () => {
    if (!option.checked) return;
    selectSettingsDesign(option.value);
    applyDesign(settingsDesign);
  });
}

fontSelect.addEventListener('change', () => {
  settingsFont = normalizeFont(fontSelect.value);
  applyFont(settingsFont);
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
  if (matchesModifiers(event, { control: true }) && event.code === 'KeyZ' && !isTypingTarget(event.target)) {
    event.preventDefault();
    undoLastDelete();
    return;
  }
  if (!confirmOverlay.hidden || !settingsOverlay.hidden) return;
  if (handleTaskNumberShortcut(event)) return;
  if (handleTaskNavigationShortcut(event)) return;
  if (handleTaskToggleShortcut(event)) return;

  focusShortcutTarget(event, inputShortcutTarget(event));
});

document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.priority-control')) closePriorityMenus();
});

function toggleShortcutDock() {
  const collapsed = shortcutDock.classList.toggle('collapsed');
  shortcutDockToggle.setAttribute('aria-expanded', String(!collapsed));
}

shortcutDockToggle.addEventListener('click', toggleShortcutDock);

document.querySelector('#hide-button').addEventListener('click', globalThis.notesApp.hide);
document.querySelector('#open-settings-button').addEventListener('click', openSettingsPopover);

globalThis.notesApp.onPanelState(({ open }) => {
  if (!open) {
    panelElement.classList.remove('panel-opening');
    settingsOverlay.hidden = true;
    if (openedSettings) {
      document.documentElement.dataset.side = openedSettings.side;
      applyDesign(openedSettings.design);
      applyFont(openedSettings.font);
    }
  }
  if (open && !hasPlayedPanelOpening) {
    hasPlayedPanelOpening = true;
    panelElement.classList.remove('panel-opening');
    requestAnimationFrame(() => requestAnimationFrame(() => panelElement.classList.add('panel-opening')));
  }
  if (open && !workspace.topics.length) setTimeout(() => topicInput.focus(), 100);
});
globalThis.notesApp.onLanguageChanged((language) => {
  applyLanguage(language);
  render();
});
globalThis.notesApp.onDesignChanged(applyDesign);

async function initialize() {
  updateTextScale();
  await loadPanelSettings();
  const loaded = await globalThis.notesApp.loadWorkspace();
  workspace = migrateWorkspace(loaded);
  await persist();
  render();
}

document.defaultView?.addEventListener('resize', updateTextScale);
document.addEventListener('DOMContentLoaded', initialize, { once: true });
