import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { WebSocketProvider } from './context/WebSocketContext'
import Landing from './pages/Landing'
import CreateJoin from './pages/CreateJoin'
import Lobby from './pages/Lobby'
import Game from './pages/Game'

function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <WebSocketProvider>
          <Routes>
            <Route path='/' element={<Landing />} />
            <Route path='/create-join' element={<CreateJoin />} />
            <Route path='/lobby/:roomCode/:playerId' element={<Lobby />} />
            <Route path='/game/:roomCode/:playerId' element={<Game />} />
            <Route path='*' element={<Navigate to='/' />} />
          </Routes>
        </WebSocketProvider>
      </GameProvider>
    </BrowserRouter>
  )
}

export default App