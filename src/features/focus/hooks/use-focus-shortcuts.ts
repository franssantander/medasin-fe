"use client";

import { useEffect, useRef } from "react";

const interactiveSelector = [
  "input", "textarea", "select", "button", "a[href]", "[contenteditable]:not([contenteditable='false'])",
  "[role='button']", "[role='combobox']", "[role='listbox']", "[role='menu']", "[role='menuitem']",
  "[role='option']", "[role='tab']", "[role='switch']", "[role='slider']",
].join(", ");

function hasOpenModal() {
  return Array.from(document.querySelectorAll('[aria-modal="true"], [role="dialog"], [role="alertdialog"]'))
    .some((popup) => !popup.closest('[data-closed], [data-ending-style], [hidden], [aria-hidden="true"]'));
}

// Space toggles the timer, like most Pomodoro apps. It stays out of the way of
// focused controls (where Space already means "press") and open dialogs.
export function useFocusShortcuts(onToggle: (() => void) | null) {
  const toggleRef = useRef(onToggle);
  useEffect(() => { toggleRef.current = onToggle; }, [onToggle]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest(interactiveSelector)) return;
      if (!toggleRef.current || hasOpenModal()) return;
      event.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
