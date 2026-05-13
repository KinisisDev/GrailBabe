import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GrailBabe brand palette
        brand: {
          50:  '#f0f0ff',
          100: '#e2e2ff',
          200: '#c4c4ff',
          300: '#a2a2ff',
          400: '#7c7cff',
          500: '#5b5bff',
          600: '#4646f5',
          700: '#3737d9',
          800: '#2d2dae',
          900: '#292989',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config
