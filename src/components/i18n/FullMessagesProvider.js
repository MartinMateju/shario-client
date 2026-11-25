import { getMessages } from "next-intl/server";

import ExtendedMessagesProvider from "@/components/i18n/ExtendedMessagesProvider";
import { selectPrivateClientMessages } from "@/i18n/clientMessages";

// A server boundary so the private catalogue is sent only when a route that
// needs it is rendered, including navigation from a public page. Do not move
// this into the shared locale layout or select its scope from a pathname.
export default async function FullMessagesProvider({ children, locale }) {
  // Nested layouts can render before the root calls setRequestLocale. Resolve
  // from this route's params rather than racing the ambient request locale.
  const messages = await getMessages({ locale });

  return (
    <ExtendedMessagesProvider messages={selectPrivateClientMessages(messages)}>
      {children}
    </ExtendedMessagesProvider>
  );
}
