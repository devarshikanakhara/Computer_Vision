/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#080b12',
          1: '#0d1117',
          2: '#161b22',
          3: '#21262d',
          4: '#30363d',
        },
        accent: {
          cyan:   '#00e5c8',
          blue:   '#3b82f6',
          amber:  '#f59e0b',
          red:    '#ef4444',
          green:  '#10b981',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        glow:        '0 0 24px rgba(0,229,200,0.15)',
        'glow-blue': '0 0 24px rgba(59,130,246,0.20)',
      },
    },
  },
  plugins: [],
}
