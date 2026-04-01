import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useGame } from '../context/GameContext';

const CreateJoin = () => {
    const [isJoining, setIsJoining] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { updatePlayer, updateRoom, clearGame } = useGame();

    const API_URL = 'http://localhost:8000/api';

    const handleCreate = async () => {
        if (!name) return setError('Please enter your name');
        clearGame();
        setLoading(true);
        setError('');
        try {
            const resp = await axios.post(`${API_URL}/create-room`, { player_name: name });
            updatePlayer({ id: resp.data.player_id, name: name });
            updateRoom({ id: resp.data.room_id, code: resp.data.code });
            navigate(`/lobby/${resp.data.code}/${resp.data.player_id}`);
        } catch (err) {
            setError('Failed to create room. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!name || !code) return setError('Please enter both name and room code');
        clearGame();
        setLoading(true);
        setError('');
        try {
            const resp = await axios.post(`${API_URL}/join-room`, { 
                player_name: name,
                code: code.toUpperCase()
            });
            updatePlayer({ id: resp.data.player_id, name: name });
            updateRoom({ id: resp.data.room_id, code: resp.data.code });
            navigate(`/lobby/${resp.data.code}/${resp.data.player_id}`);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6'>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className='w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700'
            >
                <div className='flex gap-4 mb-8 bg-slate-900 p-1 rounded-full'>
                    <button 
                        onClick={() => setIsJoining(false)}
                        className={`flex-1 py-3 rounded-full font-bold transition-all ${!isJoining ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        CREATE
                    </button>
                    <button 
                        onClick={() => setIsJoining(true)}
                        className={`flex-1 py-3 rounded-full font-bold transition-all ${isJoining ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        JOIN
                    </button>
                </div>

                <h2 className='text-3xl font-black mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-fuchsia-400'>
                    {isJoining ? 'Join Room' : 'Start a Session'}
                </h2>

                <div className='space-y-4'>
                    <div>
                        <label className='block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide'>Your Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Alex"
                            className='w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium'
                        />
                    </div>

                    {isJoining && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                        >
                            <label className='block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide'>Room Code</label>
                            <input 
                                type="text" 
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXX"
                                className='w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium tracking-widest uppercase'
                            />
                        </motion.div>
                    )}

                    {error && (
                        <motion.p 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className='text-rose-400 text-sm font-semibold text-center'
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={isJoining ? handleJoin : handleCreate}
                        disabled={loading}
                        className='w-full py-4 bg-gradient-to-r from-rose-600 to-fuchsia-600 rounded-2xl text-xl font-bold shadow-xl transition-all disabled:opacity-50 mt-4'
                    >
                        {loading ? 'WAITING...' : isJoining ? 'ENTER ROOM' : 'GET STARTED'}
                    </motion.button>
                </div>
            </motion.div>

            <button 
                onClick={() => navigate('/')}
                className='mt-8 text-slate-500 hover:text-slate-300 font-bold transition-all'
            >
                ← BACK TO HOME
            </button>
        </div>
    );
};

export default CreateJoin;
