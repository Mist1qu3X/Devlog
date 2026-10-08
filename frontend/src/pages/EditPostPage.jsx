import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import PostForm from '../components/PostForm.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function EditPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [initial, setInitial] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/posts/${id}`).then((res) => {
      setInitial({
        title: res.data.title,
        content: res.data.content,
        tags: res.data.tags.map((t) => t.name).join(', '),
      })
    })
  }, [id])

  async function handleSubmit({ title, content, tags }) {
    setError('')
    try {
      await api.put(`/api/posts/${id}`, { title, content, tags })
      toast('Изменения сохранены', 'success')
      navigate(`/posts/${id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось сохранить')
    }
  }

  if (!initial) return <div className="container"><div className="spinner" /></div>

  return (
    <div className="container">
      <h1>Редактирование поста</h1>
      {error && <div className="alert">{error}</div>}
      <PostForm onSubmit={handleSubmit} initial={initial} submitLabel="Сохранить" />
    </div>
  )
}
