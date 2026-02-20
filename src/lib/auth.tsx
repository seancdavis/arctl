import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  netlifyUserId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

type AuthStatus = "loading" | "unauthenticated" | "allowed" | "not_allowed";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (res) => {
        if (!res.ok) {
          setStatus("unauthenticated");
          return;
        }
        const data = await res.json();
        if (!data.user) {
          setStatus("unauthenticated");
          return;
        }
        setUser(data.user);
        setStatus(data.isAllowed ? "allowed" : "not_allowed");
      })
      .catch(() => {
        setStatus("unauthenticated");
      });
  }, []);

  const logout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <AuthContext.Provider value={{ user, status, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
