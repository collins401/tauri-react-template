import type { ReactNode } from "react";
import { NavLink } from "react-router";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface NavItem {
  icon?: ReactNode;
  label: string;
  to: string;
}

interface AppShellProps {
  children: ReactNode;
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { label: "首页", to: "/" },
  { label: "对话框示例", to: "/dialog-demo" },
];

export default function AppShell({
  children,
  navItems = defaultNavItems,
}: AppShellProps) {
  return (
    <ResizablePanelGroup
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
      orientation="horizontal"
    >
      {/* 侧边栏 */}

      <ResizablePanel
        className="flex shrink-0 flex-col bg-sidebar"
        defaultSize="24%"
        maxSize="40%"
        minSize="220px"
      >
        {/* 顶部拖拽区域，为 macOS 红绿灯按钮留出空间 */}
        {/* data-tauri-drag-region 让这个区域可以拖拽移动窗口 */}
        <div className="h-10 w-full shrink-0" data-tauri-drag-region="true" />

        {/* 应用名称 / Logo */}
        <div className="px-4 pb-3">
          <span className="font-semibold text-sidebar-foreground/70 text-sm tracking-wide">
            My App
          </span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
              end={item.to === "/"}
              key={item.to}
              to={item.to}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 底部区域 */}
        <div className="border-sidebar-border border-t p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-primary/20 font-medium text-sidebar-primary text-xs">
              U
            </div>
            <span className="truncate text-sidebar-foreground text-sm">
              用户
            </span>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      {/* 主内容区 */}
      <ResizablePanel
        className="flex-1 overflow-auto"
        defaultSize="76%"
        minSize="320px"
      >
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
