'use client';

import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export type AuthError = string | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile whenever session changes
  useEffect(() => {
    if (!session?.user) {
      const timer = setTimeout(() => setProfile(null), 0);
      return () => clearTimeout(timer);
    }

    let isMounted = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (isMounted) setProfile(data ?? null);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  // Sign Up
  const signUp = useCallback(
    async (username: string, password: string): Promise<AuthError> => {
      username = username.trim();

      if (!USERNAME_RE.test(username)) {
        return 'Username must be 3–20 characters: letters, numbers, underscores only.';
      }
      if (!PASSWORD_RE.test(password)) {
        return 'Password must be at least 8 characters and include a letter and a number.';
      }

      // Check if username is already taken (case-insensitive)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      if (existing) return 'Username is already taken.';

      // Use username@moodtris.local as the internal email
      const fakeEmail = `${username.toLowerCase()}@moodtris.local`;

      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: {
          // Skip email confirmation — not applicable without a real email
          emailRedirectTo: undefined,
          data: { username },
        },
      });

      if (error) return error.message;
      if (!data.user) return 'Sign-up failed. Please try again.';

      // Create the profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username });

      if (profileError) return profileError.message;

      return null;
    },
    [],
  );

  // Sign In
  const signIn = useCallback(
    async (username: string, password: string): Promise<AuthError> => {
      username = username.trim();

      if (!username || !password)
        return 'Please enter your username and password.';

      const fakeEmail = `${username.toLowerCase()}@moodtris.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      if (error) return 'Invalid username or password.';

      return null;
    },
    [],
  );

  // Sign Out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Save Score
  const saveScore = useCallback(
    async (score: number, lines: number, level: number): Promise<AuthError> => {
      if (!session?.user || !profile) return 'Not logged in.';

      const { error } = await supabase.from('scores').insert({
        user_id: session.user.id,
        username: profile.username,
        score,
        lines,
        level,
      });

      return error ? error.message : null;
    },
    [session, profile],
  );

  return {
    session,
    profile,
    loading,
    isLoggedIn: !!session,
    signUp,
    signIn,
    signOut,
    saveScore,
  };
}
