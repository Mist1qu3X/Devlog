import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import PostForm from '../components/PostForm.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState('')

  async function handleSubmit({ title, content, tags }) {
    setError('')
    try {
      const res = await api.post('/api/posts', { title, content, tags })
      toast('Пост опубликован', 'success')
      navigate(`/posts/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось создать пост')
    }
  }

  return (
    <div className="container">
      <h1>Новый пост</h1>
      {error && <div className="alert">{error}</div>}
      <PostForm onSubmit={handleSubmit} submitLabel="Опубликовать" />
    </div>
  )
}
