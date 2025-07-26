import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  principal_id?: string;
  wallet_balance: number;
  total_donated: number;
  total_received: number;
  is_creator: boolean;
  created_at: string;
  updated_at: string;
}

interface ICPWallet {
  principalId: string;
  accountId: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<ICPWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            setProfile(profileData);
          }, 0);
        } else {
          setProfile(null);
          setWallet(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const connectWallet = async () => {
    setConnecting(true);
    
    try {
      // Create ICP AuthClient
      const authClient = await AuthClient.create();
      
      // Login with Internet Identity
      await new Promise<void>((resolve, reject) => {
        authClient.login({
          identityProvider: "https://identity.ic0.app",
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        });
      });
      
      // Get the identity from auth client
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      const principalId = principal.toString();
      
      // Generate account ID from principal
      const accountId = Principal.fromText(principalId).toText();
      
      // Check if user exists with this principal
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('principal_id', principalId)
        .maybeSingle();

      if (existingProfile) {
        // Existing user - sign them in anonymously to Supabase
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              principal_id: principalId,
              account_id: accountId
            }
          }
        });

        if (!error && data.user) {
          setWallet({ principalId, accountId });
          return { success: true, isNewUser: false, shouldRedirect: true };
        }
      } else {
        // New user - create anonymous session and profile
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              principal_id: principalId,
              account_id: accountId
            }
          }
        });

        if (!error && data.user) {
          setWallet({ principalId, accountId });
          return { success: true, isNewUser: true, principalId, accountId, userId: data.user.id };
        }
      }

      throw new Error('Failed to connect wallet');
    } catch (error) {
      console.error('Wallet connection error:', error);
      return { error };
    } finally {
      setConnecting(false);
    }
  };

  const createProfile = async (name: string, email: string, isCreator: boolean = false) => {
    if (!user || !wallet) {
      return { error: new Error('No wallet connected') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        name,
        email,
        is_creator: isCreator,
        principal_id: wallet.principalId,
        wallet_balance: 100 // Starting balance
      })
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  const disconnectWallet = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setWallet(null);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: new Error('No profile found') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  return {
    user,
    session,
    profile,
    wallet,
    loading,
    connecting,
    connectWallet,
    createProfile,
    disconnectWallet,
    updateProfile,
    isAuthenticated: !!user && !!profile,
    isWalletConnected: !!wallet
  };
};

// Generate a mock ICP Principal ID (replace with real ICP SDK)
const generatePrincipalId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let result = '';
  for (let i = 0; i < 27; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate a mock Account ID (replace with real ICP SDK)
const generateAccountId = (): string => {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};