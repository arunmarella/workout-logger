"use client";

import React, { useState } from "react";
import WatchExerciseSlide from "./WatchExerciseSlide";
import WatchSummary from "./WatchSummary";

export default function WatchWorkoutSession({ workout, onUpdate, onFinish, onCancel }) {
  const [exerciseIndex, setExerciseIndex] = useState(0);

  if (!workout) return null;

  const currentExercise = workout.exercises[exerciseIndex];
  const totalExercises = workout.exercises.length;

  const handleToggleSet = (exId, setIndex) => {
    const updatedExercises = workout.exercises.map((ex) => {
      if (ex.id !== exId) return ex;
      const updatedSets = ex.sets.map((s, i) =>
        i !== setIndex ? s : { ...s, done: !s.done }
      );
      return { ...ex, sets: updatedSets };
    });
    onUpdate({ ...workout, exercises: updatedExercises });
  };

  const nextExercise = () => {
    if (exerciseIndex < totalExercises - 1) {
      setExerciseIndex(exerciseIndex + 1);
    }
  };

  const prevExercise = () => {
    if (exerciseIndex > 0) {
      setExerciseIndex(exerciseIndex - 1);
    }
  };

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* Header Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px 10px",
          borderBottom: "1px solid var(--watch-border)",
          fontSize: 11,
          color: "var(--watch-text-secondary)",
        }}
      >
        <span>{workout.name}</span>
        <span>{exerciseIndex + 1} / {totalExercises}</span>
      </div>

      {/* Main Slide */}
      <WatchExerciseSlide 
        exercise={currentExercise} 
        onToggleSet={handleToggleSet} 
      />

      {/* Navigation Controls */}
      <div style={{ display: "flex", gap: 8, padding: "0 10px", marginTop: 10 }}>
        <button
          onClick={prevExercise}
          disabled={exerciseIndex === 0}
          className="watch-btn-secondary"
          style={{ flex: 1, opacity: exerciseIndex === 0 ? 0.3 : 1 }}
        >
          ←
        </button>
        <button
          onClick={nextExercise}
          disabled={exerciseIndex === totalExercises - 1}
          className="watch-btn-secondary"
          style={{ flex: 1, opacity: exerciseIndex === totalExercises - 1 ? 0.3 : 1 }}
        >
          →
        </button>
      </div>

      {/* Finish Button */}
      <div style={{ padding: "20px 10px 0" }}>
        <button
          onClick={onFinish}
          className="watch-btn-primary"
          style={{ background: "var(--watch-success)" }}
        >
          Finish Workout
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--watch-danger)",
            fontSize: 12,
            marginTop: 15,
            width: "100%",
            textAlign: "center",
            cursor: "pointer"
          }}
        >
          Cancel Workout
        </button>
      </div>
    </div>
  );
}
