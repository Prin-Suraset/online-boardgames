import { useEffect, useState, type SyntheticEvent } from "react";
import { Dices, LoaderCircle, LockKeyhole, Sparkles, UserPlus, X } from "lucide-react";

import { useAuth, type AuthMode } from "../context/AuthContext";
import { cn } from "../lib/styles";

const tabs: readonly { mode: AuthMode; label: string }[] = [
  { mode: "guest", label: "Quick play" },
  { mode: "login", label: "Login" },
  { mode: "register", label: "Sign up" },
];

export function AuthModal() {
  const {
    user,
    isAuthModalOpen,
    authMode,
    continueAsGuest,
    login,
    register,
    openAuthModal,
    closeAuthModal,
  } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) {
    return null;
  }

  const switchMode = (mode: AuthMode): void => {
    setError(null);
    openAuthModal(mode);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (authMode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (authMode === "guest") {
        await continueAsGuest(displayName);
      } else if (authMode === "login") {
        await login(username, password);
      } else {
        await register({ username, password, displayName });
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900 shadow-2xl shadow-black/40"
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent" />
        {user !== null && (
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close authentication"
            className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
              <Dices className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-indigo-300 uppercase">Welcome to the lounge</p>
              <h2 id="auth-title" className="mt-0.5 text-2xl font-black text-white">Choose how you play</h2>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 rounded-xl bg-slate-950/70 p-1" role="tablist" aria-label="Authentication options">
            {tabs.map((tab) => (
              <button
                key={tab.mode}
                type="button"
                role="tab"
                aria-selected={authMode === tab.mode}
                onClick={() => { switchMode(tab.mode); }}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-xs font-bold transition sm:text-sm",
                  authMode === tab.mode
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-500 hover:text-slate-200",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={(event) => { void submit(event); }} className="mt-6 space-y-4">
            {authMode === "guest" ? (
              <>
                <div className="rounded-2xl border border-indigo-400/15 bg-indigo-500/5 p-4 text-sm leading-6 text-slate-300">
                  <Sparkles className="mr-2 inline size-4 text-indigo-300" />
                  Jump in instantly. Guest progress stays on this device until you create an account.
                </div>
                <label className="form-label">
                  Display name <span className="font-normal text-slate-500">(optional)</span>
                  <input
                    autoFocus
                    value={displayName}
                    maxLength={24}
                    onChange={(event) => { setDisplayName(event.target.value); }}
                    placeholder="A random guest name works too"
                    className="text-input mt-2 w-full"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="form-label">
                  Username
                  <input
                    autoFocus
                    required
                    minLength={3}
                    maxLength={32}
                    autoComplete="username"
                    value={username}
                    onChange={(event) => { setUsername(event.target.value); }}
                    className="text-input mt-2 w-full"
                  />
                </label>
                {authMode === "register" && (
                  <label className="form-label">
                    Display name <span className="font-normal text-slate-500">(optional)</span>
                    <input
                      maxLength={24}
                      value={displayName}
                      onChange={(event) => { setDisplayName(event.target.value); }}
                      placeholder="Defaults to your username"
                      className="text-input mt-2 w-full"
                    />
                  </label>
                )}
                <label className="form-label">
                  Password
                  <input
                    required
                    minLength={8}
                    maxLength={128}
                    type="password"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); }}
                    className="text-input mt-2 w-full"
                  />
                </label>
                {authMode === "register" && (
                  <label className="form-label">
                    Confirm password
                    <input
                      required
                      minLength={8}
                      maxLength={128}
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => { setConfirmPassword(event.target.value); }}
                      className="text-input mt-2 w-full"
                    />
                  </label>
                )}
              </>
            )}

            {error !== null && (
              <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">{error}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="primary-button w-full py-3.5">
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : authMode === "register" ? (
                <UserPlus className="size-4" />
              ) : (
                <LockKeyhole className="size-4" />
              )}
              {authMode === "guest"
                ? "Enter lounge"
                : authMode === "login"
                  ? "Login to lounge"
                  : "Create profile"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
