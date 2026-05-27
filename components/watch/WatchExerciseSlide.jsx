"use client";

import React from "react";
import WatchSetRow from "./WatchSetRow";

export default function WatchExerciseSlide({ exercise, onToggleSet }) {
  return (
    <div style={{ flex: "0 0 100%", padding: "10px", boxSizing: "border-box" }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 16,
          color: "var(--watch-accent)",
          textAlign: "center"
        }}
      >
        {exercise.name}
      </div>
      
      <div style={{ display: "flex", flexDirection: "column" }}>
        {exercise.sets.map((s, i) => (
          <WatchSetRow
            key={i}
            set={s}
            index={i}
            onToggle={(si) => onToggleSet(exercise.id, si)}
          />
        ))}
      </div>
    </div>
  );
}
