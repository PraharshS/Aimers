import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import type { ScoreRow } from '../lib/supabase'
import { BUILT_IN_TASKS } from '../types'

type Props = {
  onBack: () => void
}

type TimePeriod = 'hourly' | 'daily' | 'weekly'
type ChartDataPoint = { label: string; score: number; count: number }

const ALL_TASKS = [{ id: 'all', name: 'All Tasks' }, ...BUILT_IN_TASKS.map(t => ({ id: t.id, name: t.name }))]

function aggregateByPeriod(rows: ScoreRow[], period: TimePeriod): ChartDataPoint[] {
  const map = new Map<string, { sum: number; count: number }>()

  for (const row of rows) {
    const date = new Date(row.played_at)
    let label = ''

    if (period === 'hourly') {
      const h = date.getHours().toString().padStart(2, '0')
      label = `${h}:00`
    } else if (period === 'daily') {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      label = `W ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }

    const existing = map.get(label) ?? { sum: 0, count: 0 }
    existing.sum += row.score
    existing.count += 1
    map.set(label, existing)
  }

  return Array.from(map.entries()).map(([label, { sum, count }]) => ({
    label,
    score: Math.round(sum / count),
    count,
  }))
}

export default function Leaderboard({ onBack }: Props) {
  const [selectedTask, setSelectedTask] = useState('all')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase
      .from('scores')
      .select('*, profiles(username)')
      .order('played_at', { ascending: false })
      .limit(100)

    if (selectedTask !== 'all') q = q.eq('task_id', selectedTask)

    q.then(({ data }) => {
      const scores = (data as ScoreRow[]) ?? []
      setRows(scores.sort((a, b) => b.score - a.score).slice(0, 25))
      setChartData(aggregateByPeriod(scores, timePeriod))
      setLoading(false)
    })
  }, [selectedTask, timePeriod])

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

      <div className="lbChartSection">
        <div className="lbChartHeader">
          <h2 className="lbChartTitle">Score Trends</h2>
          <div className="lbTimePeriods">
            <button type="button" className={`lbPeriodBtn ${timePeriod === 'hourly' ? 'isActive' : ''}`} onClick={() => setTimePeriod('hourly')}>Hourly</button>
            <button type="button" className={`lbPeriodBtn ${timePeriod === 'daily' ? 'isActive' : ''}`} onClick={() => setTimePeriod('daily')}>Daily</button>
            <button type="button" className={`lbPeriodBtn ${timePeriod === 'weekly' ? 'isActive' : ''}`} onClick={() => setTimePeriod('weekly')}>Weekly</button>
          </div>
        </div>
        {loading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading…</div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
              <Tooltip
                contentStyle={{ background: 'rgba(3,8,18,0.95)', border: '1px solid rgba(88,214,255,0.2)', borderRadius: '6px', color: 'var(--text)' }}
                formatter={(value) => value}
              />
              <Line type="monotone" dataKey="score" stroke="#58d6ff" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>No data</div>
        )}
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
