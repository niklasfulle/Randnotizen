const { contextBridge } = require('electron');

const sampleWorkspace = {
  version: 6,
  activeTopicId: 'topic-project',
  trash: [{
    id: 'trash-sample',
    type: 'step',
    parentId: 'item-testing',
    index: 0,
    deletedAt: '2026-08-31T10:00:00.000Z',
    value: { id: 'step-old', text: 'Alten Testlauf prüfen', completed: false },
  }],
  topics: [
    {
      id: 'topic-project',
      title: 'Projektstart',
      lists: [
        {
          id: 'list-today',
          title: 'Heute',
          items: [
            {
              id: 'item-concept',
              text: 'Konzept finalisieren',
              completed: true,
              priority: 'high',
              archived: false,
              dueDate: '2026-08-30',
              details: 'Freigabe und offene Fragen dokumentieren.',
              steps: [
                { id: 'step-review', text: 'Review abschließen', completed: true },
                { id: 'step-signoff', text: 'Freigabe notieren', completed: true },
              ],
            },
            { id: 'item-testing', text: 'App gründlich testen', completed: false, priority: 'high', archived: false, dueDate: '2026-09-01' },
            { id: 'item-readme', text: 'README mit Bildern schreiben', completed: false, priority: 'medium', archived: false, dueDate: '2026-09-05' },
          ],
        },
        {
          id: 'list-release',
          title: 'Release',
          items: [
            { id: 'item-build', text: 'Windows-Build erstellen', completed: true, priority: 'none', archived: true },
            { id: 'item-icon', text: 'Anwendungsicon kontrollieren', completed: false, priority: 'low', archived: false },
          ],
        },
      ],
    },
    { id: 'topic-ideas', title: 'Ideen', lists: [] },
    { id: 'topic-private', title: 'Privat', lists: [] },
  ],
};

const panelCallbacks = {};
contextBridge.exposeInMainWorld('notesApp', {
  loadWorkspace: async () => sampleWorkspace,
  saveWorkspace: async () => undefined,
  exportWorkspace: async () => ({ canceled: false, filePath: 'Randnotizen-backup.json' }),
  importWorkspace: async () => ({ canceled: false, workspace: sampleWorkspace }),
  chooseTaskImage: async () => ({ canceled: true }),
  getSettings: async () => ({
    displayId: 'primary',
    side: 'right',
    language: 'de',
    design: 'paper',
    font: 'inter',
    keepVisible: true,
  }),
  updateSettings: async (settings) => settings,
  previewPosition: async (position) => position,
  listDisplays: async () => [
    { id: '1', label: 'Hauptbildschirm', primary: true, size: '2560 × 1440' },
    { id: '2', label: 'Zweiter Bildschirm', primary: false, size: '1920 × 1080' },
  ],
  getAutostart: async () => true,
  setAutostart: async (enabled) => enabled,
  getVersion: async () => '0.2.2',
  getInstallPath: async () => 'C:\\Users\\Niklas\\AppData\\Local\\Programs\\Randnotizen',
  hide: () => undefined,
  onPanelState: (callback) => { panelCallbacks.panelState = callback; },
  onLanguageChanged: (callback) => { panelCallbacks.language = callback; },
  onDesignChanged: (callback) => { panelCallbacks.design = callback; },
});
