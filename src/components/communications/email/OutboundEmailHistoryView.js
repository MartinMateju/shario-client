"use client";

import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import SentEmailLogsTable from "@/components/tables/email_notifications/SentEmailLogsTable";

export default function OutboundEmailHistoryView() {
  const t = useTranslations("CommunicationsEmail");

  return (
    <section
      aria-labelledby="automated-email-history-heading"
      data-outbound-email-history
    >
      <div className="mb-3 flex items-center gap-2">
        <EnvelopeIcon className="h-4 w-4 text-cobalt-600" aria-hidden="true" />
        <h2
          id="automated-email-history-heading"
          className="text-[15px] font-semibold text-ink"
        >
          {t("history.automatedTitle")}
        </h2>
      </div>
      <SentEmailLogsTable />
    </section>
  );
}
