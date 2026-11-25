import { MarketingPageShell } from "@/components/Marketing/MarketingPageShell";
import {
  LEGAL_DOCUMENTS,
  LEGAL_PROVIDER,
  LEGAL_UPDATED_DATE,
  LEGAL_VERSION,
} from "@/content/platformLegal";

import LegalDocumentNavigation from "./LegalDocumentNavigation";
import PlatformLegalLinks from "./PlatformLegalLinks";
import styles from "./platformLegal.module.css";

export default function PlatformLegalPage({ documentKey }) {
  const document = LEGAL_DOCUMENTS[documentKey];
  const updatedDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${LEGAL_UPDATED_DATE}T00:00:00Z`));

  return (
    <MarketingPageShell>
      <div className={styles.page}>
        <div className={styles.documentSwitch}>
          <PlatformLegalLinks currentDocument={documentKey} />
        </div>
        <article lang="en" aria-labelledby="legal-title" id="legal-document">
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Shario / Legal</p>
              <h1 className={styles.title} id="legal-title">
                {document.title}
              </h1>
              <p className={styles.description}>{document.description}</p>
              <p className={styles.language}>
                <span aria-hidden="true" />
                English version
              </p>
            </div>
            <dl className={styles.metadata}>
              <div>
                <dt>Provided by</dt>
                <dd>{LEGAL_PROVIDER.name}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>
                  <time dateTime={LEGAL_UPDATED_DATE}>{updatedDate}</time>
                </dd>
              </div>
              <div>
                <dt>Document version</dt>
                <dd>{LEGAL_VERSION}</dd>
              </div>
            </dl>
          </header>
          <div className={styles.layout}>
            <LegalDocumentNavigation
              sections={document.sections.map(({ id, title }) => ({
                id,
                title,
              }))}
            />
            <div className={styles.documentBody}>
              {document.sections.map((section, sectionIndex) => (
                <section
                  aria-labelledby={`${section.id}-heading`}
                  className={styles.section}
                  id={section.id}
                  key={section.id}
                >
                  <span className={styles.sectionNumber} aria-hidden="true">
                    {String(sectionIndex + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 id={`${section.id}-heading`}>
                      <span className={styles.screenReaderOnly}>
                        {section.title.match(/^\d+\.\s*/)?.[0]}
                      </span>{" "}
                      {section.title.replace(/^\d+\.\s*/, "")}
                    </h2>
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                    {section.bullets?.length ? (
                      <ul>
                        {section.bullets.map((bullet, index) => (
                          <li key={index}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
              <footer className={styles.documentFooter}>
                <div>
                  <p className={styles.eyebrow}>Here to help</p>
                  <h2>Questions about this document?</h2>
                  <a href={`mailto:${LEGAL_PROVIDER.email}`}>
                    {LEGAL_PROVIDER.email}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <a className={styles.backToTop} href="#legal-document">
                  Back to top <span aria-hidden="true">↑</span>
                </a>
              </footer>
            </div>
          </div>
        </article>
      </div>
    </MarketingPageShell>
  );
}
