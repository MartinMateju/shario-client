import { createTranslator } from "use-intl/core";
import { normalizeLocaleCode } from "@/i18n/locales";

const catalogs = import.meta.glob("../messages/*.json", {
  eager: true,
  import: "default",
});

/** Keep each test's existing UI fixtures while giving migrated legacy UI real copy. */
export function withMessageCatalogs(mock = {}, realNamespaces = []) {
  const locale = () => normalizeLocaleCode(mock.useLocale?.()) || "en";
  const messages = () => catalogs[`../messages/${locale()}.json`];
  return {
    ...mock,
    useLocale: mock.useLocale || (() => "en"),
    useMessages: messages,
    useTranslations: (namespace) => {
      if (
        namespace?.startsWith("Legacy.") ||
        realNamespaces.includes(namespace) ||
        !mock.useTranslations
      ) {
        return createTranslator({
          locale: locale(),
          messages: messages(),
          namespace,
        });
      }
      return mock.useTranslations(namespace);
    },
  };
}
