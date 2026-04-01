import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../context/WebSocketContext';
import { useGame } from '../context/GameContext';

const Lobby = () => {
    const { roomCode, playerId } = useParams();
    const { players, isConnected, sendMessage, gameState } = useWebSocket();
    const { roomInfo, playerInfo, setGameStatus } = useGame();
    const navigate = useNavigate();

    useEffect(() => {
        // PROACTIVE SYNC: If game is active, ensure we move to the game page
        if (gameState.gameActive) {
            console.log('Game already active, jumping in!');
            navigate(`/game/${roomCode}/${playerId}`);
        }
    }, [gameState.gameActive, navigate, roomCode, playerId]);

    const handleStart = () => {
        if (players.length >= 2) {
            sendMessage('start_game');
        }
    };

    return (
        <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center p-8'>
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-center mb-12 flex flex-col items-center'
            >
                <div className='flex items-center gap-3 mb-4'>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse-slow shadow-lg' : 'bg-rose-500'}`} />
                    <span className='text-sm font-bold uppercase tracking-widest text-slate-400'>
                        {isConnected ? 'ROOM ONLINE' : 'CONNECTING...'}
                    </span>
                </div>
                
                <h1 className='text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest'>Room Code</h1>
                <div className='bg-slate-800 px-8 py-4 rounded-3xl border border-slate-700 shadow-xl'>
                    <span className='text-5xl font-black tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-fuchsia-500'>
                        {roomCode}
                    </span>
                </div>
            </motion.div>

            <div className='w-full max-w-2xl grid md:grid-cols-2 gap-8'>
                <div className='flex flex-col gap-4'>
                    <h2 className='text-lg font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-3'>
                        Connected Players
                        <span className='bg-slate-800 px-3 py-1 rounded-full text-sm'>{players.length}</span>
                    </h2>
                    <div className='space-y-3'>
                        <AnimatePresence>
                            {players.map((p, idx) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 20, opacity: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`flex items-center justify-between p-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-lg ${Number(p.id) === Number(playerId) ? 'ring-2 ring-rose-500' : ''}`}
                                >
                                    <div className='flex items-center gap-4'>
                                        <div className='w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold bg-gradient-to-br from-rose-500 to-fuchsia-500'>
                                            {p.name?.[0] || '?'}
                                        </div>
                                        <span className='text-xl font-bold'>{p.name || 'Unknown'} {Number(p.id) === Number(playerId) && '(YOU)'}</span>
                                    </div>
                                    {idx === 0 && (
                                        <span className='text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-1 rounded-full uppercase tracking-tighter'>
                                            HOST
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {players.length < 2 && (
                            <motion.div 
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className='p-6 border-2 border-dashed border-slate-700 rounded-2xl text-center'
                            >
                                <p className='text-slate-500 font-bold'>Waiting for spark partner...</p>
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className='flex flex-col justify-center gap-6'>
                    <div className='bg-slate-800/50 p-8 rounded-3xl border border-slate-700'>
                        <p className='text-slate-300 text-lg leading-relaxed mb-6'>
                            Welcome to <b>Intimate Sparks</b>. This session will involve deep questions and playful dares. Make sure you're both in a comfortable space.
                        </p>
                        
                        {players.length >= 2 ? (
                            Number(players[0]?.id) === Number(playerId) ? (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleStart}
                                    className='w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-xl font-black shadow-2xl transition-all'
                                >
                                    START GAME
                                </motion.button>
                            ) : (
                                <div className='w-full py-5 bg-slate-900/50 border border-slate-700 rounded-2xl text-center flex flex-col gap-2'>
                                    <span className='text-emerald-500 font-bold uppercase tracking-widest text-sm animate-pulse'>READY TO PLAY</span>
                                    <span className='text-slate-500 text-xs font-bold'>Waiting for host to start...</span>
                                </div>
                            )
                        ) : (
                            <p className='text-center text-rose-400 font-bold'>NEED AT LEAST 2 PLAYERS</p>
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(roomCode);
                            alert('Code copied to clipboard!');
                        }}
                        className='py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border border-slate-700'
                    >
                        <span>COPY ROOM CODE</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
