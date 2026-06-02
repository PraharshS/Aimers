import { useEffect, useRef, useState } from 'react'
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
  const [editOpen, setEditOpen] = useState(false)
  const [editUsername, setEditUsername] = useState(profile?.username || '')
  const [photoZoom, setPhotoZoom] = useState(1)
  const [photoFile, setPhotoFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhotoFile(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setUploading(true)
    try {
      let avatarUrl = profile?.avatar_url

      // Upload photo if selected
      if (photoFile) {
        const fileName = `${user.id}-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, await fetch(photoFile).then(r => r.blob()), { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        avatarUrl = data.publicUrl
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ username: editUsername, avatar_url: avatarUrl })
        .eq('id', user.id)

      if (error) throw error

      setEditOpen(false)
      setPhotoFile(null)
      setPhotoZoom(1)
      window.location.reload() // Reload to show updated profile
    } catch (err) {
      console.error('Error saving profile:', err)
    } finally {
      setUploading(false)
    }
  }

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
          <div className="profileAvatarWrapper">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="profileAvatarImage" />
            ) : (
              <div className="profileAvatar">{initials}</div>
            )}
            <button
              type="button"
              className="profileEditBtn"
              onClick={() => setEditOpen(true)}
              title="Edit profile"
            >
              <i className="fa-solid fa-pen" />
            </button>
          </div>
          <div className="profileInfo">
            <h2 className="profileUsername">{profile.username}</h2>
            <p className="profileMeta">{user.email}</p>
            <p className="profileMeta">Joined {joinDate}</p>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {editOpen && (
          <div className="profileEditModal">
            <div className="profileEditCard">
              <button
                type="button"
                className="profileEditClose"
                onClick={() => setEditOpen(false)}
              >
                <i className="fa-solid fa-xmark" />
              </button>

              <h2 className="profileEditTitle">Edit Profile</h2>

              {/* Photo Upload */}
              <div className="profileEditSection">
                <label className="profileEditLabel">Profile Photo</label>
                {photoFile ? (
                  <div className="profilePhotoPreview">
                    <img
                      src={photoFile}
                      alt="Preview"
                      style={{ transform: `scale(${photoZoom})` }}
                      className="profilePhotoImage"
                    />
                    <div className="profilePhotoZoom">
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={photoZoom}
                        onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                        className="profileZoomSlider"
                      />
                      <span className="profileZoomLabel">{Math.round(photoZoom * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="profilePhotoPlaceholder">
                    <i className="fa-solid fa-image" />
                    <p>No photo selected</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="gxBtn isSm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Photo
                </button>
              </div>

              {/* Username Edit */}
              <div className="profileEditSection">
                <label className="profileEditLabel">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="profileEditInput"
                  placeholder="Enter username"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                className="gxBtn isPrimary"
                onClick={handleSaveProfile}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

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
