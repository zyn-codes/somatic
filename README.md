
# Somatic Client Form

A modern React-based client form application with Tailwind CSS styling.

## Fast Deploy Guide

### 1. Environment

Create a `.env` file at the project root with (example values):

```
PORT=3959
ADMIN_PASSWORD=admin123
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 2. Start the app (development)

Install deps and start the server + client (from project root):

```bash
npm install
npm run start-server   # starts the API server (server/index.mjs)
npm run dev            # starts the Vite dev server for the React app
```

Open the client in your browser (usually http://localhost:5173). The Admin Panel is at `/admin`.

### 3. Admin Login

Use the `ADMIN_PASSWORD` value from your `.env` to log into the Admin Panel.

### 4. Troubleshooting

- Ensure `ADMIN_PASSWORD` and `PORT` are set in `.env` at the project root.
- The client uses `VITE_API_URL` when present; otherwise it defaults to `http://localhost:<PORT>`.
- If socket auth fails, verify the password matches and that ALLOWED_ORIGINS include your client origin.

## Technologies Used

- React 18
- React Router DOM
- Vite
- Tailwind CSS
- PostCSS

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