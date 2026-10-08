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
    name: "CityCare Hospital",
    specialization: ["Emergency", "Orthopedics"],
    beds: { Emergency: 5 },
    distance: 8,
    traffic: 7,
    rating: 4.5,
    location: "MP Nagar",
    lat: 23.2330,
    lng: 77.4343
  },
  {
    id: "H2",
    name: "Apollo Trauma Center",
    specialization: ["Trauma", "Emergency"],
    beds: { Emergency: 3 },
    distance: 12,
    traffic: 5,
    rating: 4.8,
    location: "Habibganj",
    lat: 23.2210,
    lng: 77.4530
  },
  {
    id: "H3",
    name: "HeartLine Hospital",
    specialization: ["Cardiology", "Emergency"],
    beds: { Emergency: 2 },
    distance: 10,
    traffic: 4,
    rating: 4.7,
    location: "Arera Colony",
    lat: 23.2130,
    lng: 77.4320
  },
  {
    id: "H4",
    name: "Metro Neuro Center",
    specialization: ["Neurology", "Emergency"],
    beds: { Emergency: 1 },
    distance: 14,
    traffic: 6,
    rating: 4.4,
    location: "Kolar Road",
    lat: 23.1790,
    lng: 77.4370
  },

  // NEW hospitals
  {
    id: "H5",
    name: "QuickAid Emergency",
    specialization: ["Emergency"],
    beds: { Emergency: 8 },
    distance: 3,
    traffic: 9,
    rating: 3.8,
    location: "Shahpura",
    lat: 23.2150,
    lng: 77.4450
  },
  {
    id: "H6",
    name: "Elite Cardiac Institute",
    specialization: ["Cardiology"],
    beds: { Emergency: 2 },
    distance: 18,
    traffic: 3,
    rating: 4.9,
    location: "BHEL",
    lat: 23.2400,
    lng: 77.3900
  },
  {
    id: "H7",
    name: "NeuroPlus Advanced",
    specialization: ["Neurology"],
    beds: { Emergency: 2 },
    distance: 6,
    traffic: 6,
    rating: 4.6,
    location: "Ayodhya Nagar",
    lat: 23.2600,
    lng: 77.4600
  },
  {
    id: "H8",
    name: "Rapid Trauma Care",
    specialization: ["Trauma"],
    beds: { Emergency: 4 },
    distance: 5,
    traffic: 8,
    rating: 4.2,
    location: "Govindpura",
    lat: 23.2700,
    lng: 77.4200
  }
];

const initialHospitals = JSON.parse(JSON.stringify(hospitals));

const ambulances = [
  {
    id: "A1",
    location: "Sector 62",
    status: "Available",
    eta: 4,
    lat: 23.2500,
    lng: 77.4700
  },
  {
    id: "A2",
    location: "MP Nagar",
    status: "Available",
    eta: 7,
    lat: 23.2330,
    lng: 77.4343
  },
  {
    id: "A3",
    location: "Kolar Road",
    status: "Busy",
    eta: 0,
    lat: 23.1790,
    lng: 77.4370
  },
  {
    id: "A4",
    location: "Shahpura",
    status: "Available",
    eta: 10,
    lat: 23.2150,
    lng: 77.4450
  }
];

// Fake patient coordinates based on location input
function getPatientCoordinates(location) {
  const map = {
    "Sector 62": { lat: 23.2500, lng: 77.4700 },
    "MP Nagar": { lat: 23.2330, lng: 77.4343 },
    "Habibganj": { lat: 23.2210, lng: 77.4530 },
    "Arera Colony": { lat: 23.2130, lng: 77.4320 },
    "Kolar Road": { lat: 23.1790, lng: 77.4370 },
    "Shahpura": { lat: 23.2150, lng: 77.4450 }
  };

  return map[location] || { lat: 23.2500, lng: 77.4700 };
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