import { Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Activity, Trophy, Menu } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const navigation = [
  { name: "Genel Bakış", href: "/", icon: LayoutDashboard },
  { name: "Öğrenci Yönetimi", href: "/ogrenciler", icon: Users },
  { name: "Performans Değerlendirme", href: "/performans", icon: Activity },
  { name: "Sıralamalar", href: "/siralamalar", icon: Trophy },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const NavItems = () => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
        return (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
              <Link href={item.href} className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <Sidebar className="hidden md:flex">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Activity className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight tracking-tight">Spor Karne</span>
                <span className="text-xs text-muted-foreground">Eğitmen Paneli</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  <NavItems />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex h-16 items-center gap-3 border-b px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="font-bold">Spor Karne</span>
                </div>
                <div className="p-4">
                  <nav className="flex flex-col gap-2">
                    {navigation.map((item) => {
                      const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 font-bold md:hidden">
              <Activity className="h-5 w-5 text-primary" />
              <span>Spor Karne</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
