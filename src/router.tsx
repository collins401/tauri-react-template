import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import AppShell from "@/components/app-shell";

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const createAppRouter = () =>
  createBrowserRouter([
    {
      children: [
        {
          lazy: () => import("@/routes/home"),
          path: "/",
        },
        {
          lazy: () => import("@/features/dialog-demo"),
          path: "/dialog-demo",
        },
        {
          lazy: () => import("@/routes/not-found"),
          path: "*",
        },
      ],
      element: <RootLayout />,
    },
  ]);

export default function AppRouter() {
  return <RouterProvider router={createAppRouter()} />;
}
