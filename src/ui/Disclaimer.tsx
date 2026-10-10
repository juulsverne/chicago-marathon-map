import { COPY } from "@/content/copy";

export function Disclaimer() {
  return (
    <p className="text-[11px] leading-snug text-soft">
      {COPY.disclaimer}{" "}
      <a className="underline underline-offset-2 hover:text-fg active:opacity-70" href={COPY.notifyUrl} target="_blank" rel="noopener noreferrer">
        {COPY.notifyLabel}
      </a>
      .
    </p>
  );
}
