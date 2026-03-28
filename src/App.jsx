import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { EventProvider } from './context/EventContext'
import Landing from './pages/Landing'
import Create from './pages/Create'
import HostDashboard from './pages/HostDashboard'
import ParticipantView from './pages/ParticipantView'

export default function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <Routes>
          <Route path="/"                       element={<Landing />} />
          <Route path="/create"                 element={<Create />} />
          <Route path="/event/:id/dashboard"    element={<HostDashboard />} />
          <Route path="/event/:id"              element={<ParticipantView />} />
        </Routes>
      </EventProvider>
    </BrowserRouter>
  )
}
