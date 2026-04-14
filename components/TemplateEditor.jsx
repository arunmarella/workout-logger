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
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
                {template ? "Edit Template" : "New Template"}
            </div>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name (e.g. Push Day)"
                style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-default)",
                    fontSize: 15,
                    marginBottom: 16,
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            {exercises.map((ex) => (
                <div
                    key={ex.id}
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 12,
                    }}
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
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 8,
                                    border: "1px solid var(--border-danger)",
                                    background: "var(--bg-card)",
                                    color: "var(--text-danger)",
                                    cursor: "pointer",
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        {ex.description && (
                            <div 
                                style={{ 
                                    fontSize: 12, 
                                    color: "var(--text-faint)", 
                                    padding: "4px 8px",
                                    background: "var(--bg-tab)",
                                    borderRadius: 6,
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
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Reps</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Weight</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Notes</div>
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
                        style={{
                            fontSize: 12,
                            padding: "4px 10px",
                            borderRadius: 7,
                            border: "1px dashed var(--border-subtle)",
                            background: "var(--bg-card)",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                        }}
                    >
                        + Add Set
                    </button>
                </div>
            ))}
            <button
                onClick={addEx}
                style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px dashed var(--border-subtle)",
                    background: "var(--bg-add-btn)",
                    color: "var(--text-muted)",
                    fontSize: 14,
                    cursor: "pointer",
                    marginBottom: 16,
                }}
            >
                + Add Exercise
            </button>
            <div style={{ display: "flex", gap: 10, paddingBottom: 32 }}>
                <button
                    onClick={onCancel}
                    style={{
                        flex: 1,
                        padding: 11,
                        borderRadius: 10,
                        border: "1px solid var(--border-default)",
                        background: "var(--bg-card)",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
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
                    style={{
                        flex: 2,
                        padding: 11,
                        borderRadius: 10,
                        border: "none",
                        background: valid ? "var(--accent-blue)" : "var(--accent-disabled)",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: valid ? "pointer" : "default",
                    }}
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
                style={{
                    padding: "5px 8px",
                    borderRadius: 7,
                    border: "1px solid var(--border-default)",
                    fontSize: 13,
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            <input
                type="number"
                value={s.weight}
                onChange={(e) => updSet(exId, si, "weight", +e.target.value)}
                style={{
                    padding: "5px 8px",
                    borderRadius: 7,
                    border: "1px solid var(--border-default)",
                    fontSize: 13,
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            <input
                type="text"
                value={s.notes}
                placeholder="—"
                onChange={(e) => updSet(exId, si, "notes", e.target.value)}
                style={{
                    padding: "5px 8px",
                    borderRadius: 7,
                    border: "1px solid var(--border-default)",
                    fontSize: 13,
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                }}
            />
            <button
                onClick={() => remSet(exId, si)}
                disabled={setsLength === 1}
                style={{
                    padding: "4px 8px",
                    borderRadius: 7,
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-card)",
                    color: setsLength === 1 ? "var(--accent-disabled)" : "var(--text-faint)",
                    cursor: setsLength === 1 ? "default" : "pointer",
                }}
            >
                ✕
            </button>
        </>
    );
}
