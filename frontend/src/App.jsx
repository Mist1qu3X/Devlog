import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { useAuth } from './context/AuthContext.jsx'
import AdminPage from './pages/AdminPage.jsx'
import ChatsPage from './pages/ChatsPage.jsx'
import CreatePostPage from './pages/CreatePostPage.jsx'
import EditPostPage from './pages/EditPostPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PostPage from './pages/PostPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

// Маршрут только для авторизованных.
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container"><div className="spinner" /></div>
  return user ? children : <Navigate to="/login" replace />
}

// Маршрут только для администратора.
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container"><div className="spinner" /></div>
  return user && user.role === 'admin' ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/chats" element={<PrivateRoute><ChatsPage /></PrivateRoute>} />
          <Route path="/chats/:conversationId" element={<PrivateRoute><ChatsPage /></PrivateRoute>} />
          <Route path="/users/:username" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/create" element={<PrivateRoute><CreatePostPage /></PrivateRoute>} />
          <Route path="/posts/:id/edit" element={<PrivateRoute><EditPostPage /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
