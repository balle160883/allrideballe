import { useState } from 'react'
import MapboxView from './components/Map/MapboxView'
import LandingPage from './components/Landing/LandingPage'

function App() {
  const [showMap, setShowMap] = useState(false)

  return (
    <main className="w-full h-screen bg-slate-950 overflow-hidden">
      {showMap ? (
        <MapboxView />
      ) : (
        <LandingPage onStart={() => setShowMap(true)} />
      )}
    </main>
  )
}

export default App
