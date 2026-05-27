"use client";

import React from "react";

export default function WatchTemplateList({ templates, onSelect }) {
  return (
    <div style={{ padding: "10px", paddingBottom: "30px" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--watch-text-secondary)",
          marginBottom: 8,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        My Routines
      </div>
      {templates.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 20, color: "var(--watch-text-secondary)", fontSize: 13 }}>
          No templates found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="watch-btn-secondary"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "var(--watch-text-secondary)" }}>
                {t.exercises?.length || 0} exercises
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
