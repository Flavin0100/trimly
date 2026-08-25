"use client";

import { useEffect } from "react";

export default function LandingEffects() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".landing-shell");
    if (!shell) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealItems = Array.from(shell.querySelectorAll<HTMLElement>("[data-reveal]"));
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollOffset = Math.min(window.scrollY, 1100);

    const applyParallax = () => {
      shell.style.setProperty("--stage-x", `${pointerX * 16}px`);
      shell.style.setProperty("--stage-y", `${pointerY * 12 - scrollOffset * 0.07}px`);
      shell.style.setProperty("--glow-x", `${pointerX * -24}px`);
      shell.style.setProperty("--glow-y", `${pointerY * -18 + scrollOffset * 0.055}px`);
      shell.style.setProperty("--window-rotate-x", `${pointerY * -1.4 + 2}deg`);
      shell.style.setProperty("--window-rotate-y", `${pointerX * 2.2 - 4}deg`);
    };

    const updateScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        shell.style.setProperty("--scroll-progress", String(Math.min(1, window.scrollY / max)));
        scrollOffset = Math.min(window.scrollY, 1100);
        applyParallax();
      });
    };

    const updatePointer = (event: PointerEvent) => {
      if (reduceMotion.matches || event.pointerType === "touch") return;
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      applyParallax();
    };

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach(item => item.classList.add("is-visible"));
    }

    const observer = !reduceMotion.matches && "IntersectionObserver" in window
      ? new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          });
        }, { threshold: 0.14, rootMargin: "0px 0px -8%" })
      : null;

    const revealFrame = window.requestAnimationFrame(() => {
      revealItems.forEach(item => observer?.observe(item));
    });
    applyParallax();
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(revealFrame);
      observer?.disconnect();
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
