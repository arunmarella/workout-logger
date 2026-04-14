"use client";

import { useState, useEffect, useRef } from "react";

export default function RestTimer({ onDone }) {
    const [secs, setSecs] = useState(60);
    const [running, setRunning] = useState(true);
    const ref = useRef();

    useEffect(() => {
        if (running && secs > 0) {
            ref.current = setTimeout(() => setSecs((s) => s - 1), 1000);
        } else if (secs === 0) {
            onDone();
        }
        return () => clearTimeout(ref.current);
    }, [secs, running, onDone]);

    const pct = (secs / 60) * 100;
    const r = 28;
    const circ = 2 * Math.PI * r;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: "var(--bg-done)",
                border: "1px solid var(--border-success)",
                borderRadius: 10,
                marginBottom: 16,
            }}
        >
            <svg width={68} height={68} style={{ flexShrink: 0 }}>
                <circle cx={34} cy={34} r={r} fill="none" stroke="var(--border-default)" strokeWidth={4} />
                <circle
                    cx={34}
                    cy={34}
                    r={r}
                    fill="none"
                    stroke="var(--accent-green)"
                    strokeWidth={4}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - pct / 100)}
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
                <text x={34} y={39} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--accent-green-text)">
                    {secs}s
                </text>
            </svg>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-green-dark)" }}>Rest Timer</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {[30, 60, 90].map((v) => (
                        <button
                            key={v}
                            onClick={() => {
                                setSecs(v);
                                setRunning(true);
                            }}
                            style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border-success-btn)",
                                background: secs === v ? "var(--accent-green)" : "var(--bg-card)",
                                color: secs === v ? "#fff" : "var(--accent-green-text)",
                                cursor: "pointer",
                            }}
                        >
                            {v}s
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
                <button
                    onClick={() => setRunning((r) => !r)}
                    style={{
                        padding: "4px 10px",
                        borderRadius: 7,
                        border: "1px solid var(--border-success-btn)",
                        background: "var(--bg-card)",
                        fontSize: 12,
                        cursor: "pointer",
                        color: "var(--accent-green-text)",
                    }}
                >
                    {running ? "Pause" : "Resume"}
                </button>
                <button
                    onClick={onDone}
                    style={{
                        padding: "4px 10px",
                        borderRadius: 7,
                        border: "none",
                        background: "var(--accent-green)",
                        color: "#fff",
                        fontSize: 12,
                        cursor: "pointer",
                    }}
                >
                    Skip
                </button>
            </div>
        </div>
    );
}
