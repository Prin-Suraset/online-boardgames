import { CircleAlert, X } from "lucide-react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className="fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-amber-300/40 bg-slate-950 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-slate-950/30"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
      <span className="leading-5">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
