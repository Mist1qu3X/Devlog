// Страница одного поста: текст, лайки, комментарии.
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import Avatar from '../components/Avatar.jsx'
import LikeButton from '../components/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function PostPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadComments() {
    api.get(`/api/posts/${id}/comments`).then((res) => setComments(res.data))
  }

  useEffect(() => {
    setLoading(true)
    api
      .get(`/api/posts/${id}`)
      .then((res) => setPost(res.data))
      .catch(() => setError('Пост не найден'))
      .finally(() => setLoading(false))
    loadComments()
  }, [id])

  useEffect(() => {
    if (!loading && location.hash === '#comments') {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading, location.hash])

  async function submitComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    await api.post(`/api/posts/${id}/comments`, { content: newComment })
    setNewComment('')
    loadComments()
    toast('Комментарий добавлен', 'success')
  }

  async function deleteComment(commentId) {
    await api.delete(`/api/posts/${id}/comments/${commentId}`)
    loadComments()
    toast('Комментарий удалён', 'info')
  }

  async function deletePost() {
    if (!confirm('Удалить пост?')) return
    await api.delete(`/api/posts/${id}`)
    toast('Пост удалён', 'info')
    navigate('/')
  }

  if (loading) return <div className="container"><div className="spinner" /></div>
  if (error) return <div className="container"><p className="alert">{error}</p></div>
  if (!post) return null

  const canEdit = user && user.id === post.author.id
  const canModerate = user && (user.id === post.author.id || user.role === 'admin')

  return (
    <article className="container">
      <Link to="/" className="back-link"><i className="fa-solid fa-arrow-left" /> к ленте</Link>
      <h1>{post.title}</h1>
      <div className="post-head">
        <Link to={`/users/${post.author.username}`}><Avatar username={post.author.username} avatarUrl={post.author.avatar_url} /></Link>
        <div className="post-meta">
          <Link to={`/users/${post.author.username}`}>{post.author.username}</Link><br />
          {new Date(post.created_at).toLocaleString('ru-RU')}
        </div>
      </div>

      {post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((t) => (
            <Link key={t.id} to={`/?tag=${t.name}`} className="tag tag-small">
              <i className="fa-solid fa-hashtag" style={{ fontSize: 10, opacity: .6 }} />{t.name}
            </Link>
          ))}
        </div>
      )}

      <div className="post-content">{post.content}</div>

      <div className="post-actions">
        <LikeButton postId={post.id} initialLiked={post.liked_by_me} initialCount={post.likes_count} />
        {canEdit && <Link to={`/posts/${post.id}/edit`} className="btn btn-ghost btn-sm"><i className="fa-solid fa-pen" /> Редактировать</Link>}
        {canModerate && <button onClick={deletePost} className="btn btn-danger btn-sm"><i className="fa-solid fa-trash" /> Удалить</button>}
      </div>

      <section className="comments" id="comments">
        <h2>Комментарии ({comments.length})</h2>

        {user ? (
          <form onSubmit={submitComment} className="comment-form">
            <textarea placeholder="Ваш комментарий…" value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} />
            <button className="btn btn-primary" type="submit">Отправить</button>
          </form>
        ) : (
          <p className="hint"><Link to="/login">Войдите</Link>, чтобы оставить комментарий.</p>
        )}

        {comments.length === 0 ? (
          <p className="empty">Пока нет комментариев. Будьте первым!</p>
        ) : (
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className="comment">
                <div className="comment-head">
                  <Avatar username={c.author.username} avatarUrl={c.author.avatar_url} size="sm" />
                  <div className="who">
                    <Link to={`/users/${c.author.username}`}><strong>{c.author.username}</strong></Link>
                    <span className="comment-date">{new Date(c.created_at).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
                <div className="comment-body">{c.content}</div>
                {user && (user.id === c.author.id || user.role === 'admin') && (
                  <button className="link-danger" onClick={() => deleteComment(c.id)}><i className="fa-solid fa-trash" /> удалить</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}
