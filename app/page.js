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

export default function Home() {
  const [data, setData] = useState({ templates: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("templates");
  const [editing, setEditing] = useState(null);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function init() {
      try {
        const remoteData = await fetchAllData();
        
        // Simple migration logic: if remote is empty and local has data, migrate
        const localData = loadLocalData();
        if (remoteData.templates.length === 0 && localData.templates.length > 0) {
          console.log("Migrating local data to Supabase...");
          for (const t of localData.templates) {
            await upsertTemplate(t);
          }
          for (const h of localData.history) {
            await saveHistory(h);
          }
          const finalData = await fetchAllData();
          setData(finalData);
          console.log("Migration successful. Clearing local storage.");
          clearLocalData();
        } else {
          setData(remoteData);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

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
      await removeTemplate(id);
      const updatedData = await fetchAllData();
      setData(updatedData);
    } catch (err) {
      alert("Failed to delete template: " + err.message);
    }
  };

  const finishWorkout = async (log) => {
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

  if (loading) {
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
          <div style={{ fontWeight: 600 }}>Loading your data...</div>
        </div>
      </div>
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
          padding: "16px 20px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>💪 Workout Logger</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{ display: "flex", gap: 4, background: "var(--bg-tab)", borderRadius: 10, padding: 3 }}
            >
              {["templates", "history"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
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
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? "🌙" : "☀️"}
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
            {data.templates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏋️</div>
                <div>No templates yet — create one to get started</div>
              </div>
            ) : (
              data.templates.map((t) => (
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
        {tab === "history" && (
          <History
            history={data.history}
            onDelete={handleDeleteHistory}
            onClear={handleClearHistory}
          />
        )}
      </div>
    </div>
  );
}
