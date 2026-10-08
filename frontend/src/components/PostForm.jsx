// Общая форма для создания и редактирования поста.
import { useState } from 'react'

export default function PostForm({ onSubmit, initial, submitLabel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [tags, setTags] = useState(initial?.tags || '')

  function handleSubmit(e) {
    e.preventDefault()
    // Теги вводятся через запятую -> превращаем в массив строк.
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSubmit({ title, content, tags: tagList })
  }

  return (
    <form onSubmit={handleSubmit} className="card-box stack" style={{ marginTop: 16 }}>
      <label>
        Заголовок
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Текст поста
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          required
        />
      </label>
      <label>
        Теги (через запятую)
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="python, react, жизнь"
        />
      </label>
      <button className="btn btn-primary" type="submit">
        {submitLabel}
      </button>
    </form>
  )
}
