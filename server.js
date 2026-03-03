const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, "data", "store.json");

const STATUSES = ["Backlog", "In Progress", "Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function createSeedStore() {
  return {
    projects: [
      {
        id: "demo-project",
        name: "Website Redesign",
        createdAt: "2026-03-01T09:00:00.000Z",
        updatedAt: "2026-03-01T12:40:00.000Z",
        tasks: [
          {
            id: "task-1",
            title: "Collect design references",
            description: "Gather 10 examples from competitors and inspiration sites.",
            assignee: "Alex",
            status: "Backlog",
            priority: "Medium",
            dueDate: "2026-03-09",
            createdAt: "2026-03-01T09:10:00.000Z",
            updatedAt: "2026-03-01T09:10:00.000Z",
          },
          {
            id: "task-2",
            title: "Draft homepage wireframe",
            description: "Build desktop and mobile wireframes in Figma.",
            assignee: "Jordan",
            status: "In Progress",
            priority: "High",
            dueDate: "2026-03-06",
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-01T10:00:00.000Z",
          },
          {
            id: "task-3",
            title: "Approve typography system",
            description: "Review type scale with brand team.",
            assignee: "Taylor",
            status: "Review",
            priority: "Low",
            dueDate: "2026-03-08",
            createdAt: "2026-03-01T11:00:00.000Z",
            updatedAt: "2026-03-01T11:00:00.000Z",
          },
          {
            id: "task-4",
            title: "Define analytics events",
            description: "Document click and conversion events for the new page.",
            assignee: "Sam",
            status: "Done",
            priority: "Critical",
            dueDate: "2026-03-03",
            createdAt: "2026-03-01T12:00:00.000Z",
            updatedAt: "2026-03-01T12:30:00.000Z",
          },
        ],
      },
    ],
  };
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(createSeedStore(), null, 2), "utf-8");
  }
}

async function loadStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw);

  if (!isObject(parsed) || !Array.isArray(parsed.projects)) {
    throw new HttpError(500, "Data store has an invalid shape.");
  }

  return parsed;
}

async function saveStore(store) {
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function validateProjectName(name) {
  if (typeof name !== "string") {
    throw new HttpError(400, "Project name must be a string.");
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new HttpError(400, "Project name cannot be empty.");
  }

  if (trimmed.length > 80) {
    throw new HttpError(400, "Project name cannot exceed 80 characters.");
  }

  return trimmed;
}

function validateDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "Due date must be a string in YYYY-MM-DD format.");
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new HttpError(400, "Due date must follow YYYY-MM-DD format.");
  }

  const parsedDate = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError(400, "Due date is invalid.");
  }

  return trimmed;
}

function validateTaskPayload(payload, { partial = false } = {}) {
  if (!isObject(payload)) {
    throw new HttpError(400, "Task payload must be an object.");
  }

  const allowedFields = ["title", "description", "assignee", "status", "priority", "dueDate"];
  const unknownFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unsupported field(s): ${unknownFields.join(", ")}`);
  }

  if (partial && Object.keys(payload).length === 0) {
    throw new HttpError(400, "At least one task field is required.");
  }

  const updates = {};

  if (!partial || hasOwn(payload, "title")) {
    if (typeof payload.title !== "string") {
      throw new HttpError(400, "Task title must be a string.");
    }

    const title = payload.title.trim();
    if (!title) {
      throw new HttpError(400, "Task title cannot be empty.");
    }

    if (title.length > 120) {
      throw new HttpError(400, "Task title cannot exceed 120 characters.");
    }

    updates.title = title;
  }

  if (hasOwn(payload, "description")) {
    if (typeof payload.description !== "string") {
      throw new HttpError(400, "Task description must be a string.");
    }

    const description = payload.description.trim();
    if (description.length > 2000) {
      throw new HttpError(400, "Task description cannot exceed 2000 characters.");
    }

    updates.description = description;
  }

  if (hasOwn(payload, "assignee")) {
    if (typeof payload.assignee !== "string") {
      throw new HttpError(400, "Assignee must be a string.");
    }

    const assignee = payload.assignee.trim();
    if (assignee.length > 80) {
      throw new HttpError(400, "Assignee cannot exceed 80 characters.");
    }

    updates.assignee = assignee;
  }

  if (hasOwn(payload, "status")) {
    if (typeof payload.status !== "string" || !STATUSES.includes(payload.status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`);
    }

    updates.status = payload.status;
  }

  if (hasOwn(payload, "priority")) {
    if (typeof payload.priority !== "string" || !PRIORITIES.includes(payload.priority)) {
      throw new HttpError(400, `Priority must be one of: ${PRIORITIES.join(", ")}`);
    }

    updates.priority = payload.priority;
  }

  if (hasOwn(payload, "dueDate")) {
    updates.dueDate = validateDate(payload.dueDate);
  }

  return updates;
}

function getProjectOrThrow(store, projectId) {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new HttpError(404, "Project not found.");
  }

  return project;
}

function getTaskOrThrow(project, taskId) {
  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new HttpError(404, "Task not found.");
  }

  return task;
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/meta", (_req, res) => {
  res.json({
    statuses: STATUSES,
    priorities: PRIORITIES,
  });
});

app.get(
  "/api/projects",
  asyncRoute(async (_req, res) => {
    const store = await loadStore();
    res.json({ projects: store.projects });
  }),
);

app.get(
  "/api/projects/:projectId",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const project = getProjectOrThrow(store, req.params.projectId);
    res.json({ project });
  }),
);

app.post(
  "/api/projects",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const name = validateProjectName(req.body?.name);
    const now = new Date().toISOString();

    const project = {
      id: randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      tasks: [],
    };

    store.projects.unshift(project);
    await saveStore(store);

    res.status(201).json({ project });
  }),
);

app.patch(
  "/api/projects/:projectId",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const project = getProjectOrThrow(store, req.params.projectId);
    const name = validateProjectName(req.body?.name);
    const now = new Date().toISOString();

    project.name = name;
    project.updatedAt = now;

    await saveStore(store);

    res.json({ project });
  }),
);

app.delete(
  "/api/projects/:projectId",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const originalLength = store.projects.length;
    store.projects = store.projects.filter((project) => project.id !== req.params.projectId);

    if (store.projects.length === originalLength) {
      throw new HttpError(404, "Project not found.");
    }

    await saveStore(store);
    res.status(204).send();
  }),
);

app.post(
  "/api/projects/:projectId/tasks",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const project = getProjectOrThrow(store, req.params.projectId);
    const updates = validateTaskPayload(req.body, { partial: false });
    const now = new Date().toISOString();

    const task = {
      id: randomUUID(),
      title: updates.title,
      description: updates.description ?? "",
      assignee: updates.assignee ?? "",
      status: updates.status ?? "Backlog",
      priority: updates.priority ?? "Medium",
      dueDate: updates.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    project.tasks.push(task);
    project.updatedAt = now;

    await saveStore(store);

    res.status(201).json({ project, task });
  }),
);

app.patch(
  "/api/projects/:projectId/tasks/:taskId",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const project = getProjectOrThrow(store, req.params.projectId);
    const task = getTaskOrThrow(project, req.params.taskId);
    const updates = validateTaskPayload(req.body, { partial: true });
    const now = new Date().toISOString();

    Object.assign(task, updates, { updatedAt: now });
    project.updatedAt = now;

    await saveStore(store);

    res.json({ project, task });
  }),
);

app.delete(
  "/api/projects/:projectId/tasks/:taskId",
  asyncRoute(async (req, res) => {
    const store = await loadStore();
    const project = getProjectOrThrow(store, req.params.projectId);
    const nextTasks = project.tasks.filter((task) => task.id !== req.params.taskId);

    if (nextTasks.length === project.tasks.length) {
      throw new HttpError(404, "Task not found.");
    }

    project.tasks = nextTasks;
    project.updatedAt = new Date().toISOString();

    await saveStore(store);

    res.json({ project });
  }),
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.use((error, _req, res, _next) => {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = statusCode >= 500 ? "Internal server error." : error.message;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  res.status(statusCode).json({ error: message });
});

async function startServer() {
  await ensureStoreFile();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Project tracker listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  STATUSES,
  PRIORITIES,
};
