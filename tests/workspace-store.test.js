const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWorkspaceStore } = require('../src/workspace-store');

test('SQLite store migrates legacy JSON without modifying the source file', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'randnotizen-store-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const legacyPath = path.join(directory, 'workspace.json');
  const databasePath = path.join(directory, 'workspace.sqlite');
  const legacyWorkspace = {
    version: 2,
    activeTopicId: 'topic-1',
    topics: [{
      id: 'topic-1',
      title: 'Projekt',
      lists: [{
        id: 'list-1',
        title: 'Heute',
        items: [{ id: 'item-1', text: 'Testen', completed: false }],
      }],
    }],
  };
  const legacyJson = JSON.stringify(legacyWorkspace, null, 2);
  fs.writeFileSync(legacyPath, legacyJson, 'utf8');
  const store = createWorkspaceStore({ databasePath, legacyPaths: [legacyPath] });

  assert.deepEqual(store.loadWorkspace(), legacyWorkspace);
  const migratedWorkspace = structuredClone(legacyWorkspace);
  migratedWorkspace.version = 3;
  migratedWorkspace.topics[0].lists[0].items[0].details = 'Vor dem Release prüfen';
  migratedWorkspace.topics[0].lists[0].items[0].steps = [
    { id: 'step-1', text: 'Smoke-Test', completed: true },
  ];
  store.saveWorkspace(migratedWorkspace);

  assert.deepEqual(store.loadWorkspace(), migratedWorkspace);
  assert.equal(fs.readFileSync(legacyPath, 'utf8'), legacyJson);
  assert.throws(() => store.saveWorkspace(null), /Ungültige Arbeitsbereichsdaten/);
  store.close();
});

test('SQLite store persists an intentionally empty workspace instead of reimporting legacy data', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'randnotizen-empty-store-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const legacyPath = path.join(directory, 'notes.json');
  fs.writeFileSync(legacyPath, JSON.stringify([{ title: 'Alt' }]), 'utf8');
  const store = createWorkspaceStore({
    databasePath: path.join(directory, 'workspace.sqlite'),
    legacyPaths: [legacyPath],
  });
  const emptyWorkspace = { version: 3, activeTopicId: null, topics: [] };

  store.saveWorkspace(emptyWorkspace);

  assert.deepEqual(store.loadWorkspace(), emptyWorkspace);
  store.close();
});
