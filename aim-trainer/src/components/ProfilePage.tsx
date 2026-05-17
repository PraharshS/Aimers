import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ScoreRow } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BUILT_IN_TASKS } from '../types'

type Props = {
  onBack: () => void
}

type BestByTask = Record<string, ScoreRow>

export default function ProfilePage({ onBack }: Props) {
  const { profile, user, signOut } = useAuth()
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setScores((data as ScoreRow[]) ?? [])
        setLoading(false)
      })
  }, [user])

  if (!user || !profile) {
    return (
      <div className="fullPage">
        <div className="fullPageHeader">
          <button type="button" className="aimSettingsBtn" onClick={onBack} aria-label="Back">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <h1 className="fullPageTitle">Profile</h1>
          <div style={{ width: 36 }} />
        </div>
        <div className="lbEmpty">Sign in to view your profile.</div>
      </div>
    )
  }

  const totalGames = scores.length
  const totalHits = scores.reduce((s, r) => s + r.hits, 0)
  const totalShots = scores.reduce((s, r) => s + r.hits + r.misses, 0)
  const overallAccuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0
  const bestScore = scores.reduce((best, r) => Math.max(best, r.score), 0)

  const bestByTask: BestByTask = {}
  for (const row of scores) {
    if (!bestByTask[row.task_id] || row.score > bestByTask[row.task_id].score) {
      bestByTask[row.task_id] = row
    }
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <div className="fullPage">
      <div className="fullPageHeader">
        <button type="button" className="aimSettingsBtn" onClick={onBack} aria-label="Back">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1 className="fullPageTitle"><i className="fa-solid fa-user" /> Profile</h1>
        <button type="button" className="aimSettingsBtn" onClick={signOut} aria-label="Sign out" title="Sign out">
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      </div>

      <div className="profileWrap">
        {/* Identity card */}
        <div className="profileCard profileIdentity">
          <div className="profileAvatar">{initials}</div>
          <div className="profileInfo">
            <h2 className="profileUsername">{profile.username}</h2>
            <p className="profileMeta">{user.email}</p>
            <p className="profileMeta">Joined {joinDate}</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="profileStats">
          {[
            { label: 'Games Played', value: totalGames, icon: 'gamepad' },
            { label: 'Best Score', value: bestScore, icon: 'trophy' },
            { label: 'Total Hits', value: totalHits, icon: 'bullseye' },
            { label: 'Accuracy', value: `${overallAccuracy.toFixed(1)}%`, icon: 'crosshairs' },
          ].map(s => (
            <div key={s.label} className="profileStatTile">
              <i className={`fa-solid fa-${s.icon} profileStatIcon`} />
              <div className="profileStatValue">{s.value}</div>
              <div className="profileStatLabel">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Best score per task */}
        <div className="profileCard">
          <h3 className="profileSectionTitle">Best Score Per Task</h3>
          {loading ? <p className="lbEmpty">Loading…</p> : (
            <div className="profileTaskGrid">
              {BUILT_IN_TASKS.map(task => {
                const best = bestByTask[task.id]
                return (
                  <div key={task.id} className="profileTaskRow" style={{ borderColor: `${task.targetColor}33` }}>
                    <div className="profileTaskIcon" style={{ color: task.targetColor, background: `${task.targetColor}18` }}>
                      <i className={`fa-solid fa-${task.icon}`} />
                    </div>
                    <div className="profileTaskName">{task.name}</div>
                    {best ? (
                      <>
                        <div className="profileTaskScore" style={{ color: task.targetColor }}>{best.score}</div>
                        <div className="profileTaskAcc">{(best.accuracy * 100).toFixed(0)}%</div>
                      </>
                    ) : (
                      <div className="profileTaskEmpty">No games yet</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent games */}
        {scores.length > 0 && (
          <div className="profileCard">
            <h3 className="profileSectionTitle">Recent Games</h3>
            <table className="lbTable">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.slice(0, 15).map(row => (
                  <tr key={row.id}>
                    <td className="lbTask">{row.task_name}</td>
                    <td className="lbScore">{row.score}</td>
                    <td className="lbAccuracy">{(row.accuracy * 100).toFixed(0)}%</td>
                    <td className="lbDate">{new Date(row.played_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
