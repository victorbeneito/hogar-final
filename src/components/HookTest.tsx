"use client";

import { useState } from "react";

export default function HookTest() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 40 }}>
      <h2>🧩 HookTest funcionando correctamente</h2>
      <p>Contador: {count}</p>
      <button
        style={{
          background: "#2563eb",
          color: "white",
          padding: "6px 12px",
          borderRadius: "4px",
          border: "none",
        }}
        onClick={() => setCount((c) => c + 1)}
      >
        +1
      </button>
    </div>
  );
}
