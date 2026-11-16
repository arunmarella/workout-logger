"use client";

import { useState } from "react";
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { accentFor } from "@/lib/accent";
import { Check, ChevronDown, ChevronUp, ClipboardList, X } from "lucide-react";

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

    const exportCsv = () => {
        const rows = [["Date", "Workout Name", "Exercise Name", "Set Order", "Weight", "Weight Unit", "Reps", "Notes", "Workout Duration"]];
        for (const w of history) {
            for (const ex of w.exercises || []) {
                ex.sets.forEach((s, i) => rows.push([
                    new Date(w.date).toISOString(), w.template_name || w.templateName || "",
                    ex.name, i + 1, s.actualWeight ?? s.weight ?? "", "lbs",
                    s.actualReps ?? s.reps ?? "", s.notes || "", w.duration || "",
                ]));
            }
        }
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "workout-history.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    };

    if (!history.length) {
        return (
            <div className="card fade-up" style={{ textAlign: "center", padding: "56px 24px", color: "var(--text-faint)" }}>
                <div className="icon-tile" style={{ margin: "0 auto 16px", width: 64, height: 64, fontSize: 30, borderRadius: 4 }}><ClipboardList size={30} /></div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>No workouts logged yet</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>Finish your first workout and it will show up here.</div>
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
                <div>
                    <div className="eyebrow">Your progress</div>
                    <div className="section-title">Workout History</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                <button
                    onClick={exportCsv}
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                >
                    Export CSV
                </button>
                <button
                    onClick={() => {
                        hapticImpact(ImpactStyle.Heavy);
                        onClear();
                    }}
                    className="btn btn-danger-ghost"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                >
                    Clear All
                </button>
                </div>
            </div>
            {/* history is already newest-first from Supabase (date desc);
                don't reverse it — that was showing oldest first. */}
            {[...history].sort((a, b) => new Date(b.date) - new Date(a.date)).map((w, i) => {
                const d = new Date(w.date);
                const isOpen = expanded === w.id;
                const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
                const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
                const volume = w.exercises.reduce((a, e) => a + e.sets.reduce((x, s) => x + ((s.actualReps ?? s.reps) || 0) * ((s.actualWeight ?? s.weight) || 0), 0), 0);
                const accent = accentFor(w.template_name || w.templateName || "");
                return (
                    <div
                        key={w.id}
                        className="history-card fade-up"
                        style={{ "--accent": accent.solid, animationDelay: `${Math.min(i, 8) * 60}ms` }}
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
                                    minWidth: 0,
                                    padding: "16px 16px 16px 20px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    textAlign: "left",
                                    gap: 12,
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                                        {w.template_name || w.templateName}
                                    </div>
                                    <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3, fontWeight: 600 }}>
                                        {d.toLocaleDateString(undefined, {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })}{" "}
                                        · {w.duration}min · {done}/{total} sets{volume > 0 ? ` · ${volume.toLocaleString()} lb` : ""}
                                    </div>
                                </div>
                                <span style={{ color: "var(--text-faint)", flexShrink: 0, display: "inline-flex" }}>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    hapticImpact(ImpactStyle.Light);
                                    onDelete?.(w.id);
                                }}
                                style={{
                                    padding: "16px",
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-danger)",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                }}
                                title="Delete workout"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        {isOpen && (
                            <div style={{ padding: "0 16px 16px 20px" }}>
                                {w.exercises.map((ex) => (
                                    <div key={ex.id} style={{ marginBottom: 12 }}>
                                        <div
                                            style={{ fontSize: 13, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6 }}
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
                                                    fontWeight: 600,
                                                    color: s.done ? "var(--accent-green-text)" : "var(--text-faint)",
                                                    marginBottom: 4,
                                                }}
                                            >
                                                <span style={{ width: 16, display: "inline-flex", alignItems: "center" }}>{s.done ? <Check size={13} /> : "–"}</span>
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
