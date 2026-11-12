# Evac_Route Web Dashboard

The Admin Web Dashboard for Evac_Route built with React 19, Vite, Mapbox GL JS, Tailwind CSS, and Laravel Echo (WebSockets).

## ⚙️ Setup & Configuration

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Environment Parameters (`.env`):**
   - `VITE_MAPBOX_TOKEN`: Your Mapbox public access token (get one at [Mapbox Account](https://account.mapbox.com/)).
   - `VITE_API_BASE_URL`: URL to the Laravel backend API (default: `http://localhost:8000/api`).
   - `VITE_REVERB_HOST`: Hostname of the Laravel Reverb WebSocket server (default: `localhost`).
   - `VITE_REVERB_PORT`: Port of the Laravel Reverb WebSocket server (default: `8080`).
   - `VITE_REVERB_APP_KEY`: Key of the Reverb WebSocket application (default: `evac-route-key`).

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

5. **Build Production Bundle:**
   ```bash
   npm run build
   ```
