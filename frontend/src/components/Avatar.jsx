// Аватар: если у пользователя загружена картинка (avatarUrl) — показываем её,
// иначе рисуем кружок с инициалом. Цвет вычисляется по имени.
const COLORS = [
  '#6d5efc', '#9333ea', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#ef4444', '#3b82f6',
]

function colorFor(name) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return COLORS[sum % COLORS.length]
}

export default function Avatar({ username, avatarUrl, size = 'md' }) {
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : 'avatar'
  if (avatarUrl) {
    return (
      <span className={cls}>
        <img src={avatarUrl} alt={username} />
      </span>
    )
  }
  return (
    <span className={cls} style={{ background: colorFor(username || '?') }}>
      {(username || '?').charAt(0).toUpperCase()}
    </span>
  )
}
