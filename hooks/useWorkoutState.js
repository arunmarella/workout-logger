"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { genId } from "@/lib/data";

/**
 * stableStringify — JSON with object keys sorted recursively, so two
 * objects with the same content compare equal even if Postgres jsonb
 * reordered their keys on the round-trip (it does).
 */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

// localStorage key for the in-progress workout draft. Guests have no
// Supabase session, so without this a reload — or iOS reclaiming the
// WebView while the user is in another app mid-workout — loses every set
// already done. Logged-in users get it as a second layer under the
// active_workouts row.
export const ACTIVE_WORKOUT_DRAFT_KEY = "active_workout_draft";

export function clearActiveWorkoutDraft() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
  } catch (e) {}
}

export function readActiveWorkoutDraft() {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.workout?.exercises || !draft.workout.startTime) return null;
    // A draft older than a day is stale — drop it rather than resurfacing
    // a workout from last week.
    if (Date.now() - (draft.savedAt || 0) > 24 * 60 * 60 * 1000) {
      clearActiveWorkoutDraft();
      return null;
    }
    return draft;
  } catch (e) {
    return null;
  }
}
export function useWorkoutState({ sessionId: initialSessionId = null, initialTemplate = null, initialWorkout = null } = {}) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [workout, setWorkout] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Ref to track if the last state change was from a remote source
  // to avoid infinite loops when updating the server.
  const remoteUpdateRef = useRef(false);

  // Echo suppression for our own sync writes. Supabase Realtime fires an
  // UPDATE event for our own writes too, and the echoed state is the
  // snapshot from when the write was issued — if the user typed another
  // keystroke after that snapshot but before the echo arrived, applying
  // the echo silently wipes the newer edit ("the value doesn't stick").
  // lastSyncedRef holds the canonical form of the last state we wrote;
  // lastLocalEditRef holds the time of the last local edit, so a stale
  // echo can be recognised even when its content differs.
  const lastSyncedRef = useRef(null);
  const lastLocalEditRef = useRef(0);
  // True once the user has edited the workout locally. The initial fetch
  // below must not clobber those edits if it resolves late.
  const dirtyRef = useRef(false);

  // Initialize workout: a resumed in-progress workout wins over the
  // template, so a reload mid-workout restores the sets already done.
  useEffect(() => {
    if (workout) return;
    if (initialWorkout) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkout(initialWorkout);
      return;
    }
    if (initialTemplate) {
      setWorkout({
        ...initialTemplate,
        startTime: Date.now(),
        exercises: initialTemplate.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => ({
            ...s,
            done: false,
            actualReps: s.reps,
            actualWeight: s.weight,
          }))
        }))
      });
    }
  }, [initialTemplate, initialWorkout, workout]);

  // Handle Realtime Subscription
  useEffect(() => {
    if (!sessionId) return;

    console.log("Subscribing to session:", sessionId);
    
    const channel = supabase
      .channel(`active_workout_${sessionId}`)
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'active_workouts', filter: `id=eq.${sessionId}` },
        (payload) => {
          console.log("Remote update received:", payload);
          if (payload.new && payload.new.state) {
            // Our own sync write echoed back: same content, ignore it.
            if (stableStringify(payload.new.state) === lastSyncedRef.current) return;
            // A stale echo: the row snapshot predates a local edit made
            // after the write was issued. Applying it would drop that edit.
            const remoteAt = payload.new.updated_at ? new Date(payload.new.updated_at).getTime() : 0;
            if (remoteAt && remoteAt <= lastLocalEditRef.current) return;
            remoteUpdateRef.current = true;
            setWorkout(payload.new.state);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Initial fetch
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('active_workouts')
        .select('state')
        .eq('id', sessionId)
        .single();
      
      if (data && data.state) {
        // The fetch can resolve after the user has already typed: the
        // server row is the pre-edit snapshot, so applying it would wipe
        // those edits. Local edits win; server state only applies while
        // the workout is still untouched.
        if (dirtyRef.current) return;
        remoteUpdateRef.current = true;
        setWorkout(data.state);
      }
    };
    fetchInitial();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);


  // Persist the in-progress workout locally so it survives a reload or
  // the OS reclaiming the WebView mid-workout (guests have no Supabase
  // session to fall back on). Debounced like the remote sync below.
  useEffect(() => {
    if (!workout) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(ACTIVE_WORKOUT_DRAFT_KEY, JSON.stringify({ workout, sessionId, savedAt: Date.now() }));
      } catch (e) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [workout, sessionId]);

  // Sync state to Supabase when workout changes
  useEffect(() => {
    if (!sessionId || !workout || remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      return;
    }

    const syncToRemote = async () => {
      lastSyncedRef.current = stableStringify(workout);
      const { error } = await supabase
        .from('active_workouts')
        .update({ state: workout, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (error) console.error("Sync error:", error);
    };

    // Debounce sync slightly
    const timer = setTimeout(syncToRemote, 500);
    return () => clearTimeout(timer);
  }, [workout, sessionId]);

  const startWorkout = useCallback(async (template) => {
    const newSessionId = crypto.randomUUID();
    const initialWorkoutState = {
      ...template,
      startTime: Date.now(),
      exercises: template.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          ...s,
          done: false,
          actualReps: s.reps,
          actualWeight: s.weight,
        }))
      }))
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    // Guests / offline: work locally, no watch sync, no error.
    // The hook's initialTemplate effect already set the local workout.
    if (!user) {
      setWorkout(initialWorkoutState);
      setSessionId(null);
      return;
    }

    setWorkout(initialWorkoutState);
    setSessionId(newSessionId);

    const { error } = await supabase
      .from('active_workouts')
      .insert({
        id: newSessionId,
        template_id: template.id,
        template_name: template.name,
        state: initialWorkoutState,
        user_id: user.id
      });

    if (error) {
      console.error("Failed to start synced workout:", error);
      setError(error.message);
    }
  }, []);

  const updateWorkout = useCallback((newWorkout) => {
    dirtyRef.current = true;
    lastLocalEditRef.current = Date.now();
    setWorkout(newWorkout);
  }, []);

  const finishWorkout = useCallback(async (onFinish) => {
    if (onFinish) {
      onFinish({
        id: genId(),
        template_name: workout.name,
        date: new Date().toISOString(),
        duration: Math.round((Date.now() - workout.startTime) / 60000),
        exercises: workout.exercises,
      });
    }

    // The workout is done — the draft must not come back as "resume".
    clearActiveWorkoutDraft();

    // Cleanup active session
    if (sessionId) {
      await supabase.from('active_workouts').delete().eq('id', sessionId);
    }
    setWorkout(null);
    setSessionId(null);
  }, [workout, sessionId]);

  return {
    workout,
    sessionId,
    isConnected,
    error,
    startWorkout,
    updateWorkout,
    finishWorkout,
    setWorkout // Manual override if needed
  };
}
