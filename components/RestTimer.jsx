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
            className="card fade-up"
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
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
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s linear" }}
                />
                <text x={34} y={39} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--accent-green-text)">
                    {secs}s
                </text>
            </svg>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--accent-green-dark)" }}>Rest Timer</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {[30, 60, 90].map((v) => (
                        <button
                            key={v}
                            onClick={() => {
                                setSecs(v);
                                setRunning(true);
                            }}
                            className={`btn${secs === v ? " btn-green" : " btn-ghost"}`}
                            style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 99,
                            }}
                        >
                            {v}s
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                    onClick={() => setSecs((s) => s + 30)}
                    className="btn btn-ghost"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                >
                    +30s
                </button>
                <button
                    onClick={() => setRunning((r) => !r)}
                    className="btn btn-ghost"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                >
                    {running ? "Pause" : "Resume"}
                </button>
                <button
                    onClick={onDone}
                    className="btn btn-green"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                >
                    Skip
                </button>
            </div>
        </div>
    );
}
