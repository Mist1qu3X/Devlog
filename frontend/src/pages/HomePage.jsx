// Главная: hero, лента постов, теги (топ-5 + поиск), поиск и сортировка.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import PostCard from '../components/PostCard.jsx'

const TOP_TAGS = 5

export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [tags, setTags] = useState([])          // все теги, отсортированы по популярности
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [tagQuery, setTagQuery] = useState('')   // поиск по тегам
  const [showTagSearch, setShowTagSearch] = useState(false)

  const activeTag = searchParams.get('tag') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'new'

  useEffect(() => {
    setLoading(true)
    const params = { sort }
    if (activeTag) params.tag = activeTag
    if (search) params.search = search
    api.get('/api/posts', { params })
      .then((res) => setPosts(res.data))
      .finally(() => setLoading(false))
  }, [activeTag, search, sort])

  useEffect(() => {
    api.get('/api/tags').then((res) => setTags(res.data))
  }, [])

  function update(next) {
    const merged = { tag: activeTag, search, sort, ...next }
    const clean = {}
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === 'sort' && v === 'new')) clean[k] = v
    })
    setSearchParams(clean)
  }

  const topTags = tags.slice(0, TOP_TAGS)
  // если выбран тег вне топ-5 — добавим его в видимые чипы
  const activeOutsideTop = activeTag && !topTags.some((t) => t.name === activeTag)
    ? tags.find((t) => t.name === activeTag)
    : null

  const tagMatches = useMemo(() => {
    const q = tagQuery.trim().toLowerCase()
    if (!q) return tags.slice(0, 20)
    return tags.filter((t) => t.name.includes(q)).slice(0, 20)
  }, [tagQuery, tags])

  return (
    <div className="container-wide">
      <section className="hero">
        <h1>Блог сообщества devlog</h1>
        <p>Публикуйте статьи, делитесь мыслями, ставьте лайки и обсуждайте посты других авторов.</p>
        <div className="hero-stats">
          <div className="hero-stat"><b>{posts.length}</b><span>постов в ленте</span></div>
          <div className="hero-stat"><b>{tags.length}</b><span>тегов</span></div>
        </div>
      </section>

      <div className="toolbar">
        <form className="search-form" onSubmit={(e) => { e.preventDefault(); update({ search: searchInput.trim() }) }}>
          <div className="input-icon">
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Поиск по заголовку…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Найти</button>
        </form>
        <div className="segmented">
          <button className={sort === 'new' ? 'active' : ''} onClick={() => update({ sort: 'new' })}>
            <i className="fa-solid fa-clock" /> Новые
          </button>
          <button className={sort === 'popular' ? 'active' : ''} onClick={() => update({ sort: 'popular' })}>
            <i className="fa-solid fa-fire" /> Популярные
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="tag-bar">
          <button className={`tag ${!activeTag ? 'tag-active' : ''}`} onClick={() => update({ tag: '' })}>
            все
          </button>
          {topTags.map((t) => (
            <button key={t.id} className={`tag ${activeTag === t.name ? 'tag-active' : ''}`} onClick={() => update({ tag: t.name })}>
              <i className="fa-solid fa-hashtag" style={{ fontSize: 10, opacity: .6 }} />{t.name}
              <span className="cnt">{t.count}</span>
            </button>
          ))}
          {activeOutsideTop && (
            <button className="tag tag-active" onClick={() => update({ tag: activeOutsideTop.name })}>
              <i className="fa-solid fa-hashtag" style={{ fontSize: 10, opacity: .6 }} />{activeOutsideTop.name}
              <span className="cnt">{activeOutsideTop.count}</span>
            </button>
          )}
          {tags.length > TOP_TAGS && (
            <div className="tag-search">
              <button className="tag" onClick={() => setShowTagSearch((v) => !v)}>
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 0 }} /> ещё теги
              </button>
              {showTagSearch && (
                <div className="tag-dropdown">
                  <div className="tag-search" style={{ marginBottom: 6 }}>
                    <i className="fa-solid fa-magnifying-glass" />
                    <input className="tag-search-input" autoFocus placeholder="найти тег…" value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
                  </div>
                  {tagMatches.map((t) => (
                    <button key={t.id} onClick={() => { update({ tag: t.name }); setShowTagSearch(false); setTagQuery('') }}>
                      <span>#{t.name}</span><span className="cnt">{t.count}</span>
                    </button>
                  ))}
                  {tagMatches.length === 0 && <div className="hint" style={{ padding: 8 }}>ничего не найдено</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div>{[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}</div>
      ) : posts.length === 0 ? (
        <p className="empty"><i className="fa-regular fa-face-frown" />Постов не найдено.</p>
      ) : (
        <div className="post-list">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  )
}
