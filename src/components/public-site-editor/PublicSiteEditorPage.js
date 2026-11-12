"use client";

import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ClockIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";

import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import { Link } from "@/i18n/navigation";
import { getLocaleDefinition } from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import { notifyPublicSitePublished } from "@/lib/publicTenant/publicationEvents";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  useGetPublicSiteEditorQuery,
  useGetPublicSitePreviewQuery,
  useGetPublicSiteVersionsQuery,
  usePublishPublicSiteMutation,
  useRestorePublicSiteVersionMutation,
  useResetPublicSiteDraftMutation,
  useSavePublicSiteDraftMutation,
  useUploadPublicSiteMediaMutation,
} from "@/lib/features/publicSite/publicSiteApiSlice";
import {
  useGetSetupCenterQuery,
  usePublishStudioMutation,
} from "@/lib/features/setup-center/setupCenterApiSlice";

import {
  BrandingFields,
  CustomerPortalFields,
  FooterFields,
  HeaderFields,
  LoginFields,
  PagesFields,
  PublicSiteEditorLocaleProvider,
  RegisterFields,
} from "./PublicSiteEditorFields";
import PublicSiteLivePreview from "./PublicSiteLivePreview";
import {
  PUBLIC_SITE_EDITOR_TABS,
  applyPublicSiteMediaUpload,
  applyPublicSiteStylePreset,
  arePublicSiteDraftsEqual,
  arePublicSiteEditorStatesEqual,
  buildPublicSiteDraftPatch,
  canPublishPublicSiteDraft,
  getInvalidPublicSiteColorPaths,
  getInvalidPublicSiteLogoRedirectUrl,
  isValidPublicSiteEditorDraft,
  getAvailablePublicSitePreviewPages,
  getPublicSiteEditorError,
  getPublicSiteMediaErrorKey,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
  resolvePublicSiteEditorLocaleCodes,
  validatePublicSiteMediaFile,
} from "./publicSiteEditor.utils";

const PUBLIC_SITE_TABS_ID = "public-site-editor-sections";
const PUBLIC_SITE_EDITOR_PANE_ID = "public-site-editor-pane";
const PUBLIC_SITE_PREVIEW_PANE_ID = "public-site-preview-pane";
const cx = (...classes) => classes.filter(Boolean).join(" ");
const INITIAL_UPLOAD_STATE = Object.freeze({
  busy: false,
  slot: null,
  locationId: null,
  errorSlot: null,
  errorMessage: null,
  failedUpload: null,
  fileName: null,
  fileSize: null,
  resetToken: 0,
});
const MAX_LOCAL_HISTORY = 50;
const EMPTY_LOCAL_HISTORY = Object.freeze({ past: [], future: [] });
const BUILDER_ACTION_COPY = Object.freeze({
  en: Object.freeze({
    publishChanges: "Publish changes",
    publishWebsite: "Publish website",
    publishingWebsite: "Publishing website…",
    launchTitle: "Ready to launch your website?",
    launchDescription:
      "This final step makes the studio website publicly available. Future edits use Publish changes.",
    launchBlocked: (count) =>
      `Complete ${count} required launch ${count === 1 ? "step" : "steps"} first.`,
    launchConfirmTitle: "Publish your website?",
    launchConfirmDescription:
      "Your studio website will become publicly available to anyone. Future edits use Publish changes.",
    launched: "Your website is now live.",
    undo: "Undo",
    redo: "Redo",
    history: "Version history",
    historyTitle: "Published versions",
    historyDescription:
      "Restore a published version into the draft. The live website stays unchanged until you publish changes.",
    historyEmpty: "No published versions yet.",
    historyError: "Version history could not be loaded.",
    retryHistory: "Try again",
    restore: "Restore to draft",
    restored: "The selected version was restored to the draft.",
    restoreBlocked:
      "Save or undo your unsaved edits before restoring a version.",
    restoreConfirm:
      "Restore this version? It will replace your saved unpublished draft. The live website will not change.",
    close: "Close version history",
  }),
  cs: Object.freeze({
    publishChanges: "Publikovat změny",
    publishWebsite: "Publikovat web",
    publishingWebsite: "Publikování webu…",
    launchTitle: "Je web připravený ke spuštění?",
    launchDescription:
      "Tento poslední krok zpřístupní web studia veřejnosti. Další úpravy publikujete tlačítkem Publikovat změny.",
    launchBlocked: (count) =>
      `Nejprve dokončete ${count} povinné ${count === 1 ? "krok" : "kroky"}.`,
    launchConfirmTitle: "Publikovat váš web?",
    launchConfirmDescription:
      "Web studia bude veřejně dostupný komukoliv. Další úpravy publikujete tlačítkem Publikovat změny.",
    launched: "Váš web je nyní zveřejněný.",
    undo: "Zpět",
    redo: "Znovu",
    history: "Historie verzí",
    historyTitle: "Publikované verze",
    historyDescription:
      "Obnovte publikovanou verzi do konceptu. Živý web se nezmění, dokud změny nepublikujete.",
    historyEmpty: "Zatím nebyla publikována žádná verze.",
    historyError: "Historii verzí se nepodařilo načíst.",
    retryHistory: "Zkusit znovu",
    restore: "Obnovit do konceptu",
    restored: "Vybraná verze byla obnovena do konceptu.",
    restoreBlocked: "Před obnovením verze uložte nebo vraťte neuložené úpravy.",
    restoreConfirm:
      "Obnovit tuto verzi? Nahradí uložený nepublikovaný koncept. Živý web se nezmění.",
    close: "Zavřít historii verzí",
  }),
});

function PreviewSelectField({
  children,
  className,
  icon: Icon,
  id,
  label,
  onChange,
  value,
  ...selectProps
}) {
  return (
    <label htmlFor={id} className={cx("group block min-w-0", className)}>
      <span className="mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#777773] transition-colors group-focus-within:text-cobalt-700">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className="relative block">
        <select
          data-select-custom-arrow="true"
          id={id}
          value={value}
          onChange={onChange}
          className="h-12 w-full appearance-none rounded-[14px] border border-line bg-surface-raised bg-none py-0 pl-3.5 pr-10 text-base font-semibold text-[#292925] shadow-[0_4px_14px_rgba(17,17,15,0.04)] outline-none transition hover:border-cobalt-300 focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-100 2xl:text-[11px]"
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777773] transition-colors group-focus-within:text-cobalt-700"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function Notice({ notice, onReload, busy }) {
  const t = useTranslations("PublicSiteEditor");

  if (!notice) return null;

  const error = notice.type === "error";

  return (
    <div
      role={error ? "alert" : "status"}
      className={
        error
          ? "flex items-start gap-3 rounded-[15px] border border-coral-200 bg-coral-50 px-4 py-3 text-[11px] leading-5 text-terracotta-700"
          : "flex items-start gap-3 rounded-[15px] border border-[#CFE0CB] bg-[#F5FAF3] px-4 py-3 text-[11px] leading-5 text-[#47613E]"
      }
    >
      {error ? (
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{notice.message}</span>
      {notice.conflict ? (
        <button
          type="button"
          disabled={busy}
          onClick={onReload}
          className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {t("actions.reload")}
        </button>
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  mode,
  busy,
  onClose,
  onConfirm,
  publishChangesLabel,
  launchCopy,
  notice,
  onReload,
}) {
  const t = useTranslations("PublicSiteEditor.confirm");
  const cancelButtonRef = useRef(null);
  const launching = mode === "launch";

  return (
    <Dialog
      open={Boolean(mode)}
      onClose={busy ? () => {} : onClose}
      initialFocus={cancelButtonRef}
    >
      <div
        data-dialog-backdrop
        className="fixed inset-0 z-[100] bg-[#11110F]/35 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <DialogPanel
          data-dialog-layout="compact"
          className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-[26px] border border-line bg-white p-6 shadow-[0_30px_100px_rgba(17,17,15,0.22)] sm:p-8"
        >
          <DialogTitle className="text-[24px] font-semibold tracking-[-0.04em] text-[#292925]">
            {launching
              ? launchCopy.launchConfirmTitle
              : mode
                ? t(`${mode}.title`)
                : ""}
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-lg text-[13px] leading-6 text-[#686762]">
            {launching
              ? launchCopy.launchConfirmDescription
              : mode
                ? t(`${mode}.description`)
                : ""}
          </DialogDescription>
          {launching && notice ? (
            <div className="mt-4">
              <Notice notice={notice} onReload={onReload} busy={busy} />
            </div>
          ) : null}
          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              ref={cancelButtonRef}
              disabled={busy}
              onClick={onClose}
              className="min-h-11 rounded-full px-5 text-xs font-semibold text-[#686762] hover:bg-[#F4F2ED] disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={
                mode === "reset"
                  ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-skab-coral-700 px-6 text-xs font-semibold text-white disabled:opacity-50"
                  : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white disabled:opacity-50"
              }
            >
              {busy ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
              {launching
                ? busy
                  ? launchCopy.publishingWebsite
                  : launchCopy.publishWebsite
                : mode === "publish"
                  ? publishChangesLabel || t("publish.action")
                  : mode
                    ? t(`${mode}.action`)
                    : ""}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

const formatDate = (value, locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function VersionHistoryPanel({
  busy,
  copy,
  locale,
  onClose,
  onRestore,
  query,
}) {
  const versions = query.data?.versions || [];

  return (
    <section className="rounded-[20px] border border-line bg-white p-5 shadow-[0_14px_38px_rgba(17,17,15,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.03em] text-[#292925]">
            <ClockIcon className="h-5 w-5 text-cobalt-600" />
            {copy.historyTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#777773]">
            {copy.historyDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-full px-4 text-[10px] font-semibold text-[#686762] hover:bg-[#F4F2ED]"
          aria-label={copy.close}
        >
          {copy.close}
        </button>
      </div>

      {query.isLoading ? (
        <div className="mt-5 flex min-h-20 items-center justify-center">
          <ArrowPathIcon className="h-4 w-4 animate-spin text-cobalt-500" />
        </div>
      ) : query.isError ? (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-coral-200 bg-coral-50 p-4 text-[11px] text-terracotta-700"
          role="alert"
        >
          <span>{copy.historyError}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => query.refetch()}
            className="min-h-10 rounded-full border border-coral-200 bg-white px-4 text-[10px] font-semibold disabled:opacity-40"
          >
            {copy.retryHistory}
          </button>
        </div>
      ) : versions.length ? (
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {versions.map((version) => (
            <li
              key={version.id}
              className="rounded-[15px] border border-line bg-surface-muted p-4"
            >
              <p className="text-xs font-semibold text-[#292925]">
                {formatDate(version.publishedAt, locale)}
              </p>
              <p className="mt-1 text-[10px] text-[#858580]">
                Revision {version.sourceDraftRevision}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRestore(version.id)}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-cobalt-200 bg-white px-4 text-[10px] font-semibold text-cobalt-700 hover:bg-cobalt-50 disabled:opacity-40"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                {copy.restore}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-[15px] border border-dashed border-line p-5 text-[11px] text-[#777773]">
          {copy.historyEmpty}
        </p>
      )}
    </section>
  );
}

function WebsiteLaunchPanel({
  blockers,
  busy,
  canPublish,
  copy,
  draftValid,
  onPublish,
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-cobalt-200 bg-cobalt-50 p-5 shadow-[0_16px_44px_rgba(31,54,212,0.08)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-[#292925]">
            {copy.launchTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#686762]">
            {copy.launchDescription}
          </p>
          {blockers > 0 ? (
            <p className="mt-2 text-[10px] font-semibold text-terracotta-700">
              {copy.launchBlocked(blockers)}
            </p>
          ) : null}
        </div>
        {canPublish ? (
          <button
            type="button"
            disabled={busy || blockers > 0 || !draftValid}
            onClick={onPublish}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600 disabled:opacity-40"
          >
            {busy ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CloudArrowUpIcon className="h-4 w-4" />
            )}
            {busy ? copy.publishingWebsite : copy.publishWebsite}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default function PublicSiteEditorPage({ showPageHeader = true }) {
  const t = useTranslations("PublicSiteEditor");
  const setupT = useTranslations("SetupCenter");
  const guidedSetup = useGuidedSetupStep("public_site");
  const locale = useLocale();
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canPublish = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_PUBLISH,
  );
  const query = useGetPublicSiteEditorQuery();
  const previewQuery = useGetPublicSitePreviewQuery();
  const versionsQuery = useGetPublicSiteVersionsQuery();
  const setupQuery = useGetSetupCenterQuery();
  const [saveDraft, saveState] = useSavePublicSiteDraftMutation();
  const [publish, publishState] = usePublishPublicSiteMutation();
  const [publishStudio, publishStudioState] = usePublishStudioMutation();
  const [restoreVersion, restoreVersionState] =
    useRestorePublicSiteVersionMutation();
  const [resetDraft, resetState] = useResetPublicSiteDraftMutation();
  const [uploadMedia] = useUploadPublicSiteMediaMutation();

  const [draftOverride, setDraft] = useState(null);
  const [baseDraftOverride, setBaseDraft] = useState(null);
  const [revisionOverride, setRevision] = useState(null);
  const [editorOverride, setEditor] = useState(null);
  const [activeTab, setActiveTab] = useState("branding");
  const [previewPage, setPreviewPage] = useState("home");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [previewLocale, setPreviewLocale] = useState(locale);
  const [courseLocationId, setCourseLocationId] = useState("");
  const [workspaceView, setWorkspaceView] = useState("editor");
  const [localHistory, setLocalHistory] = useState(EMPTY_LOCAL_HISTORY);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmMode, setConfirmMode] = useState(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [reloadBusy, setReloadBusy] = useState(false);
  const [uploadState, setUploadState] = useState(INITIAL_UPLOAD_STATE);
  const uploadLockRef = useRef(false);
  const mutationLockRef = useRef(false);
  const workspaceScrollPositionsRef = useRef({
    editor: null,
    preview: null,
  });
  const pendingWorkspaceScrollRef = useRef(null);

  const tenantName =
    currentTenant?.name || query.data?.tenant?.name || t("studioFallback");
  const tenantSlug =
    currentTenant?.slug || query.data?.tenant?.slug || "studio";
  const serverDraft = query.data?.draft;
  const initialDraft = useMemo(
    () =>
      serverDraft
        ? normalizePublicSiteEditorDraft({
            publicSite: serverDraft,
            tenantName,
            tenantSlug,
          })
        : null,
    [serverDraft, tenantName, tenantSlug],
  );
  const draft = draftOverride || initialDraft;
  const baseDraft = baseDraftOverride || initialDraft;
  const tenantLocaleSettings =
    query.data?.tenant?.settings ||
    previewQuery.data?.tenant?.settings ||
    currentTenant?.settings;
  const editorLocaleCodes = useMemo(
    () =>
      resolvePublicSiteEditorLocaleCodes({
        settings: tenantLocaleSettings,
        publicSite: serverDraft,
        routeableLocaleCodes: routing.locales,
      }),
    [serverDraft, tenantLocaleSettings],
  );
  const revision =
    revisionOverride ?? Number(query.data?.editor?.draftRevision ?? 0);
  const editor = editorOverride || query.data?.editor || null;
  const actionCopy = BUILDER_ACTION_COPY[locale] || BUILDER_ACTION_COPY.en;
  const isDirty = useMemo(
    () =>
      Boolean(
        draft && baseDraft && !arePublicSiteDraftsEqual(draft, baseDraft),
      ),
    [baseDraft, draft],
  );
  const serverHasDraftChanges = editor?.hasUnpublishedChanges === true;
  const hasChanges = isDirty || serverHasDraftChanges;
  const invalidColorPaths = useMemo(
    () => getInvalidPublicSiteColorPaths(draft),
    [draft],
  );
  const invalidLogoRedirectUrl = getInvalidPublicSiteLogoRedirectUrl(draft);
  const draftValid = isValidPublicSiteEditorDraft(draft);
  const previewMetadata = previewQuery.data?.editor || {};
  const publicationStatus = previewQuery.isError
    ? "unknown"
    : previewMetadata.publicationStatus || "draft";
  const publiclyAvailable = previewQuery.isError
    ? null
    : previewMetadata.publiclyAvailable;
  const websiteIsLive =
    publiclyAvailable === true || publicationStatus === "live";
  const launchBlockers =
    setupQuery.data?.launchReview?.required?.incompleteStepIds || [];
  const capabilities = previewQuery.data?.tenant?.publicCapabilities || {
    bookStudio: currentTenant?.modules?.bookings !== false,
    courses: currentTenant?.modules?.courses !== false,
    memberships: currentTenant?.modules?.memberships !== false,
    vouchers: currentTenant?.modules?.vouchers !== false,
    help: currentTenant?.modules?.knowledge !== false,
    registration: true,
  };
  const availablePreviewPages =
    getAvailablePublicSitePreviewPages(capabilities);
  const courseLocations =
    previewQuery.data?.preview?.data?.courseLocations ??
    previewQuery.data?.preview?.data?.locations ??
    [];
  const selectedCourseLocationId = courseLocations.some(
    (location) => String(location.id || location._id) === courseLocationId,
  )
    ? courseLocationId
    : String(courseLocations[0]?.id || courseLocations[0]?._id || "");
  const busy =
    launchBusy ||
    saveState.isLoading ||
    publishState.isLoading ||
    publishStudioState.isLoading ||
    restoreVersionState.isLoading ||
    resetState.isLoading ||
    reloadBusy ||
    uploadState.busy;

  const applyServerState = useCallback(
    (
      state,
      {
        preserveDraft = false,
        mediaPath,
        mediaUrl,
        mediaLocationId,
        submittedDraft,
        resetHistory = false,
      } = {},
    ) => {
      const serverDraft = normalizePublicSiteEditorDraft({
        publicSite: state?.draft || state?.publicSite,
        tenantName,
        tenantSlug,
      });
      setBaseDraft(serverDraft);
      setDraft((current) => {
        if (
          submittedDraft &&
          current &&
          !arePublicSiteDraftsEqual(current, submittedDraft)
        ) {
          return current;
        }
        return preserveDraft && current
          ? applyPublicSiteMediaUpload(current, {
              path: mediaPath,
              url: mediaUrl,
              locationId: mediaLocationId,
            })
          : serverDraft;
      });
      setRevision(Number(state?.editor?.draftRevision ?? 0));
      setEditor(state?.editor || null);
      if (resetHistory) setLocalHistory(EMPTY_LOCAL_HISTORY);
    },
    [tenantName, tenantSlug],
  );

  const clearUploadFeedback = useCallback(() => {
    setUploadState((current) => ({
      ...INITIAL_UPLOAD_STATE,
      resetToken: current.resetToken + 1,
    }));
  }, []);

  const normalizedPreviewPage = availablePreviewPages.includes(previewPage)
    ? previewPage
    : availablePreviewPages[0] || "home";
  const normalizedPreviewLocale = editorLocaleCodes.includes(previewLocale)
    ? previewLocale
    : editorLocaleCodes[0];

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 639px)");
    if (!media?.matches) return undefined;

    const frame = window.requestAnimationFrame(() => {
      setPreviewDevice("mobile");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isDirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const commitLocalDraft = useCallback(
    (nextDraft) => {
      if (!draft || arePublicSiteEditorStatesEqual(draft, nextDraft)) return;
      setLocalHistory((history) => ({
        past: [...history.past, draft].slice(-MAX_LOCAL_HISTORY),
        future: [],
      }));
      setDraft(nextDraft);
      setNotice(null);
    },
    [draft],
  );

  const onChange = useCallback(
    (path, value) => {
      commitLocalDraft(
        replacePublicSiteValue(draft || initialDraft, path, value),
      );
    },
    [commitLocalDraft, draft, initialDraft],
  );

  const handleApplyStylePreset = useCallback(
    (presetId) => {
      commitLocalDraft(
        applyPublicSiteStylePreset(draft || initialDraft, presetId),
      );
    },
    [commitLocalDraft, draft, initialDraft],
  );

  const handleUndo = useCallback(() => {
    const previous = localHistory.past.at(-1);
    if (!previous || !draft) return;

    setLocalHistory({
      past: localHistory.past.slice(0, -1),
      future: [draft, ...localHistory.future].slice(0, MAX_LOCAL_HISTORY),
    });
    setDraft(previous);
    setNotice(null);
  }, [draft, localHistory]);

  const handleRedo = useCallback(() => {
    const next = localHistory.future[0];
    if (!next || !draft) return;

    setLocalHistory({
      past: [...localHistory.past, draft].slice(-MAX_LOCAL_HISTORY),
      future: localHistory.future.slice(1),
    });
    setDraft(next);
    setNotice(null);
  }, [draft, localHistory]);

  useEffect(() => {
    const handleHistoryShortcut = (event) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "z"
      ) {
        return;
      }

      event.preventDefault();
      if (confirmMode || mutationLockRef.current || uploadLockRef.current)
        return;
      if (event.shiftKey) handleRedo();
      else handleUndo();
    };

    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [confirmMode, handleRedo, handleUndo]);

  const handleReload = useCallback(async () => {
    if (uploadLockRef.current || mutationLockRef.current) return;
    mutationLockRef.current = true;
    setReloadBusy(true);
    try {
      const state = await query.refetch().unwrap();
      applyServerState(state, { resetHistory: true });
      clearUploadFeedback();
      setNotice(null);
    } catch (error) {
      setNotice({
        type: "error",
        message: getPublicSiteEditorError(error, t("messages.loadError")),
      });
    } finally {
      setReloadBusy(false);
      mutationLockRef.current = false;
    }
  }, [applyServerState, clearUploadFeedback, query, t]);

  const persistDraft = useCallback(async () => {
    const submittedDraft = draft;
    const state = await saveDraft({
      patch: buildPublicSiteDraftPatch(submittedDraft),
      revision,
    }).unwrap();
    applyServerState(state, { submittedDraft });
    return state;
  }, [applyServerState, draft, revision, saveDraft]);

  const handleSave = useCallback(async () => {
    if (mutationLockRef.current || uploadLockRef.current) return;
    mutationLockRef.current = true;
    setNotice(null);
    try {
      await persistDraft();
      if (guidedSetup.guided) {
        await guidedSetup.refreshAndContinue({
          metadata: { form: "public_site_editor" },
        });
        return;
      }
      setNotice({ type: "success", message: t("messages.saved") });
    } catch (error) {
      setNotice({
        type: "error",
        conflict: error?.data?.code === "PUBLIC_SITE_REVISION_CONFLICT",
        message: getPublicSiteEditorError(error, t("messages.saveError")),
      });
    } finally {
      mutationLockRef.current = false;
    }
  }, [guidedSetup, persistDraft, t]);

  const handleUpload = useCallback(
    ({ file, slot, path, locationId }) => {
      if (uploadLockRef.current || mutationLockRef.current) return false;
      setNotice(null);
      const validation = validatePublicSiteMediaFile(file);
      if (!validation.valid) {
        const message = t(`messages.${validation.messageKey}`);
        setUploadState((current) => ({
          ...INITIAL_UPLOAD_STATE,
          errorSlot: slot,
          locationId,
          errorMessage: message,
          fileName: file?.name || null,
          fileSize: file?.size ?? null,
          resetToken: current.resetToken + 1,
        }));
        setNotice({ type: "error", message });
        return false;
      }

      uploadLockRef.current = true;
      setUploadState((current) => ({
        ...INITIAL_UPLOAD_STATE,
        busy: true,
        slot,
        locationId,
        fileName: file.name,
        fileSize: file.size,
        resetToken: current.resetToken,
      }));

      void (async () => {
        try {
          const state = await uploadMedia({
            file,
            slot,
            revision,
            locationId,
          }).unwrap();
          const mediaUrl = state?.media?.url;
          if (!mediaUrl) throw new Error(t("messages.mediaError"));
          applyServerState(state, {
            preserveDraft: true,
            mediaPath: path,
            mediaUrl,
            mediaLocationId: slot === "courseHero" ? locationId : undefined,
          });
          setNotice({
            type: "success",
            message: t("messages.mediaUploaded"),
          });
          setUploadState((current) => ({
            ...INITIAL_UPLOAD_STATE,
            resetToken: current.resetToken + 1,
          }));
        } catch (error) {
          const messageKey = getPublicSiteMediaErrorKey(error);
          const message = t(`messages.${messageKey}`);
          const retryable =
            error?.data?.code === "PUBLIC_SITE_MEDIA_STORAGE_UNAVAILABLE" &&
            error?.data?.details?.retryable === true;
          setUploadState((current) => ({
            ...INITIAL_UPLOAD_STATE,
            errorSlot: slot,
            locationId,
            errorMessage: message,
            failedUpload: retryable ? { file, slot, path, locationId } : null,
            fileName: file.name,
            fileSize: file.size,
            resetToken: current.resetToken,
          }));
          setNotice({
            type: "error",
            conflict: error?.data?.code === "PUBLIC_SITE_REVISION_CONFLICT",
            message,
          });
        } finally {
          uploadLockRef.current = false;
        }
      })();

      return true;
    },
    [applyServerState, revision, t, uploadMedia],
  );

  const handlePublish = useCallback(async () => {
    if (mutationLockRef.current || uploadLockRef.current) return;
    mutationLockRef.current = true;
    setNotice(null);
    const submittedDraft = draft;
    try {
      let targetRevision = revision;
      if (isDirty) {
        const saved = await persistDraft();
        targetRevision = Number(saved?.editor?.draftRevision ?? targetRevision);
      }
      const state = await publish({ revision: targetRevision }).unwrap();
      applyServerState(state, { submittedDraft });
      notifyPublicSitePublished(tenantSlug);
      void previewQuery.refetch();
      setNotice({ type: "success", message: t("messages.published") });
      setConfirmMode(null);
    } catch (error) {
      setConfirmMode(null);
      setNotice({
        type: "error",
        conflict: error?.data?.code === "PUBLIC_SITE_REVISION_CONFLICT",
        message: getPublicSiteEditorError(error, t("messages.publishError")),
      });
    } finally {
      mutationLockRef.current = false;
    }
  }, [
    applyServerState,
    draft,
    isDirty,
    persistDraft,
    previewQuery,
    publish,
    revision,
    tenantSlug,
    t,
  ]);

  const handlePublishWebsite = useCallback(async () => {
    if (mutationLockRef.current || uploadLockRef.current) return;
    mutationLockRef.current = true;
    setLaunchBusy(true);
    setNotice(null);

    const submittedDraft = draft;
    try {
      let targetRevision = revision;
      if (isDirty) {
        const saved = await persistDraft();
        targetRevision = Number(saved?.editor?.draftRevision ?? targetRevision);
      }
      const publishedState = await publish({
        revision: targetRevision,
      }).unwrap();
      applyServerState(publishedState, { submittedDraft });
      const setup = await setupQuery.refetch().unwrap();
      await publishStudio(setup.definitionVersion).unwrap();
      notifyPublicSitePublished(tenantSlug);
      const state = await query.refetch().unwrap();
      applyServerState(state);
      await Promise.all([
        previewQuery.refetch(),
        versionsQuery.refetch(),
        setupQuery.refetch(),
      ]);
      setNotice({ type: "success", message: actionCopy.launched });
      setConfirmMode(null);
    } catch (error) {
      setNotice({
        type: "error",
        conflict: error?.data?.code === "PUBLIC_SITE_REVISION_CONFLICT",
        message: getPublicSiteEditorError(error, t("messages.publishError")),
      });
    } finally {
      mutationLockRef.current = false;
      setLaunchBusy(false);
    }
  }, [
    actionCopy.launched,
    applyServerState,
    draft,
    isDirty,
    persistDraft,
    previewQuery,
    publish,
    publishStudio,
    query,
    revision,
    setupQuery,
    tenantSlug,
    t,
    versionsQuery,
  ]);

  const handleRestoreVersion = useCallback(
    async (versionId) => {
      if (mutationLockRef.current || uploadLockRef.current) return;
      if (isDirty) {
        setNotice({ type: "error", message: actionCopy.restoreBlocked });
        return;
      }
      if (serverHasDraftChanges && !window.confirm(actionCopy.restoreConfirm)) {
        return;
      }

      mutationLockRef.current = true;
      setNotice(null);
      try {
        const state = await restoreVersion({ versionId, revision }).unwrap();
        applyServerState(state, { resetHistory: true });
        void previewQuery.refetch();
        setNotice({ type: "success", message: actionCopy.restored });
      } catch (error) {
        setNotice({
          type: "error",
          conflict: error?.data?.code === "PUBLIC_SITE_REVISION_CONFLICT",
          message: getPublicSiteEditorError(error, t("messages.resetError")),
        });
      } finally {
        mutationLockRef.current = false;
      }
    },
    [
      actionCopy.restoreBlocked,
      actionCopy.restoreConfirm,
      actionCopy.restored,
      applyServerState,
      isDirty,
      previewQuery,
      restoreVersion,
      revision,
      serverHasDraftChanges,
      t,
    ],
  );

  const changeWorkspaceView = useCallback(
    (nextView) => {
      if (nextView === workspaceView) return;

      const layout = document.getElementById("public-site-builder-layout");
      const workspaceOffset = window.innerWidth >= 768 ? 164 : 140;
      const layoutTop = layout
        ? window.scrollY + layout.getBoundingClientRect().top - workspaceOffset
        : 0;
      workspaceScrollPositionsRef.current[workspaceView] = window.scrollY;
      const nextScroll =
        workspaceScrollPositionsRef.current[nextView] ?? Math.max(0, layoutTop);

      pendingWorkspaceScrollRef.current = nextScroll;
      setWorkspaceView(nextView);
    },
    [workspaceView],
  );

  useLayoutEffect(() => {
    if (pendingWorkspaceScrollRef.current === null) return;

    window.scrollTo({
      top: pendingWorkspaceScrollRef.current,
      behavior: "auto",
    });
    pendingWorkspaceScrollRef.current = null;
  }, [workspaceView]);

  const handlePreviewEditPath = useCallback(
    (path) => {
      const pathParts = String(path).split(".");
      const root = pathParts[0];
      const nextTab = PUBLIC_SITE_EDITOR_TABS.includes(root) ? root : "pages";

      setActiveTab(nextTab);
      if (nextTab === "pages") {
        const requestedPage = pathParts[1];
        setPreviewPage(
          availablePreviewPages.includes(requestedPage)
            ? requestedPage
            : "home",
        );
      }
      if (nextTab === "login") setPreviewPage("login");
      if (nextTab === "register") setPreviewPage("register");
      if (nextTab === "customerPortal") setPreviewPage("portal");
      if (workspaceView === "preview") changeWorkspaceView("editor");

      window.setTimeout(() => {
        const field = document.querySelector(
          `[data-public-site-field-path="${String(path).replaceAll('"', '\\"')}"]`,
        );
        if (!field) return;

        const details = field.closest("details");
        if (details) details.open = true;
        field.scrollIntoView({ behavior: "smooth", block: "center" });
        const control = field.matches("input, textarea, select, button")
          ? field
          : field.querySelector("input, textarea, select, button");
        control?.focus?.({ preventScroll: true });
      }, 80);
    },
    [availablePreviewPages, changeWorkspaceView, workspaceView],
  );

  const handleReset = useCallback(async () => {
    if (mutationLockRef.current || uploadLockRef.current) return;
    mutationLockRef.current = true;
    setNotice(null);
    try {
      const state = await resetDraft({ revision }).unwrap();
      applyServerState(state, { resetHistory: true });
      clearUploadFeedback();
      setNotice({ type: "success", message: t("messages.reset") });
      setConfirmMode(null);
    } catch (error) {
      setConfirmMode(null);
      setNotice({
        type: "error",
        conflict: error?.data?.code === "PUBLIC_SITE_REVISION_CONFLICT",
        message: getPublicSiteEditorError(error, t("messages.resetError")),
      });
    } finally {
      mutationLockRef.current = false;
    }
  }, [applyServerState, clearUploadFeedback, resetDraft, revision, t]);

  if (query.isError) {
    return (
      <div className="rounded-[18px] border border-coral-200 bg-coral-50 p-5">
        <p className="text-xs text-terracotta-700">
          {getPublicSiteEditorError(query.error, t("messages.loadError"))}
        </p>
        <button
          type="button"
          disabled={reloadBusy}
          onClick={handleReload}
          className="mt-3 text-[11px] font-semibold text-terracotta-700 underline"
        >
          {t("actions.retry")}
        </button>
      </div>
    );
  }

  if (query.isLoading || !draft) {
    return (
      <div
        className="flex min-h-[360px] items-center justify-center"
        role="status"
      >
        <ArrowPathIcon className="h-5 w-5 animate-spin text-cobalt-500" />
        <span className="ml-3 text-xs text-[#777773]">{t("loading")}</span>
      </div>
    );
  }

  const fields = {
    branding: (
      <BrandingFields
        draft={draft}
        onChange={onChange}
        onApplyStylePreset={handleApplyStylePreset}
        onUpload={handleUpload}
        onClearUpload={clearUploadFeedback}
        disabled={busy}
        uploadState={uploadState}
      />
    ),
    pages: (
      <PagesFields
        draft={draft}
        onChange={onChange}
        onUpload={handleUpload}
        onClearUpload={clearUploadFeedback}
        disabled={busy}
        uploadState={uploadState}
      />
    ),
    header: <HeaderFields draft={draft} onChange={onChange} />,
    footer: <FooterFields draft={draft} onChange={onChange} />,
    login: (
      <LoginFields
        draft={draft}
        onChange={onChange}
        onUpload={handleUpload}
        onClearUpload={clearUploadFeedback}
        disabled={busy}
        uploadState={uploadState}
      />
    ),
    register: (
      <RegisterFields
        draft={draft}
        onChange={onChange}
        onUpload={handleUpload}
        onClearUpload={clearUploadFeedback}
        disabled={busy}
        uploadState={uploadState}
      />
    ),
    customerPortal: (
      <CustomerPortalFields
        draft={draft}
        onChange={onChange}
        locations={courseLocations}
        selectedCourseLocationId={selectedCourseLocationId}
        onCourseLocationChange={setCourseLocationId}
        onUpload={handleUpload}
        onClearUpload={clearUploadFeedback}
        disabled={busy}
        uploadState={uploadState}
      />
    ),
  };
  const lastPublished = formatDate(editor?.publishedAt, locale);
  const lastDraftUpdate = formatDate(editor?.draftUpdatedAt, locale);
  const canPublishDraft = canPublishPublicSiteDraft({
    hasChanges,
    hasPublishedSnapshot: Boolean(editor?.publishedAt),
  });

  return (
    <section
      className="min-w-0 space-y-5 pb-24 2xl:pb-0"
      aria-busy={busy}
      data-guided-form={guidedSetup.guided ? "public_site" : undefined}
    >
      {/* Keep the fixed action bar above the sticky editor controls. */}
      <header className="relative isolate z-30 overflow-hidden rounded-[22px] border border-line bg-surface-panel p-5 shadow-[0_14px_38px_rgba(17,17,15,0.04)] sm:p-6 2xl:z-auto">
        <WorkspaceBrushField variant="editorHero" />

        <div className="relative z-10 flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="min-w-0">
            {showPageHeader ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
                  {t("eyebrow")}
                </p>
                <h1 className="mt-2 flex items-center gap-3 text-[28px] font-semibold tracking-[-0.05em] text-[#111111] sm:text-[34px]">
                  <PaintBrushIcon className="h-7 w-7 text-terracotta-600" />
                  {t("title")}
                </h1>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-[#777773]">
                  {t("description")}
                </p>
              </>
            ) : null}
            <div
              className={cx(
                showPageHeader && "mt-4",
                "flex flex-wrap items-center gap-2 text-[10px]",
              )}
              aria-live="polite"
            >
              <span
                className={
                  publiclyAvailable === true
                    ? "rounded-full bg-[#EAF4E7] px-3 py-1.5 font-semibold text-[#47613E]"
                    : "rounded-full bg-sand-100 px-3 py-1.5 font-semibold text-sand-800"
                }
              >
                {publiclyAvailable === true
                  ? t("status.publiclyAvailable")
                  : publiclyAvailable === false
                    ? t(`status.${publicationStatus}`)
                    : t("status.unknown")}
              </span>
              {invalidColorPaths.length > 0 ? (
                <span
                  role="status"
                  className="rounded-full bg-coral-100 px-3 py-1.5 font-semibold text-terracotta-700"
                >
                  {t("messages.invalidColors")}
                </span>
              ) : null}
              {invalidLogoRedirectUrl ? (
                <span
                  role="status"
                  className="rounded-full bg-coral-100 px-3 py-1.5 font-semibold text-terracotta-700"
                >
                  {t("messages.invalidLogoRedirectUrl")}
                </span>
              ) : null}
              <span
                className={
                  hasChanges
                    ? "rounded-full bg-coral-100 px-3 py-1.5 font-semibold text-terracotta-700"
                    : "rounded-full bg-[#F1F0EC] px-3 py-1.5 font-semibold text-[#686762]"
                }
              >
                {isDirty
                  ? t("status.unsaved")
                  : serverHasDraftChanges
                    ? t("status.draftSaved")
                    : t("status.upToDate")}
              </span>
              {lastDraftUpdate ? (
                <span className="text-[#858580]">
                  {t("status.draftUpdated", { date: lastDraftUpdate })}
                </span>
              ) : null}
              {lastPublished ? (
                <span className="text-[#858580]">
                  {t("status.publishedAt", { date: lastPublished })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center 2xl:justify-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || localHistory.past.length === 0}
                onClick={handleUndo}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-semibold text-[#686762] hover:bg-[#F4F2ED] disabled:opacity-30"
                aria-label={actionCopy.undo}
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">
                  {actionCopy.undo}
                </span>
              </button>
              <button
                type="button"
                disabled={busy || localHistory.future.length === 0}
                onClick={handleRedo}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-semibold text-[#686762] hover:bg-[#F4F2ED] disabled:opacity-30"
                aria-label={actionCopy.redo}
              >
                <ArrowUturnRightIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">
                  {actionCopy.redo}
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setHistoryOpen((open) => !open)}
                aria-expanded={historyOpen}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[11px] font-semibold text-[#686762] hover:border-cobalt-300"
              >
                <ClockIcon className="h-4 w-4" />
                {actionCopy.history}
              </button>
              <Link
                href="/"
                locale={editorLocaleCodes[0]}
                target="_blank"
                data-contextual-guide-target="customer-journey-open-site"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-4 text-[11px] font-semibold text-[#686762] hover:border-brand-primary/45 sm:flex-none"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                {t("actions.openSite")}
              </Link>
              <button
                type="button"
                disabled={busy || !hasChanges}
                onClick={() => setConfirmMode("reset")}
                className="min-h-11 flex-1 rounded-full px-4 text-[11px] font-semibold text-[#686762] hover:bg-[#F4F2ED] disabled:opacity-35 sm:flex-none"
              >
                {t("actions.resetDraft")}
              </button>
            </div>

            <div
              role="group"
              data-contextual-guide-target="website-actions"
              aria-label={t("actions.primaryLabel")}
              className={cx(
                "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid gap-2 rounded-[20px] border border-white/80 bg-white/90 p-2 shadow-[0_20px_60px_rgba(17,17,15,0.2)] backdrop-blur-xl sm:left-auto sm:right-4 sm:w-auto",
                canPublish && !guidedSetup.guided
                  ? "grid-cols-2"
                  : "grid-cols-1",
                "2xl:static 2xl:z-auto 2xl:flex 2xl:rounded-none 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:shadow-none 2xl:backdrop-blur-none",
              )}
            >
              <button
                type="button"
                disabled={
                  busy || !draftValid || (!isDirty && !guidedSetup.guided)
                }
                onClick={handleSave}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-5 text-[11px] font-semibold text-cobalt-700 hover:bg-cobalt-100 disabled:opacity-35"
              >
                {saveState.isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudArrowUpIcon className="h-4 w-4" />
                )}
                {saveState.isLoading
                  ? t("actions.saving")
                  : guidedSetup.guided
                    ? setupT("guided.saveAndContinue")
                    : t("actions.saveDraft")}
              </button>
              {canPublish && !guidedSetup.guided ? (
                <button
                  type="button"
                  disabled={busy || !draftValid || !canPublishDraft}
                  onClick={() => setConfirmMode("publish")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[11px] font-semibold text-white shadow-cobalt hover:bg-cobalt-600 disabled:opacity-35"
                >
                  <CloudArrowUpIcon className="h-4 w-4" />
                  {actionCopy.publishChanges}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {confirmMode !== "launch" ? (
        <Notice notice={notice} onReload={handleReload} busy={busy} />
      ) : null}

      {historyOpen ? (
        <VersionHistoryPanel
          busy={busy}
          copy={actionCopy}
          locale={locale}
          onClose={() => setHistoryOpen(false)}
          onRestore={handleRestoreVersion}
          query={versionsQuery}
        />
      ) : null}

      {!websiteIsLive ? (
        <WebsiteLaunchPanel
          blockers={launchBlockers.length}
          busy={busy || setupQuery.isLoading}
          canPublish={canPublish}
          copy={actionCopy}
          draftValid={draftValid}
          onPublish={() => {
            setNotice(null);
            setConfirmMode("launch");
          }}
        />
      ) : null}

      <div
        id="public-site-builder-workspace"
        className="sticky top-[72px] z-20 rounded-[18px] border border-line bg-surface/95 p-1.5 shadow-[0_12px_32px_rgba(17,17,15,0.08)] backdrop-blur-xl md:top-[96px] 2xl:hidden"
      >
        <div
          role="group"
          aria-label={t("workspace.label")}
          className="grid grid-cols-2 gap-1"
        >
          {[
            ["editor", PaintBrushIcon, PUBLIC_SITE_EDITOR_PANE_ID],
            ["preview", EyeIcon, PUBLIC_SITE_PREVIEW_PANE_ID],
          ].map(([view, Icon, controls]) => {
            const selected = workspaceView === view;

            return (
              <button
                key={view}
                type="button"
                aria-pressed={selected}
                aria-controls={controls}
                data-contextual-guide-target={
                  view === "preview" ? "website-preview-toggle" : undefined
                }
                onClick={() => changeWorkspaceView(view)}
                className={cx(
                  "relative inline-flex min-h-11 items-center justify-center gap-2 rounded-[13px] px-3 text-[11px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2",
                  selected
                    ? "bg-cobalt-500 text-white shadow-cobalt"
                    : "text-[#686762] hover:bg-[#F4F2ED]",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(`workspace.${view}`)}
                {view === "editor" && isDirty ? (
                  <span
                    className={cx(
                      "h-1.5 w-1.5 rounded-full",
                      selected ? "bg-white" : "bg-terracotta-600",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="public-site-builder-layout"
        data-testid="public-site-builder-layout"
        className="grid min-w-0 max-w-full gap-5 2xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]"
      >
        <fieldset
          id={PUBLIC_SITE_EDITOR_PANE_ID}
          disabled={busy}
          className={cx(
            "min-w-0",
            workspaceView === "preview" && "hidden 2xl:block",
          )}
        >
          <legend className="sr-only">{t("tabs.label")}</legend>
          <WorkspaceTabs
            id={PUBLIC_SITE_TABS_ID}
            className="sticky top-[132px] z-10 mb-4 bg-canvas pb-2 pt-1 md:top-[156px] 2xl:static 2xl:bg-transparent 2xl:p-0"
            tabs={PUBLIC_SITE_EDITOR_TABS.map((tab) => ({
              id: tab,
              label: t(`tabs.${tab}`),
            }))}
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              if (tab === "pages") setPreviewPage("home");
              if (tab === "login") setPreviewPage("login");
              if (tab === "register") setPreviewPage("register");
              if (tab === "customerPortal") setPreviewPage("portal");
            }}
            ariaLabel={t("tabs.label")}
          />
          <WorkspaceTabPanel tabsId={PUBLIC_SITE_TABS_ID} tabId={activeTab}>
            <PublicSiteEditorLocaleProvider localeCodes={editorLocaleCodes}>
              {fields[activeTab]}
            </PublicSiteEditorLocaleProvider>
          </WorkspaceTabPanel>
        </fieldset>

        <aside
          id={PUBLIC_SITE_PREVIEW_PANE_ID}
          aria-labelledby="public-site-preview-title"
          className={cx(
            "min-w-0 self-start rounded-[22px] border border-line bg-surface-muted p-3 shadow-[0_14px_38px_rgba(17,17,15,0.04)] sm:p-4 2xl:sticky 2xl:top-[112px]",
            workspaceView === "editor" && "hidden 2xl:block",
          )}
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                id="public-site-preview-title"
                className="flex items-center gap-2 text-[11px] font-semibold text-[#292925]"
              >
                <EyeIcon className="h-4 w-4 text-cobalt-600" />
                {t("preview.title")}
              </p>
              <p className="mt-1 text-[10px] text-[#777773]">
                {t("preview.description")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:min-w-[30rem] lg:grid-cols-[minmax(10rem,1.25fr)_minmax(8.5rem,0.85fr)_auto] lg:items-end">
              <PreviewSelectField
                id="public-site-preview-page"
                icon={RectangleStackIcon}
                label={t("preview.page")}
                value={normalizedPreviewPage}
                onChange={(event) => setPreviewPage(event.target.value)}
                data-preview-selector="page"
                data-contextual-guide-target="customer-journey-preview-page"
              >
                {availablePreviewPages.map((key) => (
                  <option key={key} value={key}>
                    {t(`preview.pages.${key}`)}
                  </option>
                ))}
              </PreviewSelectField>
              {normalizedPreviewPage === "portalCourses" &&
              courseLocations.length > 0 ? (
                <PreviewSelectField
                  icon={BuildingStorefrontIcon}
                  id="course-preview-location"
                  label={t("customerPortal.courses.location")}
                  value={selectedCourseLocationId}
                  onChange={(event) => setCourseLocationId(event.target.value)}
                >
                  {courseLocations.map((location) => (
                    <option
                      key={location.id || location._id}
                      value={location.id || location._id}
                    >
                      {location.name}
                    </option>
                  ))}
                </PreviewSelectField>
              ) : null}
              <PreviewSelectField
                id="public-site-preview-language"
                icon={GlobeAltIcon}
                label={t("preview.language")}
                value={normalizedPreviewLocale}
                onChange={(event) => setPreviewLocale(event.target.value)}
                data-preview-selector="language"
              >
                {editorLocaleCodes.map((localeCode) => (
                  <option key={localeCode} value={localeCode}>
                    {getLocaleDefinition(localeCode)?.nativeName ||
                      localeCode.toUpperCase()}
                  </option>
                ))}
              </PreviewSelectField>
              <div
                role="group"
                aria-label={t("preview.device")}
                className="col-span-1 flex h-12 w-fit rounded-[14px] border border-line bg-surface-raised p-0.5 shadow-[0_4px_14px_rgba(17,17,15,0.04)] sm:col-span-2 lg:col-span-1"
              >
                {[
                  ["desktop", ComputerDesktopIcon],
                  ["tablet", DeviceTabletIcon],
                  ["mobile", DevicePhoneMobileIcon],
                ].map(([device, Icon]) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() => setPreviewDevice(device)}
                    aria-pressed={previewDevice === device}
                    aria-label={t(`preview.${device}`)}
                    className={
                      previewDevice === device
                        ? "inline-flex h-10 w-11 items-center justify-center rounded-[11px] bg-[#292925] text-white shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2"
                        : "inline-flex h-10 w-11 items-center justify-center rounded-[11px] text-[#777773] outline-none transition hover:bg-[#F4F2ED] hover:text-[#292925] focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2"
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PublicSiteLivePreview
            publicSite={draft}
            tenant={previewQuery.data?.tenant}
            tenantName={tenantName}
            tenantSlug={tenantSlug}
            capabilities={capabilities}
            previewModules={currentTenant?.modules}
            locale={normalizedPreviewLocale}
            page={normalizedPreviewPage}
            device={previewDevice}
            previewData={previewQuery.data?.preview?.data}
            previewLocationId={selectedCourseLocationId}
            onEditPath={handlePreviewEditPath}
          />
          <p className="mt-3 text-center text-[10px] leading-4 text-[#777773]">
            {t("preview.safety")}
          </p>
        </aside>
      </div>

      <ConfirmDialog
        mode={confirmMode}
        busy={busy}
        onClose={() => setConfirmMode(null)}
        onConfirm={
          confirmMode === "launch"
            ? handlePublishWebsite
            : confirmMode === "publish"
              ? handlePublish
              : handleReset
        }
        publishChangesLabel={actionCopy.publishChanges}
        launchCopy={actionCopy}
        notice={notice}
        onReload={handleReload}
      />
    </section>
  );
}
