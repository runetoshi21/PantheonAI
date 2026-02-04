"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./MenuModal.module.css";

type MenuModalProps = {
  open: boolean;
  onClose: () => void;
};

type NavSubItem = {
  id: string;
  label: string;
  href?: string;
};

type NavItem = {
  id: string;
  label: string;
  href?: string;
  children?: NavSubItem[];
};

const NAV_ITEMS: NavItem[] = [
  { id: "01", label: "Home", href: "#" },
  { id: "02", label: "Discover", href: "#" },
  {
    id: "03",
    label: "Create",
    href: "#",
  },
  {
    id: "04",
    label: "Manage",
    href: "#",
  },
  {
    id: "05",
    label: "Agents",
    href: "#",
  },
];

const EXIT_FALLBACK_MS = 900;

export default function MenuModal({ open, onClose }: MenuModalProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [active, setActive] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Mount/unmount choreography
  useEffect(() => {
    if (open) {
      // Start rendering immediately, then flip "active" on the next frame to trigger transitions.
      setShouldRender(true);
      returnFocusRef.current = (document.activeElement as HTMLElement) ?? null;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setActive(true));
      });
      return;
    }

    // Begin exit animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setActive(false);
  }, [open]);

  // Unmount after exit animation finishes (fallback timer for safety)
  useEffect(() => {
    if (open || !shouldRender) return;

    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
    }, EXIT_FALLBACK_MS);

    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, [open, shouldRender]);

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Body scroll lock while rendered
  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shouldRender]);

  // Focus close button when active
  useEffect(() => {
    if (active) closeBtnRef.current?.focus();
  }, [active]);

  // Close on Escape
  useEffect(() => {
    if (!shouldRender) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldRender, onClose]);

  // Restore focus after unmount
  useEffect(() => {
    if (shouldRender) return;
    returnFocusRef.current?.focus?.();
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={styles.overlay}
      data-active={active}
      role="dialog"
      aria-modal="true"
      aria-label="Pantheon Menu"
    >
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          onClick={onClose}
          aria-label="Pantheon home"
        >
          <Image
            src="/favicon.ico?v=2"
            alt="Pantheon"
            width={32}
            height={32}
            className={styles.brandIcon}
            unoptimized
          />
          <span className={styles.brandText}>Pantheon</span>
        </Link>

        <button
          ref={closeBtnRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close menu"
        />
      </header>

      <section className={styles.leftPanel} aria-label="Primary navigation">
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => {
              return (
                <li key={item.id} className={styles.navItem}>
                  <a
                    className={styles.navLink}
                    href={item.href ?? "#"}
                    onClick={onClose}
                  >
                    <span className={styles.navIndex}>{item.id}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </section>

      <section className={styles.rightPanel} aria-label="Contact">
        <div className={styles.contactWrap}>
          <h2 className={styles.contactTitle}>Contact Us</h2>

          <div className={styles.contactBlock}>
            <div className={styles.contactLabel}>Twitter</div>
            <div className={styles.contactValue}>
              <a
                href="https://x.com/runetoshi21"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                @runetoshi21
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
