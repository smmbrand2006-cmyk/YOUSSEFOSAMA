"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

export interface BackHandlerItem {
  id: string;
  onBack: () => void;
  priority: number;
}

interface BackContextType {
  registerHandler: (id: string, onBack: () => void, priority?: number) => () => void;
  showExitModal: boolean;
  setShowExitModal: (show: boolean) => void;
  handleConfirmExit: () => void;
  handleCancelExit: () => void;
}

const BackContext = createContext<BackContextType | null>(null);

export function useBackContext() {
  const ctx = useContext(BackContext);
  if (!ctx) {
    throw new Error("useBackContext must be used within BackHandlerProvider");
  }
  return ctx;
}

/**
 * Hook to register a back action for any modal, sheet, or view.
 * When open, pressing Android physical back or back-swipe will invoke onBack().
 * If closed via UI (e.g. 'X' button), it cleanly pops the history state.
 */
export function useBackHandler(
  isOpen: boolean,
  onBack: () => void,
  id: string,
  priority = 10
) {
  const { registerHandler } = useBackContext();
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isOpen) return;
    return registerHandler(id, () => onBackRef.current(), priority);
  }, [isOpen, id, priority, registerHandler]);
}

export function BackHandlerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const handlersRef = useRef<BackHandlerItem[]>([]);
  const isPoppingHistoryRef = useRef<boolean>(false);
  const ignoreNextPopRef = useRef<boolean>(false);
  const allowExitRef = useRef<boolean>(false);

  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const showExitModalRef = useRef<boolean>(false);

  useEffect(() => {
    showExitModalRef.current = showExitModal;
  }, [showExitModal]);

  // Register a handler to the stack and push a history state
  const registerHandler = useCallback(
    (id: string, onBack: () => void, priority = 10) => {
      // Remove any existing handler with the same id
      handlersRef.current = handlersRef.current.filter((h) => h.id !== id);

      const item: BackHandlerItem = { id, onBack, priority };
      handlersRef.current.push(item);

      // Push history state to capture back button / swipe
      if (typeof window !== "undefined") {
        window.history.pushState({ _appBackId: id, _ts: Date.now() }, "");
      }

      return () => {
        // Remove from stack
        handlersRef.current = handlersRef.current.filter((h) => h.id !== id);

        // If closed via UI (not via back button pop), pop the history entry to keep sync
        if (!isPoppingHistoryRef.current && typeof window !== "undefined") {
          if (window.history.state?._appBackId === id) {
            ignoreNextPopRef.current = true;
            window.history.back();
          }
        }
      };
    },
    []
  );

  const handleConfirmExit = useCallback(() => {
    setShowExitModal(false);
    allowExitRef.current = true;

    if (typeof window !== "undefined") {
      try {
        window.close();
      } catch {}

      // In regular browser tab, try navigating back past the guard
      try {
        window.history.go(-2);
      } catch {}

      // Fallback
      setTimeout(() => {
        try {
          window.location.href = "about:blank";
        } catch {}
      }, 150);
    }
  }, []);

  const handleCancelExit = useCallback(() => {
    setShowExitModal(false);
  }, []);

  // Global popstate listener to catch mobile back gestures & hardware buttons
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set up initial history guard on app boot
    const initState = window.history.state;
    if (!initState || !initState._appInit) {
      window.history.replaceState({ _appInit: true, page: "exit_guard" }, "");
      window.history.pushState({ _appInit: true, page: "home" }, "");
    }

    const handlePopState = () => {
      if (allowExitRef.current) return;

      // If this pop was triggered programmatically by closing a modal via UI, ignore
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      // If exit modal is already open and back is pressed again -> user confirmed exit
      if (showExitModalRef.current) {
        handleConfirmExit();
        return;
      }

      // 1. Check if there are active registered handlers (modals, chats, lightboxes)
      if (handlersRef.current.length > 0) {
        // Sort by priority descending (highest priority closes first)
        handlersRef.current.sort((a, b) => b.priority - a.priority);
        const top = handlersRef.current.pop();

        if (top) {
          isPoppingHistoryRef.current = true;
          try {
            top.onBack();
          } finally {
            setTimeout(() => {
              isPoppingHistoryRef.current = false;
            }, 60);
          }
          return;
        }
      }

      // 2. No active handlers on the stack: check current route
      const pathname = window.location.pathname;
      const isHome =
        pathname === "/chat" ||
        pathname === "/" ||
        pathname === "" ||
        pathname.startsWith("/chat/");

      if (!isHome) {
        // User is on a subroute like /status, /calls, /profile: return to /chat
        router.push("/chat");
        return;
      }

      // 3. User is on Home with nothing open -> re-arm home state & show Exit Confirmation Dialog
      window.history.pushState({ _appInit: true, page: "home" }, "");
      setShowExitModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router, handleConfirmExit]);

  return (
    <BackContext.Provider
      value={{
        registerHandler,
        showExitModal,
        setShowExitModal,
        handleConfirmExit,
        handleCancelExit,
      }}
    >
      {children}
    </BackContext.Provider>
  );
}
