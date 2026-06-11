# Evac_Route

**Evac_Route** is a comprehensive disaster management and evacuation assistance system designed to streamline communication between residents and emergency administrators. It provides real-time hazard tracking, optimized evacuation routing, and efficient resource management.

---

## 🚀 System Features

### 📱 Resident Mobile App
*   **Offline A* Spatial Routing:** Dynamic pathfinding algorithm that recalculates escape routes based on hazard type, vehicle mode, and severity.
*   **Dynamic TOTP QR Code:** Military-grade, time-based regenerating QR codes that prevent replay attacks during shelter check-ins.
*   **Real-time Hazard Tracking:** View active hazards and safe zones using Mapbox integration.
*   **Family Management:** Setup profiles for family members and track relief allocations.
*   **Local Graph Database:** Offline SQLite road network cache for calculating evacuation routes without internet access.

### 💻 Admin Web Dashboard
*   **Live Map Command Center:** Real-time visualization of resident locations, hazard spreads, and shelter statuses.
*   **Relief Claims Desk:** High-concurrency QR scanner interface for checking in residents and distributing rations.
*   **Inventory Manager:** Track rations, medical supplies, and shelter capacities securely.
*   **Shelter Management:** Coordinate evacuation centers and monitor live occupancy limits.
*   **Evacuation Logs:** Detailed audit trails of all evacuation activities and relief claims.

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
The system utilizes a **monolithic backend** providing a highly-concurrent RESTful API and WebSocket broadcast events. Database transactions utilize **pessimistic row locking** to prevent race conditions during mass evacuation check-ins. The **Mobile app** acts as an offline-first node, computing escape routes locally via an A* graph algorithm using `expo-sqlite`, while the **Web dashboard** provides real-time administrative command capabilities.
