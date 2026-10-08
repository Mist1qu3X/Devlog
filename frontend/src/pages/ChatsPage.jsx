import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import Avatar from '../components/Avatar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const EMOJIS = ['😀', '😂', '🥹', '😍', '😊', '😉', '🤔', '😎', '😭', '🔥', '❤️', '👍', '🎉', '🙌', '✨', '💯']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function prepareChatImage(file) {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Выберите файл изображения'))
  }
  if (file.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error('Исходное фото должно быть меньше 20 МБ'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Не удалось открыть изображение'))
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Браузер не поддерживает обработку изображений'))
          return
        }
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Не удалось обработать изображение'))
            return
          }
          if (blob.size > MAX_IMAGE_BYTES) {
            reject(new Error('Фото слишком большое даже после сжатия (лимит 5 МБ)'))
            return
          }
          const encoded = new FileReader()
          encoded.onerror = () => reject(new Error('Не удалось подготовить изображение'))
          encoded.onload = () => resolve(encoded.result)
          encoded.readAsDataURL(blob)
        }, 'image/jpeg', 0.82)
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ChatsPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [username, setUsername] = useState('')
  const [draft, setDraft] = useState('')
  const [photoDraft, setPhotoDraft] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [error, setError] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(Boolean(conversationId))
  const [startingChat, setStartingChat] = useState(false)
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const photoInputRef = useRef(null)
  const textareaRef = useRef(null)

  async function refreshChats() {
    try {
      const res = await api.get('/api/chats')
      setChats(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить список чатов')
    }
  }

  useEffect(() => {
    refreshChats()
    const timer = window.setInterval(refreshChats, 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoadingMessages(false)
      setError('')
      return undefined
    }

    let active = true
    let lastMessageId = 0
    setMessages([])
    setLoadingMessages(true)
    setError('')
    const refreshMessages = async () => {
      try {
        const path = `/api/chats/${conversationId}/messages`
        const res = await api.get(lastMessageId ? `${path}?after_id=${lastMessageId}` : path)
        if (active && res.data.length) {
          lastMessageId = Math.max(lastMessageId, ...res.data.map((message) => message.id))
          setMessages((current) => {
            const existingIds = new Set(current.map((message) => message.id))
            const newMessages = res.data.filter((message) => !existingIds.has(message.id))
            return newMessages.length ? [...current, ...newMessages] : current
          })
        }
      } catch (err) {
        if (active) setError(err.response?.data?.detail || 'Не удалось загрузить переписку')
      } finally {
        if (active) setLoadingMessages(false)
      }
    }
    refreshMessages()
    const timer = window.setInterval(refreshMessages, 4000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startChat(e) {
    e.preventDefault()
    const target = username.trim()
    if (!target) return

    setStartingChat(true)
    setError('')
    try {
      const res = await api.post(`/api/chats/with/${encodeURIComponent(target)}`)
      setChats((current) => [res.data, ...current.filter((chat) => chat.id !== res.data.id)])
      setUsername('')
      navigate(`/chats/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось открыть чат')
    } finally {
      setStartingChat(false)
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    const content = draft.trim()
    if ((!content && !photoDraft) || !conversationId || sending) return

    setSending(true)
    setError('')
    try {
      const res = await api.post(`/api/chats/${conversationId}/messages`, {
        content,
        image_url: photoDraft || null,
      })
      setMessages((current) => [...current, res.data])
      setDraft('')
      setPhotoDraft('')
      setShowEmojis(false)
      refreshChats()
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  async function choosePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setPreparingPhoto(true)
    setError('')
    try {
      setPhotoDraft(await prepareChatImage(file))
    } catch (err) {
      setError(err.message || 'Не удалось подготовить фото')
    } finally {
      setPreparingPhoto(false)
    }
  }

  function insertEmoji(emoji) {
    const textarea = textareaRef.current
    if (!textarea) {
      setDraft((current) => current + emoji)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`
    setDraft(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  const activeChat = chats.find((chat) => String(chat.id) === conversationId)

  return (
    <div className={`container-wide chat-layout ${conversationId ? 'chat-layout-active' : ''}`}>
      <aside className="chat-sidebar">
        <h1>Личные чаты</h1>
        <form className="chat-start-form" onSubmit={startChat}>
          <input
            aria-label="Имя пользователя для нового чата"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={startingChat}>
            <i className="fa-solid fa-plus" /> Новый
          </button>
        </form>
        {!conversationId && error && <p className="alert chat-alert">{error}</p>}
        {chats.length === 0 ? (
          <p className="hint chat-empty">Чатов пока нет. Введите имя пользователя или откройте чей-нибудь профиль.</p>
        ) : (
          <div className="chat-list">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                to={`/chats/${chat.id}`}
                className={`chat-list-item ${String(chat.id) === conversationId ? 'active' : ''}`}
              >
                <Avatar username={chat.partner.username} avatarUrl={chat.partner.avatar_url} size="sm" />
                <span className="chat-list-copy">
                  <strong>{chat.partner.username}</strong>
                  <span>{chat.last_message || 'Начните переписку'}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </aside>

      <section className="chat-conversation">
        {activeChat ? (
          <>
            <header className="chat-header">
              <Link to="/chats" className="chat-back-link" aria-label="Все чаты">
                <i className="fa-solid fa-arrow-left" />
              </Link>
              <Link to={`/users/${activeChat.partner.username}`}>
                <Avatar username={activeChat.partner.username} avatarUrl={activeChat.partner.avatar_url} size="sm" />
              </Link>
              <div className="chat-header-copy">
                <strong>{activeChat.partner.username}</strong>
                <span>Личная переписка</span>
              </div>
            </header>
            {error && <p className="alert chat-alert">{error}</p>}
            <div className="chat-messages" aria-live="polite">
              {loadingMessages && messages.length === 0 ? (
                <div className="spinner" />
              ) : messages.length === 0 ? (
                <p className="empty">Сообщений пока нет. Напишите первым!</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`chat-message ${message.sender.id === user.id ? 'mine' : ''}`}>
                    {message.image_url && (
                      <a href={message.image_url} target="_blank" rel="noreferrer" className="chat-photo-link">
                        <img src={message.image_url} alt={`Фото от ${message.sender.username}`} className="chat-photo" />
                      </a>
                    )}
                    {message.content && <p>{message.content}</p>}
                    <time>{new Date(message.created_at).toLocaleString('ru-RU')}</time>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <form className="chat-compose" onSubmit={sendMessage}>
              {photoDraft && (
                <div className="chat-photo-preview">
                  <img src={photoDraft} alt="Фото для отправки" />
                  <button type="button" className="icon-btn" aria-label="Убрать фото" onClick={() => setPhotoDraft('')}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              )}
              <div className="chat-compose-row">
                <div className="chat-compose-tools">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={choosePhoto}
                  />
                  <button
                    type="button"
                    className="chat-tool-btn"
                    title="Прикрепить фото"
                    aria-label="Прикрепить фото"
                    disabled={preparingPhoto || sending}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <i className={preparingPhoto ? 'fa-solid fa-spinner fa-spin' : 'fa-regular fa-image'} />
                  </button>
                  <div className="emoji-picker-wrap">
                    <button
                      type="button"
                      className="chat-tool-btn"
                      title="Эмодзи"
                      aria-label="Выбрать эмодзи"
                      aria-expanded={showEmojis}
                      onClick={() => setShowEmojis((visible) => !visible)}
                    >
                      <i className="fa-regular fa-face-smile" />
                    </button>
                    {showEmojis && (
                      <div className="emoji-picker" aria-label="Эмодзи">
                        {EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} aria-label={emoji}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  aria-label="Текст сообщения"
                  placeholder={preparingPhoto ? 'Подготовка фото…' : 'Напишите сообщение…'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form.requestSubmit()
                    }
                  }}
                  maxLength={5000}
                  rows={2}
                />
                <button
                  className="btn btn-primary chat-send-btn"
                  type="submit"
                  disabled={sending || preparingPhoto || (!draft.trim() && !photoDraft)}
                  aria-label="Отправить"
                >
                  <i className="fa-solid fa-paper-plane" /> <span>Отправить</span>
                </button>
              </div>
            </form>
          </>
        ) : conversationId ? (
          <div className="chat-placeholder">
            {error ? <p className="alert">{error}</p> : <div className="spinner" />}
          </div>
        ) : (
          <div className="chat-placeholder">
            <i className="fa-regular fa-comments" />
            <h2>Выберите чат</h2>
            <p>Откройте профиль пользователя, чтобы начать личную переписку.</p>
          </div>
        )}
      </section>
    </div>
  )
}
