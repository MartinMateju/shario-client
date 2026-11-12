// components/RichText.jsx
import React from "react";

import { Link } from "@/i18n/navigation";

const isExternal = (href = "") => /^https?:\/\//i.test(href);

const A = ({ href, children, external }) => {
  if (!href) return <>{children}</>;

  const ext = external ?? isExternal(href);

  if (ext) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="underline">
      {children}
    </Link>
  );
};

function renderTokens(tokens) {
  if (!Array.isArray(tokens)) return null;

  return tokens.map((tok, i) => {
    const text = tok?.t ?? "";
    if (!text) return null;

    const node = tok?.strong ? <strong>{text}</strong> : text;

    return tok?.href ? (
      <A key={i} href={tok.href} external={tok.external}>
        {node}
      </A>
    ) : (
      <React.Fragment key={i}>{node}</React.Fragment>
    );
  });
}

export function RichText({ value, as = "div", className = "" }) {
  if (value === null || value === undefined) return null;

  const Tag = as;
  const isP = Tag === "p";

  // allow plain string/number
  if (typeof value === "string" || typeof value === "number") {
    return <Tag className={className}>{value}</Tag>;
  }

  // Case 1: single paragraph token array (e.g. [{t:"..."}, ...])
  if (Array.isArray(value) && value.length && !value[0]?.p) {
    // If Tag is <p>, DON'T wrap another <p> inside it.
    if (isP) return <p className={className}>{renderTokens(value)}</p>;

    return (
      <Tag className={className}>
        <p>{renderTokens(value)}</p>
      </Tag>
    );
  }

  // Case 2: multi-paragraph blocks (e.g. [{p:[...]}, {p:[...]}])
  if (Array.isArray(value) && value.length && value[0]?.p) {
    // Multi-paragraph can't be safely wrapped by a single <p>
    const Wrapper = isP ? "div" : Tag;

    return (
      <Wrapper className={className}>
        {value.map((block, idx) => (
          <p key={idx}>{renderTokens(block.p)}</p>
        ))}
      </Wrapper>
    );
  }

  // Fallback
  return <Tag className={className}>{value}</Tag>;
}
