const state = {
  projects: [],
  statuses: [],
  priorities: [],
  selectedProjectId: null,
  searchText: "",
  priorityFilter: "all",
  draggedTaskId: null,
};

const elements = {
  projectForm: document.getElementById("project-form"),
  projectNameInput: document.getElementById("project-name"),
  projectList: document.getElementById("project-list"),
  renameProjectButton: document.getElementById("rename-project-btn"),
  deleteProjectButton: document.getElementById("delete-project-btn"),
  boardTitle: document.getElementById("board-title"),
  boardSubtitle: document.getElementById("board-subtitle"),
  searchInput: document.getElementById("search-input"),
  priorityFilter: document.getElementById("priority-filter"),
  addTaskButton: document.getElementById("add-task-btn"),
  statsStrip: document.getElementById("stats-strip"),
  boardColumns: document.getElementById("board-columns"),
  taskDialog: document.getElementById("task-dialog"),
  taskForm: document.getElementById("task-form"),
  taskDialogTitle: document.getElementById("task-dialog-title"),
  taskId: document.getElementById("task-id"),
  taskTitle: document.getElementById("task-title"),
  taskDescription: document.getElementById("task-description"),
  taskAssignee: document.getElementById("task-assignee"),
  taskDueDate: document.getElementById("task-due-date"),
  taskStatus: document.getElementById("task-status"),
  taskPriority: document.getElementById("task-priority"),
  cancelTaskButton: document.getElementById("cancel-task-btn"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[character] ?? character;
  });
}

async function api(path, { method = "GET", body } = {}) {
  const options = { method, headers: {} };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  return payload;
}

function sortProjects() {
  state.projects.sort((left, right) => {
    const leftDate = Date.parse(left.updatedAt || left.createdAt || 0);
    const rightDate = Date.parse(right.updatedAt || right.createdAt || 0);
    return rightDate - leftDate;
  });
}

function getSelectedProject() {
  if (!state.selectedProjectId) {
    return null;
  }

  return state.projects.find((project) => project.id === state.selectedProjectId) ?? null;
}

function getFilteredTasks(tasks) {
  const query = state.searchText.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesPriority = state.priorityFilter === "all" || task.priority === state.priorityFilter;

    const haystack = [task.title, task.description, task.assignee].join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);

    return matchesPriority && matchesQuery;
  });
}

function upsertProject(updatedProject) {
  const index = state.projects.findIndex((project) => project.id === updatedProject.id);

  if (index >= 0) {
    state.projects[index] = updatedProject;
  } else {
    state.projects.push(updatedProject);
  }

  sortProjects();

  if (!state.selectedProjectId || !state.projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0]?.id ?? null;
  }
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "No due date";
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(dateValue) {
  if (!dateValue) {
    return "just now";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isTaskOverdue(task) {
  if (!task.dueDate || task.status === "Done") {
    return false;
  }

  const dueDate = new Date(`${task.dueDate}T23:59:59`);
  return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
}

function priorityClass(priority) {
  switch ((priority || "").toLowerCase()) {
    case "low":
      return "priority-low";
    case "medium":
      return "priority-medium";
    case "high":
      return "priority-high";
    case "critical":
      return "priority-critical";
    default:
      return "priority-medium";
  }
}

function renderProjectList() {
  if (state.projects.length === 0) {
    elements.projectList.innerHTML = `<li class="empty-list">No projects yet. Create one to get started.</li>`;
    return;
  }

  elements.projectList.innerHTML = state.projects
    .map((project) => {
      const isActive = project.id === state.selectedProjectId ? "is-active" : "";
      const count = Array.isArray(project.tasks) ? project.tasks.length : 0;

      return `
        <li>
          <button class="project-item ${isActive}" data-project-id="${escapeHtml(project.id)}" type="button">
            <span>${escapeHtml(project.name)}</span>
            <span class="task-count">${count} task${count === 1 ? "" : "s"}</span>
          </button>
        </li>
      `;
    })
    .join("");
}

function renderStats(project) {
  const stats = [
    { label: "Total", value: project.tasks.length },
    ...state.statuses.map((status) => ({
      label: status,
      value: project.tasks.filter((task) => task.status === status).length,
    })),
  ];

  elements.statsStrip.innerHTML = stats
    .map(
      (stat) => `
      <article class="stat-card">
        <span class="label">${escapeHtml(stat.label)}</span>
        <span class="value">${stat.value}</span>
      </article>
    `,
    )
    .join("");
}

function renderTaskCard(task) {
  return `
    <article class="task-card ${isTaskOverdue(task) ? "overdue" : ""}" draggable="true" data-task-id="${escapeHtml(task.id)}">
      <div class="task-card-header">
        <h4>${escapeHtml(task.title)}</h4>
        <span class="priority-pill ${priorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
      </div>
      ${
        task.description
          ? `<p class="task-description">${escapeHtml(task.description)}</p>`
          : "<p class=\"task-description\">No description.</p>"
      }
      <div class="task-meta">
        <span>Assignee: ${escapeHtml(task.assignee || "Unassigned")}</span>
        <span>Due: ${escapeHtml(formatDate(task.dueDate))}</span>
      </div>
      <div class="task-actions">
        <button class="small-btn ghost-btn" type="button" data-action="edit" data-task-id="${escapeHtml(task.id)}">Edit</button>
        <button class="small-btn danger-btn" type="button" data-action="delete" data-task-id="${escapeHtml(task.id)}">Delete</button>
      </div>
    </article>
  `;
}

function renderBoardColumns(project) {
  const filteredTasks = getFilteredTasks(project.tasks);
  const hasFilter = state.searchText.trim() || state.priorityFilter !== "all";

  elements.boardColumns.innerHTML = state.statuses
    .map((status) => {
      const visibleTasks = filteredTasks.filter((task) => task.status === status);
      const totalTasks = project.tasks.filter((task) => task.status === status).length;

      const countLabel = hasFilter ? `${visibleTasks.length}/${totalTasks}` : `${totalTasks}`;
      const body =
        visibleTasks.length > 0
          ? visibleTasks.map((task) => renderTaskCard(task)).join("")
          : `<p class="column-empty">${hasFilter ? "No matching tasks." : "No tasks yet."}</p>`;

      return `
        <section class="task-column">
          <header class="task-column-header">
            <h3>${escapeHtml(status)}</h3>
            <span>${countLabel}</span>
          </header>
          <div class="task-list" data-status="${escapeHtml(status)}">${body}</div>
        </section>
      `;
    })
    .join("");
}

function renderBoard() {
  const project = getSelectedProject();

  if (!project) {
    elements.boardTitle.textContent = "Select a project";
    elements.boardSubtitle.textContent = "Create or select a project to start planning work.";
    elements.addTaskButton.disabled = true;
    elements.deleteProjectButton.disabled = true;
    elements.renameProjectButton.disabled = true;
    elements.statsStrip.innerHTML = "";
    elements.boardColumns.innerHTML = `
      <section class="task-column">
        <div class="task-list">
          <p class="column-empty">Pick a project on the left to view its board.</p>
        </div>
      </section>
    `;
    return;
  }

  elements.addTaskButton.disabled = false;
  elements.deleteProjectButton.disabled = false;
  elements.renameProjectButton.disabled = false;
  elements.boardTitle.textContent = project.name;
  elements.boardSubtitle.textContent = `${project.tasks.length} task${project.tasks.length === 1 ? "" : "s"} \u00b7 Updated ${formatTimestamp(project.updatedAt)}`;

  renderStats(project);
  renderBoardColumns(project);
}

function render() {
  renderProjectList();
  renderBoard();
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  elements.toast.classList.toggle("is-error", isError);

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3000);
}

function populateSelectOptions() {
  elements.taskStatus.innerHTML = state.statuses
    .map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
    .join("");

  elements.taskPriority.innerHTML = state.priorities
    .map((priority) => `<option value="${escapeHtml(priority)}">${escapeHtml(priority)}</option>`)
    .join("");

  elements.priorityFilter.innerHTML = [
    "<option value=\"all\">All priorities</option>",
    ...state.priorities.map(
      (priority) => `<option value="${escapeHtml(priority)}">${escapeHtml(priority)}</option>`,
    ),
  ].join("");
}

function findTask(taskId) {
  const project = getSelectedProject();
  if (!project) {
    return null;
  }

  return project.tasks.find((task) => task.id === taskId) ?? null;
}

function openTaskDialog(task = null) {
  if (!getSelectedProject()) {
    showToast("Create or select a project first.", true);
    return;
  }

  elements.taskForm.reset();
  elements.taskId.value = "";

  elements.taskStatus.value = state.statuses[0] ?? "Backlog";
  elements.taskPriority.value = state.priorities.includes("Medium") ? "Medium" : state.priorities[0];

  if (task) {
    elements.taskDialogTitle.textContent = "Edit task";
    elements.taskId.value = task.id;
    elements.taskTitle.value = task.title || "";
    elements.taskDescription.value = task.description || "";
    elements.taskAssignee.value = task.assignee || "";
    elements.taskDueDate.value = task.dueDate || "";
    elements.taskStatus.value = task.status || state.statuses[0];
    elements.taskPriority.value = task.priority || state.priorities[0];
  } else {
    elements.taskDialogTitle.textContent = "Add task";
  }

  if (typeof elements.taskDialog.showModal === "function") {
    elements.taskDialog.showModal();
  } else {
    elements.taskDialog.setAttribute("open", "true");
  }
}

function closeTaskDialog() {
  if (typeof elements.taskDialog.close === "function") {
    elements.taskDialog.close();
  } else {
    elements.taskDialog.removeAttribute("open");
  }
}

function clearDragVisualState() {
  state.draggedTaskId = null;

  document.querySelectorAll(".drag-over").forEach((node) => {
    node.classList.remove("drag-over");
  });

  document.querySelectorAll(".dragging").forEach((node) => {
    node.classList.remove("dragging");
  });
}

async function moveTask(taskId, status) {
  const project = getSelectedProject();
  if (!project) {
    return;
  }

  const task = findTask(taskId);
  if (!task || task.status === status) {
    return;
  }

  try {
    const result = await api(`/api/projects/${project.id}/tasks/${taskId}`, {
      method: "PATCH",
      body: { status },
    });
    upsertProject(result.project);
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleProjectCreate(event) {
  event.preventDefault();
  const projectName = elements.projectNameInput.value.trim();
  if (!projectName) {
    showToast("Project name is required.", true);
    return;
  }

  try {
    const result = await api("/api/projects", {
      method: "POST",
      body: { name: projectName },
    });

    upsertProject(result.project);
    state.selectedProjectId = result.project.id;
    elements.projectForm.reset();
    render();
    showToast("Project created.");
  } catch (error) {
    showToast(error.message, true);
  }
}

function handleProjectSelect(event) {
  const target = event.target.closest("button[data-project-id]");
  if (!target) {
    return;
  }

  state.selectedProjectId = target.dataset.projectId;
  render();
}

async function handleRenameProject() {
  const project = getSelectedProject();
  if (!project) {
    return;
  }

  const nextName = window.prompt("Rename project", project.name);
  if (nextName === null) {
    return;
  }

  const trimmed = nextName.trim();
  if (!trimmed) {
    showToast("Project name cannot be empty.", true);
    return;
  }

  try {
    const result = await api(`/api/projects/${project.id}`, {
      method: "PATCH",
      body: { name: trimmed },
    });
    upsertProject(result.project);
    render();
    showToast("Project renamed.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleDeleteProject() {
  const project = getSelectedProject();
  if (!project) {
    return;
  }

  const confirmed = window.confirm(`Delete "${project.name}" and all of its tasks?`);
  if (!confirmed) {
    return;
  }

  try {
    await api(`/api/projects/${project.id}`, { method: "DELETE" });
    state.projects = state.projects.filter((item) => item.id !== project.id);
    state.selectedProjectId = state.projects[0]?.id ?? null;
    render();
    showToast("Project deleted.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const project = getSelectedProject();
  if (!project) {
    return;
  }

  const payload = {
    title: elements.taskTitle.value.trim(),
    description: elements.taskDescription.value.trim(),
    assignee: elements.taskAssignee.value.trim(),
    status: elements.taskStatus.value,
    priority: elements.taskPriority.value,
    dueDate: elements.taskDueDate.value || null,
  };

  if (!payload.title) {
    showToast("Task title is required.", true);
    return;
  }

  const taskId = elements.taskId.value.trim();

  try {
    const result = taskId
      ? await api(`/api/projects/${project.id}/tasks/${taskId}`, {
          method: "PATCH",
          body: payload,
        })
      : await api(`/api/projects/${project.id}/tasks`, {
          method: "POST",
          body: payload,
        });

    upsertProject(result.project);
    closeTaskDialog();
    render();
    showToast(taskId ? "Task updated." : "Task added.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleBoardClick(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const { action, taskId } = actionButton.dataset;
  const task = findTask(taskId);
  if (!task) {
    showToast("Task no longer exists.", true);
    return;
  }

  if (action === "edit") {
    openTaskDialog(task);
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) {
      return;
    }

    const project = getSelectedProject();
    if (!project) {
      return;
    }

    try {
      const result = await api(`/api/projects/${project.id}/tasks/${task.id}`, { method: "DELETE" });
      upsertProject(result.project);
      render();
      showToast("Task deleted.");
    } catch (error) {
      showToast(error.message, true);
    }
  }
}

function handleDragStart(event) {
  const card = event.target.closest(".task-card");
  if (!card) {
    return;
  }

  state.draggedTaskId = card.dataset.taskId;
  card.classList.add("dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggedTaskId);
  }
}

function handleDragOver(event) {
  const taskList = event.target.closest(".task-list");
  if (!taskList) {
    return;
  }

  event.preventDefault();
  taskList.classList.add("drag-over");
}

function handleDragLeave(event) {
  const taskList = event.target.closest(".task-list");
  if (!taskList) {
    return;
  }

  if (!taskList.contains(event.relatedTarget)) {
    taskList.classList.remove("drag-over");
  }
}

async function handleDrop(event) {
  const taskList = event.target.closest(".task-list");
  if (!taskList) {
    return;
  }

  event.preventDefault();
  const status = taskList.dataset.status;
  const taskId = event.dataTransfer?.getData("text/plain") || state.draggedTaskId;

  clearDragVisualState();

  if (!taskId || !status) {
    return;
  }

  await moveTask(taskId, status);
}

function bindEvents() {
  elements.projectForm.addEventListener("submit", handleProjectCreate);
  elements.projectList.addEventListener("click", handleProjectSelect);
  elements.renameProjectButton.addEventListener("click", handleRenameProject);
  elements.deleteProjectButton.addEventListener("click", handleDeleteProject);
  elements.addTaskButton.addEventListener("click", () => openTaskDialog());
  elements.cancelTaskButton.addEventListener("click", closeTaskDialog);
  elements.taskForm.addEventListener("submit", handleTaskSubmit);
  elements.searchInput.addEventListener("input", (event) => {
    state.searchText = event.target.value;
    render();
  });
  elements.priorityFilter.addEventListener("change", (event) => {
    state.priorityFilter = event.target.value;
    render();
  });

  elements.boardColumns.addEventListener("click", handleBoardClick);
  elements.boardColumns.addEventListener("dragstart", handleDragStart);
  elements.boardColumns.addEventListener("dragover", handleDragOver);
  elements.boardColumns.addEventListener("dragleave", handleDragLeave);
  elements.boardColumns.addEventListener("drop", handleDrop);
  elements.boardColumns.addEventListener("dragend", clearDragVisualState);
}

async function init() {
  bindEvents();

  try {
    const [meta, projectResponse] = await Promise.all([api("/api/meta"), api("/api/projects")]);
    state.statuses = meta.statuses;
    state.priorities = meta.priorities;
    state.projects = projectResponse.projects ?? [];
    sortProjects();
    state.selectedProjectId = state.projects[0]?.id ?? null;
    populateSelectOptions();
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

init();
