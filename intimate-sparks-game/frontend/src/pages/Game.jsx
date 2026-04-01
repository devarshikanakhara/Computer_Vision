import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../context/WebSocketContext';
import { useGame } from '../context/GameContext';

const Game = () => {
    const { roomCode, playerId } = useParams();
    const { players, sendMessage, gameState, isConnected } = useWebSocket();
    const navigate = useNavigate();

    const isMyTurn = Number(gameState.currentTurn) === Number(playerId);
    const currentQuestion = gameState.currentQuestion;
    const waitingForCompletion = gameState.waitingForCompletion;
    const waitingForCustom = gameState.waitingForCustom;
    const scores = gameState.scores || {};
    const [isSelecting, setIsSelecting] = useState(false);
    const [customText, setCustomText] = useState('');
    const [isWritingCustom, setIsWritingCustom] = useState(false);

    useEffect(() => {
        if (waitingForCompletion || waitingForCustom) {
            setIsSelecting(false);
        }
        if (!waitingForCustom) {
            setIsWritingCustom(false);
            setCustomText('');
        }
    }, [waitingForCompletion, waitingForCustom]);

    const handleChoice = (choice) => {
        if (isMyTurn && !waitingForCompletion && !waitingForCustom && !isSelecting) {
            setIsSelecting(true);
            sendMessage('select_choice', { choice });
        }
    };

    const handleCustomSubmit = () => {
        if (customText.trim()) {
            sendMessage('submit_custom', { text: customText });
        }
    };

    const handleRequestRandom = () => {
        sendMessage('request_random');
    };

    const handleComplete = () => {
        if (isMyTurn && waitingForCompletion) {
            sendMessage('complete_action');
        }
    };

    const handleSkip = () => {
        if (isMyTurn && waitingForCompletion) {
            sendMessage('skip_action');
        }
    };

    const updateSpice = (level) => {
        sendMessage('update_spice', { level });
    };

    if (!gameState.gameActive && players.length > 0) {
        navigate(`/lobby/${roomCode}/${playerId}`);
    }

    return (
        <div className='min-h-screen bg-slate-900 text-white flex flex-col p-4 md:p-8 overflow-hidden relative'>
            {/* Header: Scoreboard */}
            <div className='flex justify-between items-start mb-8 z-10'>
                <div className='flex gap-4'>
                    {players.map(p => (
                        <div key={p.id} className={`p-4 bg-slate-800 rounded-2xl border ${Number(gameState.currentTurn) === Number(p.id) ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700'} transition-all`}>
                            <div className='text-xs font-black text-slate-500 uppercase mb-1 tracking-tighter'>{p.name}</div>
                            <div className='text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-fuchsia-400'>
                                {scores[p.id] || 0} PTS
                            </div>
                        </div>
                    ))}
                </div>

                <div className='flex flex-col items-end gap-2'>
                    <div className='bg-slate-800 p-1 rounded-full border border-slate-700 flex gap-1'>
                        {[1, 2, 3, 4].map(l => (
                            <button
                                key={l}
                                onClick={() => updateSpice(l)}
                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${gameState.spiceLevel === l ? (l === 4 ? 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-rose-600 shadow-lg') : 'text-slate-500 hover:text-white'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                    <span className='text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2'>SPICE LEVEL</span>
                </div>
            </div>

            {/* Main Stage */}
            <div className='flex-1 flex flex-col items-center justify-center z-10 relative'>
                <AnimatePresence mode="wait">
                    {waitingForCompletion ? (
                        <motion.div
                            key="action-stage"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className='w-full max-w-2xl'
                        >
                            <div className='bg-white text-slate-900 p-12 rounded-[3.5rem] shadow-[0_0_80px_rgba(255,255,255,0.15)] relative'>
                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-3 rounded-full text-white font-black uppercase tracking-widest text-sm shadow-xl ${gameState.currentQuestion?.type === 'truth' ? 'bg-rose-600' : 'bg-fuchsia-600'}`}>
                                    {gameState.currentQuestion?.type}
                                </div>

                                <p className='text-3xl md:text-4xl font-bold text-center leading-tight mb-12'>
                                    "{currentQuestion?.text}"
                                </p>

                                <div className='flex flex-col gap-3'>
                                    {isMyTurn ? (
                                        <div className='flex gap-4'>
                                            <button 
                                                onClick={handleComplete}
                                                className='flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-slate-800 transition-colors shadow-lg'
                                            >
                                                DONE
                                            </button>
                                            <button 
                                                onClick={handleSkip}
                                                className='px-8 py-5 border-2 border-slate-900 rounded-2xl font-black text-xl hover:bg-slate-100 transition-colors'
                                            >
                                                SKIP
                                            </button>
                                        </div>
                                    ) : (
                                        <div className='py-6 border-2 border-slate-200 rounded-2xl text-center text-slate-400 font-bold italic'>
                                            Waiting for {players.find(p => Number(p.id) === Number(gameState.currentTurn))?.name} to act...
                                        </div>
                                    )}
                                    
                                    <div className='flex items-center justify-center gap-4 mt-6'>
                                        <div className='h-1 flex-1 bg-slate-200 rounded-full overflow-hidden'>
                                            <motion.div 
                                                className='h-full bg-rose-500'
                                                initial={{ width: '100%' }}
                                                animate={{ width: '0%' }}
                                                transition={{ duration: 30, ease: 'linear' }}
                                            />
                                        </div>
                                        <span className='font-black text-slate-300'>30S</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : waitingForCustom ? (
                        <motion.div
                            key="custom-selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className='text-center w-full max-w-xl'
                        >
                            <h2 className='text-xl font-bold text-slate-400 mb-4 uppercase tracking-[0.3em]'>
                                {isMyTurn ? 'WAITING FOR PARTNER' : `THEY CHOSE ${gameState.currentQuestionType?.toUpperCase()}`}
                            </h2>
                            <div className='bg-slate-800/80 backdrop-blur-xl p-12 rounded-[3rem] border border-slate-700 shadow-2xl relative overflow-hidden'>
                                {isMyTurn ? (
                                    <p className='text-2xl text-slate-300 font-medium italic'>
                                        Your partner is choosing between a random {gameState.currentQuestionType} or writing their own...
                                    </p>
                                ) : (
                                    <div className='flex flex-col gap-6'>
                                        {isWritingCustom ? (
                                            <>
                                                <p className='text-xl font-bold mb-2'>Write your custom {gameState.currentQuestionType}:</p>
                                                <textarea 
                                                    value={customText}
                                                    onChange={(e) => setCustomText(e.target.value)}
                                                    placeholder="Type something spicy..."
                                                    className='w-full h-32 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-500'
                                                />
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={() => setIsWritingCustom(false)}
                                                        className='flex-1 py-4 border border-slate-700 rounded-2xl font-bold text-slate-400 hover:text-white transition-all'
                                                    >
                                                        CANCEL
                                                    </button>
                                                    <button 
                                                        onClick={handleCustomSubmit}
                                                        className='flex-[2] py-4 bg-gradient-to-r from-rose-500 to-rose-700 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all'
                                                    >
                                                        SUBMIT
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className='text-2xl font-black mb-4'>What do you want to do?</p>
                                                <button 
                                                    onClick={() => setIsWritingCustom(true)}
                                                    className='w-full py-6 bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 rounded-3xl text-2xl font-black shadow-xl hover:scale-105 transition-all mb-4'
                                                >
                                                    WRITE CUSTOM
                                                </button>
                                                <button 
                                                    onClick={handleRequestRandom}
                                                    className='w-full py-5 border-2 border-slate-700 rounded-3xl text-xl font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-all'
                                                >
                                                    USE GAME RANDOM
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="turn-indicator"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className='text-center w-full max-w-xl'
                        >
                            <h2 className='text-xl font-bold text-slate-400 mb-4 uppercase tracking-[0.3em]'>
                                {isMyTurn ? 'YOUR TURN' : `${players.find(p => Number(p.id) === Number(gameState.currentTurn))?.name}'s Turn`}
                            </h2>
                            
                            <div className='bg-slate-800/80 backdrop-blur-xl p-12 rounded-[3rem] border border-slate-700 shadow-2xl relative overflow-hidden'>
                                <div className='absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] -mr-16 -mt-16' />
                                <div className='absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 blur-[50px] -ml-16 -mb-16' />
                                
                                <p className='text-3xl font-black mb-10 leading-tight'>
                                    {isSelecting ? 'Finding a spark...' : isMyTurn ? 'Choose your path...' : `Waiting for choice...`}
                                </p>

                                {isMyTurn && (
                                    <div className='flex gap-4'>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleChoice('truth')}
                                            disabled={isSelecting}
                                            className='flex-1 py-6 bg-gradient-to-br from-rose-500 to-rose-700 rounded-3xl text-2xl font-black shadow-xl disabled:opacity-50'
                                        >
                                            TRUTH
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleChoice('dare')}
                                            disabled={isSelecting}
                                            className='flex-1 py-6 bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 rounded-3xl text-2xl font-black shadow-xl disabled:opacity-50'
                                        >
                                            DARE
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer with connection status */}
            {!isConnected && (
                <div className='absolute bottom-8 left-1/2 -translate-x-1/2 bg-rose-600/90 backdrop-blur-md px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl z-50 flex items-center gap-2'>
                    <div className='w-2 h-2 rounded-full bg-white animate-ping' />
                    RECONNECTING TO SERVER...
                </div>
            )}
        </div>
    );
};

export default Game;
