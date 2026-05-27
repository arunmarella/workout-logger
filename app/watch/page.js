"use client";

import { useState, useEffect } from "react";
import { fetchAllData } from "@/lib/data";
import { useWorkoutState } from "@/hooks/useWorkoutState";
import { useSearchParams } from "next/navigation";
import WatchTemplateList from "@/components/watch/WatchTemplateList";
import WatchWorkoutSession from "@/components/watch/WatchWorkoutSession";
import WatchSummary from "@/components/watch/WatchSummary";

import { Suspense } from "react";

function WatchPageContent() {
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("session_id");
  
  const [data, setData] = useState({ templates: [] });
  const [view, setView] = useState("templates"); // templates, workout, summary
  const [finishedWorkout, setFinishedWorkout] = useState(null);

  const {
    workout,
    sessionId,
    isConnected,
    startWorkout,
    updateWorkout,
    finishWorkout
  } = useWorkoutState({ sessionId: sessionIdFromUrl });

  useEffect(() => {
    async function load() {
      const res = await fetchAllData();
      setData(res);
    }
    load();
    
    // Set watch mode attribute for styling
    document.documentElement.setAttribute("data-watch", "true");
    return () => document.documentElement.removeAttribute("data-watch");
  }, []);

  // View state management based on workout status
  useEffect(() => {
    if (workout && view !== "summary") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("workout");
    } else if (!workout && view === "workout") {
      setView("templates");
    }
  }, [workout, view]);

  const handleSelectTemplate = async (template) => {
    await startWorkout(template);
    setView("workout");
  };

  const handleFinish = async () => {
    setFinishedWorkout(workout);
    await finishWorkout((log) => {
      // Logic for saving history is usually handled by the main app,
      // but if the watch is standalone, we can call saveHistory here too.
      // For now, we just transition to summary.
    });
    setView("summary");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--watch-bg)", color: "var(--watch-text)" }}>
      {view === "templates" && (
        <WatchTemplateList 
          templates={data.templates} 
          onSelect={handleSelectTemplate} 
        />
      )}

      {view === "workout" && workout && (
        <WatchWorkoutSession
          workout={workout}
          onUpdate={updateWorkout}
          onFinish={handleFinish}
          onCancel={() => window.location.reload()} // Simple reset
        />
      )}

      {view === "summary" && (
        <WatchSummary 
          workout={finishedWorkout} 
          onDone={() => setView("templates")} 
        />
      )}

      {/* Connection Indicator (Subtle) */}
      <div 
        style={{ 
          position: "fixed", 
          bottom: 4, 
          right: 4, 
          width: 6, 
          height: 6, 
          borderRadius: 99, 
          background: isConnected ? "var(--watch-success)" : "var(--watch-danger)",
          opacity: 0.5 
        }} 
      />
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "black", color: "white" }}>Loading...</div>}>
      <WatchPageContent />
    </Suspense>
  );
}
