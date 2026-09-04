"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

function syncThemeColor(theme: Theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#111827" : "#ffffff");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("sac-theme") as Theme | null;
    if (stored === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
    syncThemeColor(stored === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("sac-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      syncThemeColor(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
