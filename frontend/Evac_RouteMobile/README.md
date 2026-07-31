# Evac_Route Mobile Application

The Resident Mobile Application for Evac_Route built with React Native (Expo), `@rnmapbox/maps`, and `expo-sqlite` for offline-first evacuation routing and real-time emergency tracking.

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

3. **Environment Parameters & Mapbox Tokens (`.env`):**
   - **Mapbox Public Token (`MAPBOX_TOKEN`):** Your Default Public Token (`pk.***`) from [https://account.mapbox.com/](https://account.mapbox.com/).
   - **Mapbox Secret Token (`MAPBOX_DOWNLOADS_TOKEN` / `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`):** Create a token at [https://account.mapbox.com/](https://account.mapbox.com/) with scope `downloads:read` (`sk.***`) to allow downloading Mapbox mobile SDK binaries.
   - **Backend API URL (`API_BASE_URL`):** Base URL for the backend API (`http://10.0.2.2:8000/api` for Android Emulator, or `http://<YOUR_LOCAL_IP>:8000/api` for physical devices on Wi-Fi).
   - **Reverb WebSocket Host (`REVERB_HOST`):** Server IP/host (`10.0.2.2` or your local IP address).
   - **Reverb WebSocket Port (`REVERB_PORT`):** Port (default: `8080`).


4. **Start Development Server:**
   ```bash
   npx expo start
   ```
