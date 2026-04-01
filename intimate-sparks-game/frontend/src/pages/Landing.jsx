import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 overflow-hidden relative'>
      {/* Background decoration */}
      <div className='absolute top-0 left-0 w-full h-full overflow-hidden z-0'>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute bg-white opacity-10 rounded-full'
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 5,
            }}
            style={{
              width: `${Math.random() * 20 + 5}px`,
              height: `${Math.random() * 20 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className='z-10 text-center max-w-2xl'
      >
        <motion.h1
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className='text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent'
        >
          INTIMATE SPARKS
        </motion.h1>

        <p className='text-lg md:text-xl text-slate-300 font-medium leading-relaxed mb-10'>
          Spark deeper connections through play. A game of truth, dare, and meaningful conversations designed for couples and close friends.
        </p>

        <motion.button
          whileHover={{ scale: 1.1, boxShadow: '0 0 25px rgba(244, 63, 94, 0.5)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/create-join')}
          className='px-10 py-5 bg-gradient-to-r from-rose-600 to-fuchsia-600 rounded-full text-xl font-bold shadow-xl transition-all duration-300'
        >
          PLAY NOW
        </motion.button>

        <div className='mt-12 flex justify-center gap-8 text-slate-400 font-semibold uppercase tracking-wider text-sm'>
          <div className='flex items-center gap-2'>
            <span className='w-2 h-2 rounded-full bg-rose-500' /> TRUTH
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-2 h-2 rounded-full bg-fuchsia-500' /> DARE
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-2 h-2 rounded-full bg-indigo-500' /> REVEAL
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Landing;
