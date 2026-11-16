"use client";

import { useState, useEffect, useRef } from "react";
import { searchExercises } from "@/lib/data";

export default function ExerciseAutocomplete({ value, onChange, placeholder }) {
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuery(value || "");
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                const data = await searchExercises(query);
                setResults(data);
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (ex) => {
        setQuery(ex.name);
        setIsOpen(false);
        onChange(ex);
    };

    return (
        <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
            <input
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    if (e.target.value === "") onChange({ name: "" });
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="input"
                style={{ padding: "9px 12px", fontSize: 14 }}
            />
            {isOpen && (query.length >= 2 || results.length > 0) && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: "var(--bg-card)",
                        border: "1.5px solid var(--border-default)",
                        borderRadius: 4,
                        marginTop: 6,
                        maxHeight: 300,
                        overflowY: "auto",
                        boxShadow: "var(--shadow-card-hard)",
                    }}
                >
                    {loading && (
                        <div style={{ padding: 12, fontSize: 13, color: "var(--text-faint)", textAlign: "center" }}>
                            Searching...
                        </div>
                    )}
                    {!loading && results.length === 0 && query.length >= 2 && (
                        <div
                            onClick={() => {
                                onChange({ name: query });
                                setIsOpen(false);
                            }}
                            style={{
                                padding: "10px 12px",
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--brand-1)",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--border-default)",
                            }}
                        >
                            {`+ Add "${query}" as custom exercise`}
                        </div>
                    )}
                    {results.map((ex) => (
                        <div
                            key={ex.id}
                            onClick={() => handleSelect(ex)}
                            style={{
                                padding: "10px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--border-subtle)",
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tab)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>
                                {ex.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 3, textTransform: "capitalize" }}>
                                {[ex.muscle_group, ex.equipment].filter(Boolean).join(" · ")}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
