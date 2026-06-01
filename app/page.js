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
  clearLocalData
} from "@/lib/data";
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-default)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {signUpPrompt === "finish_workout" ? "🏆" : "🔒"}
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '10px',
            color: 'var(--text-primary)'
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
            marginBottom: '24px'
          }}>
            {message}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handlePrimary}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--accent-blue)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {primaryBtnText}
            </button>

            {showDiscard && (
              <button
                onClick={handleDiscard}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-danger)',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  border: '1px solid var(--border-danger)',
                  cursor: 'pointer'
                }}
              >
                Discard Workout
              </button>
            )}

            <button
              onClick={handleCancel}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '15px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer'
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
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>⚡️</div>
          <div style={{ fontWeight: 600 }}>Loading...</div>
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
        style={{
          background: "var(--bg-header)",
          borderBottom: "1px solid var(--border-default)",
          padding: "calc(16px + env(safe-area-inset-top)) 20px 16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="header-container">
          <div className="header-title">💪 Rep Journal</div>
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
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === t ? "var(--bg-tab-active)" : "transparent",
                  color: tab === t ? "var(--text-secondary)" : "var(--text-muted)",
                  fontWeight: tab === t ? 600 : 400,
                  cursor: "pointer",
                  fontSize: 13,
                  boxShadow: tab === t ? "var(--shadow-tab)" : "none",
                }}
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
              style={{
                fontSize: 18,
                textDecoration: "none",
                background: "var(--bg-tab)",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-default)",
              }}
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
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
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
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>My Templates</div>
              <button
                onClick={() => setEditing("new")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 9,
                  border: "none",
                  background: "var(--accent-blue)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + New
              </button>
            </div>
            {userTemplates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏋️</div>
                <div>No templates yet — create one to get started</div>
              </div>
            ) : (
              userTemplates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                    {t.exercises?.length || 0} exercise{(t.exercises?.length !== 1) ? "s" : ""} ·{" "}
                    {t.exercises?.reduce((a, e) => a + (e.sets?.length || 0), 0) || 0} sets
                  </div>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {t.exercises?.map((e) => (
                      <span
                        key={e.id}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: "var(--bg-tab)",
                          borderRadius: 99,
                          color: "var(--text-muted)",
                        }}
                      >
                        {e.name}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => setActiveWorkout(t)}
                      style={{
                        flex: 2,
                        padding: 9,
                        borderRadius: 9,
                        border: "none",
                        background: "var(--accent-blue)",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      ▶ Start
                    </button>
                    <button
                      onClick={() => setEditing(t)}
                      style={{
                        flex: 1,
                        padding: 9,
                        borderRadius: 9,
                        border: "1px solid var(--border-default)",
                        background: "var(--bg-card)",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: "1px solid var(--border-danger)",
                        background: "var(--bg-card)",
                        color: "var(--text-danger)",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
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
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                Template Library {isAdmin(user) && <span style={{ fontSize: 11, padding: '2px 6px', background: 'var(--accent-blue)', color: 'white', borderRadius: 4, marginLeft: 8, fontWeight: 600 }}>Admin</span>}
              </div>
              {isAdmin(user) && (
                <button
                  onClick={() => setEditing({ is_system: true })}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 9,
                    border: "none",
                    background: "var(--accent-blue)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  + New System
                </button>
              )}
            </div>
            {systemTemplates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📚</div>
                <div>No system templates available</div>
              </div>
            ) : (
              systemTemplates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                    {t.exercises?.length || 0} exercise{(t.exercises?.length !== 1) ? "s" : ""} ·{" "}
                    {t.exercises?.reduce((a, e) => a + (e.sets?.length || 0), 0) || 0} sets
                  </div>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {t.exercises?.map((e) => (
                      <span
                        key={e.id}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: "var(--bg-tab)",
                          borderRadius: 99,
                          color: "var(--text-muted)",
                        }}
                      >
                        {e.name}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => setActiveWorkout(t)}
                      style={{
                        flex: isAdmin(user) ? 2 : 1,
                        padding: 9,
                        borderRadius: 9,
                        border: "none",
                        background: "var(--accent-blue)",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      ▶ Start
                    </button>
                    {isAdmin(user) ? (
                      <>
                        <button
                          onClick={() => setEditing(t)}
                          style={{
                            flex: 1,
                            padding: 9,
                            borderRadius: 9,
                            border: "1px solid var(--border-default)",
                            background: "var(--bg-card)",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleAdminDeleteTemplate(t.id)}
                          style={{
                            padding: "9px 12px",
                            borderRadius: 9,
                            border: "1px solid var(--border-danger)",
                            background: "var(--bg-card)",
                            color: "var(--text-danger)",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCloneTemplate(t)}
                        style={{
                          flex: 1,
                          padding: 9,
                          borderRadius: 9,
                          border: "1px solid var(--border-default)",
                          background: "var(--bg-card)",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        📥 Copy to My Templates
                      </button>
                    )}
                  </div>
                </div>
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
