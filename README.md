# Somatic Client Form

A modern React-based client form application with Tailwind CSS styling.

## Technologies Used

- React 18
- React Router DOM
- Vite
- Tailwind CSS
- PostCSS

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/saeed355ahmed/somatic-client-form.git
   cd somatic-client-form
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend (Vite):
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:5173

4. Start the backend (Express):
   ```bash
   npm run server
   ```
   The backend will be available at http://localhost:5000

## API Keys

Some VPN/proxy detection APIs support free keys. Add them to `.env` (see `.env.example`):

```
IPAPI_KEY=
IPGEO_KEY=
```
Leave blank to use public endpoints only.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally

## Project Structure

```
somatic-client-form/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/         # Page components and routes
│   ├── App.jsx        # Main application component
│   ├── main.jsx       # Application entry point
│   └── index.css      # Global styles and Tailwind imports
├── index.html         # HTML template
├── vite.config.js     # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
└── postcss.config.js  # PostCSS configuration
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT