import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import UserDashboard from './pages/UserDashboard'
import JoinQueue from './pages/JoinQueue'
import QueueStatus from './pages/QueueStatus'
import History from './pages/History'   
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/join-queue" element={<JoinQueue />} />
        <Route path="queue-status" element={<QueueStatus />} />
        <Route path="history" element={<History />} />
      </Routes>
    </Router>
  )
}
export default App