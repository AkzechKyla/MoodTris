'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/AuthModal';

export function UserHUD({ className }: { className?: string }) {
  const { isLoggedIn, profile, signOut, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) return null;

  return (
    <>
      <div
        className={`flex items-center gap-2 text-[8px] tracking-widest ${className}`}
      >
        {isLoggedIn && profile ? (
          <>
            <span className="text-[#4a7a50]">PLAYER:</span>
            <span className="glow-text">{profile.username.toUpperCase()}</span>
            <button
              onClick={signOut}
              className="text-[#00ff41]/70 hover:text-[#ff3131] transition ml-1 border border-[#00ff41]/50 px-2 py-0.5 hover:border-[#ff3131]"
            >
              SIGN OUT
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="border border-[#00ff41]/50 text-[#00ff41]/70 px-3 py-1 hover:border-[#00ff41] hover:text-[#00ff41] transition"
          >
            SIGN IN / REGISTER
          </button>
        )}
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
