module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          800: '#1E3A8A',
          600: '#2563EB',
          400: '#60A5FA',
        },
        gray: {
          100: '#F3F4F6',
          300: '#D1D5DB',
          500: '#6B7280',
          600: '#4B5563',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        neumorphic: '4px 4px 8px #d1d5db, -4px -4px 8px #ffffff',
      },
    },
  },
  plugins: [],
};