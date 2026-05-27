"use client";

import { useState } from "react";
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const hapticImpact = async (style = ImpactStyle.Light) => {
    try {
        await Haptics.impact({ style });
    } catch (e) {}
};

const hapticNotification = async (type = NotificationType.Success) => {
    try {
        await Haptics.notification({ type });
    } catch (e) {}
};

export default function History({ history, onClear, onDelete }) {
    const [expanded, setExpanded] = useState(null);

    if (!history.length) {
        return (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 15 }}>No workouts logged yet</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                }}
            >
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Workout History</div>
                <button
                    onClick={() => {
                        hapticImpact(ImpactStyle.Heavy);
                        onClear();
                    }}
                    style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 7,
                        border: "1px solid var(--border-danger)",
                        background: "var(--bg-card)",
                        color: "var(--text-danger)",
                        cursor: "pointer",
                    }}
                >
                    Clear All
                </button>
            </div>
            {[...history].reverse().map((w) => {
                const d = new Date(w.date);
                const isOpen = expanded === w.id;
                const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
                const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
                return (
                    <div
                        key={w.id}
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-default)",
                            borderRadius: 12,
                            marginBottom: 10,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: "none",
                            }}
                        >
                            <button
                                onClick={() => setExpanded(isOpen ? null : w.id)}
                                style={{
                                    flex: 1,
                                    padding: "14px 16px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    textAlign: "left",
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>
                                        {w.template_name || w.templateName}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                                        {d.toLocaleDateString(undefined, {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })}{" "}
                                        · {w.duration}min · {done}/{total} sets
                                    </div>
                                </div>
                                <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    hapticImpact(ImpactStyle.Light);
                                    onDelete?.(w.id);
                                }}
                                style={{
                                    padding: "14px 16px",
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-danger)",
                                    cursor: "pointer",
                                    fontSize: 14,
                                }}
                                title="Delete workout"
                            >
                                ✕
                            </button>
                        </div>
                        {isOpen && (
                            <div style={{ padding: "0 16px 14px" }}>
                                {w.exercises.map((ex) => (
                                    <div key={ex.id} style={{ marginBottom: 10 }}>
                                        <div
                                            style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}
                                        >
                                            {ex.name}
                                        </div>
                                        {ex.sets.map((s, si) => (
                                            <div
                                                key={si}
                                                style={{
                                                    display: "flex",
                                                    gap: 12,
                                                    fontSize: 12,
                                                    color: s.done ? "var(--accent-green-text)" : "var(--text-faint)",
                                                    marginBottom: 3,
                                                }}
                                            >
                                                <span style={{ width: 16 }}>{s.done ? "✓" : "–"}</span>
                                                <span>Set {si + 1}</span>
                                                <span>{s.actualReps ?? s.reps} reps</span>
                                                {(s.actualWeight ?? s.weight) > 0 && (
                                                    <span>@ {s.actualWeight ?? s.weight} lbs</span>
                                                )}
                                                {s.notes && <span style={{ fontStyle: "italic" }}>{s.notes}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
