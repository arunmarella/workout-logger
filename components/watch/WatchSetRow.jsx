"use client";

import React from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export default function WatchSetRow({ set, index, onToggle, onUpdate }) {
  const haptic = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}
  };

  const handleDone = () => {
    haptic();
    onToggle(index);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--watch-border)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>Set {index + 1}</div>
      
      {/* Weight/Reps are shown but for watch we might just use a stepper in a detail view.
          For now, let's keep it simple: display only, and a big Done button. */}
      <div style={{ fontSize: 13, color: "var(--watch-text-secondary)", textAlign: "center" }}>
        {set.actualWeight} lb × {set.actualReps}
      </div>

      <button
        onClick={handleDone}
        style={{
          background: set.done ? "var(--watch-success)" : "transparent",
          border: set.done ? "none" : "2px solid var(--watch-border)",
          borderRadius: "8px",
          height: "36px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        {set.done ? "✓" : ""}
      </button>
    </div>
  );
}
