import { useEffect } from "react";
import "./global.css";

import AppProvider from "@/provider";
import AppRouter from "@/router";
import { ThemeProvider } from "./components/theme-provider";

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "r") {
        e.preventDefault();
        window.location.reload();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ThemeProvider>
  );
}
