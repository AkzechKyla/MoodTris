'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'signin' | 'register';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);

  // Focus username on open
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    const err =
      mode === 'signin'
        ? await signIn(username, password)
        : await signUp(username, password);

    setSubmitting(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(onClose, 800);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setUsername('');
    setPassword('');
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal */}
      <div
        className="relative w-80 pixel-panel border-2 p-6 glow-border-bright"
        style={{
          boxShadow:
            '0 0 40px rgba(0,255,65,0.2), 0 0 80px rgba(0,255,65,0.05)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-[#4a7a50] hover:text-[#00ff41] text-xs transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="glow-text text-sm tracking-widest mb-1">
            {mode === 'signin' ? 'SIGN IN' : 'REGISTER'}
          </div>
          <div className="text-[7px] text-[#4a7a50] tracking-widest">
            {mode === 'signin' ? 'WELCOME BACK, PLAYER' : 'CREATE YOUR ACCOUNT'}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 border border-[#1a4d1e]">
          {(['signin', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-[8px] tracking-widest transition ${
                mode === m
                  ? 'bg-[#00ff41] text-[#020b04] font-bold'
                  : 'text-[#4a7a50] hover:text-[#00ff41]'
              }`}
            >
              {m === 'signin' ? 'SIGN IN' : 'REGISTER'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[7px] text-[#4a7a50] tracking-widest mb-1 uppercase">
              Username
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
              maxLength={20}
              spellCheck={false}
              disabled={submitting || success}
              className="w-full bg-[#0a1a0c] border border-[#1a4d1e] text-[#00ff41] text-[10px] px-3 py-2 tracking-widest outline-none focus:border-[#00ff41] transition disabled:opacity-40"
              style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
              placeholder="PLAYER_ONE"
            />
          </div>
          <div>
            <label className="block text-[7px] text-[#4a7a50] tracking-widest mb-1 uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              disabled={submitting || success}
              className="w-full bg-[#0a1a0c] border border-[#1a4d1e] text-[#00ff41] text-[10px] px-3 py-2 tracking-widest outline-none focus:border-[#00ff41] transition disabled:opacity-40"
              style={{ fontFamily: "'VT323', monospace", fontSize: '16px' }}
              placeholder="••••••••"
            />
            {mode === 'register' && (
              <div className="text-[6px] text-[#4a7a50] mt-1 tracking-wide">
                Min 8 chars, include a letter and a number.
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="text-[8px] text-[#ff3131] tracking-wide mb-3 leading-relaxed"
            style={{ textShadow: '0 0 8px #ff3131' }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-[8px] text-[#00ff41] tracking-widest mb-3 glow-text">
            ✓ {mode === 'signin' ? 'AUTHENTICATED' : 'ACCOUNT CREATED'}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || success}
          className="w-full py-3 text-[9px] tracking-widest border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#020b04] transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 0 12px rgba(0,255,65,0.3)' }}
        >
          {submitting
            ? 'PROCESSING...'
            : success
              ? 'OK ✓'
              : mode === 'signin'
                ? 'SIGN IN'
                : 'CREATE ACCOUNT'}
        </button>

        {/* Hint */}
        <div className="text-[6px] text-[#1a4d1e] text-center mt-3 tracking-widest">
          PRESS ENTER TO CONFIRM · ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}
