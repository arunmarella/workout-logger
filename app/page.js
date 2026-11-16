"use client";

import { useState, useEffect } from "react";
import { 
  fetchAllData, 
  upsertTemplate, 
  deleteTemplate as removeTemplate, 
  saveHistory, 
  deleteHistoryItem,
  clearAllHistory,
  loadLocalData,
  clearLocalData,
  buildPreviousMap
} from "@/lib/data";
import { accentFor, iconFor } from "@/lib/accent";
import { useTheme } from "@/components/ThemeProvider";
import ActiveWorkout from "@/components/ActiveWorkout";
import TemplateEditor from "@/components/TemplateEditor";
import History from "@/components/History";
import Auth from "@/components/Auth";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [guestChecked, setGuestChecked] = useState(false);
  const [authSignUpView, setAuthSignUpView] = useState(false);
  const [signUpPrompt, setSignUpPrompt] = useState(null);
  const [pendingWorkoutLog, setPendingWorkoutLog] = useState(null);

  const [data, setData] = useState({ templates: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("templates");
  const [editing, setEditing] = useState(null);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const { theme, toggleTheme } = useTheme();

  // Load guest state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const g = localStorage.getItem("workout_logger_guest") === "true";
      setIsGuest(g);
      if (g) {
        setTab("library");
      }
      setGuestChecked(true);
    }
  }, []);

  useEffect(() => {
    console.warn("DEBUG: App useEffect mounted.");
    if (!guestChecked) return;
    
    // SAFE BOOT: Force loading to end after 5 seconds no matter what
    const safeBoot = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("DEBUG: Safe Boot triggered! Forcing loading to end.");
          return false;
        }
        return prev;
      });
    }, 5000);

    async function init() {
      try {
        console.warn("DEBUG: Starting initialization...");
        const remoteData = await fetchAllData();
        console.warn("DEBUG: fetchAllData returned.");
        
        // Recover pending guest workout if they just logged in/signed up!
        if (user) {
          const pendingWorkoutStr = localStorage.getItem("pending_workout");
          if (pendingWorkoutStr) {
            try {
              const pendingWorkout = JSON.parse(pendingWorkoutStr);
              await saveHistory(pendingWorkout);
              localStorage.removeItem("pending_workout");
              alert("Your guest workout has been successfully saved to your history!");
            } catch (e) {
              console.error("Failed to save pending guest workout:", e);
            }
          }
        }

        if (user) {
          // Simple migration logic (only for authenticated users migrating from local storage)
          const localData = loadLocalData();
          if (remoteData.templates.length === 0 && localData.templates.length > 0) {
            console.warn("DEBUG: Migration required.");
            for (const t of localData.templates) await upsertTemplate(t);
            for (const h of localData.history) await saveHistory(h);
            const finalData = await fetchAllData();
            setData(finalData);
            console.warn("DEBUG: Migration complete.");
            clearLocalData();
          } else {
            console.warn("DEBUG: No migration needed.");
            setData(remoteData);
          }
        } else {
          // Guest mode or loading system templates for guest
          setData(remoteData);
        }
      } catch (err) {
        console.warn("DEBUG: Initialization error:", err.message);
      } finally {
        console.warn("DEBUG: Initialization finished.");
        setLoading(false);
        clearTimeout(safeBoot);
      }
    }
    
    if (user || isGuest) {
      init();
    } else {
      setLoading(false);
    }
  }, [user, isGuest, guestChecked]);

  const userTemplates = data.templates.filter((t) => !t.is_system);
  const systemTemplates = data.templates.filter((t) => t.is_system);

  const triggerSignUpPrompt = (context, pendingLog = null) => {
    setSignUpPrompt(context);
    if (pendingLog) {
      setPendingWorkoutLog(pendingLog);
    }
  };

  const handleCloneTemplate = async (template) => {
    if (isGuest) {
      triggerSignUpPrompt("copy");
      return;
    }
    try {
      const clonedTemplate = {
        id: crypto.randomUUID(),
        name: `${template.name} (Copy)`,
        exercises: template.exercises.map((ex) => ({
          ...ex,
          id: Math.random().toString(36).slice(2, 9),
        })),
        is_system: false
      };
      await upsertTemplate(clonedTemplate);
      const updatedData = await fetchAllData();
      setData(updatedData);
      setTab("templates");
    } catch (err) {
      alert("Failed to copy template: " + err.message);
    }
  };

  const saveTemplate = async (tpl) => {
    try {
      await upsertTemplate(tpl);
      const updatedData = await fetchAllData();
      setData(updatedData);
      setEditing(null);
    } catch (err) {
      alert("Failed to save template: " + err.message);
    }
  };

  const handleDeleteHistory = async (id) => {
    console.log("Triggering handleDeleteHistory for ID:", id);
    if (!confirm("Delete this workout log?")) return;
    try {
      await deleteHistoryItem(id);
      const updatedData = await fetchAllData();
      setData(updatedData);
    } catch (err) {
      alert("Failed to delete history item: " + err.message);
    }
  };

  const handleClearHistory = async () => {
    console.log("Triggering handleClearHistory");
    if (!confirm("Are you sure you want to clear ALL workout history? This cannot be undone.")) return;
    try {
      await clearAllHistory();
      const updatedData = await fetchAllData();
      setData(updatedData);
    } catch (err) {
      alert("Failed to clear history: " + err.message);
    }
  };

  const deleteTemplate = async (id) => {
    console.log("Triggering deleteTemplate for ID:", id);
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await removeTemplate(id, false);
      const updatedData = await fetchAllData();
      setData(updatedData);
    } catch (err) {
      alert("Failed to delete template: " + err.message);
    }
  };

  const handleAdminDeleteTemplate = async (id) => {
    console.log("Triggering handleAdminDeleteTemplate for ID:", id);
    if (!confirm("Are you sure you want to delete this global system template? This will remove it for all users!")) return;
    try {
      await removeTemplate(id, true);
      const updatedData = await fetchAllData();
      setData(updatedData);
    } catch (err) {
      alert("Failed to delete system template: " + err.message);
    }
  };

  const finishWorkout = async (log) => {
    if (isGuest) {
      triggerSignUpPrompt("finish_workout", log);
      return;
    }
    try {
      await saveHistory(log);
      const updatedData = await fetchAllData();
      setData(updatedData);
      setActiveWorkout(null);
      setTab("history");
    } catch (err) {
      alert("Failed to save workout: " + err.message);
    }
  };

  // SignUp Prompt Modal
  const renderSignUpModal = () => {
    if (!signUpPrompt) return null;

    let title = "Join Rep Journal";
    let message = "Create an account or sign in to access this feature.";
    let primaryBtnText = "Sign Up / Log In";
    let secondaryBtnText = "Cancel";
    let showDiscard = false;

    if (signUpPrompt === "copy") {
      title = "Customize Your Workouts";
      message = "Sign up or log in to copy library templates, customize exercises, and design your own routines.";
    } else if (signUpPrompt === "history") {
      title = "Track Your Progress";
      message = "Creating an account lets you save your workout history, view past performances, and track your consistency over time.";
    } else if (signUpPrompt === "templates") {
      title = "Build Your Routine";
      message = "Create and customize your own workout templates. Sign up or log in to save your personal routines.";
    } else if (signUpPrompt === "finish_workout") {
      title = "Save Your Workout!";
      message = "Sign up now to save this workout log to your history and track your progress.";
      primaryBtnText = "Sign Up & Save";
      secondaryBtnText = "Discard Workout";
      showDiscard = true;
    }

    const handlePrimary = () => {
      if (signUpPrompt === "finish_workout" && pendingWorkoutLog) {
        localStorage.setItem("pending_workout", JSON.stringify(pendingWorkoutLog));
      }
      setSignUpPrompt(null);
      setPendingWorkoutLog(null);
      localStorage.removeItem("workout_logger_guest");
      setIsGuest(false);
      setAuthSignUpView(true);
      setActiveWorkout(null);
      setEditing(null);
    };

    const handleCancel = () => {
      setSignUpPrompt(null);
      setPendingWorkoutLog(null);
    };

    const handleDiscard = () => {
      setSignUpPrompt(null);
      setPendingWorkoutLog(null);
      setActiveWorkout(null);
      setTab("library");
    };

    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-icon">
            {signUpPrompt === "finish_workout" ? "🏆" : "🔒"}
          </div>
          <h2 style={{
            fontSize: '21px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '10px',
            color: 'var(--text-primary)'
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: '1.55',
            marginBottom: '24px'
          }}>
            {message}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handlePrimary}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '15px' }}
            >
              {primaryBtnText}
            </button>

            {showDiscard && (
              <button
                onClick={handleDiscard}
                className="btn btn-danger-ghost"
                style={{ width: '100%', padding: '13px', fontSize: '15px' }}
              >
                Discard Workout
              </button>
            )}

            <button
              onClick={handleCancel}
              className="btn"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '15px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {showDiscard ? "Back to Workout" : secondaryBtnText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading || !guestChecked || (loading && (user || isGuest))) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: "var(--bg-page)",
        color: "var(--text-primary)"
      }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div className="loading-mark">RJ</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em" }}>Rep Journal</div>
            <div className="shimmer-bar" style={{ width: 120, margin: "12px auto 0" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <Auth 
        onGuestAccess={() => {
          localStorage.setItem("workout_logger_guest", "true");
          setIsGuest(true);
          setTab("library");
        }}
        initialSignUp={authSignUpView}
      />
    );
  }

  if (activeWorkout) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-page)", padding: "20px 16px" }}>
        <ActiveWorkout
          template={activeWorkout}
          previousMap={buildPreviousMap(data.history)}
          onFinish={finishWorkout}
          onCancel={() => setActiveWorkout(null)}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-page)", padding: "20px 16px" }}>
        <TemplateEditor
          template={editing === "new" ? null : editing}
          onSave={saveTemplate}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
      <div
        className="app-header"
        style={{
          padding: "calc(16px + env(safe-area-inset-top)) 20px 16px",
        }}
      >
        <div className="header-container">
          <div className="header-title">
            <span className="brand-mark">RJ</span>
            Rep Journal
          </div>
          <div className="header-tabs">
            {["templates", "library", "history"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  if (isGuest && (t === "templates" || t === "history")) {
                    triggerSignUpPrompt(t);
                  } else {
                    setTab(t);
                  }
                }}
                className={`tab-btn${tab === t ? " active" : ""}`}
              >
                {t === "templates" 
                  ? `My Templates${isGuest ? " 🔒" : ""}` 
                  : t === "library" 
                    ? "Library" 
                    : `History${isGuest ? " 🔒" : ""}`}
              </button>
            ))}
          </div>
          <div className="header-actions">
            <a
              href="/watch"
              target="_blank"
              title="Open Watch View"
              className="icon-btn"
            >
              ⌚️
            </a>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => {
                if (isGuest) {
                  localStorage.removeItem("workout_logger_guest");
                  setIsGuest(false);
                  setAuthSignUpView(false);
                } else {
                  supabase.auth.signOut();
                }
              }}
              className="icon-btn"
              title={isGuest ? "Exit Guest Mode" : "Sign Out"}
              aria-label={isGuest ? "Exit Guest Mode" : "Sign Out"}
            >
              🚪
            </button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "templates" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <div className="eyebrow">Your routines</div>
                <div className="section-title">My Templates</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setActiveWorkout({ id: `empty-${Date.now()}`, name: "Empty Workout", exercises: [] })}
                  className="btn btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  Start Empty Workout
                </button>
                <button
                  onClick={() => setEditing("new")}
                  className="btn btn-primary"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  + New
                </button>
              </div>
            </div>
            {userTemplates.length === 0 ? (
              <div className="card fade-up" style={{ textAlign: "center", padding: "56px 24px", color: "var(--text-faint)" }}>
                <div className="icon-tile" style={{ margin: "0 auto 16px", width: 64, height: 64, fontSize: 30, borderRadius: 4 }}>🏋️</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>No templates yet</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>Create one to get started — or copy a routine from the Library.</div>
              </div>
            ) : (
              userTemplates.map((t, i) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  index={i}
                  actions={
                    <>
                      <button
                        onClick={() => setActiveWorkout(t)}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: 10, fontSize: 13 }}
                      >
                        ▶ Start
                      </button>
                      <button
                        onClick={() => setEditing(t)}
                        className="btn btn-ghost"
                        style={{ flex: 1, padding: 10, fontSize: 13 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="btn btn-danger-ghost"
                        style={{ padding: "10px 14px", fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </>
                  }
                />
              ))
            )}
          </>
        )}
        {tab === "library" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <div className="eyebrow">Ready-made routines</div>
                <div className="section-title">
                  Template Library {isAdmin(user) && <span style={{ fontSize: 11, padding: '3px 8px', background: 'var(--brand-1)', color: 'var(--on-brand)', borderRadius: 4, marginLeft: 8, fontWeight: 700, verticalAlign: 'middle' }}>Admin</span>}
                </div>
              </div>
              {isAdmin(user) && (
                <button
                  onClick={() => setEditing({ is_system: true })}
                  className="btn btn-primary"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  + New System
                </button>
              )}
            </div>
            {systemTemplates.length === 0 ? (
              <div className="card fade-up" style={{ textAlign: "center", padding: "56px 24px", color: "var(--text-faint)" }}>
                <div className="icon-tile" style={{ margin: "0 auto 16px", width: 64, height: 64, fontSize: 30, borderRadius: 4 }}>📚</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>No system templates available</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>Check back soon — new routines are added regularly.</div>
              </div>
            ) : (
              systemTemplates.map((t, i) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  index={i}
                  actions={
                    <>
                      <button
                        onClick={() => setActiveWorkout(t)}
                        className="btn btn-primary"
                        style={{ flex: isAdmin(user) ? 2 : 1, padding: 10, fontSize: 13 }}
                      >
                        ▶ Start
                      </button>
                      {isAdmin(user) ? (
                        <>
                          <button
                            onClick={() => setEditing(t)}
                            className="btn btn-ghost"
                            style={{ flex: 1, padding: 10, fontSize: 13 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAdminDeleteTemplate(t.id)}
                            className="btn btn-danger-ghost"
                            style={{ padding: "10px 14px", fontSize: 13 }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCloneTemplate(t)}
                          className="btn btn-ghost"
                          style={{ flex: 1, padding: 10, fontSize: 13 }}
                        >
                          📥 Copy to My Templates
                        </button>
                      )}
                    </>
                  }
                />
              ))
            )}
          </>
        )}
        {tab === "history" && (
          <History
            history={data.history}
            onDelete={handleDeleteHistory}
            onClear={handleClearHistory}
          />
        )}
      </div>
      {renderSignUpModal()}
    </div>
  );
}

// Shared template card — no exercise chips: each exercise is its own row
// (colored dot + name + set count), up to 4 rows, then "+N more".
function TemplateCard({ template: t, index = 0, actions }) {
  const accent = accentFor(t.name);
  const exercises = t.exercises || [];
  const totalSets = exercises.reduce((a, e) => a + (e.sets?.length || 0), 0);
  const shown = exercises.slice(0, 4);
  return (
    <div
      className="template-card fade-up"
      style={{ "--accent": accent.solid, animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div className="icon-tile">{iconFor(t.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1.25 }}>{t.name}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3, fontWeight: 600 }}>
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} ·{" "}
            {totalSets} sets
          </div>
        </div>
      </div>
      {exercises.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {shown.map((e) => (
            <div className="ex-row" key={e.id}>
              <span className="ex-dot" />
              <span className="ex-row__name">{e.name}</span>
              <span className="ex-row__sets">{e.sets?.length || 0} {(e.sets?.length || 0) === 1 ? "set" : "sets"}</span>
            </div>
          ))}
          {exercises.length > 4 && (
            <div className="ex-more">+{exercises.length - 4} more exercises</div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {actions}
      </div>
    </div>
  );
}
