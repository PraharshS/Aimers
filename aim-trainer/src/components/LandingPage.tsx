import { useEffect, useState } from 'react'
import type { TaskConfig } from '../types'
import { BUILT_IN_TASKS } from '../types'
import { deleteCustomTask, loadCustomTasks } from '../taskStorage'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'

type Props = {
  onSelectTask: (task: TaskConfig) => void
  onOpenCreator: () => void
  onEditTask: (task: TaskConfig) => void
  onViewProfile: () => void
  onViewLeaderboard: () => void
}

function DrillIcon({ taskId, size = 18 }: { taskId: string; size?: number }) {
  const s: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  return (
    <svg {...s}>
      {taskId === 'tracking' && <>
        <circle cx="13" cy="11" r="2" />
        <path d="M 3 16 Q 8 11 13 12 T 22 7" />
      </>}
      {taskId === 'flicking' && <>
        <circle cx="5" cy="19" r="1.5" />
        <circle cx="19" cy="6" r="2.2" />
        <path d="M 6 17.5 L 17 8" strokeDasharray="2 2.5" />
      </>}
      {taskId === 'gridshot' && <>
        <circle cx="6" cy="6" r="1.2" /><circle cx="12" cy="6" r="1.2" /><circle cx="18" cy="6" r="1.2" />
        <circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" />
        <circle cx="6" cy="18" r="1.2" /><circle cx="12" cy="18" r="1.2" /><circle cx="18" cy="18" r="1.2" />
      </>}
      {taskId === 'precision' && <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </>}
      {taskId === 'speed' && <>
        <path d="M 13 3 L 7 13 L 12 13 L 10 21 L 17 10 L 12 10 Z" />
      </>}
      {taskId === 'microflick' && <>
        <circle cx="6" cy="18" r="1.2" />
        <circle cx="18" cy="6" r="1.8" />
        <path d="M 7 16.8 L 17 7.2" strokeDasharray="1.5 2" />
      </>}
      {!['tracking', 'flicking', 'gridshot', 'precision', 'speed', 'microflick'].includes(taskId) && (
        <path d="M 12 5 V 19 M 5 12 H 19" />
      )}
    </svg>
  )
}

export default function LandingPage({ onSelectTask, onOpenCreator, onEditTask, onViewProfile, onViewLeaderboard }: Props) {
  const { user, profile, signOut } = useAuth()
  const [customTasks, setCustomTasks] = useState<TaskConfig[]>([])
  const [authOpen, setAuthOpen] = useState(false)
  const [pbMap, setPbMap] = useState<Record<string, number>>({})

  useEffect(() => {
    setCustomTasks(loadCustomTasks())
  }, [])

  useEffect(() => {
    if (!user) { setPbMap({}); return }
    let isMounted = true
    supabase
      .from('scores')
      .select('task_id, score')
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!isMounted) return
        const best: Record<string, number> = {}
        for (const row of data ?? []) {
          if (!best[row.task_id]) best[row.task_id] = row.score
        }
        setPbMap(best)
      })
    return () => { isMounted = false }
  }, [user?.id])

  const refresh = () => setCustomTasks(loadCustomTasks())

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteCustomTask(id)
    refresh()
  }

  const allTasks = [...BUILT_IN_TASKS, ...customTasks]

  return (
    <div className="landingPage">
      {/* Topbar */}
      <div className="gxTopbar">
        <span className="gxBrand">AIMERS</span>
        <span style={{ color: 'var(--text-3)' }}>/</span>
        <span>play · catalog</span>
        <div style={{ flex: 1 }} />
        <span className="gxLiveDot" />
        <span>v0.1</span>
        <div className="gxTopbarAuth">
          {user && profile ? (
            <>
              <button type="button" className="gxBtn isSm" onClick={onViewLeaderboard}>
                <i className="fa-solid fa-trophy" style={{ fontSize: 11 }} /> Board
              </button>
              <button type="button" className="gxBtn isSm" onClick={onViewProfile}>
                <i className="fa-solid fa-user" style={{ fontSize: 11 }} /> {profile.username}
              </button>
              <button type="button" className="gxBtn isSm" onClick={signOut} title="Sign out">
                <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 11 }} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="gxBtn isSm" onClick={onViewLeaderboard}>
                <i className="fa-solid fa-trophy" style={{ fontSize: 11 }} /> Board
              </button>
              <button type="button" className="gxBtn isPrimary isSm" onClick={() => setAuthOpen(true)}>
                Sign In
              </button>
            </>
          )}
        </div>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      <div className="landingLayout">
        {/* Side rail */}
        <nav className="gxRail">
          <div className="gxRailItem isActive" title="Drills">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="1.2" /><circle cx="12" cy="6" r="1.2" /><circle cx="18" cy="6" r="1.2" />
              <circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" />
              <circle cx="6" cy="18" r="1.2" /><circle cx="12" cy="18" r="1.2" /><circle cx="18" cy="18" r="1.2" />
            </svg>
          </div>
          <div className="gxRailItem" title="Stats">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 4 20 V 12 M 10 20 V 6 M 16 20 V 14 M 22 20 V 9" />
            </svg>
          </div>
          <div className="gxRailSpacer" />
          <div className="gxRailItem" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M 12 3 V 6 M 12 18 V 21 M 3 12 H 6 M 18 12 H 21 M 5.5 5.5 L 7.5 7.5 M 16.5 16.5 L 18.5 18.5 M 5.5 18.5 L 7.5 16.5 M 16.5 7.5 L 18.5 5.5" />
            </svg>
          </div>
        </nav>

        {/* Main content */}
        <main className="landingMain">
          <div className="landingHeaderRow">
            <div>
              <div className="landingLabel">drills · catalog</div>
              <h1 className="landingTitle">
                All modes{' '}
                <span className="landingTitleMuted">· {String(allTasks.length).padStart(2, '0')}</span>
              </h1>
            </div>
            <div className="landingActions">
              <button
                type="button"
                className="gxBtn isSm"
                onClick={onOpenCreator}
              >
                + custom
              </button>
              <button
                type="button"
                className="gxBtn isPrimary isSm"
                onClick={() => onSelectTask(allTasks[0])}
              >
                ▸ quick start
              </button>
            </div>
          </div>

          {/* Drill grid */}
          <div className="drillGrid">
            {allTasks.map((task, i) => (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                className="drillCard"
                onClick={() => onSelectTask(task)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectTask(task)}
              >
                <div className="drillCardTop">
                  <DrillIcon taskId={task.isCustom ? '' : task.id} size={18} />
                  <span className="drillCardNum">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div>
                  <div className="drillCardName">{task.name}</div>
                  <div className="drillCardTag">{task.tags.join(' · ')}</div>
                </div>
                <div className="drillCardFooter">
                  <span className="drillCardPbLabel">PB</span>
                  <span className="drillCardPbVal">{pbMap[task.id] ?? '—'}</span>
                </div>
                {task.isCustom && (
                  <div className="drillCardActions">
                    <button
                      type="button"
                      className="drillCardActionBtn"
                      onClick={(e) => { e.stopPropagation(); onEditTask(task) }}
                      aria-label="Edit task"
                    >
                      <i className="fa-solid fa-pen" style={{ fontSize: 9 }} />
                    </button>
                    <button
                      type="button"
                      className="drillCardActionBtn isDanger"
                      onClick={(e) => handleDelete(e, task.id)}
                      aria-label="Delete task"
                    >
                      <i className="fa-solid fa-trash" style={{ fontSize: 9 }} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Create task card */}
            <button
              type="button"
              className="drillCard drillCardCreate"
              onClick={onOpenCreator}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
                <path d="M 12 5 V 19 M 5 12 H 19" />
              </svg>
              <span className="drillCardCreateLabel">custom</span>
            </button>
          </div>
        </main>
      </div>

    </div>
  )
}
