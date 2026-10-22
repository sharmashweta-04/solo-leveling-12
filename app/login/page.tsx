'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import systemMessages from '@/config/system_messages.json';
import { playSystemChime } from '@/src/utils/audio';

export default function LoginPage() {
  const router = useRouter();
  const { user, isGuest, isLoading, login, signUp, resetPassword, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated or in guest mode, redirect to dashboard
  useEffect(() => {
    if (!isLoading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, isGuest, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);
    playSystemChime();

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          router.replace('/');
        }
      } else if (mode === 'signup') {
        const res = await signUp(email, password);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.message) {
          setSuccessMessage(res.message);
        } else {
          router.replace('/');
        }
      } else if (mode === 'forgot') {
        const res = await resetPassword(email);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.message) {
          setSuccessMessage(res.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = () => {
    playSystemChime();
    continueAsGuest();
    router.replace('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--sys-bg)]">
        <div className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">
          [ SYSTEM ] INITIALIZING HUNTER PORTAL...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--sys-bg)]">
      <div className="w-full max-w-md bg-[var(--sys-bg-panel)] border border-[var(--sys-border)] rounded-lg shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded text-cyan-400 font-mono text-xs tracking-widest font-bold uppercase mb-2">
            SOLO LEVELING • CLASS 12 PCB
          </div>
          <h1 className="text-lg font-bold font-mono text-white tracking-wide">
            {mode === 'signup'
              ? systemMessages.auth.signup_header
              : mode === 'forgot'
              ? '[ SYSTEM ] Password Recovery'
              : systemMessages.auth.login_header}
          </h1>
        </div>

        {/* Auth Mode Tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-md bg-slate-900/80 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[44px] py-2 text-xs font-mono font-bold uppercase rounded transition-colors ${
                mode === 'login'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[44px] py-2 text-xs font-mono font-bold uppercase rounded transition-colors ${
                mode === 'signup'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded text-red-300 text-xs font-mono">
            [ ERROR ] {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded text-emerald-300 text-xs font-mono">
            {successMessage}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Player Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hunter@monarch.com"
              className="w-full min-h-[44px] px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-mono text-slate-300 uppercase">
                  Security Passkey
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
                >
                  Forgot passkey?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full min-h-[44px] px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] mt-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            {submitting
              ? '[ AUTHENTICATING... ]'
              : mode === 'signup'
              ? 'Awaken New Account'
              : mode === 'forgot'
              ? 'Send Reset Link'
              : 'Enter System'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full min-h-[44px] text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              Back to Log In
            </button>
          )}
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-mono">
            <span className="bg-[var(--sys-bg-panel)] px-2 text-slate-500">OR</span>
          </div>
        </div>

        {/* Continue as Guest */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="w-full min-h-[44px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors border border-slate-700"
          >
            Continue as Guest
          </button>
          <p className="mt-3 text-xs text-amber-400/90 font-mono text-left leading-relaxed">
            {systemMessages.auth.guest_warning}
          </p>
        </div>
      </div>
    </div>
  );
}
