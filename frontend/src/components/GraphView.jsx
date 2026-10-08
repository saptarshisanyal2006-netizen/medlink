import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function GraphView({ graph }) {
  return (
    <div
      style={{
        width: "100%",
        height: "400px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #ddd",
        background: "white"
      }}
    >
      <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default GraphView;