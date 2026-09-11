import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { TicketNotifications } from "@/components/tickets/ticket-notifications";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/lib/session";
import { SessionProvider } from "@/lib/session-context";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProvider user={session}>
      <TicketNotifications />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <SidebarTrigger />
            <NotificationBell />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
