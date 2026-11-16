"use client";

import { useState, useEffect } from "react";
import { genId } from "@/lib/data";
import RestTimer from "./RestTimer";
import ExerciseAutocomplete from "./ExerciseAutocomplete";
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useWorkoutState } from "@/hooks/useWorkoutState";
import { Check, Dumbbell, Timer, Trophy, Watch } from "lucide-react";

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

export default function ActiveWorkout({ template, onFinish, onCancel, previousMap = {}, initialWorkout = null, initialSessionId = null }) {
    const {
        workout: syncedWorkout,
        sessionId,
        updateWorkout,
        finishWorkout: completeSyncedWorkout,
        startWorkout
    } = useWorkoutState({ initialTemplate: template, initialWorkout, sessionId: initialSessionId });

    // Keep the phone's screen awake while a workout is active. Phones
    // auto-lock after a minute or so, and unlocking mid-set to log the next
    // one is the single most annoying thing about logging on a phone.
    // Silent no-op where the API is unavailable (older WKWebView); the lock
    // is released by the OS when the page hides, so re-acquire on return.
    useEffect(() => {
        let lock = null;
        const acquire = async () => {
            try {
                if (!("wakeLock" in navigator) || !navigator.wakeLock?.request) return;
                lock = await navigator.wakeLock.request("screen");
                lock.addEventListener("release", () => { lock = null; });
            } catch (e) { /* denied or unsupported — carry on without it */ }
        };
        const onVisibility = () => {
            if (document.visibilityState === "visible" && !lock) acquire();
        };
        acquire();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            try { lock?.release(); } catch (e) {}
        };
    }, []);

    useEffect(() => {
        // Automatically start a synced session if none exists — unless
        // we're resuming a saved in-progress workout, which already has
        // its sets (starting fresh would wipe them).
        if (template && !sessionId && !initialWorkout) {
            startWorkout(template);
        }
    }, [template, sessionId, initialWorkout, startWorkout]);

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
                <div className="fade-up">
                    <div className="eyebrow">Nice work</div>
                    <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--text-primary)", marginBottom: 4 }}>Workout Summary</div>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16, fontWeight: 600 }}>{template.name}</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                        <div className="stat-card">
                            <div className="stat-card__value">{elapsed}</div>
                            <div className="stat-card__label">Duration</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__value">{volume > 0 ? volume.toLocaleString() : "—"}</div>
                            <div className="stat-card__label">Volume (lb)</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__value">{done}/{total}</div>
                            <div className="stat-card__label">Sets</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__value">{prCount > 0 ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><Trophy size={24} />{prCount}</span>) : "0"}</div>
                            <div className="stat-card__label">PRs</div>
                        </div>
                    </div>
                </div>
                {logs.map((ex, i) => (
                    <div key={ex.id} className="card fade-up" style={{ padding: 16, marginBottom: 10, animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em", color: "var(--text-secondary)" }}>{ex.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                            {ex.sets.filter((s) => s.done).map((s) => `${s.actualWeight > 0 ? `${s.actualWeight} lb × ` : ""}${s.actualReps}`).join(", ") || "No sets completed"}
                        </div>
                    </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 8, paddingBottom: 32 }}>
                    <button onClick={() => setShowSummary(false)} className="btn btn-ghost" style={{ flex: 1, padding: 13, fontSize: 14 }}>Back</button>
                    <button onClick={handleFinish} className="btn btn-primary" style={{ flex: 2, padding: 13, fontSize: 14 }}>Save Workout</button>
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
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 14,
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div className="eyebrow">Active Workout</div>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1.1 }}>{template.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>
                        {done}/{total} sets{volume > 0 ? ` · ${volume.toLocaleString()} lb` : ""} · {pct}% complete
                    </div>
                </div>
                <div className="timer-pill" style={{ flexShrink: 0 }}>
                    <Timer size={15} /> {elapsed}
                </div>
            </div>
            {sessionId && (
                <div style={{ 
                    background: "var(--bg-tab)", 
                    padding: "9px 14px", 
                    borderRadius: 4, 
                    marginBottom: 16, 
                    fontSize: 12, 
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1.5px solid var(--border-default)"
                }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Watch size={14} /> Syncing with Watch...</span>
                    <span style={{ fontFamily: "monospace", opacity: 0.7 }}>ID: {sessionId.slice(0, 8)}</span>
                </div>
            )}
            <div className="progress-track" style={{ marginBottom: 18 }}>
                <div
                    className="progress-fill"
                    style={{ width: `${pct}%` }}
                />
            </div>
            {restingSet && <RestTimer onDone={() => setRestingSet(null)} />}
            {logs.map((ex, ei) => (
                <div
                    key={ex.id}
                    className="card fade-up"
                    style={{ padding: 16, marginBottom: 14, animationDelay: `${Math.min(ei, 6) * 50}ms` }}
                >
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: 4 }}>
                        {ex.name}
                    </div>
                    {previousMap[ex.name] && (
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginBottom: 10 }}>
                            Last: {previousMap[ex.name].sets.map((s) => `${s.weight > 0 ? `${s.weight} lb × ` : ""}${s.reps}`).join(", ")}
                        </div>
                    )}
                    <div className="set-grid">
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>#</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Reps</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Wt (lbs)</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Previous</div>
                        <div />
                        {ex.sets.map((s, si) => (
                            <SetRow key={si} s={s} si={si} ei={ei} update={update} toggleDone={toggleDone} prev={previousMap[ex.name]?.sets[si]} prevMax={previousMap[ex.name]?.maxWeight || 0} />
                        ))}
                    </div>
                    <button
                        onClick={() => addSet(ei)}
                        className="btn btn-ghost"
                        style={{
                            fontSize: 12, padding: "6px 12px", marginTop: 12,
                            borderStyle: "dashed",
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
                <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-faint)" }}>
                    <div className="icon-tile" style={{ margin: "0 auto 14px", width: 60, height: 60, fontSize: 28, borderRadius: 4 }}><Dumbbell size={28} /></div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>Empty workout</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Add your first exercise above</div>
                </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8, paddingBottom: 32 }}>
                <button
                    onClick={onCancel}
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: 13, fontSize: 14 }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleFinish}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: 13, fontSize: 14 }}
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
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>{si + 1}</div>
            <input
                type="number"
                value={s.actualReps}
                onChange={(e) => update(ei, si, "actualReps", +e.target.value)}
                className="set-input"
                style={{ background: s.done ? "var(--bg-done)" : "var(--bg-input)" }}
            />
            <input
                type="number"
                value={s.actualWeight}
                onChange={(e) => update(ei, si, "actualWeight", +e.target.value)}
                className="set-input"
                style={{ background: s.done ? "var(--bg-done)" : "var(--bg-input)" }}
            />
            <input
                type="text"
                value={s.notes}
                placeholder="—"
                onChange={(e) => update(ei, si, "notes", e.target.value)}
                className="set-input"
                style={{ background: s.done ? "var(--bg-done)" : "var(--bg-input)" }}
            />
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>
                {prev ? `${prev.weight > 0 ? `${prev.weight} × ` : ""}${prev.reps}` : "—"}
                {isPR && <Trophy size={12} style={{ verticalAlign: "-1px", marginLeft: 4 }} />}
            </div>
            <button
                onClick={() => toggleDone(ei, si)}
                className={`check-btn${s.done ? " done" : ""}`}
                aria-label={s.done ? `Mark set ${si + 1} incomplete` : `Mark set ${si + 1} complete`}
            >
                {s.done ? <Check size={16} /> : ""}
            </button>
        </>
    );
}
