// Кнопка «лайк». Оптимистично меняет состояние, при ошибке откатывает.
import { useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function LikeButton({ postId, initialLiked, initialCount }) {
  const { user } = useAuth()
  const toast = useToast()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast('Войдите, чтобы ставить лайки', 'info')
      return
    }
    if (busy) return
    setBusy(true)
    const nextLiked = !liked
    // оптимистичное обновление
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))
    try {
      if (nextLiked) await api.post(`/api/posts/${postId}/like`)
      else await api.delete(`/api/posts/${postId}/like`)
    } catch {
      // откат при ошибке
      setLiked(!nextLiked)
      setCount((c) => c + (nextLiked ? -1 : 1))
      toast('Не удалось изменить лайк', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={toggle} title="Нравится">
      <span className="heart">{liked ? '❤️' : '🤍'}</span>
      <span>{count}</span>
    </button>
  )
}
