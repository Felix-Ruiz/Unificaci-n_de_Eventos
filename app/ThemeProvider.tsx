"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("acofi-theme") as Theme | null;
    const initialTheme = savedTheme || "dark";
    
    setThemeState(initialTheme);
    // Aplicamos el atributo directamente al HTML y al Body para asegurar la prioridad en CSS y Tailwind
    document.documentElement.setAttribute("data-theme", initialTheme);
    document.body.setAttribute("data-theme", initialTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("acofi-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);