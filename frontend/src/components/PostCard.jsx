// Карточка поста в ленте.
import { Link } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import LikeButton from './LikeButton.jsx'

export default function PostCard({ post }) {
  return (
    <article className="post-card">
      <div className="post-card-head">
        <Link to={`/users/${post.author.username}`}>
          <Avatar username={post.author.username} avatarUrl={post.author.avatar_url} size="sm" />
        </Link>
        <div className="post-meta">
          <Link to={`/users/${post.author.username}`}>{post.author.username}</Link>
          {' · '}
          {new Date(post.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>

      <Link to={`/posts/${post.id}`} className="post-card-title">
        {post.title}
      </Link>

      {post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((t) => (
            <Link key={t.id} to={`/?tag=${t.name}`} className="tag tag-small">
              <i className="fa-solid fa-hashtag" style={{ fontSize: 10, opacity: .6 }} />{t.name}
            </Link>
          ))}
        </div>
      )}

      <div className="card-footer">
        <LikeButton
          postId={post.id}
          initialLiked={post.liked_by_me}
          initialCount={post.likes_count}
        />
        <Link to={`/posts/${post.id}#comments`} className="stat comment-stat" aria-label={`Открыть комментарии: ${post.comments_count}`}>
          <i className="fa-regular fa-comment" /> {post.comments_count}
        </Link>
      </div>
    </article>
  )
}
