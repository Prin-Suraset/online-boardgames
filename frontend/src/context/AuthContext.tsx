import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AuthResponse, AuthUser } from "../types";

const AUTH_TOKEN_KEY = "auth_token";

export type AuthMode = "guest" | "login" | "register";

interface RegisterInput {
  username: string;
  password: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authMode: AuthMode;
  continueAsGuest: (displayName: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  openAuthModal: (mode: AuthMode) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.display_name === "string" &&
    typeof value.is_guest === "boolean" &&
    typeof value.is_admin === "boolean" &&
    typeof value.wins === "number" &&
    typeof value.losses === "number" &&
    typeof value.draws === "number"
  );
}

function isAuthResponse(value: unknown): value is AuthResponse {
  return (
    isRecord(value) &&
    typeof value.token === "string" &&
    isAuthUser(value.user)
  );
}

function responseError(response: Response, body: unknown): string {
  if (isRecord(body) && isRecord(body.detail) && typeof body.detail.message === "string") {
    return body.detail.message;
  }
  return response.status === 401
    ? "Your username or password was not accepted."
    : "Authentication is temporarily unavailable.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [token, setToken] = useState<string | null>(initialToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(initialToken !== null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(
    initialToken === null,
  );
  const [authMode, setAuthMode] = useState<AuthMode>("guest");

  useEffect(() => {
    const storedToken = initialToken;
    if (storedToken === null) {
      return;
    }
    let isCancelled = false;

    const restoreSession = async (): Promise<void> => {
      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const body: unknown = await response.json();
        if (!response.ok || !isAuthUser(body)) {
          throw new Error("Stored session is no longer valid.");
        }
        if (!isCancelled) {
          setUser(body);
          setIsLoading(false);
          setAuthModalOpen(false);
        }
      } catch {
        if (!isCancelled) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
          setIsLoading(false);
          setAuthModalOpen(true);
        }
      }
    };

    void restoreSession();
    return () => {
      isCancelled = true;
    };
  }, [initialToken]);

  const authenticate = async (endpoint: string, payload: object): Promise<void> => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !isAuthResponse(body)) {
      throw new Error(responseError(response, body));
    }
    localStorage.setItem(AUTH_TOKEN_KEY, body.token);
    setToken(body.token);
    setUser(body.user);
    setIsLoading(false);
    setAuthModalOpen(false);
  };

  const logout = (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthMode("guest");
    setAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: user !== null && token !== null,
        isGuest: user?.is_guest ?? false,
        isLoading,
        isAuthModalOpen,
        authMode,
        continueAsGuest: async (displayName) =>
          authenticate("/api/auth/guest", { display_name: displayName }),
        login: async (username, password) =>
          authenticate("/api/auth/login", { username, password }),
        register: async ({ username, password, displayName }) =>
          authenticate("/api/auth/register", {
            username,
            password,
            display_name: displayName,
          }),
        logout,
        openAuthModal: (mode) => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        },
        closeAuthModal: () => {
          if (user !== null) {
            setAuthModalOpen(false);
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Context hooks intentionally share this module with their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
