"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Haptics, NotificationType } from "@capacitor/haptics";

const hapticNotification = async (type = NotificationType.Success) => {
    try {
        await Haptics.notification({ type });
    } catch (e) {}
};

// Rest timer, driven by a wall-clock end time — NOT by decrementing once a
// second. On a phone the screen locks or the app backgrounds between sets
// and the OS suspends JS timers; a tick-based countdown freezes and the
// user comes back minutes later to a timer that still says 45s. With an
// end timestamp the remaining time is recomputed on every tick, so it stays
// correct across lock / background / return.
export default function RestTimer({ onDone }) {
    const [duration, setDuration] = useState(60);
    const [secs, setSecs] = useState(60);
    const [running, setRunning] = useState(true);
    // Wall-clock end time (lazy initializer — the purity rule allows
    // impure calls here, unlike in a useRef argument).
    const [endAt, setEndAt] = useState(() => Date.now() + 60 * 1000);
    const pausedRemainingRef = useRef(null);
    const doneRef = useRef(false);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setSecs(remaining);
            if (remaining === 0 && !doneRef.current) {
                doneRef.current = true;
                hapticNotification();
                onDone();
            }
        };
        tick();
        const t = setInterval(tick, 250);
        return () => clearInterval(t);
    }, [running, endAt, onDone]);

    const setTimer = useCallback((v) => {
        doneRef.current = false;
        setDuration(v);
        setSecs(v);
        setEndAt(Date.now() + v * 1000);
        pausedRemainingRef.current = null;
        setRunning(true);
    }, []);

    const addThirty = useCallback(() => {
        doneRef.current = false;
        if (running) {
            setEndAt((e) => e + 30 * 1000);
            setDuration((d) => d + 30);
        } else if (pausedRemainingRef.current != null) {
            pausedRemainingRef.current += 30;
            setSecs(pausedRemainingRef.current);
            setDuration((d) => d + 30);
        }
    }, [running]);

    const togglePause = useCallback(() => {
        if (running) {
            pausedRemainingRef.current = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setRunning(false);
        } else {
            const r = pausedRemainingRef.current ?? secs;
            doneRef.current = false;
            setEndAt(Date.now() + r * 1000);
            pausedRemainingRef.current = null;
            setRunning(true);
        }
    }, [running, endAt, secs]);

    const pct = Math.max(0, Math.min(100, (secs / duration) * 100));
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
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.25s linear" }}
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
                            onClick={() => setTimer(v)}
                            className={`btn${duration === v ? " btn-green" : " btn-ghost"}`}
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
                    onClick={addThirty}
                    className="btn btn-ghost"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                >
                    +30s
                </button>
                <button
                    onClick={togglePause}
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
