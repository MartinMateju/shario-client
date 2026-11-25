"use client";

import { useState } from "react";

import styles from "./platformLegal.module.css";

export default function LegalDocumentNavigation({ sections }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.contentsHeader}>
        <h2 id="legal-contents" className={styles.contentsTitle}>
          Contents
        </h2>
        <span className={styles.sectionCount}>{sections.length} sections</span>
      </div>
      <button
        aria-controls="legal-contents-links"
        aria-expanded={expanded}
        className={styles.contentsToggle}
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span>
          Contents{" "}
          <span className={styles.sectionCount}>
            {" "}
            / {sections.length} sections
          </span>
        </span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <nav
        aria-labelledby="legal-contents"
        className={`${styles.contents} ${expanded ? styles.expanded : ""}`}
        id="legal-contents-links"
      >
        <ol>
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} onClick={() => setExpanded(false)}>
                <span aria-hidden="true" className={styles.contentsNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className={styles.screenReaderOnly}>
                    {section.title.match(/^\d+\.\s*/)?.[0]}
                  </span>{" "}
                  {section.title.replace(/^\d+\.\s*/, "")}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <button
        className={styles.printButton}
        onClick={() => window.print()}
        type="button"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM16 11h1" />
        </svg>
        Print / save PDF
      </button>
    </aside>
  );
}
