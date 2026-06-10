# Evac_Route

**Evac_Route** is a comprehensive disaster management and evacuation assistance system designed to streamline communication between residents and emergency administrators. It provides real-time hazard tracking, optimized evacuation routing, and efficient resource management.

---

## 🚀 System Features

### 📱 Resident Mobile App
*   **Real-time Hazard Map:** View active hazards and safe zones using Mapbox integration.
*   **Safe Check-in:** Quick check-in system to notify authorities of your safety status.
*   **Profile QR Code:** Unique identity for rapid scanning at shelters.
*   **Family Management:** Setup profiles for family members and specify transportation needs.
*   **Offline Mode:** Local database support for accessing critical info without connectivity.

### 💻 Admin Web Dashboard
*   **Map Dashboard:** Real-time visualization of resident locations and hazard spreads.
*   **Inventory Manager:** Track rations, medical supplies, and shelter capacity.
*   **Shelter Management:** Coordinate evacuation centers and monitor occupancy.
*   **Staff Management:** Organize and deploy emergency response teams.
*   **Evacuation Logs:** Detailed audit trails of all evacuation activities.

---

## 🛠 Tech Stack

### Backend (API & Real-time)
*   **Framework:** Laravel 11+
*   **Real-time:** Laravel Reverb (WebSockets)
*   **Authentication:** Laravel Sanctum (SPA & Mobile Auth)
*   **Testing:** Pest PHP
*   **Storage:** AWS S3 (via League Flysystem)

### Frontend (Mobile)
*   **Framework:** React Native (Expo)
*   **State Management:** Zustand & TanStack Query
*   **Maps:** @rnmapbox/maps
*   **Database:** Expo SQLite (Offline storage)

### Frontend (Web)
*   **Framework:** React 19 (Vite)
*   **Styling:** Tailwind CSS & Framer Motion
*   **Charts:** Recharts
*   **Maps:** Mapbox GL JS

---

## ⚙️ Installation

### 1. Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### 2. Mobile App Setup
```bash
cd frontend/Evac_RouteMobile
npm install
npx expo start
```

### 3. Web Dashboard Setup
```bash
cd frontend/Evac_RouteWeb
npm install
npm run dev
```

---

## 🗺 System Architecture
The system uses a **monolithic backend** providing a RESTful API and WebSocket events. The **Mobile app** communicates via Axios and Laravel Echo for real-time hazard updates, while the **Web dashboard** provides an administrative interface for resource allocation and monitoring.
