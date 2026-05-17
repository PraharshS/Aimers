import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ScoreRow } from '../lib/supabase'
import { BUILT_IN_TASKS } from '../types'

type Props = {
  onBack: () => void
}

const ALL_TASKS = [{ id: 'all', name: 'All Tasks' }, ...BUILT_IN_TASKS.map(t => ({ id: t.id, name: t.name }))]

export default function Leaderboard({ onBack }: Props) {
  const [selectedTask, setSelectedTask] = useState('all')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase
      .from('scores')
      .select('*, profiles(username)')
      .order('score', { ascending: false })
      .limit(25)

    if (selectedTask !== 'all') q = q.eq('task_id', selectedTask)

    q.then(({ data }) => {
      setRows((data as ScoreRow[]) ?? [])
      setLoading(false)
    })
  }, [selectedTask])

  return (
    <div className="fullPage">
      <div className="fullPageHeader">
        <button type="button" className="aimSettingsBtn" onClick={onBack} aria-label="Back">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1 className="fullPageTitle"><i className="fa-solid fa-trophy" /> Leaderboard</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="lbTaskFilter">
        {ALL_TASKS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`lbFilterBtn ${selectedTask === t.id ? 'isActive' : ''}`}
            onClick={() => setSelectedTask(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="lbTableWrap">
        {loading ? (
          <div className="lbEmpty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="lbEmpty">No scores yet. Be the first!</div>
        ) : (
          <table className="lbTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                {selectedTask === 'all' && <th>Task</th>}
                <th>Score</th>
                <th>Accuracy</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className={i < 3 ? `lbTop${i + 1}` : ''}>
                  <td className="lbRank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="lbPlayer">{row.profiles?.username ?? '—'}</td>
                  {selectedTask === 'all' && <td className="lbTask">{row.task_name}</td>}
                  <td className="lbScore">{row.score}</td>
                  <td className="lbAccuracy">{(row.accuracy * 100).toFixed(0)}%</td>
                  <td className="lbDate">
                    {new Date(row.played_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
