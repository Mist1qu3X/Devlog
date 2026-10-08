import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register(username, email, password)
      toast('Аккаунт создан!', 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    }
  }

  return (
    <div className="container auth-wrap">
      <div className="card-box">
        <h1>Создать аккаунт</h1>
        <p className="auth-sub">Присоединяйтесь к сообществу</p>
        {error && <div className="alert">{error}</div>}
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Имя пользователя
            <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Пароль
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </label>
          <button className="btn btn-primary full-btn" type="submit">Зарегистрироваться</button>
        </form>
        <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
