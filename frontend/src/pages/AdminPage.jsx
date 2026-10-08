// Панель администратора: статистика, графики и управление пользователями.
import { useEffect, useState } from 'react'
import api from '../api'
import Avatar from '../components/Avatar.jsx'
import BarChart from '../components/BarChart.jsx'
import useCountUp from '../hooks/useCountUp.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

function StatTile({ icon, num, lbl }) {
  const value = useCountUp(num)
  return (
    <div className="stat-tile">
      <div className="ico"><i className={icon} /></div>
      <div>
        <div className="num">{value}</div>
        <div className="lbl">{lbl}</div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    Promise.all([api.get('/api/admin/stats'), api.get('/api/admin/users')])
      .then(([s, u]) => { setStats(s.data); setUsers(u.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function removeUser(u) {
    if (!confirm(`Удалить пользователя ${u.username} и все его данные?`)) return
    try {
      await api.delete(`/api/admin/users/${u.id}`)
      toast(`Пользователь ${u.username} удалён`, 'info')
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Не удалось удалить', 'error')
    }
  }

  if (loading) return <div className="container-wide"><div className="spinner" /></div>

  const tiles = [
    { icon: 'fa-solid fa-users', num: stats.users_count, lbl: 'Пользователей' },
    { icon: 'fa-solid fa-newspaper', num: stats.posts_count, lbl: 'Постов' },
    { icon: 'fa-solid fa-comments', num: stats.comments_count, lbl: 'Комментариев' },
    { icon: 'fa-solid fa-heart', num: stats.likes_count, lbl: 'Лайков' },
    { icon: 'fa-solid fa-hashtag', num: stats.tags_count, lbl: 'Тегов' },
  ]

  return (
    <div className="container-wide">
      <h1><i className="fa-solid fa-gauge-high" style={{ color: 'var(--primary)' }} /> Панель администратора</h1>
      <p className="hint">Обзор платформы и управление пользователями.</p>

      <div className="stat-grid" style={{ marginTop: 18 }}>
        {tiles.map((t) => <StatTile key={t.lbl} {...t} />)}
      </div>

      <div className="chart-grid">
        <div className="panel">
          <h2><i className="fa-solid fa-chart-column" style={{ color: 'var(--primary)' }} /> Посты по дням</h2>
          <BarChart data={stats.posts_per_day.map((d) => ({ label: d.date.slice(5), value: d.count }))} />
        </div>
        <div className="panel">
          <h2><i className="fa-solid fa-hashtag" style={{ color: 'var(--primary)' }} /> Популярные теги</h2>
          <BarChart data={stats.top_tags.map((t) => ({ label: '#' + t.name, value: t.count }))} />
        </div>
        <div className="panel">
          <h2><i className="fa-solid fa-pen-nib" style={{ color: 'var(--primary)' }} /> Активные авторы</h2>
          <BarChart data={stats.top_authors.map((a) => ({ label: a.username, value: a.count }))} />
        </div>
      </div>

      <div className="panel">
        <h2><i className="fa-solid fa-users" style={{ color: 'var(--primary)' }} /> Пользователи</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Пользователь</th><th>Email</th><th>Роль</th><th>Постов</th><th>Комм.</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Avatar username={u.username} avatarUrl={u.avatar_url} size="sm" /> {u.username}
                    </span>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role === 'admin' ? <span className="badge-admin">админ</span> : 'user'}</td>
                  <td>{u.posts_count}</td>
                  <td>{u.comments_count}</td>
                  <td>
                    {u.role !== 'admin' && u.id !== user.id && (
                      <button className="btn btn-danger btn-sm" onClick={() => removeUser(u)}>
                        <i className="fa-solid fa-trash" /> Удалить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
