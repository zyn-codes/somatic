# Somatic Client Form

A sophisticated multi-step form application with real-time admin monitoring capabilities. Built with React, Express, and Socket.IO.

## Features

- 📝 Multi-step form with progress tracking
- 🔄 Real-time admin panel for monitoring form submissions
- 📊 Comprehensive visit analytics and logging
- 🌍 Geolocation tracking
- 📱 Device and browser detection
- 🔒 Enhanced security measures
- 📈 Real-time WebSocket updates

## Architecture

### Frontend (`/src`)
- Built with React + Vite
- Tailwind CSS for styling
- Components:
  - `MultiStepForm`: Core form component with 4 steps
  - `ErrorBoundary`: Global error handling
  - `ProgressBar`: Visual step progress
  - Individual step components (Step1-4)
- Analytics and WebRTC detection utilities

### Backend (`/server`)
- Express.js server with Socket.IO integration
- Features:
  - Visit logging with enhanced data collection
  - Real-time admin notifications
  - Geolocation tracking
  - Security middleware (rate limiting, CORS, etc.)
  - Comprehensive logging system

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Create a `.env` file in the root directory
   - Required variables:
     ```
     ADMIN_PASSWORD=your_secure_password
     NODE_ENV=development
     ```

3. Development mode:
   ```bash
   npm run dev        # Start Vite dev server
   npm run start:dev  # Start backend server
   ```

4. Production build:
   ```bash
   npm run build     # Build frontend
   npm start         # Start production server
   ```

## Project Structure

```
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── pages/           # Page components
│   └── utils/           # Frontend utilities
├── server/              # Backend source code
│   ├── middleware/      # Express middleware
│   ├── utils/          # Backend utilities
│   └── data/           # Data storage
├── logs/               # Application logs
└── dist/               # Production build
```

## Security Features

- Rate limiting on API endpoints
- CORS configuration
- Request size limiting
- Helmet security headers
- Input sanitization
- IP tracking and logging

## Admin Panel

Access the admin panel at `/admin` to:
- Monitor form submissions in real-time
- View visitor analytics
- Track form completion rates
- Monitor server metrics

## Testing

Run admin socket tests:
```bash
npm run test-admin-socket
```

## Deployment

The application is configured for deployment on both Railway and Vercel platforms:
- `railway.toml`: Railway deployment configuration
- `vercel.json`: Vercel deployment configuration

## Technical Stack

- **Frontend**: React, Vite, Tailwind CSS, Socket.IO Client
- **Backend**: Express.js, Socket.IO, Winston Logger
- **Development**: Node.js, Playwright for testing
- **Build Tools**: Vite, PostCSS

## Browser Support

Supports all modern browsers with WebSocket capabilities.
Mobile-responsive design for all form interfaces.
