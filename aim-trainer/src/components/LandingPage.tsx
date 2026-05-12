import { useEffect, useState } from 'react'
import type { TaskConfig } from '../types'
import { BUILT_IN_TASKS } from '../types'
import { deleteCustomTask, loadCustomTasks } from '../taskStorage'
import TaskCreator from './TaskCreator'

type Props = {
  onSelectTask: (task: TaskConfig) => void
}

export default function LandingPage({ onSelectTask }: Props) {
  const [customTasks, setCustomTasks] = useState<TaskConfig[]>([])
  const [creatorOpen, setCreatorOpen] = useState(false)

  useEffect(() => {
    setCustomTasks(loadCustomTasks())
  }, [])

  const refresh = () => setCustomTasks(loadCustomTasks())

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteCustomTask(id)
    refresh()
  }

  const allTasks = [...BUILT_IN_TASKS, ...customTasks]

  return (
    <div className="landingPage">
      <header className="landingHeader">
        <h1 className="landingTitle">
          <i className="fa-solid fa-crosshairs" /> Aimers
        </h1>
        <p className="landingSubtitle">Choose a training mode to begin</p>
      </header>

      <div className="taskGrid">
        {allTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className="taskCard"
            onClick={() => onSelectTask(task)}
          >
            <div
              className="taskCardIcon"
              style={{
                color: task.targetColor,
                background: `${task.targetColor}18`,
                borderColor: `${task.targetColor}44`,
              }}
            >
              <i className={`fa-solid fa-${task.icon}`} />
            </div>
            <div className="taskCardBody">
              <h2 className="taskCardTitle">{task.name}</h2>
              <p className="taskCardDesc">{task.description || 'Custom training mode'}</p>
              <div className="taskCardTags">
                {task.tags.map((tag) => (
                  <span key={tag} className="taskTag" style={{ color: task.targetColor, borderColor: `${task.targetColor}44`, background: `${task.targetColor}12` }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {task.isCustom && (
              <button
                type="button"
                className="taskDeleteBtn"
                onClick={(e) => handleDelete(e, task.id)}
                aria-label="Delete task"
              >
                <i className="fa-solid fa-trash" />
              </button>
            )}
          </button>
        ))}

        <button
          type="button"
          className="taskCard taskCardCreate"
          onClick={() => setCreatorOpen(true)}
        >
          <div className="taskCardCreateInner">
            <i className="fa-solid fa-plus" />
            <span>Create Task</span>
          </div>
        </button>
      </div>

      {creatorOpen && (
        <TaskCreator
          onSave={() => { refresh(); setCreatorOpen(false) }}
          onClose={() => setCreatorOpen(false)}
        />
      )}
    </div>
  )
}
