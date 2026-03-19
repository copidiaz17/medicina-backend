/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        cardio: {
          blue:    '#1E40AF',
          'blue-light': '#3B82F6',
          'blue-pale': '#EFF6FF',
          red:     '#DC2626',
          'red-light': '#FEF2F2',
          green:   '#16A34A',
          'green-light': '#F0FDF4',
          orange:  '#EA580C',
          'orange-light': '#FFF7ED',
          gray:    '#374151',
          'gray-light': '#F9FAFB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
