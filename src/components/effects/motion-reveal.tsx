import type { CSSProperties, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
};

export function Reveal({ children, className = "", delay = 0, distance = 18 }: RevealProps) {
  return (
    <div
      className={`reveal-entry ${className}`}
      style={{ "--reveal-delay": `${delay}s`, "--reveal-distance": `${distance}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}

type BlurWordsProps = {
  text: string;
  className?: string;
};

export function BlurWords({ text, className = "" }: BlurWordsProps) {
  const words = text.split(" ");

  return (
    <span aria-label={text}>
      {words.map((word, index) => (
        <span
          aria-hidden="true"
          className={`blur-word inline-block ${className}`}
          key={`${word}-${index}`}
          style={{ "--word-delay": `${0.12 + index * 0.07}s` } as CSSProperties}
        >
          {word}{index < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}
