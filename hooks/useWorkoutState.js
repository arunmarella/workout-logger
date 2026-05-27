"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { genId } from "@/lib/data";

/**
 * useWorkoutState
 * Manages the lifecycle and real-time synchronization of a workout.
 */
export function useWorkoutState({ sessionId: initialSessionId = null, initialTemplate = null } = {}) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [workout, setWorkout] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Ref to track if the last state change was from a remote source
  // to avoid infinite loops when updating the server.
  const remoteUpdateRef = useRef(false);

  // Initialize workout from template if provided
  useEffect(() => {
    if (initialTemplate && !workout) {
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
  }, [initialTemplate, workout]);

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
            remoteUpdateRef.current = true;
            setWorkout(payload.new.state);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Initial fetch
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('active_workouts')
        .select('state')
        .eq('id', sessionId)
        .single();
      
      if (data && data.state) {
        remoteUpdateRef.current = true;
        setWorkout(data.state);
      }
    };
    fetchInitial();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);


  // Sync state to Supabase when workout changes
  useEffect(() => {
    if (!sessionId || !workout || remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      return;
    }

    const syncToRemote = async () => {
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

    if (!user) {
      setError("Must be logged in to start a workout");
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
