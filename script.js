let tasks = [];
let deletedTasks = [];
const DELETE_LIFETIME_MS = 30000; // 30 seconds

// --- Local Storage Functions ---
function saveToLocalStorage() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));
}

function loadFromLocalStorage() {
  const tasksData = localStorage.getItem('tasks');
  const deletedData = localStorage.getItem('deletedTasks');
  tasks = tasksData ? JSON.parse(tasksData) : [];
  deletedTasks = deletedData ? JSON.parse(deletedData) : [];
}

// --- Date Formatting ---
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Rendering Functions ---
function renderTasks() {
  const pendingList = document.getElementById('pendingTasks');
  const completedList = document.getElementById('completedTasks');
  pendingList.innerHTML = '';
  completedList.innerHTML = '';

  tasks.forEach((task, idx) => {
    const li = document.createElement('li');

    // First row: Task text and actions
    const row = document.createElement('div');
    row.className = 'row';

    const textSpan = document.createElement('span');
    textSpan.textContent = task.text;
    row.appendChild(textSpan);

    const actions = document.createElement('span');
    actions.className = 'task-actions';

    // Complete button (only for pending tasks)
    if (!task.completed) {
      const completeBtn = document.createElement('button');
      completeBtn.title = 'Mark as Completed';
      completeBtn.textContent = '✓';
      completeBtn.onclick = () => completeTask(idx);
      actions.appendChild(completeBtn);
    }

    // Delete button for every task
    const deleteBtn = document.createElement('button');
    deleteBtn.title = 'Delete Task';
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = () => deleteTask(idx);
    actions.appendChild(deleteBtn);

    row.appendChild(actions);
    li.appendChild(row);

    // Second row: Meta info (added time, completed time, reminder)
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.innerHTML = `Added: <b>${formatDateTime(task.addedAt)}</b>`;
    if (task.reminder) {
      meta.innerHTML += `<br><span class="reminder">Reminder: <b>${formatDateTime(task.reminder)}</b></span>`;
    }
    if (task.completed && task.completedAt) {
      meta.innerHTML += `<br>Completed: <b>${formatDateTime(task.completedAt)}</b>`;
    }
    li.appendChild(meta);

    if (task.completed) {
      li.classList.add('completed');
      completedList.appendChild(li);
    } else {
      pendingList.appendChild(li);
    }
  });

  renderDeletedTasks();
}

function renderDeletedTasks() {
  const deletedList = document.getElementById('deletedTasks');
  deletedList.innerHTML = '';
  deletedTasks.forEach((task, idx) => {
    const li = document.createElement('li');
    // First row: Task text and actions
    const row = document.createElement('div');
    row.className = 'row';

    const textSpan = document.createElement('span');
    textSpan.textContent = task.text;
    row.appendChild(textSpan);

    // Undo button
    const actions = document.createElement('span');
    actions.className = 'task-actions';
    const undoBtn = document.createElement('button');
    undoBtn.title = 'Undo Delete';
    undoBtn.textContent = '↩️';
    undoBtn.onclick = () => undoDeleteTask(idx);
    actions.appendChild(undoBtn);

    row.appendChild(actions);
    li.appendChild(row);

    // Second row: Deleted time and original meta
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.innerHTML = `Deleted: <b>${formatDateTime(task.deletedAt)}</b>`;
    meta.innerHTML += `<br>Added: <b>${formatDateTime(task.addedAt)}</b>`;
    if (task.reminder) {
      meta.innerHTML += `<br><span class="reminder">Reminder: <b>${formatDateTime(task.reminder)}</b></span>`;
    }
    if (task.completed && task.completedAt) {
      meta.innerHTML += `<br>Completed: <b>${formatDateTime(task.completedAt)}</b>`;
    }
    li.appendChild(meta);

    deletedList.appendChild(li);
  });
}

// --- Task Actions ---
function addTask() {
  const input = document.getElementById('taskInput');
  const reminderInput = document.getElementById('reminderInput');
  const text = input.value.trim();
  const reminderValue = reminderInput && reminderInput.value ? new Date(reminderInput.value) : null;
  if (text) {
    tasks.push({ 
      text, 
      completed: false, 
      addedAt: new Date(), 
      completedAt: null,
      reminder: reminderValue
    });
    input.value = '';
    if (reminderInput) reminderInput.value = '';
    saveToLocalStorage();
    renderTasks();
  }
}

function completeTask(index) {
  tasks[index].completed = true;
  tasks[index].completedAt = new Date();
  saveToLocalStorage();
  renderTasks();
}

function deleteTask(index) {
  // Move the task to deletedTasks instead of removing permanently
  const [removed] = tasks.splice(index, 1);
  if (removed) {
    removed.deletedAt = new Date();
    deletedTasks.push(removed);
  }
  saveToLocalStorage();
  renderTasks();
}

function undoDeleteTask(index) {
  // Move the task back to tasks array and remove from deletedTasks
  const [restored] = deletedTasks.splice(index, 1);
  if (restored) {
    delete restored.deletedAt;
    tasks.push(restored);
  }
  saveToLocalStorage();
  renderTasks();
}

// --- Reminder Check ---
function checkReminders() {
  const now = new Date();
  tasks.forEach((task, idx) => {
    if (
      task.reminder &&
      !task.completed &&
      !task.reminderNotified &&
      new Date(task.reminder) <= now
    ) {
      alert(`⏰ Reminder: "${task.text}"`);
      task.reminderNotified = true;
      saveToLocalStorage();
    }
  });
}

// --- Auto-delete old deleted tasks ---
function cleanupDeletedTasks() {
  const now = Date.now();
  // Keep only tasks deleted less than DELETE_LIFETIME_MS ago
  const filtered = deletedTasks.filter(task => {
    if (!task.deletedAt) return true;
    const deletedTime = new Date(task.deletedAt).getTime();
    return now - deletedTime < DELETE_LIFETIME_MS;
  });
  if (filtered.length !== deletedTasks.length) {
    deletedTasks = filtered;
    saveToLocalStorage();
    renderTasks();
  }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
  loadFromLocalStorage();

  document.getElementById('addBtn').addEventListener('click', addTask);

  // Add task on Enter key
  document.getElementById('taskInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addTask();
  });

  renderTasks();

  // Check reminders every 20 seconds
  setInterval(checkReminders, 20000);

  // Clean up deleted tasks every 5 seconds
  setInterval(cleanupDeletedTasks, 5000);
});
