import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  Receipt, 
  FileSignature, 
  Settings,
  Menu,
  X,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/leads", icon: Users, label: "Leads" },
  { path: "/jobs", icon: Briefcase, label: "Jobs" },
  { path: "/quotes", icon: FileText, label: "Quotes" },
  { path: "/invoices", icon: Receipt, label: "Invoices" },
  { path: "/contracts", icon: FileSignature, label: "Contracts" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-bone">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        data-testid="mobile-menu-btn"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-obsidian/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-obsidian transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-8 border-b border-white/10">
          <div className="w-10 h-10 bg-gold rounded-sm flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg text-white">Weddings</h1>
            <p className="text-xs text-white/50 uppercase tracking-wider">By Mark</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 ${
                  isActive 
                    ? "text-white bg-white/10 border-l-2 border-gold" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            © 2024 Weddings By Mark
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0">
        <div className="p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
