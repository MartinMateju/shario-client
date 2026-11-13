"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

const MESSAGE_UPDATE = "shario:public-site-preview:update";
const MESSAGE_READY = "shario:public-site-preview:ready";
const MESSAGE_APPLIED = "shario:public-site-preview:applied";
const MESSAGE_EDIT = "shario:public-site-preview:edit";
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 10;
const ACK_TIMEOUT_MS = 15000;
const DEVICE_WIDTHS = Object.freeze({
  desktop: "1440px",
  tablet: "768px",
  mobile: "390px",
});

export default function PublicSiteLivePreview({
  publicSite,
  tenant,
  tenantName,
  tenantSlug,
  capabilities,
  locale,
  page,
  device,
  previewData,
  previewModules,
  previewLocationId,
  onEditPath,
}) {
  const t = useTranslations("PublicSiteEditor.preview.connection");
  const frameRef = useRef(null);
  const reactId = useId();
  const [reloadVersion, setReloadVersion] = useState(0);
  const nonce = useMemo(
    () => `preview-${reactId.replaceAll(":", "")}-${locale}-${reloadVersion}`,
    [locale, reactId, reloadVersion],
  );
  const frameTenant = useMemo(
    () => ({
      ...(tenant && typeof tenant === "object" ? tenant : {}),
      name: tenantName,
      slug: tenantSlug,
      publicCapabilities: capabilities,
      publicSite,
    }),
    [capabilities, publicSite, tenant, tenantName, tenantSlug],
  );
  // The editor already runs on the tenant's host, including custom domains.
  // Let the hostname proxy resolve the internal tenant route; direct /tenants
  // URLs are deliberately blocked and cannot be loaded by the iframe.
  const frameUrl = `/${encodeURIComponent(locale)}/public-site-preview?nonce=${encodeURIComponent(nonce)}`;
  const payload = useMemo(
    () => ({
      tenant: frameTenant,
      page,
      data: previewData && typeof previewData === "object" ? previewData : {},
      previewModules,
      previewLocationId,
    }),
    [frameTenant, page, previewData, previewModules, previewLocationId],
  );
  const [delivery, setDelivery] = useState(() => ({
    nonce,
    payload,
    revision: 1,
    status: "loading",
  }));
  // Acknowledgements belong to one draft revision. A delayed response for an
  // earlier draft must not hide the loading/error state for newer edits.
  if (delivery.nonce !== nonce || delivery.payload !== payload) {
    setDelivery({
      nonce,
      payload,
      revision: delivery.revision + 1,
      status: "loading",
    });
  }
  const revision = delivery.revision;

  const sendPayload = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target || typeof window === "undefined") return;

    target.postMessage(
      { type: MESSAGE_UPDATE, nonce, revision, payload },
      window.location.origin,
    );
  }, [nonce, payload, revision]);

  useEffect(() => {
    const receive = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        event.data?.nonce !== nonce
      ) {
        return;
      }

      if (event.data.type === MESSAGE_READY) {
        sendPayload();
      }
      if (
        event.data.type === MESSAGE_APPLIED &&
        event.data.revision === revision
      ) {
        setDelivery((current) =>
          current.nonce === nonce && current.revision === revision
            ? { ...current, status: "ready" }
            : current,
        );
      }
      if (event.data.type === MESSAGE_EDIT && event.data.path) {
        onEditPath?.(String(event.data.path));
      }
    };

    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [nonce, onEditPath, revision, sendPayload]);

  useEffect(() => {
    // Send optimistically whenever the draft, page, or studio data changes.
    // The iframe's READY message and load event retry this payload if its
    // listener was not mounted yet, so browser event ordering cannot leave
    // subsequent selector updates stuck behind stale readiness state.
    sendPayload();
  }, [sendPayload]);

  useEffect(() => {
    if (delivery.status !== "loading") return undefined;
    let attempts = 0;
    const interval = window.setInterval(() => {
      sendPayload();
      attempts += 1;
      if (attempts >= MAX_RETRIES) window.clearInterval(interval);
    }, RETRY_DELAY_MS);
    const timeout = window.setTimeout(() => {
      setDelivery((current) =>
        current.nonce === nonce &&
        current.revision === revision &&
        current.status === "loading"
          ? { ...current, status: "timeout" }
          : current,
      );
    }, ACK_TIMEOUT_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [delivery.status, nonce, revision, sendPayload]);

  return (
    <div
      className="overflow-auto rounded-[18px] border border-line bg-[#D7D5CF] p-2 sm:p-3"
      data-public-site-production-preview
      data-preview-device={device}
    >
      <div className="sticky left-0 mb-2 flex max-w-full flex-wrap items-center justify-between gap-2 rounded-[10px] bg-white px-3 py-2 text-[#292925]">
        <p
          role={delivery.status === "timeout" ? "alert" : "status"}
          className="min-w-0 flex-1 text-[11px] leading-5"
        >
          {t(delivery.status)}
        </p>
        <button
          type="button"
          onClick={() => setReloadVersion((current) => current + 1)}
          className="min-h-10 shrink-0 rounded-full border border-line bg-white px-4 text-[11px] font-semibold text-cobalt-600 hover:bg-cobalt-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-600"
        >
          {t("reload")}
        </button>
      </div>
      <iframe
        key={reloadVersion}
        ref={frameRef}
        src={frameUrl}
        title={t("frameTitle", { name: tenantName })}
        sandbox="allow-same-origin allow-scripts"
        onLoad={sendPayload}
        className="mx-auto block min-h-[760px] rounded-[12px] border-0 bg-white shadow-[0_22px_70px_rgba(17,17,15,0.18)] transition-[width] duration-200"
        style={{ width: DEVICE_WIDTHS[device] || DEVICE_WIDTHS.desktop }}
      />
    </div>
  );
}
