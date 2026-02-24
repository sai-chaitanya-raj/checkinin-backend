# CheckInIn Backend

Mood check-in and emotional presence API for the CheckInIn app.

## Features

- **Auth**: Email signup/login, Google OAuth, password reset
- **Check-ins**: Record daily mood (great, okay, bad)
- **Friends**: Friend requests, feed, streak calculation
- **Profile**: Avatar (Cloudinary), privacy settings, push notifications
- **Emotional Presence**: See friends' latest check-ins

## Setup

1. Clone and install:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

3. Required environment variables:
   - `MONGO_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret for JWT signing (min 32 chars)
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_ANDROID_CLIENT_ID` - Google OAuth Android client ID (optional)

4. Optional:
   - Cloudinary (avatars): `CLOUDINARY_*`
   - SMTP (password reset emails): `SMTP_*`
   - `FRONTEND_URL` - For reset links (default: `http://localhost:19006`)

## Scripts

- `npm start` - Run production server
- `npm run dev` - Run with nodemon (auto-restart)

## API Overview

| Method | Endpoint                | Auth | Description                    |
|--------|-------------------------|------|--------------------------------|
| POST   | /auth/signup            | No   | Register with email            |
| POST   | /auth/login             | No   | Login with email               |
| POST   | /auth/google            | No   | Google OAuth                   |
| POST   | /auth/forgot-password   | No   | Request password reset         |
| POST   | /auth/reset-password    | No   | Reset with token               |
| GET    | /health                 | No   | Health check                   |
| POST   | /checkin                | Yes  | Add/update check-in            |
| GET    | /history                | Yes  | Get check-in history           |
| GET    | /emotional-presence     | Yes  | Friends' latest check-ins      |
| GET    | /friends                | Yes  | Friends list                   |
| GET    | /friends/feed           | Yes  | Circle feed with streaks       |
| GET    | /profile/me             | Yes  | Get profile                    |

Send JWT in header: `Authorization: Bearer <token>`

## Security

- Helmet for security headers
- Rate limiting on auth and API
- CORS configurable via `CORS_ORIGIN`
- Passwords hashed with bcrypt (12 rounds)

## License

ISC
