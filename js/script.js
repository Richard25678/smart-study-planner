"use strict";

// The nested category tree is the single source for both the recursive category
// processor and the category options shown by the application.
const nestedCategories = [
  {
    name: "Programming",
    children: [
      { name: "JavaScript", children: [] },
      { name: "HTML", children: [] },
      { name: "CSS", children: [] }
    ]
  },
  {
    name: "Mathematics",
    children: [
      { name: "Algebra", children: [] },
      { name: "Statistics", children: [] }
    ]
  },
  {
    name: "Personal Development",
    children: [
      { name: "Reading", children: [] },
      { name: "Assignments", children: [] }
    ]
  }
];

const storageKey = "smartStudyTasks";
let tasks = [];
let statusFilter = "All";
let categoryFilter = "All";
let searchQuery = "";
let toastTimer = null;

const taskForm = document.getElementById("taskForm");
const taskModal = document.getElementById("taskModal");
const taskList = document.getElementById("taskList");
const taskCategory = document.getElementById("taskCategory");

// This genuine recursive function visits every nested category node. The empty
// children array is the natural base case: no recursive call is made for that node.
function processCategoryTree(categoryNodes, parentName = "", output = []) {
  try {
    if (!Array.isArray(categoryNodes)) {
      throw new Error("Category data must be an array.");
    }

    categoryNodes.forEach((category) => {
      if (!category || typeof category.name !== "string") {
        throw new Error("A category is missing a valid name.");
      }

      const fullCategoryName = parentName
        ? `${parentName} / ${category.name}`
        : category.name;
      output.push(fullCategoryName);

      // Recursive call: the function processes the node's children and moves
      // deeper until it reaches a category with no children.
      if (Array.isArray(category.children) && category.children.length > 0) {
        processCategoryTree(category.children, fullCategoryName, output);
      }
    });

    return output;
  } catch (error) {
    showToast(error.message, true);
    return [];
  }
}

// Populate category controls using the result produced by the recursive processor.
function populateCategoryControls() {
  const categoryNames = processCategoryTree(nestedCategories);
  const leafCategories = nestedCategories.reduce((result, parent) => {
    const children = parent.children && parent.children.length > 0
      ? parent.children
      : [{ name: parent.name, children: [] }];
    return result.concat(children.map((child) => child.name));
  }, []);

  taskCategory.innerHTML = "";
  leafCategories.forEach((categoryName) => {
    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    taskCategory.appendChild(option);
  });

  const navigation = document.getElementById("categoryNavigation");
  navigation.innerHTML = "";
  ["All", ...leafCategories].forEach((categoryName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.dataset.categoryFilter = categoryName;
    button.textContent = categoryName === "All" ? "All categories" : categoryName;
    navigation.appendChild(button);
  });
  console.info("Recursive category count:", categoryNames.length);
}

// Load saved tasks and restore the application state after a browser refresh.
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(storageKey);
    if (!savedTasks) {
      tasks = [];
      return;
    }

    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks)) {
      throw new Error("Saved task data is not in a valid format.");
    }
    tasks = parsedTasks;
  } catch (error) {
    tasks = [];
    showToast("Saved tasks could not be restored.", true);
  }
}

// Store the complete task array in localStorage so edits persist across refreshes.
function saveTasks() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  } catch (error) {
    showToast("This browser could not save your tasks.", true);
  }
}

// Validate required fields and throw a clear error for invalid form input.
function getValidatedTaskFormData() {
  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const category = document.getElementById("taskCategory").value;
  const priority = document.getElementById("taskPriority").value;
  const dueDate = document.getElementById("taskDueDate").value;

  try {
    if (title.length < 2) {
      throw new Error("Please enter a task title with at least 2 characters.");
    }
    if (!category) {
      throw new Error("Please select a study category.");
    }
    if (!["Low", "Medium", "High"].includes(priority)) {
      throw new Error("Please select a valid priority.");
    }
    if (dueDate && !dayjs(dueDate).isValid()) {
      throw new Error("Please enter a valid due date.");
    }

    return { title, description, category, priority, dueDate };
  } catch (error) {
    document.getElementById("formError").textContent = error.message;
    throw error;
  }
}

// Filter tasks by status, category, and search text, then demonstrate find/map/filter.
function getFilteredTasks() {
  let filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Completed" && task.completed) ||
      (statusFilter === "Incomplete" && !task.completed);
    const matchesCategory =
      categoryFilter === "All" || task.category === categoryFilter;
    const searchableText =
      `${task.title} ${task.description} ${task.category}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return filteredTasks;
}

// Create the complete visible interface using a map() pipeline and DOM methods.
function renderTasks() {
  const filteredTasks = getFilteredTasks();
  taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    renderEmptyState();
  } else {
    const cards = filteredTasks.map((task) => createTaskCard(task));
    cards.forEach((card) => taskList.appendChild(card));
  }

  updateDashboard();
  updateFilterButtons();
}

// Build one task card dynamically and attach accessible controls to it.
function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.completed ? " completed" : ""}`;
  card.dataset.taskId = task.id;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `complete-toggle${task.completed ? " checked" : ""}`;
  toggle.textContent = "✓";
  toggle.setAttribute("aria-label", task.completed ? "Mark task incomplete" : "Mark task complete");
  toggle.dataset.action = "toggle";

  const main = document.createElement("div");
  main.className = "task-main";

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const description = document.createElement("p");
  description.className = "task-description";
  description.textContent = task.description || "No description provided.";

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const category = document.createElement("span");
  category.className = "meta-pill";
  category.textContent = task.category;

  const priority = document.createElement("span");
  priority.className = `meta-pill ${task.priority.toLowerCase()}`;
  priority.textContent = `${task.priority} priority`;

  const dueDate = document.createElement("span");
  dueDate.className = "due-date";
  dueDate.textContent = formatDueDate(task.dueDate);

  meta.append(category, priority, dueDate);
  main.append(title, description, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.innerHTML =
    '<button class="task-action edit" type="button" data-action="edit" aria-label="Edit task" title="Edit">✎</button>' +
    '<button class="task-action delete" type="button" data-action="delete" aria-label="Delete task" title="Delete">⌫</button>';

  card.append(toggle, main, actions);
  return card;
}

// Render a friendly empty state depending on whether there are no tasks or no matches.
function renderEmptyState() {
  const hasAnyTasks = tasks.length > 0;
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.innerHTML = `
    <div>
      <div class="empty-icon" aria-hidden="true">${hasAnyTasks ? "⌕" : "✓"}</div>
      <h3>${hasAnyTasks ? "No matching tasks" : "Your study plan is clear"}</h3>
      <p>${hasAnyTasks ? "Try changing the search or filters." : "Add a task to start planning your next study session."}</p>
    </div>`;
  taskList.appendChild(empty);
}

// Format a date with Day.js while safely handling missing or invalid values.
function formatDueDate(dueDate) {
  if (!dueDate) {
    return "No due date";
  }
  if (typeof dayjs === "undefined") {
    return dueDate;
  }
  const parsedDate = dayjs(dueDate);
  if (!parsedDate.isValid()) {
    return "Invalid date";
  }
  return `Due ${parsedDate.format("MMM D, YYYY")}`;
}

// Recalculate totals and completion progress after every task change.
function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("totalCount").textContent = total;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressFill").style.width = `${percent}%`;

  const progressTrack = document.querySelector(".progress-track");
  progressTrack.setAttribute("aria-valuenow", String(percent));
}

// Keep all status filter controls visually synchronized with the active state.
function updateFilterButtons() {
  document.querySelectorAll("[data-status-filter]").forEach((button) => {
    const isActive = button.dataset.statusFilter === statusFilter;
    button.classList.toggle("active", isActive);
  });

  document.querySelectorAll("[data-category-filter]").forEach((button) => {
    const isActive = button.dataset.categoryFilter === categoryFilter;
    button.classList.toggle("active", isActive);
  });

  document.getElementById("taskHeading").textContent =
    categoryFilter !== "All"
      ? `${categoryFilter} tasks`
      : `${statusFilter} tasks`;
}

// Locate a task by unique ID using native Array.find().
function findTaskById(taskId) {
  return tasks.find((task) => task.id === taskId);
}

// Open the task dialog for either a new task or an existing task being edited.
function openTaskModal(task = null) {
  taskForm.reset();
  document.getElementById("formError").textContent = "";
  document.getElementById("taskId").value = task ? task.id : "";
  document.getElementById("modalTitle").textContent =
    task ? "Edit task" : "Add a new task";
  document.getElementById("saveTaskButton").textContent =
    task ? "Update task" : "Save task";

  if (task) {
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDescription").value = task.description;
    document.getElementById("taskCategory").value = task.category;
    document.getElementById("taskPriority").value = task.priority;
    document.getElementById("taskDueDate").value = task.dueDate || "";
  } else {
    document.getElementById("taskPriority").value = "Medium";
  }

  taskModal.classList.add("open");
  taskModal.setAttribute("aria-hidden", "false");
  document.getElementById("taskTitle").focus();
}

// Close the task dialog and reset transient form error text.
function closeTaskModal() {
  taskModal.classList.remove("open");
  taskModal.setAttribute("aria-hidden", "true");
  document.getElementById("formError").textContent = "";
}

// Add a task or update an existing task using the data validated by the form handler.
function handleTaskSubmit(event) {
  event.preventDefault();

  try {
    const formData = getValidatedTaskFormData();
    const taskId = document.getElementById("taskId").value;

    if (taskId) {
      const existingTask = findTaskById(taskId);
      if (!existingTask) {
        throw new Error("The task you are editing could not be found.");
      }
      Object.assign(existingTask, formData);
      showToast("Task updated successfully.");
    } else {
      tasks.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...formData,
        completed: false,
        createdAt: new Date().toISOString()
      });
      showToast("Task added successfully.");
    }

    saveTasks();
    closeTaskModal();
    renderTasks();
  } catch (error) {
    showToast(error.message, true);
  }
}

// Route card button clicks to completion, edit, or confirmed deletion actions.
function handleTaskListClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const card = actionButton.closest(".task-card");
  const taskId = card.dataset.taskId;
  const task = findTaskById(taskId);
  if (!task) {
    showToast("That task could not be found.", true);
    return;
  }

  if (actionButton.dataset.action === "toggle") {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    showToast(task.completed ? "Task marked complete." : "Task marked incomplete.");
  } else if (actionButton.dataset.action === "edit") {
    openTaskModal(task);
  } else if (actionButton.dataset.action === "delete") {
    deleteTask(task);
  }
}

// Remove one task only after the browser confirms the user's deletion choice.
function deleteTask(task) {
  if (!window.confirm(`Delete "${task.title}"?`)) {
    return;
  }

  tasks = tasks.filter((currentTask) => currentTask.id !== task.id);
  saveTasks();
  renderTasks();
  showToast("Task deleted.");
}

// Remove all completed tasks after confirmation and preserve incomplete work.
function clearCompletedTasks() {
  const completedCount = tasks.filter((task) => task.completed).length;
  if (completedCount === 0) {
    showToast("There are no completed tasks to clear.", true);
    return;
  }
  if (!window.confirm(`Clear ${completedCount} completed task(s)?`)) {
    return;
  }

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
  showToast("Completed tasks cleared.");
}

// Apply status or category filters selected from sidebar or dashboard controls.
function setFilter(filterType, value) {
  if (filterType === "status") {
    statusFilter = value;
  } else if (filterType === "category") {
    categoryFilter = value;
  }
  renderTasks();
  document.getElementById("sidebar").classList.remove("open");
}

// Display success or error feedback in a temporary, accessible toast message.
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

// Initialize Day.js labels, controls, stored tasks, and event handlers.
function initializeApplication() {
  populateCategoryControls();
  loadTasks();

  document.getElementById("todayLabel").textContent =
    typeof dayjs !== "undefined"
      ? dayjs().format("dddd, MMMM D").toUpperCase()
      : "TODAY";

  taskForm.addEventListener("submit", handleTaskSubmit);
  taskList.addEventListener("click", handleTaskListClick);
  document.getElementById("openAddButton").addEventListener("click", () => openTaskModal());
  document.getElementById("closeModalButton").addEventListener("click", closeTaskModal);
  document.getElementById("cancelButton").addEventListener("click", closeTaskModal);
  document.getElementById("clearCompletedButton").addEventListener("click", clearCompletedTasks);

  taskModal.addEventListener("click", (event) => {
    if (event.target === taskModal) {
      closeTaskModal();
    }
  });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    searchQuery = event.target.value.trim();
    renderTasks();
  });

  document.querySelectorAll("[data-status-filter]").forEach((button) => {
    button.addEventListener("click", () => setFilter("status", button.dataset.statusFilter));
  });

  document.getElementById("categoryNavigation").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-filter]");
    if (button) {
      setFilter("category", button.dataset.categoryFilter);
    }
  });

  document.getElementById("menuButton").addEventListener("click", (event) => {
    const sidebar = document.getElementById("sidebar");
    const isOpen = sidebar.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && taskModal.classList.contains("open")) {
      closeTaskModal();
    }
  });

  renderTasks();
}

initializeApplication();