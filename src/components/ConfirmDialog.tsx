"use client";

import { AlertTriangle, Trash2, Send } from "lucide-react";
import { useEffect, useId, useRef, type RefObject } from "react";

export function ConfirmDialog({
  busy = false,
  variant = "danger",
  confirmLabel,
  description,
  detail,
  error,
  returnFocusRef,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  busy?: boolean;
  variant?: "danger" | "primary";
  confirmLabel: string;
  description: string;
  detail?: string;
  error?: string | null;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCancelRef.current = onCancel;
    busyRef.current = busy;
  }, [busy, onCancel]);

  useEffect(() => {
    if (!open || dialogRef.current?.contains(document.activeElement)) return;
    if (busy) dialogRef.current?.focus();
    else cancelButtonRef.current?.focus();
  }, [open, busy]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = returnFocusRef?.current ?? document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current?.contains(document.activeElement) || document.activeElement === dialogRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className={`confirm-dialog-icon ${variant}`}>
          {variant === "danger" ? <AlertTriangle size={20} /> : <Send size={20} />}
        </div>
        <div className="confirm-dialog-copy">
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
          {detail && <div className="confirm-dialog-detail">{detail}</div>}
          {error && <p role="alert">{error}</p>}
        </div>
        <div className="confirm-dialog-actions">
          <button
            className="button button-ghost"
            disabled={busy}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`button button-${variant}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {variant === "danger" ? <Trash2 size={15} /> : <Send size={15} />}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
