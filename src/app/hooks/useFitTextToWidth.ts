import { DependencyList, RefObject, useLayoutEffect } from "react";

type UseFitTextToWidthOptions = {
  /**
   * Optional extra safety padding (in px) subtracted from container width.
   * Useful if you want guaranteed breathing room even at 100vw containers.
   */
  paddingPx?: number;
};

export function useFitTextToWidth(
  containerRef: RefObject<HTMLElement>,
  textRef: RefObject<HTMLElement>,
  deps: DependencyList = [],
  options: UseFitTextToWidthOptions = {},
) {
  const { paddingPx = 0 } = options;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    let raf = 0;

    const fit = () => {
      // Reset to CSS baseline so we measure the “natural” size first.
      textEl.style.fontSize = "";

      const containerWidth = container.clientWidth - paddingPx;
      if (containerWidth <= 0) return;

      // scrollWidth is ideal because it includes overflowed content width.
      const textWidth = textEl.scrollWidth;

      if (textWidth <= containerWidth) {
        // Already fits, keep baseline CSS sizing.
        return;
      }

      const computed = window.getComputedStyle(textEl);
      const currentFontSize = parseFloat(computed.fontSize);
      if (!Number.isFinite(currentFontSize) || currentFontSize <= 0) return;

      const ratio = containerWidth / textWidth;
      const nextFontSize = currentFontSize * ratio;

      // Apply an inline font-size override that forces fit.
      textEl.style.fontSize = `${nextFontSize}px`;

      // Optional: if rounding still causes a tiny overflow, do one more pass.
      // (Avoid loops; just correct once.)
      const postWidth = textEl.scrollWidth;
      if (postWidth > containerWidth) {
        const ratio2 = containerWidth / postWidth;
        textEl.style.fontSize = `${nextFontSize * ratio2}px`;
      }
    };

    const scheduleFit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    // Initial fit (baseline render)
    scheduleFit();

    // Fit again after fonts load (important with next/font swap behavior).
    // document.fonts is widely supported in modern browsers.
    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleFit).catch(() => {});
    } else {
      // Fallback: a short delay after mount
      window.setTimeout(scheduleFit, 50);
    }

    // Observe size changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleFit);
      ro.observe(container);
    } else {
      // Very old fallback
      window.addEventListener("resize", scheduleFit);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", scheduleFit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
