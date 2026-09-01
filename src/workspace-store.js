const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
    details TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
    archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
    image_name TEXT NOT NULL DEFAULT '',
    image_data TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS task_steps (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
    sort_order INTEGER NOT NULL
  ) STRICT;
`;

const WORKSPACE_VERSION = 6;

function ensureItemColumns(database) {
  const columns = new Set(database.prepare('PRAGMA table_info(items)').all().map(({ name }) => name));
  if (!columns.has('priority')) {
    database.exec("ALTER TABLE items ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'");
  }
  if (!columns.has('archived')) {
    database.exec('ALTER TABLE items ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
  }
  if (!columns.has('image_name')) {
    database.exec("ALTER TABLE items ADD COLUMN image_name TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.has('image_data')) {
    database.exec("ALTER TABLE items ADD COLUMN image_data TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.has('due_date')) {
    database.exec("ALTER TABLE items ADD COLUMN due_date TEXT NOT NULL DEFAULT ''");
  }
}

function validateWorkspace(workspace) {
  if (!workspace || typeof workspace !== 'object' || !Array.isArray(workspace.topics)) {
    throw new Error('Ungültige Arbeitsbereichsdaten');
  }
}

function readLegacyWorkspace(legacyPaths, fileSystem) {
  for (const legacyPath of legacyPaths) {
    try {
      return JSON.parse(fileSystem.readFileSync(legacyPath, 'utf8'));
    } catch {
      // Try the next legacy location. Original files remain untouched as backups.
    }
  }
  return null;
}

function insertSteps(item, insertStep) {
  const steps = Array.isArray(item.steps) ? item.steps : [];
  for (const [stepIndex, step] of steps.entries()) {
    insertStep.run(step.id, item.id, step.text, Number(Boolean(step.completed)), stepIndex);
  }
}

function insertItems(list, insertItem, insertStep) {
  for (const [itemIndex, item] of list.items.entries()) {
    insertItem.run(
      item.id,
      list.id,
      item.text,
      Number(Boolean(item.completed)),
      typeof item.details === 'string' ? item.details : '',
      ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'none',
      Number(Boolean(item.archived)),
      typeof item.image?.name === 'string' ? item.image.name : '',
      typeof item.image?.dataUrl === 'string' ? item.image.dataUrl : '',
      typeof item.dueDate === 'string' ? item.dueDate : '',
      itemIndex,
    );
    insertSteps(item, insertStep);
  }
}

function insertLists(topic, insertList, insertItem, insertStep) {
  for (const [listIndex, list] of topic.lists.entries()) {
    insertList.run(list.id, topic.id, list.title, listIndex);
    insertItems(list, insertItem, insertStep);
  }
}

function insertTopics(topics, insertTopic, insertList, insertItem, insertStep) {
  for (const [topicIndex, topic] of topics.entries()) {
    insertTopic.run(topic.id, topic.title, topicIndex);
    insertLists(topic, insertList, insertItem, insertStep);
  }
}

function createWorkspaceStore({ databasePath, legacyPaths = [], fileSystem = fs }) {
  const database = new DatabaseSync(databasePath);
  database.exec(SCHEMA);
  ensureItemColumns(database);

  function getMetadata(key) {
    const value = database.prepare('SELECT value FROM metadata WHERE key = ?').get(key)?.value;
    return String(value ?? '');
  }

  function loadWorkspace() {
    if (!getMetadata('workspace_version')) {
      return readLegacyWorkspace(legacyPaths, fileSystem);
    }

    const topics = database.prepare('SELECT id, title FROM topics ORDER BY sort_order').all()
      .map((topic) => ({ ...topic, lists: [] }));
    const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
    const lists = database.prepare('SELECT id, topic_id, title FROM lists ORDER BY sort_order').all()
      .map((list) => ({ id: list.id, title: list.title, items: [] }));
    const listRows = database.prepare('SELECT id, topic_id FROM lists ORDER BY sort_order').all();
    const listsById = new Map(lists.map((list) => [list.id, list]));
    for (const [index, list] of lists.entries()) {
      topicsById.get(listRows[index].topic_id)?.lists.push(list);
    }

    const items = database.prepare(
      'SELECT id, list_id, text, completed, details, priority, archived, image_name, image_data, due_date FROM items ORDER BY sort_order',
    ).all().map((item) => ({
      id: item.id,
      text: item.text,
      completed: Boolean(item.completed),
      details: item.details,
      priority: item.priority,
      archived: Boolean(item.archived),
      image: item.image_data ? { name: item.image_name, dataUrl: item.image_data } : null,
      dueDate: item.due_date,
      steps: [],
    }));
    const itemRows = database.prepare('SELECT id, list_id FROM items ORDER BY sort_order').all();
    const itemsById = new Map(items.map((item) => [item.id, item]));
    for (const [index, item] of items.entries()) {
      listsById.get(itemRows[index].list_id)?.items.push(item);
    }

    const steps = database.prepare(
      'SELECT id, item_id, text, completed FROM task_steps ORDER BY sort_order',
    ).all();
    for (const step of steps) {
      itemsById.get(step.item_id)?.steps.push({
        id: step.id,
        text: step.text,
        completed: Boolean(step.completed),
      });
    }

    let trash = [];
    try {
      const parsedTrash = JSON.parse(getMetadata('trash') || '[]');
      trash = Array.isArray(parsedTrash) ? parsedTrash : [];
    } catch {
      trash = [];
    }

    return {
      version: WORKSPACE_VERSION,
      activeTopicId: getMetadata('active_topic_id') || null,
      topics,
      trash,
    };
  }

  function saveWorkspace(workspace) {
    validateWorkspace(workspace);
    const insertMetadata = database.prepare(
      'INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    const insertTopic = database.prepare(
      'INSERT INTO topics (id, title, sort_order) VALUES (?, ?, ?)',
    );
    const insertList = database.prepare(
      'INSERT INTO lists (id, topic_id, title, sort_order) VALUES (?, ?, ?, ?)',
    );
    const insertItem = database.prepare(
      'INSERT INTO items (id, list_id, text, completed, details, priority, archived, image_name, image_data, due_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const insertStep = database.prepare(
      'INSERT INTO task_steps (id, item_id, text, completed, sort_order) VALUES (?, ?, ?, ?, ?)',
    );

    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec('DELETE FROM topics');
      insertTopics(workspace.topics, insertTopic, insertList, insertItem, insertStep);
      insertMetadata.run('workspace_version', String(WORKSPACE_VERSION));
      insertMetadata.run('active_topic_id', workspace.activeTopicId || '');
      insertMetadata.run('trash', JSON.stringify(Array.isArray(workspace.trash) ? workspace.trash : []));
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  return {
    loadWorkspace,
    saveWorkspace,
    close: () => database.close(),
  };
}

module.exports = { createWorkspaceStore, validateWorkspace };
