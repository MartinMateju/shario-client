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
  previewValues,
  fillAvailableSpace = false,
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
        previewValues,
      }),
    [
      emptyText,
      footerHtml,
      headerHtml,
      primaryColor,
      subjectLabel,
      variant,
      previewValues,
    ],
  );

  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={source}
      className={`${fillAvailableSpace ? "min-h-[360px] flex-1 rounded-[16px] lg:min-h-0" : "min-h-[520px] rounded-[22px]"} w-full border border-black/10 bg-white ${className}`}
    />
  );
}
