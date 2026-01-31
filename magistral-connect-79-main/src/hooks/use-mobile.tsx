import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Primeira leitura (garante estado correto ao montar)
    update();

    // Alguns browsers ainda usam addListener/removeListener (fallback).
    // Além disso, adicionamos resize como garantia extra em casos onde
    // o evento do matchMedia não dispara (ex.: zoom, maximizar/restaurar em certos ambientes).
    const hasAddEventListener = typeof mql.addEventListener === "function";
    const hasRemoveEventListener = typeof mql.removeEventListener === "function";

    if (hasAddEventListener && hasRemoveEventListener) {
      mql.addEventListener("change", update);
    } else if (typeof (mql as any).addListener === "function") {
      (mql as any).addListener(update);
    }

    window.addEventListener("resize", update);

    return () => {
      if (hasAddEventListener && hasRemoveEventListener) {
        mql.removeEventListener("change", update);
      } else if (typeof (mql as any).removeListener === "function") {
        (mql as any).removeListener(update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  return isMobile;
}
