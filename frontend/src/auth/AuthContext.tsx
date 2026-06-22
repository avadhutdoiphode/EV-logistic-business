import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY } from "@/src/api/client";

type User = {
  id: string;
  phone: string;
  role: "customer" | "driver" | "admin";
  name: string;
  vehicle_id?: string;
  vehicle_number?: string;
  is_online?: boolean;
  rating?: number;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await storage.secureGet(TOKEN_KEY, "");
    if (!t) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    setToken(t as string);
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      await storage.secureRemove(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = async (t: string, u: User) => {
    await storage.secureSet(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  };

  const signOut = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
    setToken(null);
  };

  return (
    <Ctx.Provider value={{ user, token, loading, signIn, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
