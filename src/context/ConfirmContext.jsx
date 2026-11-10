import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

const ConfirmContext = createContext(null);

const variants = {
  danger: {
    iconWrap: "bg-red-100 text-red-600",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    iconWrap: "bg-amber-100 text-amber-700",
    confirmBtn: "bg-amber-700 hover:bg-amber-800 text-white",
  },
  default: {
    iconWrap: "bg-slate-100 text-slate-600",
    confirmBtn: "bg-navy hover:bg-navy-light text-white",
  },
};

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options || {};
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        title: opts.title || "Confirm",
        message: opts.message || "Are you sure?",
        confirmLabel: opts.confirmLabel || "Continue",
        cancelLabel: opts.cancelLabel || "Cancel",
        variant: opts.variant || "warning",
      });
    });
  }, []);

  const close = (result) => {
    setDialog(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  const style = variants[dialog?.variant] || variants.default;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-scale-up"
          >
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconWrap}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
                    {dialog.title}
                  </h3>
                  <p id="confirm-dialog-message" className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {dialog.message}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  {dialog.cancelLabel}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${style.confirmBtn}`}
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
