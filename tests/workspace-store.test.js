const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
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
  migratedWorkspace.version = 6;
  migratedWorkspace.trash = [{
    id: 'trash-1', type: 'step', parentId: 'item-1', index: 0, deletedAt: '2026-08-31T00:00:00.000Z',
    value: { id: 'deleted-step', text: 'Dokumentieren', completed: false },
  }];
  migratedWorkspace.topics[0].lists[0].items[0].details = 'Vor dem Release prüfen';
  migratedWorkspace.topics[0].lists[0].items[0].priority = 'high';
  migratedWorkspace.topics[0].lists[0].items[0].archived = true;
  migratedWorkspace.topics[0].lists[0].items[0].image = {
    name: 'check.png', dataUrl: 'data:image/png;base64,AQID',
  };
  migratedWorkspace.topics[0].lists[0].items[0].dueDate = '2030-01-02';
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
  const emptyWorkspace = { version: 6, activeTopicId: null, topics: [], trash: [] };

  store.saveWorkspace(emptyWorkspace);

  assert.deepEqual(store.loadWorkspace(), emptyWorkspace);
  store.close();
});

test('SQLite store upgrades an existing schema 3 database in place', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'randnotizen-schema-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const databasePath = path.join(directory, 'workspace.sqlite');
  const oldDatabase = new DatabaseSync(databasePath);
  oldDatabase.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    CREATE TABLE topics (id TEXT PRIMARY KEY, title TEXT NOT NULL, sort_order INTEGER NOT NULL) STRICT;
    CREATE TABLE lists (id TEXT PRIMARY KEY, topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE, title TEXT NOT NULL, sort_order INTEGER NOT NULL) STRICT;
    CREATE TABLE items (id TEXT PRIMARY KEY, list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE, text TEXT NOT NULL, completed INTEGER NOT NULL, details TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL) STRICT;
    CREATE TABLE task_steps (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE, text TEXT NOT NULL, completed INTEGER NOT NULL, sort_order INTEGER NOT NULL) STRICT;
    INSERT INTO metadata VALUES ('workspace_version', '3');
    INSERT INTO metadata VALUES ('active_topic_id', 'topic-1');
    INSERT INTO metadata VALUES ('trash', '{');
    INSERT INTO topics VALUES ('topic-1', 'Altbestand', 0);
    INSERT INTO lists VALUES ('list-1', 'topic-1', 'Liste', 0);
    INSERT INTO items VALUES ('item-1', 'list-1', 'Aufgabe', 0, '', 0);
  `);
  oldDatabase.close();

  const store = createWorkspaceStore({ databasePath });
  const loaded = store.loadWorkspace();

  assert.equal(loaded.version, 6);
  assert.deepEqual(loaded.trash, []);
  assert.equal(loaded.topics[0].lists[0].items[0].priority, 'none');
  assert.equal(loaded.topics[0].lists[0].items[0].archived, false);
  assert.equal(loaded.topics[0].lists[0].items[0].image, null);
  assert.equal(loaded.topics[0].lists[0].items[0].dueDate, '');
  store.close();
});
