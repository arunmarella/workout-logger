"use client";

import React from "react";
import { Trophy } from "lucide-react";

export default function WatchSummary({ workout, onDone }) {
  if (!workout) return null;

  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.done).length, 0);

  return (
    <div style={{ padding: "20px 10px", textAlign: "center" }}>
      <div style={{ marginBottom: 10, color: "var(--watch-accent)", display: "flex", justifyContent: "center" }}><Trophy size={40} /></div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Workout Complete!</div>
      <div style={{ fontSize: 14, color: "var(--watch-text-secondary)", marginBottom: 24 }}>
        You crushed {completedSets} / {totalSets} sets.
      </div>

      <div style={{ background: "var(--watch-card)", borderRadius: "12px", padding: "12px", marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--watch-text-secondary)" }}>Routine</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{workout.name}</div>
      </div>

      <button
        onClick={onDone}
        className="watch-btn-primary"
      >
        Dismiss
      </button>
    </div>
  );
}
