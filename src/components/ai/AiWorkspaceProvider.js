"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { PERMISSIONS } from "@/config/permissions";
import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import { usePathname } from "@/i18n/navigation";
import { aiAccessCacheScope } from "@/lib/features/ai/aiApi.utils";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import StudioAssistantConversation from "./StudioAssistantConversation";
import {
  buildWorkspaceAssistantContext,
  getWorkspaceAssistantContextScope,
} from "./workspace-assistant-context";
import SetupAssistantFallback from "@/components/setup-center/SetupAssistantFallback";

const AiWorkspaceContext = createContext({
  assistantOpen: false,
  available: false,
  openAssistant() {},
  openSetupAssistant() {},
  closeAssistant() {},
});

export const useAiWorkspace = () => useContext(AiWorkspaceContext);

export default function AiWorkspaceProvider({ children }) {
  const t = useTranslations("AI");
  const setupT = useTranslations("SetupCenter");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const locationId = useSelector(selectActiveStudioId);
  const workspaceScope = `${aiAccessCacheScope({
    tenant,
    access: workspaceAccess,
  })}|active-location:${locationId || "all"}`;
  const pageAssistantContext = buildWorkspaceAssistantContext({
    pathname,
    searchParams,
  });
  const surfaceScope = `${workspaceScope}|assistant-context:${getWorkspaceAssistantContextScope(pageAssistantContext)}`;
  const [open, setOpen] = useState(false);
  const [assistantRequest, setAssistantRequest] = useState(null);
  const assistantRequestId = useRef(0);
  const activeSurfaceScopeRef = useRef(surfaceScope);
  const access = useAiAccess({
    permission: PERMISSIONS.AI_USE,
    feature: "assistant",
  });
  const closeAssistant = useCallback(() => {
    setOpen(false);
    setAssistantRequest(null);
  }, []);

  useEffect(() => {
    if (activeSurfaceScopeRef.current === surfaceScope) return;
    activeSurfaceScopeRef.current = surfaceScope;
    closeAssistant();
  }, [closeAssistant, surfaceScope]);

  const setupFallbackOpen = assistantRequest?.mode === "setup-fallback";
  const dialogAvailable = access.available || setupFallbackOpen;
  const value = useMemo(
    () => ({
      assistantOpen: open && dialogAvailable,
      available: access.available,
      capabilities: access.capabilities,
      openAssistant: (request = null) => {
        if (!access.available) return;
        setAssistantRequest(
          request
            ? {
                ...request,
                mode: "ai",
                requestId: ++assistantRequestId.current,
              }
            : { mode: "ai", requestId: ++assistantRequestId.current },
        );
        setOpen(true);
      },
      openSetupAssistant: (request = null) => {
        setAssistantRequest({
          ...(request ?? {}),
          mode: access.available ? "ai" : "setup-fallback",
          requestId: ++assistantRequestId.current,
        });
        setOpen(true);
      },
      closeAssistant,
    }),
    [
      access.available,
      access.capabilities,
      closeAssistant,
      dialogAvailable,
      open,
    ],
  );

  return (
    <AiWorkspaceContext.Provider value={value}>
      {children}
      <Dialog
        open={open && dialogAvailable}
        onClose={closeAssistant}
        className="relative z-[90]"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-ink/25 backdrop-blur-[2px] transition duration-300 data-closed:opacity-0"
        />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <DialogPanel
              data-dialog-layout="drawer"
              data-ai-assistant-drawer
              transition
              className="flex h-full w-full max-w-[440px] transform flex-col border-l border-line/80 bg-canvas shadow-[-12px_0_40px_rgb(31_31_31/0.08)] transition duration-300 ease-out data-closed:translate-x-full"
            >
              <header className="flex min-h-[72px] items-center gap-3 border-b border-line/80 bg-white px-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
                  <SparklesIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-sm font-semibold text-ink">
                    {setupFallbackOpen
                      ? setupT("assistant.fallbackTitle")
                      : t("assistant.title")}
                  </DialogTitle>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {setupFallbackOpen
                      ? setupT("assistant.fallbackSubtitle")
                      : t("assistant.subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAssistant}
                  aria-label={t("assistant.close")}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </header>
              {setupFallbackOpen ? (
                <SetupAssistantFallback
                  key={assistantRequest?.requestId}
                  stepId={assistantRequest?.context?.setupStepId}
                  starterPrompt={assistantRequest?.starterPrompt}
                />
              ) : (
                <StudioAssistantConversation
                  key={assistantRequest?.requestId ?? "general"}
                  compact
                  assistantContext={
                    assistantRequest?.context ?? pageAssistantContext
                  }
                  starterPrompt={assistantRequest?.starterPrompt}
                />
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </AiWorkspaceContext.Provider>
  );
}
