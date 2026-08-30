const { contextBridge } = require('electron');

const sampleWorkspace = {
  version: 2,
  activeTopicId: 'topic-project',
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
              details: 'Freigabe und offene Fragen dokumentieren.',
              steps: [
                { id: 'step-review', text: 'Review abschließen', completed: true },
                { id: 'step-signoff', text: 'Freigabe notieren', completed: true },
              ],
            },
            { id: 'item-testing', text: 'App gründlich testen', completed: false },
            { id: 'item-readme', text: 'README mit Bildern schreiben', completed: false },
          ],
        },
        {
          id: 'list-release',
          title: 'Release',
          items: [
            { id: 'item-build', text: 'Windows-Build erstellen', completed: true },
            { id: 'item-icon', text: 'Anwendungsicon kontrollieren', completed: false },
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
  getSettings: async () => ({
    displayId: 'primary',
    side: 'right',
    language: 'de',
    design: 'paper',
    font: 'segoe',
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
  getVersion: async () => '0.1.23',
  hide: () => undefined,
  onPanelState: (callback) => { panelCallbacks.panelState = callback; },
  onLanguageChanged: (callback) => { panelCallbacks.language = callback; },
  onDesignChanged: (callback) => { panelCallbacks.design = callback; },
});
