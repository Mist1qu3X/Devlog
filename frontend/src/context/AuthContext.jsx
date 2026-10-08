// Контекст авторизации: хранит текущего пользователя и токен,
// даёт методы login / register / logout всему приложению.
import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // При загрузке приложения проверяем, есть ли действующий токен.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/api/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    // Backend ожидает форму OAuth2 (username + password).
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    const res = await api.post('/api/auth/login', form)
    localStorage.setItem('token', res.data.access_token)
    setUser(res.data.user)
  }

  async function register(username, email, password) {
    const res = await api.post('/api/auth/register', { username, email, password })
    localStorage.setItem('token', res.data.access_token)
    setUser(res.data.user)
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  // Обновить данные текущего пользователя (после редактирования профиля).
  function updateUser(patch) {
    setUser((u) => ({ ...u, ...patch }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
