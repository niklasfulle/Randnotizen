(function initializeTranslations(globalObject) {
const messagePairs = {
  brandEyebrow: ['DEIN GEDANKENRAND', 'YOUR THOUGHTS, CLOSE BY'],
  brandLineOne: ['RAND', 'EDGE'],
  brandLineTwo: ['NOTIZEN', 'NOTES'],
  hide: ['Ausblenden', 'Hide'],
  hideShortcut: ['Ausblenden (Strg + Alt + N)', 'Hide (Ctrl + Alt + N)'],
  settings: ['EINSTELLUNGEN', 'SETTINGS'],
  settingsTitle: ['Einstellungen', 'Settings'],
  settingsEyebrow: ['RANDNOTIZEN KONFIGURIEREN', 'CONFIGURE EDGE NOTES'],
  closeSettings: ['Einstellungen schließen', 'Close settings'],
  display: ['Bildschirm', 'Display'],
  side: ['Seite', 'Side'],
  left: ['Links', 'Left'],
  right: ['Rechts', 'Right'],
  topics: ['THEMEN', 'TOPICS'],
  newTopic: ['Neues Thema …', 'New topic …'],
  newTopicAria: ['Neues Thema', 'New topic'],
  newTopicShortcut: ['Neues Thema (Strg + Umschalt + T)', 'New topic (Ctrl + Shift + T)'],
  addTopic: ['Thema hinzufügen', 'Add topic'],
  currentTopic: ['AKTUELLES THEMA', 'CURRENT TOPIC'],
  deleteTopic: ['Thema löschen', 'Delete topic'],
  listsAria: ['Listen im gewählten Thema', 'Lists in the selected topic'],
  lists: ['LISTEN', 'LISTS'],
  newList: ['Neue Liste …', 'New list …'],
  newListAria: ['Neue Liste', 'New list'],
  newListShortcut: ['Neue Liste (Strg + Umschalt + L)', 'New list (Ctrl + Shift + L)'],
  addList: ['LISTE +', 'LIST +'],
  confirmEyebrow: ['BIST DU SICHER?', 'ARE YOU SURE?'],
  confirmTitle: ['Wirklich löschen?', 'Really delete?'],
  cancel: ['ABBRECHEN', 'CANCEL'],
  delete: ['LÖSCHEN', 'DELETE'],
  shortcutsAria: ['Tastenkombinationen', 'Keyboard shortcuts'],
  shortcuts: ['SHORTCUTS', 'SHORTCUTS'],
  controlKey: ['Strg', 'Ctrl'],
  shortcutApp: ['App', 'App'],
  shortcutTopic: ['Thema', 'Topic'],
  shortcutList: ['Liste', 'List'],
  shortcutTasks: ['Liste wählen', 'Select list'],
  shortcutSelectTask: ['Punkt wählen', 'Select item'],
  shortcutNavigateTasks: ['Navigieren', 'Navigate'],
  shortcutToggleTask: ['Abhaken', 'Toggle'],
  spaceKey: ['Leertaste', 'Space'],
  deleteList: ['Liste löschen', 'Delete list'],
  addTaskPlaceholder: ['Aufgabe hinzufügen …', 'Add a task …'],
  newTask: ['Neue Aufgabe', 'New task'],
  addTask: ['Aufgabe hinzufügen', 'Add task'],
  deleteTask: ['Aufgabe löschen', 'Delete task'],
  taskDetails: ['DETAILS', 'DETAILS'],
  taskDetailsAria: ['Aufgabendetails öffnen oder schließen', 'Open or close task details'],
  taskDescription: ['Zusätzlicher Text', 'Additional text'],
  taskDescriptionPlaceholder: ['Notizen zu dieser Aufgabe …', 'Notes for this task …'],
  requiredSteps: ['BENÖTIGTE SCHRITTE', 'REQUIRED STEPS'],
  newStep: ['Neuer Schritt', 'New step'],
  addStepPlaceholder: ['Schritt hinzufügen …', 'Add a step …'],
  addStep: ['Schritt hinzufügen', 'Add step'],
  deleteStep: ['Schritt löschen', 'Delete step'],
  general: ['Allgemein', 'General'],
  untitled: ['Ohne Titel', 'Untitled'],
  imported: ['Importiert', 'Imported'],
  oldNotes: ['Alte Notizen', 'Old notes'],
  note: ['Notiz', 'Note'],
  primaryAuto: ['Primärbildschirm (automatisch)', 'Primary display (automatic)'],
  primary: ['Primär', 'Primary'],
  emptyList: ['Noch leer — füge die erste Aufgabe hinzu.', 'Nothing here yet — add the first task.'],
  detachListTitle: ['Liste ablösen?', 'Remove this list?'],
  detachListMessage: ['„{title}“ und alle enthaltenen Aufgaben werden gelöscht.', '“{title}” and all of its tasks will be deleted.'],
  addTaskShortcut: ['Aufgabe hinzufügen (Alt + {number})', 'Add task (Alt + {number})'],
  firstTopic: ['Lege zuerst ein Thema an.', 'Create a topic first.'],
  tasksProgress: ['{completed} von {total} Aufgaben erledigt', '{completed} of {total} tasks completed'],
  noTasks: ['Noch keine Aufgaben', 'No tasks yet'],
  listOne: ['Liste', 'list'],
  listMany: ['Listen', 'lists'],
  emptyTopic: ['Dieses Thema ist noch leer. Starte mit einer Liste.', 'This topic is empty. Start with a list.'],
  detachTopicTitle: ['Thema ablösen?', 'Remove this topic?'],
  detachTopicMessage: ['„{title}“ und alle enthaltenen Listen werden gelöscht.', '“{title}” and all of its lists will be deleted.'],
  trayOpen: ['Randnotizen öffnen', 'Open Edge Notes'],
  lightTheme: ['Hell', 'Light'],
  darkTheme: ['Dunkel', 'Dark'],
  switchLanguage: ['Sprache wechseln', 'Switch language'],
  language: ['Sprache', 'Language'],
  design: ['Design', 'Design'],
  designPaper: ['Papier-Collage', 'Paper collage'],
  designDark: ['Nacht-Collage', 'Night collage'],
  font: ['Schriftart', 'Font'],
  keepVisible: ['Bei Fokusverlust geöffnet lassen', 'Keep open when focus is lost'],
  keepVisibleHint: ['Strg + Alt + N setzt den Fokus wieder auf Randnotizen.', 'Ctrl + Alt + N focuses Edge Notes again.'],
  autostart: ['Mit Windows starten', 'Start with Windows'],
  autostartHint: ['Randnotizen startet nach der Anmeldung automatisch im Infobereich.', 'Edge Notes starts automatically in the notification area after sign-in.'],
  version: ['Version', 'Version'],
  copyright: ['© 2026 Urheberrecht: Niklas Fulle', '© 2026 Copyright: Niklas Fulle'],
  saveSettings: ['EINSTELLUNGEN SPEICHERN', 'SAVE SETTINGS'],
  settingsSaved: ['Einstellungen gespeichert.', 'Settings saved.'],
  german: ['Deutsch', 'German'],
  english: ['Englisch', 'English'],
  trayExit: ['Beenden', 'Exit'],
  trayTooltip: ['Randnotizen · Strg + Alt + N', 'Edge Notes · Ctrl + Alt + N'],
};

const messages = Object.fromEntries(['de', 'en'].map((language, languageIndex) => [
  language,
  Object.fromEntries(Object.entries(messagePairs).map(([key, values]) => [key, values[languageIndex]])),
]));

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'de';
}

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light';
}

function normalizeDesign(design) {
  return design === 'dark' ? 'dark' : 'paper';
}

function themeForDesign(design) {
  return normalizeDesign(design) === 'dark' ? 'dark' : 'light';
}

function normalizeFont(font) {
  return ['segoe', 'arial', 'verdana', 'georgia', 'courier'].includes(font) ? font : 'segoe';
}

function translate(language, key, variables = {}) {
  const normalized = normalizeLanguage(language);
  const template = messages[normalized][key] ?? messages.de[key] ?? key;
  return template.replaceAll(/\{(\w+)\}/g, (_match, name) => String(variables[name] ?? `{${name}}`));
}

const translations = {
  messages,
  normalizeLanguage,
  normalizeTheme,
  normalizeDesign,
  themeForDesign,
  normalizeFont,
  translate,
};

if (typeof module !== 'undefined' && module.exports) module.exports = translations;
globalObject.RandnotizenI18n = translations;
}(globalThis));
