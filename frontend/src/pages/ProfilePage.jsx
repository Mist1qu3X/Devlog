// Профиль пользователя: аватар, статистика, его посты.
// Владелец может отредактировать имя и загрузить аватар.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import Avatar from '../components/Avatar.jsx'
import PostCard from '../components/PostCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Уменьшаем картинку до 160px и возвращаем data URL (JPEG), чтобы не хранить тяжёлые файлы.
function resizeImage(file, size = 160) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage() {
  const { username } = useParams()
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError('')
    api.get(`/api/users/${username}`)
      .then((res) => { setProfile(res.data); setNewName(res.data.user.username) })
      .catch(() => setError('Пользователь не найден'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [username])

  const isOwner = user && profile && user.id === profile.user.id

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Нужен файл-картинка', 'error'); return }
    try {
      const dataUrl = await resizeImage(file)
      const res = await api.patch('/api/auth/me', { avatar_url: dataUrl })
      updateUser({ avatar_url: res.data.avatar_url })
      setProfile((p) => ({ ...p, user: { ...p.user, avatar_url: res.data.avatar_url } }))
      toast('Аватар обновлён', 'success')
    } catch (err) {
      toast(err.response?.data?.detail || 'Не удалось загрузить аватар', 'error')
    }
  }

  async function removeAvatar() {
    const res = await api.patch('/api/auth/me', { avatar_url: '' })
    updateUser({ avatar_url: null })
    setProfile((p) => ({ ...p, user: { ...p.user, avatar_url: null } }))
    toast('Аватар удалён', 'info')
  }

  async function saveName() {
    if (!newName.trim() || newName === profile.user.username) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await api.patch('/api/auth/me', { username: newName.trim() })
      updateUser({ username: res.data.username })
      toast('Имя изменено', 'success')
      setEditing(false)
      navigate(`/users/${res.data.username}`)
    } catch (err) {
      toast(err.response?.data?.detail || 'Не удалось сохранить', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function messageUser() {
    try {
      const res = await api.post(`/api/chats/with/${encodeURIComponent(profile.user.username)}`)
      navigate(`/chats/${res.data.id}`)
    } catch (err) {
      toast(err.response?.data?.detail || 'Не удалось открыть чат', 'error')
    }
  }

  if (loading) return <div className="container"><div className="spinner" /></div>
  if (error) return <div className="container"><p className="alert"><i className="fa-solid fa-triangle-exclamation" />{error}</p></div>

  const { user: u, posts, posts_count, comments_count, likes_received } = profile

  return (
    <div className="container">
      <div className="profile-header">
        {isOwner ? (
          <div className="avatar-edit" onClick={() => fileRef.current?.click()} title="Сменить аватар">
            <Avatar username={u.username} avatarUrl={u.avatar_url} size="lg" />
            <span className="overlay"><i className="fa-solid fa-camera" /></span>
          </div>
        ) : (
          <Avatar username={u.username} avatarUrl={u.avatar_url} size="lg" />
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />

        <div style={{ flex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ maxWidth: 220 }} />
              <button className="btn btn-primary btn-sm" onClick={saveName} disabled={saving}>
                <i className="fa-solid fa-check" /> Сохранить
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setNewName(u.username) }}>Отмена</button>
            </div>
          ) : (
            <h1 style={{ marginBottom: 2 }}>
              {u.username}{' '}
              {u.role === 'admin' && <span className="badge-admin">админ</span>}
              {isOwner && (
                <button className="icon-btn" style={{ width: 32, height: 32, fontSize: 13, marginLeft: 8, verticalAlign: 'middle' }} onClick={() => setEditing(true)} title="Изменить имя">
                  <i className="fa-solid fa-pen" />
                </button>
              )}
            </h1>
          )}
          <p className="hint">
            <i className="fa-regular fa-calendar" /> На платформе с {new Date(u.created_at).toLocaleDateString('ru-RU')}
          </p>
          {isOwner && u.avatar_url && (
            <button className="link-danger" onClick={removeAvatar}><i className="fa-solid fa-trash" /> убрать аватар</button>
          )}
          {!isOwner && user && (
            <button className="btn btn-primary btn-sm" onClick={messageUser}>
              <i className="fa-regular fa-paper-plane" /> Написать сообщение
            </button>
          )}
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat"><div className="num">{posts_count}</div><div className="lbl">постов</div></div>
        <div className="profile-stat"><div className="num">{comments_count}</div><div className="lbl">комментариев</div></div>
        <div className="profile-stat"><div className="num">{likes_received}</div><div className="lbl">лайков получено</div></div>
      </div>

      <h2>Посты</h2>
      {posts.length === 0 ? (
        <p className="empty"><i className="fa-regular fa-newspaper" />Пользователь ещё не публиковал посты.</p>
      ) : (
        <div className="post-list" style={{ marginTop: 14 }}>
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
