import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'super_admin' | 'admin' | 'teacher' | 'parent' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  schoolId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authRequestIdRef = useRef(0);

  const fetchUserRole = async (userId: string, requestId: number) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', userId)
      .single();

    if (authRequestIdRef.current !== requestId) {
      return;
    }
    
    if (!error && data) {
      setUserRole(data.role as UserRole);
      setSchoolId(data.school_id || null);
    } else {
      setUserRole(null);
      setSchoolId(null);
    }
  };

  useEffect(() => {
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const requestId = authRequestIdRef.current + 1;
        authRequestIdRef.current = requestId;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setLoading(true);

          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(async () => {
            await fetchUserRole(session.user.id, requestId);

            if (authRequestIdRef.current === requestId) {
              setLoading(false);
            }
          }, 0);
        } else {
          setUserRole(null);
          setSchoolId(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialSessionHandled) return;
      initialSessionHandled = true;

      const requestId = authRequestIdRef.current + 1;
      authRequestIdRef.current = requestId;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        await fetchUserRole(session.user.id, requestId);
      }

      if (authRequestIdRef.current === requestId) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error };
  };

  const signOut = async () => {
    authRequestIdRef.current += 1;
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setSchoolId(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, schoolId, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
