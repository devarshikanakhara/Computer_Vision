import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [playerInfo, setPlayerInfo] = useState(() => {
    const saved = localStorage.getItem('playerInfo');
    return saved ? JSON.parse(saved) : { id: null, name: '', color: '' };
  });

  const [roomInfo, setRoomInfo] = useState(() => {
    const saved = localStorage.getItem('roomInfo');
    return saved ? JSON.parse(saved) : { id: null, code: '' };
  });

  const [gameStatus, setGameStatus] = useState('lobby');

  useEffect(() => {
    localStorage.setItem('playerInfo', JSON.stringify(playerInfo));
  }, [playerInfo]);

  useEffect(() => {
    localStorage.setItem('roomInfo', JSON.stringify(roomInfo));
  }, [roomInfo]);

  const updatePlayer = useCallback((info) => setPlayerInfo(prev => ({ ...prev, ...info })), []);
  const updateRoom = useCallback((info) => setRoomInfo(prev => ({ ...prev, ...info })), []);

  const clearGame = useCallback(() => {
    setPlayerInfo({ id: null, name: '', color: '' });
    setRoomInfo({ id: null, code: '' });
    setGameStatus('lobby');
    localStorage.removeItem('playerInfo');
    localStorage.removeItem('roomInfo');
  }, []);

  const value = useMemo(() => ({
    playerInfo,
    roomInfo,
    gameStatus,
    setGameStatus,
    updatePlayer,
    updateRoom,
    clearGame
  }), [playerInfo, roomInfo, gameStatus, updatePlayer, updateRoom, clearGame]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
