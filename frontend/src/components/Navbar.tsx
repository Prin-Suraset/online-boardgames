import { useMemo, useState } from "react";
import { ChevronDown, Dices, LogOut, Pencil, ShieldCheck, UserPlus } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, isGuest, isLoading, logout, openAuthModal } = useAuth();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const initials = useMemo(
    () => user?.display_name.trim().slice(0, 2).toUpperCase() || "?",
    [user?.display_name],
  );

  return (
    <nav className="relative z-50 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-3 text-white">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
            <Dices className="size-5" />
          </span>
          <span className="font-display text-sm font-black tracking-tight sm:text-base">ONLINE BOARD GAMES</span>
        </a>

        {isLoading ? (
          <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-800" />
        ) : user === null ? (
          <button type="button" onClick={() => { openAuthModal("login"); }} className="secondary-button min-h-9 px-4 py-1.5 text-sm">Sign in</button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => { setMenuOpen((open) => !open); }}
              aria-expanded={isMenuOpen}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-1.5 pr-3 text-left transition hover:border-slate-700"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white">{initials}</span>
              <span className="hidden sm:block">
                <span className="block max-w-36 truncate text-sm font-bold text-slate-100">{user.display_name}</span>
                <span className={isGuest ? "text-[10px] font-bold tracking-wider text-amber-400 uppercase" : "text-[10px] font-bold tracking-wider text-emerald-400 uppercase"}>{user.is_admin ? "Admin" : isGuest ? "Guest" : "Member"}</span>
              </span>
              <ChevronDown className="size-4 text-slate-500" />
            </button>

            {isMenuOpen && (
              <div className="absolute top-[calc(100%+0.6rem)] right-0 w-64 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
                {isGuest ? (
                  <>
                    <button type="button" onClick={() => { setMenuOpen(false); openAuthModal("register"); }} className="menu-action text-indigo-200">
                      <UserPlus className="size-4" /> Save / register account
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); openAuthModal("guest"); }} className="menu-action">
                      <Pencil className="size-4" /> Change name
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-1 px-2 py-3 text-center">
                      <div><strong className="block text-sm text-emerald-300">{user.wins}</strong><span className="text-[9px] text-slate-500 uppercase">Wins</span></div>
                      <div><strong className="block text-sm text-rose-300">{user.losses}</strong><span className="text-[9px] text-slate-500 uppercase">Losses</span></div>
                      <div><strong className="block text-sm text-slate-300">{user.draws}</strong><span className="text-[9px] text-slate-500 uppercase">Draws</span></div>
                    </div>
                    <div className="my-1 border-t border-slate-800" />
                    <button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="menu-action text-rose-300">
                      <LogOut className="size-4" /> Log out
                    </button>
                  </>
                )}
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-slate-950/70 px-3 py-2 text-[10px] text-slate-500">
                  <ShieldCheck className="size-3.5 text-emerald-400" /> Secure session active
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
