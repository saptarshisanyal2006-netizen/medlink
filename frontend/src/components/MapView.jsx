import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix marker issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons
const ambulanceIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [34, 34],
});

const patientIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [34, 34],
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [34, 34],
});

// Helper: move ambulance smoothly
function interpolatePosition(start, end, progress) {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ];
}

function MapView({ hospital, patient, ambulance }) {
  if (!hospital || !patient || !ambulance) return null;

  const patientPos = [patient.lat, patient.lng];
  const hospitalPos = [hospital.lat, hospital.lng];

  // FIX overlap: if ambulance same as patient, slightly offset it
  let originalAmbulancePos = [ambulance.lat, ambulance.lng];
  if (
    ambulance.lat === patient.lat &&
    ambulance.lng === patient.lng
  ) {
    originalAmbulancePos = [ambulance.lat + 0.01, ambulance.lng + 0.01];
  }

  const [ambulancePos, setAmbulancePos] = useState(originalAmbulancePos);
  const [eta, setEta] = useState(ambulance.eta);

  // Animate ambulance moving toward patient
  useEffect(() => {
    let progress = 0;
    let countdown = ambulance.eta;

    setAmbulancePos(originalAmbulancePos);
    setEta(ambulance.eta);

    const moveInterval = setInterval(() => {
      progress += 0.1;
      if (progress >= 1) {
        progress = 1;
        clearInterval(moveInterval);
      }

      const newPos = interpolatePosition(originalAmbulancePos, patientPos, progress);
      setAmbulancePos(newPos);
    }, 500);

    const etaInterval = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        countdown = 0;
        clearInterval(etaInterval);
      }
      setEta(countdown);
    }, 1000);

    return () => {
      clearInterval(moveInterval);
      clearInterval(etaInterval);
    };
  }, [ambulance.lat, ambulance.lng, patient.lat, patient.lng, ambulance.eta]);

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
          <span>🔴 Ambulance</span>
          <span>🔵 Patient</span>
          <span>🟢 Hospital</span>
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
            🚑 Ambulance → Patient
          </span>
          <span style={{ background: "#dbeafe", padding: "6px 12px", borderRadius: "999px" }}>
            🧍 Patient → Hospital
          </span>
          <span style={{ background: "#fef3c7", padding: "6px 12px", borderRadius: "999px" }}>
            ⏱ ETA: {eta} min
          </span>
        </div>
      </div>

      {/* Map */}
      <div
        style={{
          width: "100%",
          height: "480px",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          background: "white",
        }}
      >
        <MapContainer
          center={patientPos}
          zoom={12}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Animated Ambulance */}
          <Marker position={ambulancePos} icon={ambulanceIcon}>
            <Popup>
              <strong>🚑 Ambulance</strong><br />
              ID: {ambulance.id}<br />
              Current Location: {ambulance.location}<br />
              Live ETA: {eta} min
            </Popup>
          </Marker>

          {/* Patient */}
          <Marker position={patientPos} icon={patientIcon}>
            <Popup>
              <strong>🧍 Patient</strong><br />
              {patient.name || "Unknown"}<br />
              {patient.condition} ({patient.severity})<br />
              {patient.location}
            </Popup>
          </Marker>

          {/* Hospital */}
          <Marker position={hospitalPos} icon={hospitalIcon}>
            <Popup>
              <strong>🏥 Hospital</strong><br />
              {hospital.name}<br />
              {hospital.location}<br />
              Distance: {hospital.distance} km
            </Popup>
          </Marker>

          {/* Routes */}
          <Polyline
            positions={[ambulancePos, patientPos]}
            pathOptions={{ color: "#dc2626", weight: 6 }}
          />
          <Polyline
            positions={[patientPos, hospitalPos]}
            pathOptions={{ color: "#2563eb", weight: 6 }}
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;