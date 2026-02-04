"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import MenuModal from "./components/MenuModal";
import { useFitTextToWidth } from "./hooks/useFitTextToWidth";
import styles from "./page.module.css";

function BrandLogo() {
  return (
    <div className={styles.brand}>
      <Image
        src="/favicon.ico?v=2"
        alt="Pantheon"
        width={32}
        height={32}
        className={styles.brandIcon}
        unoptimized
      />
      <span className={styles.brandText}>Pantheon</span>
    </div>
  );
}

function MenuIcon({
  onClick,
  expanded,
}: {
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      className={styles.menuIcon}
      aria-label="Menu"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onClick}
      type="button"
    >
      <span className={styles.menuLine} />
      <span className={styles.menuLine} />
    </button>
  );
}

function ConnectWalletButton() {
  return (
    <button
      className={styles.contactButton}
      type="button"
      data-connected={false}
      aria-label="Connect wallet"
    >
      CONNECT WALLET
    </button>
  );
}

function MidRow() {
  const [selected, setSelected] = useState<"agent" | "human">("agent");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    const value = "curl https://localhost:3002";
    let ok = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        ok = false;
      }
    }

    if (!ok) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className={styles.selectorWrap}>
      <div className={styles.selectorCard}>
        <div className={styles.selectorRow} role="tablist" aria-label="Audience">
          <button
            className={styles.selectorButton}
            data-selected={selected === "agent"}
            onClick={() => setSelected("agent")}
            type="button"
            role="tab"
            aria-selected={selected === "agent"}
          >
            AGENT
          </button>
          <button
            className={styles.selectorButton}
            data-selected={selected === "human"}
            onClick={() => setSelected("human")}
            type="button"
            role="tab"
            aria-selected={selected === "human"}
          >
            HUMAN
          </button>
        </div>

        <div className={styles.selectorContent} role="tabpanel">
          {selected === "agent" ? (
            <div className={styles.agentBlock}>
              <p className={styles.agentNote}>For agents: run</p>
              <div className={styles.copyRow}>
                <span className={styles.codeInline}>
                  curl https://localhost:3002
                </span>
                <button
                  className={styles.copyButton}
                  type="button"
                  onClick={handleCopy}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  className={styles.openButton}
                  type="button"
                  aria-label="Open https://localhost:3002 in new tab"
                  onClick={() =>
                    window.open("https://localhost:3002", "_blank", "noopener,noreferrer")
                  }
                >
                  <svg
                    className={styles.openIcon}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
                    <path d="M5 5h6V3H3v8h2V5zm0 14h14V9h2v12H3V9h2v10z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.humanPrompt}>
              <span className={styles.humanText}>Enter Site</span>
              <button
                className={styles.enterButton}
                type="button"
                onClick={() => router.push("/terminal")}
              >
                Go to website
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BigWord() {
  const text = "Pantheon";

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useFitTextToWidth(containerRef, textRef, [text], {
    paddingPx: 0,
  });

  return (
    <div ref={containerRef} className={styles.bigWordContainer}>
      <span ref={textRef} className={styles.bigWord}>
        {text}
      </span>
    </div>
  );
}

export default function Hero() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.hero}>
      <header className={styles.header}>
        <BrandLogo />
        <MenuIcon onClick={() => setMenuOpen(true)} expanded={menuOpen} />
        <ConnectWalletButton />
      </header>
      <MidRow />
      <BigWord />

      <MenuModal open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
