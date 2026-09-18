import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoginPage, RegisterPage } from './pages'
import LandingPage from './pages/LandingPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/app" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  )
}
