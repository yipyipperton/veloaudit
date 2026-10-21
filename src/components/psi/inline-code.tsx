import { Fragment } from "react";

/** Renders Lighthouse's Markdown inline code (`<frame>`) as <code>, the way PSI does. Text only, never HTML. */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <code key={i} className="rounded bg-muted px-1 py-px font-mono text-[0.92em]">{p}</code> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
