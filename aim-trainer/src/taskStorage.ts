import type { TaskConfig } from './types'

const KEY = 'aimers-custom-tasks'

export function loadCustomTasks(): TaskConfig[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TaskConfig[]) : []
  } catch {
    return []
  }
}

export function saveCustomTask(task: TaskConfig): void {
  const existing = loadCustomTasks().filter((t) => t.id !== task.id)
  localStorage.setItem(KEY, JSON.stringify([...existing, task]))
}

export function deleteCustomTask(id: string): void {
  const remaining = loadCustomTasks().filter((t) => t.id !== id)
  localStorage.setItem(KEY, JSON.stringify(remaining))
}
