# Evac_Route Backend Startup Guide

This document contains a quick reference of the commands needed to run the backend API, real-time WebSockets, database, and background queues for testing the Evac Route mobile application.

---

## 📋 Prerequisites

### 1. Get Your Local IP Address
To test on a physical mobile device over Wi-Fi, you need your computer's local IP address.
* Run this command in WSL:
  ```bash
  hostname -I | awk '{print $1}'
  ```
  *(Example output: `192.168.1.100`)*

### 2. Configure Environment Files & Required Keys
Before starting the servers, copy `.env.example` to `.env` in each module:
```bash
cp backend/.env.example backend/.env
cp frontend/Evac_RouteMobile/.env.example frontend/Evac_RouteMobile/.env
cp frontend/Evac_RouteWeb/.env.example frontend/Evac_RouteWeb/.env
```

#### A. Generate Backend Application Key (`APP_KEY`)
Run key generation inside the `backend` directory:
```bash
cd backend
php artisan key:generate
```

#### B. Obtain & Configure Mapbox API Keys
1. Sign up / log in to [Mapbox Account](https://account.mapbox.com/).
2. **Public Token (`pk.***`):** Copy Default Public Token and paste into:
   - `backend/.env` -> `MAPBOX_TOKEN=pk.YOUR_MAPBOX_PUBLIC_TOKEN_HERE`
   - `frontend/Evac_RouteMobile/.env` -> `MAPBOX_TOKEN=pk.YOUR_MAPBOX_PUBLIC_TOKEN_HERE`
   - `frontend/Evac_RouteWeb/.env` -> `VITE_MAPBOX_TOKEN=pk.YOUR_MAPBOX_PUBLIC_TOKEN_HERE`
3. **Secret Downloads Token (`sk.***`):** Create a token with `downloads:read` scope and paste into:
   - `frontend/Evac_RouteMobile/.env` -> `MAPBOX_DOWNLOADS_TOKEN=sk.YOUR_SECRET_TOKEN` and `RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.YOUR_SECRET_TOKEN`

#### C. Network & IP Settings
Update your local IP address in the environment files:
* **Backend (`backend/.env`):**
  ```env
  APP_URL=http://<YOUR_LOCAL_IP>:8000
  VITE_REVERB_HOST=<YOUR_LOCAL_IP>
  ```
* **Mobile Frontend (`frontend/Evac_RouteMobile/.env`):**
  ```env
  API_BASE_URL=http://<YOUR_LOCAL_IP>:8000/api
  REVERB_HOST=<YOUR_LOCAL_IP>
  ```
* **Web Frontend (`frontend/Evac_RouteWeb/.env`):**
  ```env
  VITE_API_BASE_URL=http://localhost:8000/api
  VITE_REVERB_HOST=localhost
  ```

---

## 🚀 Startup Commands

Run each of these commands in a **separate WSL terminal window/tab**:

### 1. MySQL Database
Start the local MySQL database server:
```bash
sudo service mysql start
```

### 2. Laravel HTTP API Server
Starts the web/API server, listening on all network interfaces (`0.0.0.0`) so your mobile phone can connect:
```bash
cd /home/pheinz/Evac_Route/backend
php artisan serve --host 0.0.0.0 --port 8000
```

### 3. Laravel Reverb (WebSockets) Server
Starts the WebSocket server on port `8080` for broadcasting real-time updates and emergency alerts:
```bash
cd /home/pheinz/Evac_Route/backend
php artisan reverb:start
```

### 4. Laravel Queue Worker
Processes background jobs, database sessions, and notification broadcasts:
```bash
cd /home/pheinz/Evac_Route/backend
php artisan queue:work
```

### 5. Ngrok Tunnel (Alternative to Local IP)
If you are testing using your permanent ngrok domain instead of local Wi-Fi, run this in a terminal to forward your local Laravel server:
```bash
ngrok http --domain=inculcative-carina-atomistical.ngrok-free.dev 8000
```
*(Make sure to update `backend/.env` `APP_URL` to `https://inculcative-carina-atomistical.ngrok-free.dev` when running this).*

---

## 📱 Mobile Development Server (Optional)
If you are running a **development build** (not the standalone `preview` APK), start Metro:
```bash
cd /home/pheinz/Evac_Route/frontend/Evac_RouteMobile
npx expo start
```
