# 🚑 MedLink - Smart Emergency Healthcare Routing System

MedLink is an intelligent emergency healthcare triage and hospital recommendation system. It evaluates emergency conditions, bed availability, transit distance, live traffic congestion, and nearby ambulance readiness to route patients to the most optimal healthcare facility in real time.

---

## 🚀 Features

- **Dynamic Triage Scoring**: Adaptive weights for distance, traffic, and emergency beds depending on patient severity (Low, Medium, High).
- **Ambulance Allocation**: Nearest available ambulance auto-assigned with live ETA countdown.
- **Interactive Route Map**: Built with React-Leaflet and OpenStreetMap showing real-time animated ambulance and patient-to-hospital routing.
- **Decision Knowledge Graph**: Visualized using React Flow (`@xyflow/react`).
- **Resilience & Capacity Simulation**: Test emergency bed saturation and observe automated failover rerouting.

---

## 🛠️ Local Development

### 1. Prerequisites
Install [Node.js (v18 or v20+)](https://nodejs.org).

### 2. Run Backend
```bash
cd backend
npm install
node server.js
```
Runs at `http://localhost:5000`.

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

---

## ☁️ Deployment (Free on Render)

1. Push this repository to **GitHub**.
2. Go to [Render.com](https://render.com) and create a free account.
3. Click **New +** → **Web Service** → Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Click **Deploy Web Service**. Your live public link will be ready in 2 minutes!
