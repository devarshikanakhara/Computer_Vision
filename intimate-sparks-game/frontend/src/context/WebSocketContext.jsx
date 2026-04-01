import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGame } from './GameContext';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { roomInfo, playerInfo, updatePlayer, setGameStatus } = useGame();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({
    gameActive: false,
    currentTurn: null,
    scores: {},
    spiceLevel: 2,
    currentQuestion: null,
    currentQuestionType: null,
    timer: 0,
    waitingForCustom: false,
    waitingForCompletion: false
  });
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (!roomInfo.code) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    
    // Reset local state before new connection
    setPlayers([]);
    setGameState({
      gameActive: false,
      currentTurn: null,
      scores: {},
      spiceLevel: 2,
      currentQuestion: null,
      currentQuestionType: null,
      timer: 0,
      waitingForCustom: false,
      waitingForCompletion: false
    });
    
    const wsUrl = import.meta.env.VITE_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}${window.location.port ? ':8000' : ''}/ws/${roomInfo.code}`;

    console.log('Connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket Connected!');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
      } catch (err) {
        console.error('Error parsing websocket message:', err, event.data);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket Closed. Retrying in 5s...');
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(() => connect(), 5000);
    };

    ws.current = socket;
  }, [roomInfo.code, playerInfo.id, playerInfo.name]);

  const handleIncomingMessage = (data) => {
    setMessages(prev => [...prev, data]);

    switch (data.type) {
      case 'joined':
        console.log('Joined successfully, syncing state:', data);
        setGameState(prev => ({
          ...prev,
          gameActive: data.game_active,
          currentTurn: data.current_turn,
          scores: data.scores,
          spiceLevel: data.spice_level,
          currentQuestion: data.current_question,
          waitingForCustom: data.waiting_for_custom,
          waitingForCompletion: data.waiting_for_completion
        }));
        if (data.game_active) setGameStatus('playing');
        break;
      case 'players_update':
        setPlayers(data.players);
        break;
      case 'game_started':
        setGameState(prev => ({
          ...prev,
          gameActive: true,
          currentTurn: data.first_turn,
          scores: data.scores,
          spiceLevel: data.spice_level
        }));
        setGameStatus('playing');
        break;
      case 'spice_updated':
        setGameState(prev => ({ ...prev, spiceLevel: data.spice_level }));
        break;
      case 'choice_selected':
        setGameState(prev => ({
          ...prev,
          currentQuestionType: data.choice,
          currentTurn: data.player_turn,
          waitingForCustom: true
        }));
        break;
      case 'question_display':
        setGameState(prev => ({
          ...prev,
          currentQuestion: data.question,
          currentQuestionType: data.choice,
          currentTurn: data.player_turn,
          waitingForCustom: false,
          waitingForCompletion: true
        }));
        break;
      case 'action_completed':
      case 'action_skipped':
        setGameState(prev => ({
          ...prev,
          scores: data.new_scores,
          currentQuestion: null,
          currentQuestionType: null,
          waitingForCustom: false,
          waitingForCompletion: false
        }));
        break;
      case 'turn_changed':
        setGameState(prev => ({
          ...prev,
          currentTurn: data.current_turn,
          scores: data.scores,
          currentQuestion: null,
          currentQuestionType: null,
          waitingForCustom: false,
          waitingForCompletion: false
        }));
        break;
      case 'timer_start':
        setGameState(prev => ({ ...prev, timer: data.duration }));
        break;
      case 'reaction_received':
        // Handle reactions in UI?
        break;
      case 'game_ended':
        setGameState(prev => ({ ...prev, gameActive: false }));
        setGameStatus('lobby');
        break;
      default:
        console.log('Unhandled websocket message:', data);
    }
  };

  const sendMessage = useCallback((type, payload = {}) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('Socket not open, message skipped:', type);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  // Handle joining when both connection and playerInfo are ready
  useEffect(() => {
    if (isConnected && playerInfo.id && ws.current) {
      console.log('Handshaking player:', playerInfo.id);
      ws.current.send(JSON.stringify({
        type: 'join',
        player_id: Number(playerInfo.id),
        player_name: playerInfo.name
      }));
    }
  }, [isConnected, playerInfo.id, playerInfo.name]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        sendMessage('ping');
      }, 20000); // Every 20 seconds
    }
    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  const value = useMemo(() => ({
    isConnected,
    sendMessage,
    players,
    gameState,
    messages
  }), [isConnected, sendMessage, players, gameState, messages]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
