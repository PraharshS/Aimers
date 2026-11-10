import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import * as api from '../lib/api'
import type { ScoreRow, TrendPoint } from '../lib/api'
import { BUILT_IN_TASKS } from '../types'

type Props = {
  onBack: () => void
}

type TimePeriod = 'hourly' | 'daily' | 'weekly'
type ChartDataPoint = { label: string; score: number; count: number }

const ALL_TASKS = [{ id: 'all', name: 'All Tasks' }, ...BUILT_IN_TASKS.map(t => ({ id: t.id, name: t.name }))]

/** Axis label for a trend bucket (the API returns UTC timestamps; show them in local time). */
function labelFor(bucket: string, period: TimePeriod): string {
  const date = new Date(bucket)
  if (period === 'hourly') return `${date.getHours().toString().padStart(2, '0')}:00`
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return period === 'weekly' ? `W ${day}` : day
}

function toChartData(points: TrendPoint[], period: TimePeriod): ChartDataPoint[] {
  return points.map((p) => ({ label: labelFor(p.bucket, period), score: p.score, count: p.count }))
}

export default function Leaderboard({ onBack }: Props) {
  const [selectedTask, setSelectedTask] = useState('all')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.getLeaderboard({ task: selectedTask, period: 'all', limit: 25 }),
      api.getTrend({ task: selectedTask, period: timePeriod }),
    ])
      .then(([board, trend]) => {
        if (cancelled) return
        setRows(board)
        setChartData(toChartData(trend, timePeriod))
      })
      .catch(() => {
        if (cancelled) return
        setRows([])
        setChartData([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
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
                <tr key={`${row.rank}-${row.username}`} className={i < 3 ? `lbTop${i + 1}` : ''}>
                  <td className="lbRank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="lbPlayer">{row.username ?? '—'}</td>
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
