import { useState } from "react";
import axios from "axios";
import GraphView from "./components/GraphView";
import MapView from "./components/MapView";

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname === "localhost" ? "http://localhost:5000" : "");

function App() {
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("Heart Attack");
  const [severity, setSeverity] = useState("Medium");
  const [location, setLocation] = useState("Sector 62");
  const [result, setResult] = useState(null);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState("");

  const getGraph = async (recommendationData = null) => {
    try {
      const sourceData = recommendationData || result;
      if (!sourceData) return;

      const res = await axios.post(`${API_BASE}/api/graph`, {
        patient: sourceData.patient,
        hospital: sourceData.bestHospital,
        ambulance: sourceData.ambulance,
        requiredSpecialization: sourceData.requiredSpecialization,
      });

      const positions = {
        P1: { x: 250, y: 50 },
        L1: { x: 50, y: 200 },
        S1: { x: 250, y: 350 },
        H1: { x: 500, y: 200 },
        A1: { x: 750, y: 200 },
      };

      const flowNodes = res.data.nodes.map((node) => ({
        id: node.id,
        data: { label: node.label },
        position: positions[node.id] || { x: 100, y: 100 },
        style: {
          padding: 10,
          borderRadius: 12,
          border: "2px solid #2563eb",
          background: "#eff6ff",
          fontWeight: "600",
          width: 140,
          textAlign: "center",
        },
      }));

      const flowEdges = res.data.edges.map((edge, index) => ({
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: { stroke: "#64748b", strokeWidth: 2 },
      }));

      setGraph({ nodes: flowNodes, edges: flowEdges });
    } catch (error) {
      console.error("Error fetching graph:", error);
    }
  };

  const getRecommendation = async () => {
    try {
      setLoading(true);
      setSimulationMessage("");

      const res = await axios.post(`${API_BASE}/api/recommend`, {
        name,
        condition,
        severity,
        location,
      });

      setResult(res.data);
      await getGraph(res.data);
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      alert("Could not connect to backend. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const simulateHospitalFull = async () => {
    if (!result?.bestHospital?.id) {
      alert("Please get a hospital recommendation first.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/simulate-full`, {
        hospitalId: result.bestHospital.id,
      });

      setSimulationMessage(
        `${result.bestHospital.name} is now marked as unavailable. MedLink has rerouted the patient to the next best hospital.`
      );

      const res = await axios.post(`${API_BASE}/api/recommend`, {
        name,
        condition,
        severity,
        location,
      });

      setResult(res.data);
      await getGraph(res.data);
    } catch (error) {
      console.error("Simulation error:", error);
    }
  };

  const resetSimulation = async () => {
    try {
      await axios.post(`${API_BASE}/api/reset`);
      setSimulationMessage("");
      await getRecommendation();
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  const getSeverityColor = () => {
    if (severity === "Low") return "#16a34a";
    if (severity === "Medium") return "#f59e0b";
    return "#dc2626";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "24px" }}>
      <h1
        style={{
          textAlign: "center",
          fontSize: "40px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#0f172a",
        }}
      >
        🚑 MedLink
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#475569",
          marginBottom: "10px",
          fontSize: "18px",
        }}
      >
        Smart Emergency Healthcare Routing System
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            background: getSeverityColor(),
            color: "white",
            padding: "8px 16px",
            borderRadius: "999px",
            fontWeight: "bold",
            fontSize: "14px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          }}
        >
          Severity: {severity}
        </span>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "24px",
          padding: "28px",
          maxWidth: "1150px",
          margin: "0 auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: "20px", color: "#0f172a" }}>
          Emergency Patient Details
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          <input
            type="text"
            placeholder="Enter patient name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
            }}
          />

          <input
            type="text"
            placeholder="Enter location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
            }}
          >
            <option>Heart Attack</option>
            <option>Accident</option>
            <option>Stroke</option>
            <option>Fracture</option>
            <option>Emergency</option>
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
            }}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={getRecommendation}
            style={{
              background: "#2563eb",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            {loading ? "Finding..." : "Get Best Recommendation"}
          </button>

          <button
            onClick={simulateHospitalFull}
            style={{
              background: "#dc2626",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            Simulate Capacity Failure
          </button>

          <button
            onClick={resetSimulation}
            style={{
              background: "#0f766e",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            Reset
          </button>
        </div>

        {result && (
          <>
            {simulationMessage && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "16px",
                  borderRadius: "14px",
                  marginBottom: "20px",
                  fontWeight: "600",
                }}
              >
                ⚠️ {simulationMessage}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "#dcfce7",
                  padding: "20px",
                  borderRadius: "18px",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.04)",
                }}
              >
                <h3 style={{ marginBottom: "12px" }}>🏥 Recommended Hospital</h3>
                <p><strong>Name:</strong> {result.bestHospital.name}</p>
                <p><strong>Location:</strong> {result.bestHospital.location}</p>
                <p><strong>Specialization Needed:</strong> {result.requiredSpecialization}</p>
                <p><strong>Score:</strong> {result.bestHospital.score}</p>
                <p><strong>Distance:</strong> {result.bestHospital.distance} km</p>
                <p><strong>Traffic:</strong> {result.bestHospital.traffic}/10</p>
                <p><strong>Rating:</strong> ⭐ {result.bestHospital.rating}</p>
              </div>

              <div
                style={{
                  background: "#dbeafe",
                  padding: "20px",
                  borderRadius: "18px",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.04)",
                }}
              >
                <h3 style={{ marginBottom: "12px" }}>🚑 Assigned Ambulance</h3>
                <p><strong>ID:</strong> {result.ambulance.id}</p>
                <p><strong>Current Location:</strong> {result.ambulance.location}</p>
                <p><strong>ETA:</strong> {result.ambulance.eta} min</p>
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ marginBottom: "10px" }}>🤖 AI Explanation</h3>
              <p style={{ lineHeight: "1.8", color: "#334155", fontSize: "15px" }}>
                {result.aiExplanation}
              </p>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ marginBottom: "10px" }}>📊 Other Ranked Hospitals</h3>
              {result.rankedHospitals.map((h) => (
                <div
                  key={h.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "10px 0",
                  }}
                >
                  <strong>{h.name}</strong> — Score: {h.score} | {h.location}
                </div>
              ))}
            </div>

            <MapView
              hospital={result.bestHospital}
              patient={result.patient}
              ambulance={result.ambulance}
            />

            <h2 style={{ marginBottom: "12px", color: "#0f172a" }}>🔗 Decision Graph</h2>
            <GraphView graph={graph} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;