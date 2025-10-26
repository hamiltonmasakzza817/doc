(function () {
  'use strict';

  const STORAGE_KEY = 'todo:v1';

  const state = {
    todos: [],
    filter: 'all',
  };

  let todoForm;
  let todoInput;
  let todoList;
  let todoCount;
  let clearCompletedButton;
  let filterButtons = [];

  let editingId = null;
  let editReturnFocus = null;
  let nextFocus = null;

  const storageAvailable = checkStorageAvailability();

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    todoForm = document.querySelector('.todo-form');
    todoInput = document.querySelector('#todo-input');
    todoList = document.querySelector('.todo-list');
    todoCount = document.querySelector('.todo-count');
    clearCompletedButton = document.querySelector('.todo-clear');
    filterButtons = Array.from(document.querySelectorAll('.filter-button[data-filter]'));

    if (!todoForm || !todoInput || !todoList || !todoCount || !clearCompletedButton) {
      return;
    }

    state.todos = loadTodos();
    render();

    todoForm.addEventListener('submit', handleAddTodo);
    todoList.addEventListener('change', handleListChange);
    todoList.addEventListener('click', handleListClick);
    todoList.addEventListener('keydown', handleListKeydown);
    filterButtons.forEach((button) => {
      button.addEventListener('click', handleFilterClick);
    });
    clearCompletedButton.addEventListener('click', handleClearCompleted);
  }

  function handleAddTodo(event) {
    event.preventDefault();
    const value = todoInput.value.trim();
    if (!value) {
      return;
    }

    const timestamp = Date.now();
    state.todos.push({
      id: createId(),
      text: value,
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    todoInput.value = '';
    todoInput.focus();
    saveTodos();
    render();
  }

  function handleListChange(event) {
    const target = event.target;
    if (!target.classList.contains('todo-toggle')) {
      return;
    }

    const item = target.closest('.todo-item');
    if (!item) {
      return;
    }

    const { id } = item.dataset;
    const todo = findTodo(id);
    if (!todo) {
      return;
    }

    const completed = Boolean(target.checked);
    if (todo.completed === completed) {
      return;
    }

    todo.completed = completed;
    todo.updatedAt = Date.now();
    saveTodos();
    render();
  }

  function handleListClick(event) {
    const target = event.target;
    const button = target.closest('button');
    if (!button) {
      return;
    }

    const item = button.closest('.todo-item');
    if (!item) {
      return;
    }

    const { id } = item.dataset;

    if (button.classList.contains('todo-delete')) {
      deleteTodo(id);
      return;
    }

    if (button.classList.contains('todo-edit')) {
      enterEditMode(id, button);
    }
  }

  function handleListKeydown(event) {
    const target = event.target;
    if (!target.classList.contains('todo-edit-input')) {
      return;
    }

    const item = target.closest('.todo-item');
    if (!item) {
      return;
    }

    const { id } = item.dataset;

    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit(id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit(id);
    }
  }

  function handleFilterClick(event) {
    const button = event.currentTarget;
    const filter = button.dataset.filter;
    if (!filter || filter === state.filter) {
      return;
    }

    state.filter = filter;
    render();
  }

  function handleClearCompleted() {
    const hasCompleted = state.todos.some((todo) => todo.completed);
    if (!hasCompleted) {
      return;
    }

    state.todos = state.todos.filter((todo) => !todo.completed);
    saveTodos();
    render();
  }

  function enterEditMode(id, triggerElement) {
    if (editingId && editingId !== id) {
      cancelEdit(editingId);
    }

    const item = todoList.querySelector(`[data-id="${id}"]`);
    if (!item) {
      return;
    }

    const input = item.querySelector('.todo-edit-input');
    if (!input) {
      return;
    }

    const todo = findTodo(id);
    if (!todo) {
      return;
    }

    editingId = id;
    editReturnFocus = triggerElement || item.querySelector('.todo-edit');
    item.classList.add('is-editing');
    input.value = todo.text;
    input.removeAttribute('aria-invalid');

    requestAnimationFrame(() => {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }

  function saveEdit(id) {
    const item = todoList.querySelector(`[data-id="${id}"]`);
    if (!item) {
      return;
    }

    const input = item.querySelector('.todo-edit-input');
    if (!input) {
      return;
    }

    const todo = findTodo(id);
    if (!todo) {
      return;
    }

    const nextText = input.value.trim();
    if (!nextText) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }

    input.removeAttribute('aria-invalid');
    item.classList.remove('is-editing');
    editingId = null;
    editReturnFocus = null;

    if (nextText !== todo.text) {
      todo.text = nextText;
      todo.updatedAt = Date.now();
      saveTodos();
    }

    nextFocus = { id, selector: '.todo-edit' };
    render();
  }

  function cancelEdit(id) {
    const item = todoList.querySelector(`[data-id="${id}"]`);
    if (!item) {
      return;
    }

    const input = item.querySelector('.todo-edit-input');
    if (input) {
      const todo = findTodo(id);
      if (todo) {
        input.value = todo.text;
      }
      input.removeAttribute('aria-invalid');
    }

    item.classList.remove('is-editing');
    editingId = null;

    if (editReturnFocus) {
      editReturnFocus.focus();
    }

    editReturnFocus = null;
  }

  function deleteTodo(id) {
    const index = state.todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      return;
    }

    const nextTodoCandidate = state.todos[index + 1] || state.todos[index - 1] || null;
    state.todos = state.todos.filter((todo) => todo.id !== id);

    editingId = null;
    editReturnFocus = null;
    saveTodos();

    if (nextTodoCandidate) {
      nextFocus = { id: nextTodoCandidate.id, selector: '.todo-edit', fallback: 'input' };
      render();
    } else {
      nextFocus = { fallback: 'input' };
      render();
    }
  }

  function render() {
    if (!todoList) {
      return;
    }

    editingId = null;
    editReturnFocus = null;

    const fragment = document.createDocumentFragment();
    const filteredTodos = getFilteredTodos();
    let focusCandidate = null;

    filteredTodos.forEach((todo) => {
      const item = document.createElement('li');
      item.className = 'todo-item';
      if (todo.completed) {
        item.classList.add('is-completed');
      }
      item.dataset.id = todo.id;

      const labelText = (todo.text && todo.text.trim()) || 'todo';

      const main = document.createElement('div');
      main.className = 'todo-item-main';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'todo-toggle';
      toggle.id = `todo-toggle-${todo.id}`;
      toggle.checked = todo.completed;
      toggle.setAttribute(
        'aria-label',
        todo.completed ? `Mark "${labelText}" as active` : `Mark "${labelText}" as completed`
      );

      const label = document.createElement('label');
      label.className = 'todo-label';
      label.setAttribute('for', toggle.id);

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      label.appendChild(text);

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'todo-edit-input';
      editInput.value = todo.text;
      editInput.setAttribute('aria-label', `Edit "${labelText}"`);

      main.append(toggle, label, editInput);

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'todo-edit';
      editButton.textContent = 'Edit';
      editButton.setAttribute('aria-label', `Edit "${labelText}"`);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'todo-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete "${labelText}"`);

      actions.append(editButton, deleteButton);

      item.append(main, actions);

      if (nextFocus && nextFocus.id === todo.id) {
        const candidate = item.querySelector(nextFocus.selector);
        if (candidate) {
          focusCandidate = candidate;
        }
      }

      fragment.appendChild(item);
    });

    todoList.innerHTML = '';
    todoList.appendChild(fragment);

    updateCount();
    updateFilterButtons();
    updateClearButton();

    const fallback = nextFocus ? nextFocus.fallback : null;

    if (focusCandidate) {
      requestAnimationFrame(() => {
        focusCandidate.focus();
      });
    } else if (fallback === 'input' && todoInput) {
      requestAnimationFrame(() => {
        todoInput.focus();
      });
    }

    nextFocus = null;
  }

  function updateCount() {
    if (!todoCount) {
      return;
    }

    const remaining = state.todos.filter((todo) => !todo.completed).length;
    const label = remaining === 1 ? 'item' : 'items';
    todoCount.textContent = `${remaining} ${label} left`;
  }

  function updateFilterButtons() {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === state.filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function updateClearButton() {
    const hasCompleted = state.todos.some((todo) => todo.completed);
    clearCompletedButton.disabled = !hasCompleted;
    clearCompletedButton.setAttribute('aria-disabled', hasCompleted ? 'false' : 'true');
  }

  function findTodo(id) {
    return state.todos.find((todo) => todo.id === id) || null;
  }

  function getFilteredTodos() {
    switch (state.filter) {
      case 'active':
        return state.todos.filter((todo) => !todo.completed);
      case 'completed':
        return state.todos.filter((todo) => todo.completed);
      default:
        return state.todos.slice();
    }
  }

  function saveTodos() {
    if (!storageAvailable) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
    } catch (error) {
      // ignore write failures
    }
  }

  function loadTodos() {
    if (!storageAvailable) {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(isValidTodo)
        .map(normalizeTodo)
        .sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      return [];
    }
  }

  function isValidTodo(value) {
    return (
      value &&
      typeof value.id === 'string' &&
      typeof value.text === 'string' &&
      typeof value.completed === 'boolean' &&
      typeof value.createdAt === 'number' &&
      typeof value.updatedAt === 'number'
    );
  }

  function normalizeTodo(value) {
    return {
      id: value.id,
      text: value.text,
      completed: Boolean(value.completed),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `todo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function checkStorageAvailability() {
    try {
      const key = '__todo_storage_test__';
      localStorage.setItem(key, key);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }
})();
