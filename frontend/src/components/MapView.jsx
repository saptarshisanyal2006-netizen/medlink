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
      width: 46px;
      height: 46px;
      background: #ffffff;
      border: 3px solid #dc2626;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.5);
      font-size: 24px;
      cursor: pointer;
    ">
      🚑
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -23],
});

// Patient marker that moves along the route
const patientIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: #eff6ff;
      border: 3px solid #2563eb;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.5);
      font-size: 22px;
      cursor: pointer;
    ">
      👤
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Fixed pickup point marker that always stays at VIT Chennai
const pickupSpotIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      <div style="
        background: #1e3a8a;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        margin-bottom: 2px;
      ">
        📍 Pickup Point (VIT Chennai)
      </div>
      <div style="
        width: 14px;
        height: 14px;
        background: #3b82f6;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>
    </div>
  `,
  iconSize: [160, 38],
  iconAnchor: [80, 38],
  popupAnchor: [0, -38],
});

const hospitalIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #f0fdf4;
      border: 3px solid #16a34a;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.45);
      font-size: 26px;
      cursor: pointer;
    ">
      🏥
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24],
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
    console.warn("OSRM routing failed, using fallback waypoints:", err);
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

// Resample a route array to a target length for smooth animation pacing
function sampleRoute(coords, targetCount = 50) {
  if (!coords || coords.length === 0) return [];
  if (coords.length <= targetCount) return coords;
  const result = [];
  const step = (coords.length - 1) / (targetCount - 1);
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(coords.length - 1, Math.round(i * step));
    result.push(coords[idx]);
  }
  return result;
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

  const initialPatientPos = [patient.lat, patient.lng];
  const hospitalPos = [hospital.lat, hospital.lng];
  const initialAmbulancePos = [ambulance.lat, ambulance.lng];

  const [ambulancePos, setAmbulancePos] = useState(initialAmbulancePos);
  const [patientPos, setPatientPos] = useState(initialPatientPos);
  const [eta, setEta] = useState(ambulance.eta);
  const [phase, setPhase] = useState("DISPATCHING"); // DISPATCHING -> PICKUP -> TO_HOSPITAL -> ARRIVED
  const [statusMessage, setStatusMessage] = useState("Ambulance dispatched");
  const [ambulanceRoute, setAmbulanceRoute] = useState([]);
  const [hospitalRoute, setHospitalRoute] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [replayKey, setReplayKey] = useState(0);

  // Fetch real road routes whenever coordinates change
  useEffect(() => {
    let isCancelled = false;
    setLoadingRoutes(true);

    async function loadRoutes() {
      const [routeAmb, routeHosp] = await Promise.all([
        fetchStreetRoute(initialAmbulancePos, initialPatientPos),
        fetchStreetRoute(initialPatientPos, hospitalPos),
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

  // 2-Phase Sequential Animation:
  // Phase 1: Ambulance drives from depot to Patient at VIT Chennai
  // Phase 2: Patient and Ambulance BOTH travel together along road to Hospital
  useEffect(() => {
    if (ambulanceRoute.length < 2 || hospitalRoute.length < 2) return;

    let isMounted = true;
    let leg1Timer = null;
    let pickupTimer = null;
    let leg2Timer = null;

    const ambSteps = sampleRoute(ambulanceRoute, 35);
    const hospSteps = sampleRoute(hospitalRoute, 55);

    // Initial positions
    setAmbulancePos(ambSteps[0]);
    setPatientPos(initialPatientPos);
    setEta(ambulance.eta);
    setPhase("DISPATCHING");
    setStatusMessage(`🚑 Phase 1: Ambulance dispatched from ${ambulance.location} → En route to VIT Chennai`);

    let ambIdx = 0;
    const stepIntervalMs = 220;

    // Phase 1: Ambulance travels to Patient at VIT Chennai
    leg1Timer = setInterval(() => {
      ambIdx += 1;
      if (ambIdx >= ambSteps.length) {
        clearInterval(leg1Timer);
        leg1Timer = null;
        if (!isMounted) return;

        setAmbulancePos(initialPatientPos);
        setPhase("PICKUP");
        setStatusMessage(`🚨 Ambulance arrived at VIT Chennai! Patient boarded. Departing to ${hospital.name}...`);
        setEta(0);

        // Pause 1.2s for boarding, then start Phase 2
        pickupTimer = setTimeout(() => {
          if (!isMounted) return;

          setPhase("TO_HOSPITAL");
          setStatusMessage(`🏥 Phase 2: Patient & Ambulance traveling together along the road to ${hospital.name}...`);

          let hospIdx = 0;
          leg2Timer = setInterval(() => {
            hospIdx += 1;
            if (hospIdx >= hospSteps.length) {
              clearInterval(leg2Timer);
              leg2Timer = null;
              if (!isMounted) return;

              // Arrived at Hospital
              setAmbulancePos(hospitalPos);
              setPatientPos(hospitalPos);
              setPhase("ARRIVED");
              setStatusMessage(`✅ Arrived at ${hospital.name}! Emergency patient admitted.`);
            } else {
              const currentPoint = hospSteps[hospIdx];
              // Update BOTH positions so patient and ambulance visibly travel side-by-side!
              setPatientPos(currentPoint);
              setAmbulancePos([currentPoint[0] + 0.0004, currentPoint[1] + 0.0004]);
            }
          }, stepIntervalMs);
        }, 1200);
      } else {
        setAmbulancePos(ambSteps[ambIdx]);
      }
    }, stepIntervalMs);

    return () => {
      isMounted = false;
      if (leg1Timer) clearInterval(leg1Timer);
      if (pickupTimer) clearTimeout(pickupTimer);
      if (leg2Timer) clearInterval(leg2Timer);
    };
  }, [ambulanceRoute, hospitalRoute, replayKey]);

  const allBounds = [initialPatientPos, hospitalPos, initialAmbulancePos];

  return (
    <div style={{ marginBottom: "30px" }}>
      {/* Header */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "6px" }}>
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            🗺️ Live Emergency Route & Patient Transit Map
          </h2>

          <button
            onClick={() => setReplayKey((k) => k + 1)}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "999px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            🔄 Replay Animation
          </button>
        </div>

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
          <span>🚑 Ambulance (from {ambulance.location})</span>
          <span>👤 Patient (at {patient.location || "VIT Chennai"})</span>
          <span>🏥 Hospital ({hospital.name})</span>
        </div>

        {/* Status Banner */}
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "12px",
            background: phase === "ARRIVED" ? "#dcfce7" : phase === "PICKUP" ? "#fef3c7" : "#eff6ff",
            border: `1.5px solid ${phase === "ARRIVED" ? "#86efac" : phase === "PICKUP" ? "#fde047" : "#bfdbfe"}`,
            color: phase === "ARRIVED" ? "#166534" : phase === "PICKUP" ? "#854d0e" : "#1e40af",
            fontWeight: "600",
            fontSize: "14px",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span>{statusMessage}</span>
          <span style={{ fontSize: "13px", opacity: 0.9 }}>
            {phase === "DISPATCHING" && `⏱ Pickup ETA: ${eta} min`}
            {phase === "PICKUP" && "⚡ Boarding"}
            {phase === "TO_HOSPITAL" && "🚨 In Transit to Hospital"}
            {phase === "ARRIVED" && "🏥 Admitted"}
          </span>
        </div>

        {/* Route labels */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            fontSize: "13px",
            fontWeight: "600",
            color: "#334155",
          }}
        >
          <span style={{ background: "#fee2e2", padding: "5px 12px", borderRadius: "999px" }}>
            🚑 Leg 1: Ambulance ({ambulance.location}) → Patient (VIT Chennai)
          </span>
          <span style={{ background: "#dbeafe", padding: "5px 12px", borderRadius: "999px" }}>
            🏥 Leg 2: Patient & Ambulance → {hospital.name}
          </span>
          {loadingRoutes && (
            <span style={{ background: "#e0e7ff", padding: "5px 12px", borderRadius: "999px", color: "#3730a3" }}>
              🔄 Calculating Chennai road routes...
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
          center={initialPatientPos}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
        >
          <MapAutoBounds bounds={allBounds} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Leg 1: Ambulance to Patient (Dashed Red Road Path) */}
          {ambulanceRoute.length > 0 && (
            <Polyline
              positions={ambulanceRoute}
              pathOptions={{
                color: "#dc2626",
                weight: 5,
                opacity: phase === "DISPATCHING" ? 0.9 : 0.4,
                dashArray: "8, 8",
              }}
            />
          )}

          {/* Leg 2: Patient to Hospital (Solid Blue Road Path) */}
          {hospitalRoute.length > 0 && (
            <Polyline
              positions={hospitalRoute}
              pathOptions={{
                color: "#2563eb",
                weight: 6,
                opacity: phase === "TO_HOSPITAL" || phase === "ARRIVED" ? 0.95 : 0.6,
              }}
            />
          )}

          {/* Fixed Origin Marker: Always marks VIT Chennai so you can see where patient started */}
          <Marker position={initialPatientPos} icon={pickupSpotIcon}>
            <Popup>
              <strong>📍 Pickup Spot</strong><br />
              VIT Chennai (Patient Origin)<br />
              Vandalur-Kelambakkam Road
            </Popup>
          </Marker>

          {/* Emergency Ambulance Marker */}
          <Marker position={ambulancePos} icon={ambulanceIcon}>
            <Popup>
              <strong>🚑 Emergency Ambulance</strong><br />
              ID: {ambulance.id}<br />
              Origin: {ambulance.location}<br />
              Status: {phase === "DISPATCHING" ? "Driving to VIT Chennai" : phase === "PICKUP" ? "Boarding patient" : phase === "TO_HOSPITAL" ? "Rushing to hospital" : "Arrived"}
            </Popup>
          </Marker>

          {/* Patient Marker - starts at VIT Chennai and moves along the road in Phase 2 */}
          <Marker position={patientPos} icon={patientIcon}>
            <Popup>
              <strong>👤 Patient ({patient.name || "Student / Patient"})</strong><br />
              Condition: {patient.condition} ({patient.severity})<br />
              Pickup: VIT Chennai<br />
              Status: {phase === "DISPATCHING" ? "Waiting at VIT Chennai" : phase === "PICKUP" ? "Boarding ambulance" : "Inside ambulance, heading to hospital"}
            </Popup>
          </Marker>

          {/* Destination Hospital Marker */}
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