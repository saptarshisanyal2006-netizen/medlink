const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
// -------------------------------
// MOCK DATA
// -------------------------------

let hospitals = [
  {
    id: "H1",
    name: "Tagore Medical College & Hospital",
    specialization: ["Emergency", "Orthopedics", "Trauma"],
    beds: { Emergency: 8 },
    distance: 2.5,
    traffic: 3,
    rating: 4.6,
    location: "Rathinamangalam (near VIT Chennai)",
    lat: 12.8480,
    lng: 80.1420
  },
  {
    id: "H2",
    name: "Chettinad Super Speciality Hospital",
    specialization: ["Cardiology", "Emergency", "Neurology"],
    beds: { Emergency: 6 },
    distance: 8.5,
    traffic: 4,
    rating: 4.7,
    location: "Kelambakkam, OMR",
    lat: 12.7938,
    lng: 80.2201
  },
  {
    id: "H3",
    name: "Gleneagles Global Health City",
    specialization: ["Neurology", "Trauma", "Emergency"],
    beds: { Emergency: 5 },
    distance: 10,
    traffic: 4,
    rating: 4.8,
    location: "Perumbakkam",
    lat: 12.9022,
    lng: 80.1931
  },
  {
    id: "H4",
    name: "Dr. Rela Institute & Medical Centre",
    specialization: ["Cardiology", "Emergency", "Trauma"],
    beds: { Emergency: 7 },
    distance: 12,
    traffic: 5,
    rating: 4.9,
    location: "Chromepet, GST Road",
    lat: 12.9490,
    lng: 80.1412
  },
  {
    id: "H5",
    name: "Apollo Hospitals (Greams Road)",
    specialization: ["Emergency", "Cardiology", "Orthopedics"],
    beds: { Emergency: 6 },
    distance: 26,
    traffic: 6,
    rating: 4.9,
    location: "Greams Road, Thousand Lights",
    lat: 13.0607,
    lng: 80.2508
  },
  {
    id: "H6",
    name: "MIOT International",
    specialization: ["Trauma", "Orthopedics", "Emergency"],
    beds: { Emergency: 5 },
    distance: 19,
    traffic: 5,
    rating: 4.6,
    location: "Manapakkam",
    lat: 13.0233,
    lng: 80.1740
  },
  {
    id: "H7",
    name: "SIMS Hospital",
    specialization: ["Neurology", "Emergency"],
    beds: { Emergency: 4 },
    distance: 22,
    traffic: 6,
    rating: 4.5,
    location: "Vadapalani",
    lat: 13.0519,
    lng: 80.2114
  },
  {
    id: "H8",
    name: "Kauvery Hospital",
    specialization: ["Emergency", "Cardiology"],
    beds: { Emergency: 8 },
    distance: 24,
    traffic: 5,
    rating: 4.6,
    location: "Alwarpet",
    lat: 13.0339,
    lng: 80.2529
  }
];

const initialHospitals = JSON.parse(JSON.stringify(hospitals));

const ambulances = [
  {
    id: "A1",
    location: "VIT Chennai Campus (Gate 1)",
    status: "Available",
    eta: 3,
    lat: 12.8415,
    lng: 80.1530
  },
  {
    id: "A2",
    location: "Vandalur Zoo Junction",
    status: "Available",
    eta: 6,
    lat: 12.8900,
    lng: 80.0810
  },
  {
    id: "A3",
    location: "Kelambakkam Bus Terminus",
    status: "Available",
    eta: 8,
    lat: 12.7870,
    lng: 80.2190
  },
  {
    id: "A4",
    location: "Tambaram Sanatorium",
    status: "Busy",
    eta: 0,
    lat: 12.9360,
    lng: 80.1260
  }
];

// Patient coordinates based on location input - defaults to VIT Chennai
function getPatientCoordinates(location) {
  const map = {
    "VIT Chennai": { lat: 12.8429, lng: 80.1554 },
    "VIT": { lat: 12.8429, lng: 80.1554 },
    "Vandalur": { lat: 12.8900, lng: 80.0810 },
    "Kelambakkam": { lat: 12.7870, lng: 80.2190 },
    "Perumbakkam": { lat: 12.9022, lng: 80.1931 },
    "Chromepet": { lat: 12.9490, lng: 80.1412 },
    "Tambaram": { lat: 12.9249, lng: 80.1000 },
    "T. Nagar": { lat: 13.0418, lng: 80.2341 },
    "Anna Nagar": { lat: 13.0850, lng: 80.2101 },
    "Adyar": { lat: 13.0012, lng: 80.2565 },
    "Velachery": { lat: 12.9815, lng: 80.2180 },
    "Guindy": { lat: 13.0067, lng: 80.2025 },
    "Chennai": { lat: 12.8429, lng: 80.1554 }
  };

  const key = Object.keys(map).find(k => k.toLowerCase() === (location || "").trim().toLowerCase());
  return key ? map[key] : { lat: 12.8429, lng: 80.1554 }; // Default: VIT Chennai
}

// -------------------------------
// HELPERS
// -------------------------------

function mapCondition(condition) {
  return {
    "Heart Attack": "Cardiology",
    "Accident": "Trauma",
    "Stroke": "Neurology",
    "Fracture": "Orthopedics",
    "Emergency": "Emergency"
  }[condition] || "Emergency";
}

function calculateScore(h, spec, severity) {
  let score = 0;

  // specialization
  if (h.specialization.includes(spec)) score += 100;

  // beds
  if ((h.beds.Emergency || 0) > 0) score += 50;

  // ---------------- LOW ----------------
  if (severity === "Low") {
    score += h.rating * 20;
    score += Math.max(0, 20 - h.distance);
  }

  // ---------------- MEDIUM ----------------
  if (severity === "Medium") {
    score += h.rating * 10;
    score += Math.max(0, 30 - h.distance);
    score += Math.max(0, 15 - h.traffic);
  }

  // ---------------- HIGH (VERY DIFFERENT) ----------------
  if (severity === "High") {
    // ignore rating mostly
    score += Math.max(0, 60 - h.distance * 3);
    score += Math.max(0, 40 - h.traffic * 3);

    // huge bonus if very close
    if (h.distance <= 5) score += 100;

    // emergency readiness matters most
    if ((h.beds.Emergency || 0) > 0) score += 80;
  }

  return Math.round(score);
}

function getBestAmbulance() {
  return ambulances
    .filter(a => a.status === "Available")
    .sort((a, b) => a.eta - b.eta)[0];
}

function generateAIExplanation(patient, hospital, ambulance, spec) {
  return `Based on the patient's condition (${patient.condition}) and severity (${patient.severity}), MedLink identified ${hospital.name} as the best option because it supports ${spec}, has emergency bed availability, maintains a strong hospital rating of ${hospital.rating}, and is reachable in approximately ${hospital.distance} km with manageable traffic. Ambulance ${ambulance.id} is also available nearby with an ETA of ${ambulance.eta} minutes, improving emergency response speed.`;
}

// -------------------------------
// ROUTES
// -------------------------------

app.get("/api/health", (req, res) => {
  res.send("MedLink backend is running 🚑");
});

app.post("/api/recommend", (req, res) => {
  const { name, condition, severity, location } = req.body;

  const spec = mapCondition(condition);
  const patientCoords = getPatientCoordinates(location);

  const ranked = hospitals
    .map(h => ({
      ...h,
      score: calculateScore(h, spec, severity)
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const ambulance = getBestAmbulance();

  const patient = {
    name: name || "Unknown",
    condition,
    severity,
    location,
    lat: patientCoords.lat,
    lng: patientCoords.lng
  };

  const reason = [
    "Matching specialization available",
    "Emergency beds available",
    "Closest optimal route",
    "Ambulance available nearby"
  ];

  const aiExplanation = generateAIExplanation(patient, best, ambulance, spec);

  res.json({
    patient,
    requiredSpecialization: spec,
    bestHospital: best,
    ambulance,
    rankedHospitals: ranked,
    reason,
    aiExplanation
  });
});

app.post("/api/simulate-full", (req, res) => {
  const { hospitalId } = req.body;

  hospitals = hospitals.map(h =>
    h.id === hospitalId
      ? {
          ...h,
          beds: {
            ...h.beds,
            Emergency: 0
          }
        }
      : h
  );

  res.json({ message: "Hospital marked as full" });
});

app.post("/api/reset", (req, res) => {
  hospitals = JSON.parse(JSON.stringify(initialHospitals));
  res.json({ message: "Simulation reset successfully" });
});

// Graph endpoint now dynamic and meaningful
app.post("/api/graph", (req, res) => {
  const { patient, hospital, ambulance, requiredSpecialization } = req.body;

  res.json({
    nodes: [
      { id: "P1", label: patient?.name || "Patient" },
      { id: "L1", label: patient?.location || "Location" },
      { id: "S1", label: requiredSpecialization || "Specialization" },
      { id: "H1", label: hospital?.name || "Hospital" },
      { id: "A1", label: ambulance?.id || "Ambulance" }
    ],
    edges: [
      { source: "P1", target: "L1" },
      { source: "P1", target: "S1" },
      { source: "H1", target: "S1" },
      { source: "A1", target: "P1" },
      { source: "A1", target: "H1" }
    ]
  });
});

// Serve frontend static files if built
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("MedLink backend is running 🚑 (Frontend not built yet)");
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});