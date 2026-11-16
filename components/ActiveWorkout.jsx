"use client";

import { useState, useEffect } from "react";
import { genId } from "@/lib/data";
import RestTimer from "./RestTimer";
import ExerciseAutocomplete from "./ExerciseAutocomplete";
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useWorkoutState } from "@/hooks/useWorkoutState";

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

export default function ActiveWorkout({ template, onFinish, onCancel, previousMap = {} }) {
    const {
        workout: syncedWorkout,
        sessionId,
        updateWorkout,
        finishWorkout: completeSyncedWorkout,
        startWorkout
    } = useWorkoutState({ initialTemplate: template });

    useEffect(() => {
        // Automatically start a synced session if none exists
        if (template && !sessionId) {
            startWorkout(template);
        }
    }, [template, sessionId, startWorkout]);

    const [restingSet, setRestingSet] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [initialTime] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());

    // Elapsed timer, ticking every second (Strong shows this prominently)
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // Initial fallback logs - in a real app, you might want to show a spinner
    // until syncedWorkout is ready.
    const logs = syncedWorkout ? syncedWorkout.exercises : [];
    const startTime = syncedWorkout ? syncedWorkout.startTime : initialTime;

    const update = (ei, si, f, v) => {
        if (!syncedWorkout) return;
        const updatedExercises = syncedWorkout.exercises.map((ex, i) =>
            i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => (j !== si ? s : { ...s, [f]: v })) }
        );
        updateWorkout({ ...syncedWorkout, exercises: updatedExercises });
    };

    const toggleDone = (ei, si) => {
        const was = logs[ei].sets[si].done;
        update(ei, si, "done", !was);
        if (!was) {
            hapticImpact(ImpactStyle.Medium);
            setRestingSet({ ei, si });
        }
    };

    const total = logs.reduce((a, ex) => a + ex.sets.length, 0);
    const done = logs.reduce((a, ex) => a + ex.sets.filter((s) => s.done).length, 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const volume = logs.reduce((a, ex) => a + ex.sets.filter((s) => s.done).reduce((x, s) => x + ((s.actualReps ?? s.reps) || 0) * ((s.actualWeight ?? s.weight) || 0), 0), 0);
    const elapsedSecs = Math.floor((now - startTime) / 1000);
    const elapsed = `${Math.floor(elapsedSecs / 60)}:${String(elapsedSecs % 60).padStart(2, "0")}`;

    const addSet = (ei) => {
        if (!syncedWorkout) return;
        const ex = syncedWorkout.exercises[ei];
        const last = ex.sets[ex.sets.length - 1] || { reps: 10, weight: 0, notes: "" };
        const updatedExercises = syncedWorkout.exercises.map((e, i) =>
            i !== ei ? e : { ...e, sets: [...e.sets, { reps: last.reps, weight: last.weight, notes: "", done: false, actualReps: last.actualReps ?? last.reps, actualWeight: last.actualWeight ?? last.weight }] }
        );
        updateWorkout({ ...syncedWorkout, exercises: updatedExercises });
    };

    const addExercise = (name) => {
        if (!syncedWorkout || !name?.trim()) return;
        const prev = previousMap[name.trim()];
        const first = prev?.sets[0] || { reps: 10, weight: 0 };
        updateWorkout({
            ...syncedWorkout,
            exercises: [...syncedWorkout.exercises, {
                id: genId(), name: name.trim(),
                sets: [{ reps: first.reps, weight: first.weight, notes: "", done: false, actualReps: first.reps, actualWeight: first.weight }],
            }],
        });
    };

    const prCount = logs.reduce((a, ex) => a + ex.sets.filter((s) => s.done && (s.actualWeight ?? s.weight) > 0 && (s.actualWeight ?? s.weight) > (previousMap[ex.name]?.maxWeight || 0)).length, 0);

    const handleFinish = async () => {
        if (!showSummary) { setShowSummary(true); return; }
        hapticNotification(NotificationType.Success);
        await completeSyncedWorkout(onFinish);
    };

    if (showSummary) {
        return (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Workout Summary</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>{template.name} · {elapsed} · {done}/{total} sets{volume > 0 ? ` · ${volume.toLocaleString()} lb volume` : ""}{prCount > 0 ? ` · 🏆 ${prCount} PR${prCount > 1 ? "s" : ""}` : ""}</div>
                {logs.map((ex) => (
                    <div key={ex.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-secondary)" }}>{ex.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                            {ex.sets.filter((s) => s.done).map((s) => `${s.actualWeight > 0 ? `${s.actualWeight} lb × ` : ""}${s.actualReps}`).join(", ") || "No sets completed"}
                        </div>
                    </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 8, paddingBottom: 32 }}>
                    <button onClick={() => setShowSummary(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--bg-card)", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Back</button>
                    <button onClick={handleFinish} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "var(--accent-blue)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Save Workout</button>
                </div>
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
                    <div style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        ⏱ {elapsed}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {done}/{total} sets{volume > 0 ? ` · ${volume.toLocaleString()} lb` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{pct}% complete</div>
                </div>
            </div>
            {sessionId && (
                <div style={{ 
                    background: "var(--bg-tab)", 
                    padding: "8px 12px", 
                    borderRadius: 10, 
                    marginBottom: 16, 
                    fontSize: 12, 
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <span>Syncing with Watch...</span>
                    <span style={{ fontFamily: "monospace", opacity: 0.7 }}>ID: {sessionId.slice(0, 8)}</span>
                </div>
            )}
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
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>
                        {ex.name}
                    </div>
                    {previousMap[ex.name] && (
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 10 }}>
                            Last: {previousMap[ex.name].sets.map((s) => `${s.weight > 0 ? `${s.weight} lb × ` : ""}${s.reps}`).join(", ")}
                        </div>
                    )}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "24px 1fr 1fr 1fr 72px 32px",
                            gap: "6px 8px",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>#</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Reps</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Wt (lbs)</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Notes</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Previous</div>
                        <div />
                        {ex.sets.map((s, si) => (
                            <SetRow key={si} s={s} si={si} ei={ei} update={update} toggleDone={toggleDone} prev={previousMap[ex.name]?.sets[si]} prevMax={previousMap[ex.name]?.maxWeight || 0} />
                        ))}
                    </div>
                    <button
                        onClick={() => addSet(ei)}
                        style={{
                            fontSize: 12, padding: "4px 10px", borderRadius: 7, border: "1px dashed var(--border-subtle)",
                            background: "var(--bg-card)", color: "var(--text-muted)", cursor: "pointer", marginTop: 10,
                        }}
                    >
                        + Add Set
                    </button>
                </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <ExerciseAutocomplete
                    value=""
                    onChange={(ex) => { if (ex?.name) addExercise(ex.name); }}
                    placeholder="+ Add exercise (e.g. Squat)"
                />
            </div>
            {logs.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-faint)" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏋️</div>
                    <div>Empty workout — add your first exercise above</div>
                </div>
            )}
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

function SetRow({ s, si, ei, update, toggleDone, prev, prevMax }) {
    const isPR = s.done && (s.actualWeight ?? s.weight) > 0 && (s.actualWeight ?? s.weight) > prevMax;
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
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                {prev ? `${prev.weight > 0 ? `${prev.weight} × ` : ""}${prev.reps}` : "—"}
                {isPR ? " 🏆" : ""}
            </div>
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
