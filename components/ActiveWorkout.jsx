"use client";

import { useState } from "react";
import { genId } from "@/lib/data";
import RestTimer from "./RestTimer";

export default function ActiveWorkout({ template, onFinish, onCancel }) {
    const [logs, setLogs] = useState(() =>
        template.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => ({
                ...s,
                done: false,
                actualReps: s.reps,
                actualWeight: s.weight,
            })),
        }))
    );
    const [restingSet, setRestingSet] = useState(null);
    const [startTime] = useState(Date.now());

    const update = (ei, si, f, v) =>
        setLogs((prev) =>
            prev.map((ex, i) =>
                i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => (j !== si ? s : { ...s, [f]: v })) }
            )
        );

    const toggleDone = (ei, si) => {
        const was = logs[ei].sets[si].done;
        update(ei, si, "done", !was);
        if (!was) setRestingSet({ ei, si });
    };

    const total = logs.reduce((a, ex) => a + ex.sets.length, 0);
    const done = logs.reduce((a, ex) => a + ex.sets.filter((s) => s.done).length, 0);
    const pct = Math.round((done / total) * 100);

    const handleFinish = () =>
        onFinish({
            id: genId(),
            template_name: template.name,
            date: new Date().toISOString(),
            duration: Math.round((Date.now() - startTime) / 60000),
            exercises: logs,
        });

    return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            color: "var(--text-faint)",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                        }}
                    >
                        Active Workout
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{template.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {done}/{total} sets
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{pct}% complete</div>
                </div>
            </div>
            <div style={{ background: "var(--border-default)", borderRadius: 99, height: 6, marginBottom: 16 }}>
                <div
                    style={{
                        background: "var(--accent-blue)",
                        height: 6,
                        borderRadius: 99,
                        width: `${pct}%`,
                        transition: "width 0.3s",
                    }}
                />
            </div>
            {restingSet && <RestTimer onDone={() => setRestingSet(null)} />}
            {logs.map((ex, ei) => (
                <div
                    key={ex.id}
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 14,
                    }}
                >
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12 }}>
                        {ex.name}
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "24px 1fr 1fr 1fr 32px",
                            gap: "6px 8px",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>#</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Reps</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Wt (lbs)</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Notes</div>
                        <div />
                        {ex.sets.map((s, si) => (
                            <SetRow key={si} s={s} si={si} ei={ei} update={update} toggleDone={toggleDone} />
                        ))}
                    </div>
                </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8, paddingBottom: 32 }}>
                <button
                    onClick={onCancel}
                    style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid var(--border-default)",
                        background: "var(--bg-card)",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 14,
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleFinish}
                    style={{
                        flex: 2,
                        padding: 12,
                        borderRadius: 10,
                        border: "none",
                        background: "var(--accent-blue)",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 14,
                    }}
                >
                    Finish Workout
                </button>
            </div>
        </div>
    );
}

function SetRow({ s, si, ei, update, toggleDone }) {
    return (
        <>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{si + 1}</div>
            <input
                type="number"
                value={s.actualReps}
                onChange={(e) => update(ei, si, "actualReps", +e.target.value)}
                style={{
                    width: "100%",
                    padding: "5px 6px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 7,
                    fontSize: 13,
                    background: s.done ? "var(--bg-done)" : "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            <input
                type="number"
                value={s.actualWeight}
                onChange={(e) => update(ei, si, "actualWeight", +e.target.value)}
                style={{
                    width: "100%",
                    padding: "5px 6px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 7,
                    fontSize: 13,
                    background: s.done ? "var(--bg-done)" : "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            <input
                type="text"
                value={s.notes}
                placeholder="—"
                onChange={(e) => update(ei, si, "notes", e.target.value)}
                style={{
                    width: "100%",
                    padding: "5px 6px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 7,
                    fontSize: 13,
                    background: s.done ? "var(--bg-done)" : "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            <button
                onClick={() => toggleDone(ei, si)}
                style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: s.done ? "none" : "2px solid var(--border-checkbox)",
                    background: s.done ? "var(--accent-green)" : "var(--bg-input)",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {s.done ? "✓" : ""}
            </button>
        </>
    );
}
