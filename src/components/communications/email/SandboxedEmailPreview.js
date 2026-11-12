"use client";

import { useMemo } from "react";

import { buildEmailPreviewDocument } from "./emailContent";

export default function SandboxedEmailPreview({
  variant,
  title,
  headerHtml = "",
  footerHtml = "",
  primaryColor = "#1f1a17",
  subjectLabel = "Subject",
  emptyText = "Start writing to preview the email.",
  className = "",
}) {
  const source = useMemo(
    () =>
      buildEmailPreviewDocument({
        variant,
        headerHtml,
        footerHtml,
        primaryColor,
        subjectLabel,
        emptyText,
      }),
    [emptyText, footerHtml, headerHtml, primaryColor, subjectLabel, variant],
  );

  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={source}
      className={`min-h-[520px] w-full rounded-[22px] border border-black/10 bg-white ${className}`}
    />
  );
}
