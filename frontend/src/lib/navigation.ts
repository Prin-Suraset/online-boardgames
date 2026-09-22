import { useEffect, useState } from "react";

export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathname(): string {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePathname = (): void => { setPathname(window.location.pathname); };
    window.addEventListener("popstate", updatePathname);
    return () => { window.removeEventListener("popstate", updatePathname); };
  }, []);

  return pathname;
}
