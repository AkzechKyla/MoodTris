'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';

interface LeaderboardProps {
  refreshToken: number;
  currentUserId?: string;
}

export function Leaderboard({ refreshToken, currentUserId }: LeaderboardProps) {
  const { scores, loading, error } = useLeaderboard(refreshToken);

  return (
    <div className="pixel-panel glow-border p-3 w-full max-w-[680px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="glow-text text-[9px] tracking-widest">
          ▶ LEADERBOARD
        </div>
        <div className="text-[6px] text-[#1a4d1e] tracking-widest">
          TOP 10 ALL-TIME
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-3 text-[6px] text-[#1a4d1e] tracking-widest uppercase mb-1 px-1">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Score</span>
        <span className="text-right">Lines</span>
        <span className="text-right">Lvl</span>
      </div>

      <div className="border-t border-[#1a4d1e] mb-2" />

      {/* Rows */}
      {loading && (
        <div className="text-[7px] text-[#4a7a50] tracking-widest animate-pulse py-3 text-center">
          LOADING...
        </div>
      )}
      {error && (
        <div className="text-[7px] text-[#ff3131] tracking-widest py-3 text-center">
          ⚠ {error}
        </div>
      )}
      {!loading && !error && scores.length === 0 && (
        <div className="text-[7px] text-[#1a4d1e] tracking-widest py-3 text-center">
          NO SCORES YET — BE THE FIRST!
        </div>
      )}
      {!loading &&
        !error &&
        scores.map((entry, i) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

          return (
            <div
              key={entry.id}
              className={`grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-3 px-1 py-[3px] text-[8px] tracking-wider items-center transition-colors ${
                isCurrentUser
                  ? 'bg-[#00ff41]/10 border border-[#00ff41]/20'
                  : 'border border-transparent'
              }`}
            >
              {/* Rank */}
              <span
                className={
                  i < 3 ? 'text-[#ffd700]' : 'text-[#1a4d1e] vt text-[11px]'
                }
              >
                {medal ?? `${i + 1}`}
              </span>

              {/* Username */}
              <span
                className={
                  isCurrentUser
                    ? 'glow-text text-[9px] truncate'
                    : 'text-[#4a7a50] truncate'
                }
              >
                {entry.username.toUpperCase()}
                {isCurrentUser && (
                  <span className="text-[#00ff41]/50 ml-1 text-[6px]">
                    ◀ YOU
                  </span>
                )}
              </span>

              {/* Score */}
              <span
                className={`vt text-right ${
                  isCurrentUser
                    ? 'text-[#ffd700] text-[14px]'
                    : 'text-[#4a7a50] text-[12px]'
                }`}
                style={isCurrentUser ? { textShadow: '0 0 8px #ffd700' } : {}}
              >
                {entry.score.toLocaleString()}
              </span>

              {/* Lines */}
              <span className="vt text-right text-[#4a7a50] text-[12px]">
                {entry.lines}
              </span>

              {/* Level */}
              <span className="vt text-right text-[#4a7a50] text-[12px]">
                {entry.level}
              </span>
            </div>
          );
        })}
    </div>
  );
}
