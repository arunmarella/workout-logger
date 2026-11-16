"use client";

import { useState } from "react";
import { genId } from "@/lib/data";
import ExerciseAutocomplete from "./ExerciseAutocomplete";

export default function TemplateEditor({ template, onSave, onCancel }) {
    const [name, setName] = useState(template?.name || "");
    const [exercises, setExercises] = useState(template?.exercises || []);

    const addEx = () =>
        setExercises((p) => [...p, { id: genId(), name: "", description: "", sets: [{ reps: 10, weight: 0, notes: "" }] }]);

    const removeEx = (id) => setExercises((p) => p.filter((e) => e.id !== id));

    const updEx = (id, f, v) =>
        setExercises((p) => p.map((e) => (e.id !== id ? e : { ...e, [f]: v })));

    const handleExerciseSelect = (id, ex) => {
        setExercises((p) => 
            p.map((e) => (e.id !== id ? e : { 
                ...e, 
                name: ex.name, 
                description: ex.description || "" 
            }))
        );
    };

    const addSet = (id) =>
        setExercises((p) =>
            p.map((e) =>
                e.id !== id ? e : { ...e, sets: [...e.sets, { reps: 10, weight: 0, notes: "" }] }
            )
        );

    const remSet = (id, si) =>
        setExercises((p) =>
            p.map((e) => (e.id !== id ? e : { ...e, sets: e.sets.filter((_, i) => i !== si) }))
        );

    const updSet = (id, si, f, v) =>
        setExercises((p) =>
            p.map((e) =>
                e.id !== id ? e : { ...e, sets: e.sets.map((s, i) => (i !== si ? s : { ...s, [f]: v })) }
            )
        );

    const valid =
        name.trim() && exercises.length > 0 && exercises.every((e) => e.name.trim() && e.sets.length > 0);

    return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div className="eyebrow">{template ? "Edit routine" : "New routine"}</div>
            <div className="section-title" style={{ fontSize: 22, marginBottom: 18 }}>
                {template ? "Edit Template" : "New Template"}
            </div>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name (e.g. Push Day)"
                className="input"
                style={{ marginBottom: 16, padding: "13px 16px", fontSize: 16, fontWeight: 700 }}
            />
            {exercises.map((ex, i) => (
                <div
                    key={ex.id}
                    className="card fade-up"
                    style={{ padding: 16, marginBottom: 12, animationDelay: `${Math.min(i, 6) * 50}ms` }}
                >
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <ExerciseAutocomplete
                                value={ex.name}
                                onChange={(selected) => handleExerciseSelect(ex.id, selected)}
                                placeholder="Exercise name (e.g. Bench Press)"
                            />
                            <button
                                onClick={() => removeEx(ex.id)}
                                className="btn btn-danger-ghost"
                                style={{ padding: "8px 12px", fontSize: 13, flexShrink: 0 }}
                            >
                                ✕
                            </button>
                        </div>
                        {ex.description && (
                            <div 
                                style={{ 
                                    fontSize: 12, 
                                    color: "var(--text-faint)", 
                                    padding: "8px 10px",
                                    background: "var(--bg-tab)",
                                    borderRadius: 4,
                                    maxHeight: 60,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    lineHeight: "1.4"
                                }}
                                title={ex.description}
                            >
                                {ex.description}
                            </div>
                        )}
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr auto",
                            gap: "6px 8px",
                            alignItems: "center",
                            marginBottom: 6,
                        }}
                    >
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Reps</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weight</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes</div>
                        <div />
                        {ex.sets.map((s, si) => (
                            <ExerciseSetRow
                                key={si}
                                s={s}
                                si={si}
                                exId={ex.id}
                                setsLength={ex.sets.length}
                                updSet={updSet}
                                remSet={remSet}
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => addSet(ex.id)}
                        className="btn btn-ghost"
                        style={{
                            fontSize: 12,
                            padding: "6px 12px",
                            borderStyle: "dashed",
                        }}
                    >
                        + Add Set
                    </button>
                </div>
            ))}
            <button
                onClick={addEx}
                className="btn btn-ghost"
                style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 14,
                    borderStyle: "dashed",
                    marginBottom: 16,
                }}
            >
                + Add Exercise
            </button>
            <div style={{ display: "flex", gap: 10, paddingBottom: 32 }}>
                <button
                    onClick={onCancel}
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: 13 }}
                >
                    Cancel
                </button>
                <button
                    onClick={() =>
                        valid &&
                        onSave({
                            ...template,
                            id: template?.id || genId(),
                            name: name.trim(),
                            exercises,
                        })
                    }
                    disabled={!valid}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: 13 }}
                >
                    Save Template
                </button>
            </div>
        </div>
    );
}

function ExerciseSetRow({ s, si, exId, setsLength, updSet, remSet }) {
    return (
        <>
            <input
                type="number"
                value={s.reps}
                onChange={(e) => updSet(exId, si, "reps", +e.target.value)}
                className="set-input"
            />
            <input
                type="number"
                value={s.weight}
                onChange={(e) => updSet(exId, si, "weight", +e.target.value)}
                className="set-input"
            />
            <input
                type="text"
                value={s.notes}
                placeholder="—"
                onChange={(e) => updSet(exId, si, "notes", e.target.value)}
                className="set-input"
            />
            <button
                onClick={() => remSet(exId, si)}
                disabled={setsLength === 1}
                className="btn btn-ghost"
                style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    color: setsLength === 1 ? "var(--accent-disabled)" : "var(--text-faint)",
                }}
            >
                ✕
            </button>
        </>
    );
}
