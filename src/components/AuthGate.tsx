// src/components/AuthGate.tsx
//
// Wraps the app. If not signed in, shows a login/signup form using the same
// visual language your existing pages use (AnimatedBackground, Tommy logo,
// MagicalCard, gradient buttons). This is the ONLY auth surface the user sees.

"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

const TOMMY_LOGO =
  "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662026/tommy-logo.png"

type Mode = "signin" | "signup" | "forgot"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useSupabase()

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <BackgroundShell>
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 py-12">
            <div className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-12">
              <div className="animate-spin w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white">Loading StoryLoom…</h2>
            </div>
          </div>
        </BackgroundShell>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return <>{children}</>
}

// A stripped-down background so we don't pull in AnimatedBackground (which
// lives in page.tsx). Visually consistent: same gradient family.
function BackgroundShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function AuthScreen() {
  const { signIn, signUp, resetPassword } = useSupabase()
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErrMsg(null); setNotice(null)
    try {
      if (mode === "signup") {
        if (!displayName.trim()) throw new Error("Please enter a display name")
        if (password.length < 8)  throw new Error("Password must be at least 8 characters")
        await signUp(email.trim(), password, displayName.trim())
        setNotice("Check your email for a confirmation link. Once confirmed, sign in here.")
        setMode("signin")
      } else if (mode === "signin") {
        await signIn(email.trim(), password)
      } else {
        await resetPassword(email.trim())
        setNotice("If that email has an account, a reset link has been sent.")
        setMode("signin")
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <BackgroundShell>
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="flex justify-center mb-8">
          <img
            src={TOMMY_LOGO}
            alt="StoryLoom"
            className="w-full max-w-[320px] h-auto drop-shadow-xl"
            style={{ opacity: 1 }}
          />
        </div>

        <div
          className="relative w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl"
          style={{ boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.2), 0 0 0 1px rgba(255,255,255,0.05)" }}
        >
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-2 drop-shadow">
              {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
            </h1>
            <p className="text-white/70 text-center text-sm mb-6">
              {mode === "signup"
                ? "Your stories, safe in the cloud."
                : mode === "forgot"
                ? "We'll email you a link to reset it."
                : "Sign in to your library."}
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-white font-semibold mb-2 text-sm">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    maxLength={40}
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
                    placeholder="How should we call you?"
                  />
                </div>
              )}

              <div>
                <label className="block text-white font-semibold mb-2 text-sm">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="block text-white font-semibold mb-2 text-sm">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
                    placeholder={mode === "signup" ? "At least 8 characters" : ""}
                  />
                </div>
              )}

              {errMsg && (
                <div className="text-red-200 text-center bg-red-500/20 p-3 rounded-lg text-sm">{errMsg}</div>
              )}
              {notice && (
                <div className="text-green-100 text-center bg-green-500/20 p-3 rounded-lg text-sm">{notice}</div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset email" : "Sign in"}
              </button>
            </form>

            <div className="mt-6 flex justify-between text-sm">
              {mode === "signin" ? (
                <>
                  <button onClick={() => setMode("forgot")} className="text-white/80 hover:text-white underline">
                    Forgot password?
                  </button>
                  <button onClick={() => setMode("signup")} className="text-white/80 hover:text-white underline">
                    Create an account
                  </button>
                </>
              ) : (
                <button onClick={() => setMode("signin")} className="text-white/80 hover:text-white underline">
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </BackgroundShell>
  )
}
