import { createContext, useContext, useEffect, useState } from "react";
import { api, errText } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      localStorage.removeItem("nusa_token");
      setUser(null);
      return { ok: false, error: errText(e) };
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const persist = (data) => {
    if (data.access_token) localStorage.setItem("nusa_token", data.access_token);
    setUser(data.user);
    return { ok: true, user: data.user };
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      return persist(data);
    } catch (e) {
      return { ok: false, error: errText(e) };
    }
  };

  const signup = async ({ name, email, password, phone }) => {
    try {
      const { data } = await api.post("/auth/signup", { name, email, password, phone });
      return persist(data);
    } catch (e) {
      return { ok: false, error: errText(e) };
    }
  };

  const startGoogleLogin = () => {
    const base = api.defaults.baseURL || "";
    window.location.assign(`${base}/auth/google/start`);
  };

  const logout = () => {
    localStorage.removeItem("nusa_token");
    setUser(null);
    api.post("/auth/logout").catch(() => {});
  };

  return <AuthCtx.Provider value={{ user, loading, login, signup, refresh, startGoogleLogin, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export const homeFor = (role) =>
  role === "admin" ? "/admin" : role === "superadmin" ? "/superadmin" : "/resident";
