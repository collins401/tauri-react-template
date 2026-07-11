import "./global.css";

import AppProvider from "@/provider";
import AppRouter from "@/router";
import { ThemeProvider } from "./components/theme-provider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ThemeProvider>
  );
}
