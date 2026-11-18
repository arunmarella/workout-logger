"use client";

import { useState } from "react";

/**
 * NumberField — a number input that behaves while you type.
 *
 * The plain controlled pattern (`value={n}` + `onChange={e => set(+e.target.value)}`)
 * breaks data entry two ways:
 *   1. Backspace to empty: `+""` is 0, so the field snaps back to "0" and
 *      can never be cleared — every backspace just shows 0.
 *   2. Decimals: `+"12."` is 12, so the "." vanishes as you type and a
 *      weight like 12.5 can never be entered.
 * This keeps the in-progress text local (as a string) and only commits a
 * parsed number on blur (or Enter). Empty or invalid text on blur reverts
 * to the last committed value instead of writing 0. `type="text"` with
 * `inputMode="decimal"` keeps the numeric keyboard on iOS while letting
 * intermediate states like "12." exist.
 */
export default function NumberField({ value, onCommit, className, style, ariaLabel }) {
    const [text, setText] = useState(String(value ?? ""));
    // Focus as state (not a ref): the render-time sync below reads it, and
    // refs must not be read during render.
    const [focused, setFocused] = useState(false);

    // Adopt outside changes (a set pre-filled from Previous, or a
    // remote/watch update) — but never while the user is mid-edit.
    // Adjusted during render (the documented pattern for syncing state
    // from props); the effect form trips react-hooks/set-state-in-effect.
    const [prevValue, setPrevValue] = useState(value);
    if (value !== prevValue) {
        setPrevValue(value);
        if (!focused) setText(String(value ?? ""));
    }

    const commit = () => {
        const trimmed = text.trim();
        if (trimmed === "") {
            setText(String(value ?? ""));
            return;
        }
        const parsed = Number(trimmed);
        if (Number.isNaN(parsed)) {
            setText(String(value ?? ""));
            return;
        }
        if (parsed !== value) onCommit(parsed);
        setText(String(parsed));
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={text}
            aria-label={ariaLabel}
            className={className}
            style={style}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); commit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        />
    );
}
