import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ClipboardList,
  Home,
  LogOut,
  QrCode,
  Settings,
  Stethoscope,
  Users,
  Video,
  FileText,
  Activity,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const doctorMenuItems = [
  { title: "Dashboard", url: "/doctor/dashboard", icon: Home },
  { title: "Appointments", url: "/doctor/appointments", icon: Calendar },
  { title: "Patients", url: "/doctor/patients", icon: Users },
  { title: "Meetings", url: "/doctor/meetings", icon: Video },
  { title: "Call Notes", url: "/doctor/notes", icon: FileText },
  { title: "Surveys", url: "/doctor/surveys", icon: ClipboardList },
  { title: "PROMS Monitor", url: "/doctor/monitor", icon: Activity },
  { title: "Peer Network", url: "/peer-network", icon: MessageCircle },
  { title: "Generate QR", url: "/doctor/qr", icon: QrCode },
];

const patientMenuItems = [
  { title: "Dashboard", url: "/patient/dashboard", icon: Home },
  { title: "My Doctors", url: "/patient/doctors", icon: Stethoscope },
  { title: "Appointments", url: "/patient/appointments", icon: Calendar },
  { title: "Surveys", url: "/patient/surveys", icon: ClipboardList },
  { title: "Peer Network", url: "/peer-network", icon: MessageCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const menuItems = user?.role === "doctor" ? doctorMenuItems : patientMenuItems;

  // Get unread message count
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/peers/chat/unread-count"],
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!user, // Only fetch if user is logged in
  });

  const unreadMessageCount = unreadData?.unreadCount || 0;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                TeddyBridge
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Your PROMS AI assistant</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarSeparator />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    className="relative"
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.title === "Peer Network" && unreadMessageCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute right-2 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                        >
                          {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator />
        
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/settings"}
                  tooltip="Settings"
                >
                  <Link href="/settings" data-testid="nav-settings">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent border-2 border-transparent hover:border-primary/20 transition-all duration-200">
          <Avatar className="w-11 h-11 border-2 border-background shadow-sm">
            <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
              {user?.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" data-testid="text-user-name">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize font-medium" data-testid="text-user-role">
              {user?.role}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="shrink-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
