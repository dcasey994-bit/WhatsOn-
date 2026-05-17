// Simple in-memory store for saved events and "going" state
// In a real app this would be persisted to localStorage or a backend

let savedIds = new Set();
let goingIds = new Set();
let listeners = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function isSaved(id) {
  return savedIds.has(id);
}

export function toggleSaved(id) {
  if (savedIds.has(id)) {
    savedIds.delete(id);
  } else {
    savedIds.add(id);
  }
  notify();
  return savedIds.has(id);
}

export function getSavedIds() {
  return new Set(savedIds);
}

export function isGoing(id) {
  return goingIds.has(id);
}

export function toggleGoing(id) {
  if (goingIds.has(id)) {
    goingIds.delete(id);
  } else {
    goingIds.add(id);
  }
  notify();
  return goingIds.has(id);
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
