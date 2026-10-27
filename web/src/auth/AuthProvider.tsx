import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../lib/api";

type AuthContextValue = {
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    let active = true;
    authApi.restore().then((restored) => {
      if (active) setStatus(restored ? "authenticated" : "anonymous");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const expire = () => setStatus("anonymous");
    window.addEventListener("finpa:auth-expired", expire);
    return () => window.removeEventListener("finpa:auth-expired", expire);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      login: async (email, password) => {
        await authApi.login(email, password);
        setStatus("authenticated");
      },
      logout: async () => {
        await authApi.logout();
        setStatus("anonymous");
      },
    }),
    [status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
