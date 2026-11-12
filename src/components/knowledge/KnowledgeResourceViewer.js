"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { Modal } from "@/components/communications/CommunicationsPrimitives";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";

import { getSafeResourceUrl, getYoutubeEmbedUrl } from "./knowledge.utils";

function ResourceModal({ open, onClose, title, description, children }) {
  const t = useTranslations("Communications");
  const publicTenant = useOptionalPublicTenant();

  if (!publicTenant) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        size="xl"
      >
        {children}
      </Modal>
    );
  }

  const theme = getPublicTenantTheme(publicTenant.tenant, {
    surface: publicTenant.appearanceSurface || publicTenant.surface,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="relative z-[100]"
      style={theme.style}
      data-tenant-style={theme.stylePresetId}
    >
      <DialogBackdrop className="fixed inset-0 bg-black/35 backdrop-blur-[3px]" />
      <div className="fixed inset-0 overflow-y-auto overscroll-y-contain">
        <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
          <DialogPanel
            data-dialog-layout="modal"
            className="flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-floating sm:max-h-[calc(100dvh-3rem)] sm:max-w-4xl sm:rounded-[24px]"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--tenant-border)] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold text-[var(--tenant-heading-on-surface)]">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="mt-1 text-sm text-[var(--tenant-muted-on-surface)]">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("actions.close")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--tenant-border)] text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default function KnowledgeResourceViewer({ resource, open, onClose }) {
  const t = useTranslations("KnowledgeHub");

  if (!resource) return null;

  const embedUrl = getYoutubeEmbedUrl(resource);
  const externalUrl = getSafeResourceUrl(
    resource.type === "file"
      ? resource.fileUrl || resource.sourceUrl
      : resource.sourceUrl || resource.fileUrl,
  );
  const questions = Array.isArray(resource.customQuestions)
    ? resource.customQuestions
    : [];

  return (
    <ResourceModal
      open={open}
      onClose={onClose}
      title={resource.title}
      description={resource.summary}
    >
      <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto bg-[var(--tenant-surface)] p-5 text-[var(--tenant-text-on-surface)] sm:p-6">
        {embedUrl ? (
          <div className="aspect-video overflow-hidden rounded-[22px] bg-ink">
            <iframe
              src={embedUrl}
              title={resource.title}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}

        {resource.content ? (
          <div className={embedUrl ? "mt-6" : ""}>
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--tenant-text-on-surface)]">
              {resource.content}
            </p>
          </div>
        ) : null}

        {questions.length ? (
          <section className="mt-7">
            <h3 className="text-sm font-semibold text-[var(--tenant-heading-on-surface)]">
              {t("viewer.questions")}
            </h3>
            <div className="mt-3 space-y-2">
              {questions.map((item, index) => (
                <details
                  key={`${item.question}-${index}`}
                  className="group rounded-[16px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-4 py-3"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--tenant-text)]">
                    {item.question}
                  </summary>
                  {item.answer ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--tenant-muted-text)]">
                      {item.answer}
                    </p>
                  ) : null}
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {resource.transcript ? (
          <details className="mt-7 rounded-[16px] border border-[var(--tenant-border)] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--tenant-text-on-surface)]">
              {t("viewer.transcript")}
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[var(--tenant-muted-on-surface)]">
              {resource.transcript}
            </p>
          </details>
        ) : null}

        {resource.aiEnabled ? (
          <div className="mt-6 flex items-start gap-2 rounded-[14px] border border-[color-mix(in_srgb,var(--tenant-accent)_25%,var(--tenant-border))] bg-[color-mix(in_srgb,var(--tenant-accent)_8%,transparent)] px-3.5 py-3 text-xs leading-5 text-[var(--tenant-accent-on-surface)]">
            <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("viewer.aiSource")}</span>
          </div>
        ) : null}

        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--tenant-portal-button,var(--tenant-accent))] px-5 py-2.5 text-xs font-semibold text-[var(--tenant-portal-button-foreground,var(--tenant-accent-foreground))] transition hover:brightness-[0.97]"
          >
            {resource.type === "file" ? (
              <DocumentArrowDownIcon className="h-4 w-4" />
            ) : (
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            )}
            {resource.type === "file"
              ? t("viewer.openFile")
              : t("viewer.openLink")}
          </a>
        ) : null}
      </div>
    </ResourceModal>
  );
}
