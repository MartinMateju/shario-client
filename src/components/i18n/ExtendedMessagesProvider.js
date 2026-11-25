"use client";

import { useMemo } from "react";
import { NextIntlClientProvider, useLocale, useMessages } from "next-intl";

export default function ExtendedMessagesProvider({ messages, children }) {
  const locale = useLocale();
  const inheritedMessages = useMessages();
  const completeMessages = useMemo(
    () => ({ ...inheritedMessages, ...messages }),
    [inheritedMessages, messages],
  );

  return (
    <NextIntlClientProvider locale={locale} messages={completeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
