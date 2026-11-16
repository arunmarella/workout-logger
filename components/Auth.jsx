"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { KeyRound } from "lucide-react";

export default function Auth({ onGuestAccess, initialSignUp = false }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsSignUp(initialSignUp);
  }, [initialSignUp]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Check your email for the login link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Gradient hero */}
      <div className="auth-hero" style={{ padding: '48px 20px 72px', textAlign: 'center', color: 'var(--on-brand)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 4,
            background: 'var(--on-brand)',
            color: 'var(--brand-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: '0 auto 16px',
            boxShadow: '4px 4px 0 rgba(22,22,22,0.25)',
          }}>
            RJ
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Rep Journal
          </h1>
          <p className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.92, marginTop: 10 }}>
            Train strong. Track everything.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
            {["Templates", "PRs", "History"].map((f) => (
              <span key={f} className="mono" style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '5px 12px',
                borderRadius: 4,
                background: 'transparent',
                border: '1.5px solid color-mix(in srgb, var(--on-brand) 50%, transparent)',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form card, overlapping the hero */}
      <div style={{
        maxWidth: '400px',
        width: 'calc(100% - 40px)',
        margin: '-48px auto 0',
        position: 'relative',
        zIndex: 2,
        paddingBottom: 32,
      }}>
        <div className="auth-card fade-up" style={{ padding: '28px 26px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>

          {error && (
            <div style={{
              background: 'rgba(225, 29, 72, 0.08)',
              color: 'var(--text-danger)',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
              border: '1px solid var(--border-danger)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                style={{ padding: '13px 14px', fontSize: '16px' }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                style={{ padding: '13px 14px', fontSize: '16px' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '8px' }}
            >
              {loading ? "Please wait..." : (isSignUp ? "Sign Up" : "Log In")}
            </button>

            {onGuestAccess && (
              <button
                type="button"
                onClick={onGuestAccess}
                className="btn btn-ghost"
                style={{ width: '100%', padding: '13px', fontSize: '15px', marginTop: '4px' }}
              >
                <KeyRound size={15} /> Continue as Guest
              </button>
            )}
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="link-gradient"
              style={{
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
                padding: 0,
                fontSize: '14px',
              }}
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
