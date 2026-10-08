import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      toast('Вы вошли в систему', 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка входа')
    }
  }

  return (
    <div className="container auth-wrap">
      <div className="card-box">
        <h1>С возвращением</h1>
        <p className="auth-sub">Войдите в свой аккаунт</p>
        {error && <div className="alert">{error}</div>}
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Имя пользователя
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            Пароль
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn btn-primary full-btn" type="submit">Войти</button>
        </form>
        <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
