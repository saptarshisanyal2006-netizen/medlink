import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Custom modern badge icons
const ambulanceIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: #ffffff;
      border: 3px solid #dc2626;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.45);
      font-size: 24px;
      cursor: pointer;
    ">
      🚑
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

const patientIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: #eff6ff;
      border: 3px solid #2563eb;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      font-size: 20px;
      cursor: pointer;
    ">
      👤
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const hospitalIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      background: #f0fdf4;
      border: 3px solid #16a34a;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);
      font-size: 22px;
      cursor: pointer;
    ">
      🏥
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21],
});

// Helper: fetch driving street route from OpenStreetMap OSRM API
async function fetchStreetRoute(start, end) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]?.geometry?.coordinates?.length) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch (err) {
    console.warn("OSRM routing failed, using fallback:", err);
  }

  // Fallback: smooth interpolated waypoints
  const waypoints = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    waypoints.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ]);
  }
  return waypoints;
}

// Auto-adjust map bounds when locations change
function MapAutoBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function MapView({ hospital, patient, ambulance }) {
  if (!hospital || !patient || !ambulance) return null;

  const patientPos = [patient.lat, patient.lng];
  const hospitalPos = [hospital.lat, hospital.lng];

  let initialAmbulancePos = [ambulance.lat, ambulance.lng];
  if (ambulance.lat === patient.lat && ambulance.lng === patient.lng) {
    initialAmbulancePos = [ambulance.lat + 0.008, ambulance.lng + 0.008];
  }

  const [ambulancePos, setAmbulancePos] = useState(initialAmbulancePos);
  const [eta, setEta] = useState(ambulance.eta);
  const [ambulanceRoute, setAmbulanceRoute] = useState([]);
  const [hospitalRoute, setHospitalRoute] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  // Fetch real road routes whenever endpoints change
  useEffect(() => {
    let isCancelled = false;
    setLoadingRoutes(true);

    async function loadRoutes() {
      const [routeAmb, routeHosp] = await Promise.all([
        fetchStreetRoute(initialAmbulancePos, patientPos),
        fetchStreetRoute(patientPos, hospitalPos),
      ]);

      if (!isCancelled) {
        setAmbulanceRoute(routeAmb);
        setHospitalRoute(routeHosp);
        setLoadingRoutes(false);
      }
    }

    loadRoutes();

    return () => {
      isCancelled = true;
    };
  }, [ambulance.lat, ambulance.lng, patient.lat, patient.lng, hospital.lat, hospital.lng]);

  // Animate ambulance smoothly and slowly along the real street route
  useEffect(() => {
    if (ambulanceRoute.length < 2) return;

    let currentIndex = 0;
    const totalPoints = ambulanceRoute.length;
    setAmbulancePos(ambulanceRoute[0]);
    setEta(ambulance.eta);

    // Speed: 280ms interval per road waypoint provides gentle, realistic movement
    const moveInterval = setInterval(() => {
      currentIndex += 1;
      if (currentIndex >= totalPoints) {
        setAmbulancePos(ambulanceRoute[totalPoints - 1]);
        clearInterval(moveInterval);
      } else {
        setAmbulancePos(ambulanceRoute[currentIndex]);
      }
    }, 280);

    // Live countdown for ETA
    const etaDurationMs = totalPoints * 280;
    const intervalSeconds = Math.max(1, Math.round(etaDurationMs / (ambulance.eta * 1000)));

    let remainingSeconds = ambulance.eta * 60;
    const etaInterval = setInterval(() => {
      remainingSeconds -= intervalSeconds * 2;
      const displayMinutes = Math.max(0, Math.ceil(remainingSeconds / 60));
      setEta(displayMinutes);
      if (remainingSeconds <= 0) {
        clearInterval(etaInterval);
      }
    }, 1000);

    return () => {
      clearInterval(moveInterval);
      clearInterval(etaInterval);
    };
  }, [ambulanceRoute, ambulance.eta]);

  const allBounds = [patientPos, hospitalPos, initialAmbulancePos];

  return (
    <div style={{ marginBottom: "30px" }}>
      {/* Header */}
      <div style={{ marginBottom: "10px" }}>
        <h2 style={{ marginBottom: "6px", color: "#0f172a" }}>
          🗺️ Emergency Route Map
        </h2>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "10px",
          }}
        >
          <span>🚑 Ambulance</span>
          <span>👤 Patient</span>
          <span>🏥 Hospital</span>
        </div>

        {/* Route labels */}
        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            fontSize: "14px",
            fontWeight: "600",
            color: "#334155",
          }}
        >
          <span style={{ background: "#fee2e2", padding: "6px 12px", borderRadius: "999px" }}>
            🚑 Ambulance → Patient (Road Path)
          </span>
          <span style={{ background: "#dbeafe", padding: "6px 12px", borderRadius: "999px" }}>
            🏥 Patient → Hospital (Road Path)
          </span>
          <span style={{ background: "#fef3c7", padding: "6px 12px", borderRadius: "999px" }}>
            ⏱ ETA: {eta} min
          </span>
          {loadingRoutes && (
            <span style={{ background: "#e0e7ff", padding: "6px 12px", borderRadius: "999px", color: "#3730a3" }}>
              🔄 Calculating real road paths...
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div
        style={{
          width: "100%",
          height: "520px",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          background: "white",
        }}
      >
        <MapContainer
          center={patientPos}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
        >
          <MapAutoBounds bounds={allBounds} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Real road path: Ambulance to Patient (Red) */}
          {ambulanceRoute.length > 0 && (
            <Polyline
              positions={ambulanceRoute}
              pathOptions={{
                color: "#dc2626",
                weight: 6,
                opacity: 0.85,
                dashArray: "10, 8",
              }}
            />
          )}

          {/* Real road path: Patient to Hospital (Blue) */}
          {hospitalRoute.length > 0 && (
            <Polyline
              positions={hospitalRoute}
              pathOptions={{
                color: "#2563eb",
                weight: 6,
                opacity: 0.9,
              }}
            />
          )}

          {/* Animated Ambulance along street path */}
          <Marker position={ambulancePos} icon={ambulanceIcon}>
            <Popup>
              <strong>🚑 Emergency Ambulance</strong><br />
              ID: {ambulance.id}<br />
              Station: {ambulance.location}<br />
              Live ETA: {eta} min
            </Popup>
          </Marker>

          {/* Patient Marker */}
          <Marker position={patientPos} icon={patientIcon}>
            <Popup>
              <strong>👤 Patient Location</strong><br />
              {patient.name || "Patient"}<br />
              {patient.condition} ({patient.severity})<br />
              {patient.location}
            </Popup>
          </Marker>

          {/* Hospital Marker */}
          <Marker position={hospitalPos} icon={hospitalIcon}>
            <Popup>
              <strong>🏥 {hospital.name}</strong><br />
              {hospital.location}<br />
              Distance: {hospital.distance} km
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;