import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import Avatar from './Avatar.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="container-wide navbar-inner">
        <Link to="/" className="brand">
          <span className="logo"><i className="fa-solid fa-feather-pointed" /></span>
          devlog
        </Link>
        <nav className="nav-links">
          <button className="icon-btn" onClick={toggle} title="Сменить тему">
            <i className={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
          </button>
          {user ? (
            <>
              <Link to="/chats" className="btn btn-ghost btn-sm nav-icon-link" aria-label="Чаты" title="Чаты">
                <i className="fa-regular fa-comments" /> <span>Чаты</span>
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn btn-ghost btn-sm nav-icon-link" aria-label="Админ" title="Админ">
                  <i className="fa-solid fa-gauge-high" /> <span>Админ</span>
                </Link>
              )}
              <Link to="/create" className="btn btn-primary btn-sm nav-icon-link" aria-label="Создать пост" title="Создать пост">
                <i className="fa-solid fa-plus" /> <span>Пост</span>
              </Link>
              <Link to={`/users/${user.username}`} title="Мой профиль">
                <Avatar username={user.username} avatarUrl={user.avatar_url} size="sm" />
              </Link>
              <button onClick={handleLogout} className="icon-btn" title="Выйти">
                <i className="fa-solid fa-arrow-right-from-bracket" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                <i className="fa-solid fa-right-to-bracket" /> Вход
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
