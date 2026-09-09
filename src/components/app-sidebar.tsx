"use client";

import { KeyRound, LayoutDashboard, LogOut, Tags, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { ROLE_LABELS } from "@/lib/roles";
import { useSession } from "@/lib/session-context";

export function AppSidebar() {
  const pathname = usePathname();
  const session = useSession();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-center px-3 py-5">
        <Logo size={40} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/tickets")}
                  render={
                    <Link href="/tickets">
                      <Ticket />
                      <span>Chamados</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {session.role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/admin/users")}
                    render={
                      <Link href="/admin/users">
                        <Users />
                        <span>Usuários</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/admin/categories")}
                    render={
                      <Link href="/admin/categories">
                        <Tags />
                        <span>Categorias</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/admin/dashboard")}
                    render={
                      <Link href="/admin/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 py-3">
        <div className="flex items-center gap-2 rounded-md px-1 py-1">
          <UserAvatar name={session.name} className="size-8 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{session.name}</span>
            <span className="text-xs text-muted-foreground">
              {ROLE_LABELS[session.role] ?? session.role}
            </span>
          </div>
          <ThemeToggle className="ml-auto size-7 shrink-0" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <ChangePasswordDialog
              trigger={
                <SidebarMenuButton tooltip="Trocar senha">
                  <KeyRound />
                  <span>Trocar senha</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              disabled={loggingOut}
              onClick={handleLogout}
              tooltip="Sair"
            >
              <LogOut />
              <span>{loggingOut ? "Saindo..." : "Sair"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
