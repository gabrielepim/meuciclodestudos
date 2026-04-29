import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Timer, BookOpenCheck, ListChecks, LogOut, Sun, Moon,
  BrainCircuit, MessageSquareQuote, FileQuestion, Download, Trophy, PenLine, Menu, X, Library
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DayCyclePopup } from "@/components/DayCyclePopup";
import { useState } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cycle", label: "Ciclo de Estudo", icon: Timer },
  { to: "/errors", label: "Caderno de Erros", icon: BookOpenCheck },
  { to: "/editorial", label: "Edital", icon: ListChecks },
  { to: "/arguments", label: "Argumentos", icon: MessageSquareQuote },
  { to: "/exam-questions", label: "Questões", icon: FileQuestion },
  { to: "/discursivas", label: "Discursivas", icon: PenLine },
  { to: "/materiais", label: "Materiais", icon: Library },
  { to: "/gamification", label: "XP & Streak", icon: Trophy },
  { to: "/export", label: "Exportar", icon: Download },
] as const;

export function AppLayout() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  const initials = user?.display_name
    ? user.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen bg-background">
      <DayCyclePopup />

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <BrainCircuit className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">StudyGabi</div>
            <div className="text-[10px] text-muted-foreground">Ciclo de Estudos</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "nav-active"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3 space-y-1">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user?.display_name ?? user?.email}</div>
              <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={toggle} className="flex-1 h-8 gap-2 text-xs justify-start">
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === "dark" ? "Modo claro" : "Modo escuro"}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background/80 backdrop-blur px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 mx-auto">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">StudyGabi</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
