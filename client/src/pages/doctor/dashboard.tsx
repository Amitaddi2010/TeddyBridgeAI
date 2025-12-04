import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import {
  Calendar,
  Users,
  Video,
  QrCode,
  ArrowRight,
  Clock,
  FileText,
  Activity,
  MessageCircle,
  Send,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Monitor,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Play,
  X,
  Radio,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api-config";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalPatients: number;
  upcomingAppointments: number;
  completedMeetings: number;
  cancelledAppointments?: number;
  onlineConsultations?: number;
  pendingNotes: number;
  previousTotalPatients?: number;
  previousCompletedMeetings?: number;
  previousCancelledAppointments?: number;
  previousOnlineConsultations?: number;
  totalAppointments?: number;
  totalVideoConsultations?: number;
  totalRescheduled?: number;
  totalFollowUps?: number;
}

interface UpcomingAppointment {
  id: string;
  appointmentId?: string;
  patientName: string;
  patientAvatar?: string;
  patientId?: string;
  scheduledAt: string;
  title?: string;
  status?: string;
  meetingUrl?: string;
  isOnline?: boolean;
  specialty?: string;
}

interface RecentAppointment {
  id: string;
  appointmentId?: string;
  patientName: string;
  patientAvatar?: string;
  patientId?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  title?: string;
  status: string;
  meetingUrl?: string;
  isOnline?: boolean;
  specialty?: string;
  createdAt?: string;
}

interface TopPatient {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  phone?: string;
  appointmentCount: number;
  lastVisit?: string;
}

interface ChartData {
  date: string;
  completed: number;
  pending: number;
  cancelled: number;
}

function PatientChatDialog({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadMessages = async () => {
    try {
      const res = await fetch(getApiUrl(`/peers/chat/${patientId}`), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/peers/chat/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiverId: patientId, message: newMessage }),
      });
      
      if (res.ok) {
        setNewMessage("");
        await loadMessages();
      } else {
        const error = await res.json();
        toast({
          title: "Failed to send message",
          description: error.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return (
    <div className="space-y-4">
      <div className="h-96 overflow-y-auto space-y-3 p-4 border rounded-lg bg-muted/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs p-3 rounded-lg ${
                msg.senderId === user?.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card border-2"
              }`}>
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${
                  msg.senderId === user?.id ? "opacity-70" : "text-muted-foreground"
                }`}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
        />
        <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedAppointment, setSelectedAppointment] = useState<RecentAppointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/doctor/stats", { period: statsPeriod }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/doctor/stats?period=${statsPeriod}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<UpcomingAppointment[]>({
    queryKey: ["/api/doctor/appointments/upcoming", { filter: appointmentFilter }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/doctor/appointments/upcoming?filter=${appointmentFilter}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  const { data: recentAppointments, isLoading: recentAppointmentsLoading } = useQuery<RecentAppointment[]>({
    queryKey: ["/api/doctor/appointments/recent", { limit: 10 }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/doctor/appointments/recent?limit=10`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recent appointments");
      return res.json();
    },
  });

  const { data: topPatients, isLoading: topPatientsLoading } = useQuery<TopPatient[]>({
    queryKey: ["/api/doctor/patients/top", { period: 'week' }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/doctor/patients/top?period=week`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch top patients");
      return res.json();
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<ChartData[]>({
    queryKey: ["/api/doctor/appointments/statistics", { period: chartPeriod }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/doctor/appointments/statistics?period=${chartPeriod}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateGrowth = (current: number, previous: number | undefined): string | null => {
    if (previous === undefined || previous === 0) {
      return null;
    }
    if (current === 0 && previous === 0) {
      return null;
    }
    const growth = ((current - previous) / previous) * 100;
    return growth > 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"><Play className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statCards = [
    {
      title: "Total Appointments",
      value: stats?.totalAppointments ?? stats?.upcomingAppointments ?? 0,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      trend: null,
      subtitle: "All time",
    },
    {
      title: "Online Consultations",
      value: stats?.onlineConsultations ?? 0,
      icon: Video,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      trend: calculateGrowth(stats?.onlineConsultations ?? 0, stats?.previousOnlineConsultations),
      subtitle: `+${statsPeriod === 'week' ? '7' : statsPeriod === 'month' ? '30' : '365'} days`,
    },
    {
      title: "Completed Meetings",
      value: stats?.completedMeetings ?? 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      trend: calculateGrowth(stats?.completedMeetings ?? 0, stats?.previousCompletedMeetings),
      subtitle: `+${statsPeriod === 'week' ? '7' : statsPeriod === 'month' ? '30' : '365'} days`,
    },
    {
      title: "Cancelled Appointments",
      value: stats?.cancelledAppointments ?? 0,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
      trend: calculateGrowth(stats?.cancelledAppointments ?? 0, stats?.previousCancelledAppointments),
      subtitle: `+${statsPeriod === 'week' ? '7' : statsPeriod === 'month' ? '30' : '365'} days`,
    },
  ];

  const breakdownCards = [
    {
      title: "Total Appointments",
      value: stats?.totalAppointments ?? 0,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Video Consultation",
      value: stats?.totalVideoConsultations ?? 0,
      icon: Video,
      color: "text-purple-600",
    },
    {
      title: "Rescheduled",
      value: stats?.totalRescheduled ?? 0,
      icon: RefreshCw,
      color: "text-orange-600",
    },
    {
      title: "Follow Ups",
      value: stats?.totalFollowUps ?? 0,
      icon: UserPlus,
      color: "text-green-600",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Doctor Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.name?.split(" ")[0]}</span>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/doctor/appointments">
            <Button variant="outline" className="gap-2">
              <UserPlus className="w-4 h-4" />
              New Appointment
            </Button>
          </Link>
          <Link href="/doctor/qr">
            <Button variant="outline" className="gap-2" data-testid="button-generate-qr">
              <QrCode className="w-4 h-4" />
              Generate QR
            </Button>
          </Link>
          <Link href="/doctor/appointments">
            <Button className="gap-2 shadow-sm" data-testid="button-new-meeting">
              <Video className="w-4 h-4" />
              Schedule Meeting
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Period Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Appointment Statistics</h2>
        <Select value={statsPeriod} onValueChange={(value: 'week' | 'month' | 'year') => setStatsPeriod(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className={`border-2 ${stat.borderColor} ${stat.bgColor} transition-all duration-200 hover:shadow-lg`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center justify-between mt-1">
                    {stat.trend ? (
                      <p className={`text-xs flex items-center gap-1 ${
                        stat.trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {stat.trend.startsWith('+') ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {stat.trend}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No change</p>
                    )}
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Appointment Breakdown Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Breakdown</CardTitle>
          <CardDescription>Overview of all appointment types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {breakdownCards.map((card, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <div className={`p-2 rounded-lg bg-muted`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Upcoming Appointments</CardTitle>
                  <CardDescription className="text-sm">Your scheduled consultations</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={appointmentFilter} onValueChange={(value: 'all' | 'today' | 'week' | 'month') => setAppointmentFilter(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link href="/doctor/appointments">
                    <Button variant="ghost" size="sm" className="gap-1">
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {appointmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))}
                </div>
              ) : appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.slice(0, 5).map((apt) => {
                    const scheduledDate = new Date(apt.scheduledAt);
                    const now = new Date();
                    const gracePeriod = new Date(scheduledDate.getTime() + 30 * 60000);
                    const isMissed = now > gracePeriod;
                    
                    return (
                      <div
                        key={apt.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                          isMissed 
                            ? 'bg-destructive/5 border-destructive/20' 
                            : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        data-testid={`appointment-${apt.id}`}
                      >
                        <Avatar className="w-12 h-12 border-2">
                          <AvatarImage src={apt.patientAvatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(apt.patientName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">{apt.patientName}</p>
                            {apt.appointmentId && (
                              <Badge variant="outline" className="text-xs">#{apt.appointmentId}</Badge>
                            )}
                          </div>
                          {apt.title && (
                            <p className="text-sm text-muted-foreground mb-1">{apt.title}</p>
                          )}
                          {apt.specialty && (
                            <Badge variant="secondary" className="text-xs mr-2">{apt.specialty}</Badge>
                          )}
                          {apt.isOnline ? (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                              <Video className="w-3 h-3 mr-1" /> Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" /> In-Person
                            </Badge>
                          )}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(apt.scheduledAt)}
                          </div>
                          {isMissed && (
                            <Badge variant="destructive" className="mt-2 text-xs">Missed</Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {!isMissed && (
                            <Link href={`/meeting/${apt.id}`}>
                              <Button size="sm" data-testid={`button-join-${apt.id}`} className="w-full">
                                <Play className="w-4 h-4 mr-1" />
                                Start
                              </Button>
                            </Link>
                          )}
                          {apt.isOnline && (
                            <Link href={`/meeting/${apt.id}`}>
                              <Button size="sm" variant="outline" className="w-full">
                                <Video className="w-4 h-4 mr-1" />
                                Video
                              </Button>
                            </Link>
                          )}
                          {apt.patientId && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="w-full">
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Chat with {apt.patientName}</DialogTitle>
                                </DialogHeader>
                                <PatientChatDialog patientId={apt.patientId} patientName={apt.patientName} />
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No upcoming appointments</p>
                  <Link href="/doctor/appointments">
                    <Button variant="outline" size="sm" className="mt-4">
                      Schedule Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Appointments Table */}
          <Card>
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="text-lg font-semibold">Recent Appointments</CardTitle>
              <CardDescription>Latest appointment history</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentAppointmentsLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentAppointments && recentAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={apt.patientAvatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(apt.patientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{apt.patientName}</p>
                                {apt.appointmentId && (
                                  <p className="text-xs text-muted-foreground">#{apt.appointmentId}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(apt.scheduledAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {apt.isOnline ? (
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                <Video className="w-3 h-3 mr-1" /> Online
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <MapPin className="w-3 h-3 mr-1" /> In-Person
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(apt.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setShowAppointmentDetails(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {apt.status === 'scheduled' && (
                                <Link href={`/meeting/${apt.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Play className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No recent appointments</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Statistics Chart */}
          <Card>
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Appointment Statistics</CardTitle>
                  <CardDescription>Visual overview of appointment trends</CardDescription>
                </div>
                <Select value={chartPeriod} onValueChange={(value: 'weekly' | 'monthly' | 'yearly') => setChartPeriod(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {chartLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                    <Bar dataKey="pending" fill="#3b82f6" name="Pending" />
                    <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No chart data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Patients - Takes 1 column */}
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Top Patients</CardTitle>
                  <CardDescription className="text-sm">Most frequent patients</CardDescription>
                </div>
                <Link href="/doctor/patients">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {topPatientsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topPatients && topPatients.length > 0 ? (
                <div className="space-y-3">
                  {topPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
                      data-testid={`patient-${patient.id}`}
                    >
                      <Avatar className="w-10 h-10 border">
                        <AvatarImage src={patient.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(patient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{patient.name}</p>
                        {patient.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {patient.appointmentCount} appointment{patient.appointmentCount !== 1 ? 's' : ''}
                        </p>
                        {patient.lastVisit && (
                          <p className="text-xs text-muted-foreground">
                            Last visit: {formatDate(patient.lastVisit)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Chat with {patient.name}</DialogTitle>
                            </DialogHeader>
                            <PatientChatDialog patientId={patient.userId || patient.id} patientName={patient.name} />
                          </DialogContent>
                        </Dialog>
                        <Link href={`/doctor/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No patients yet</p>
                  <Link href="/doctor/qr">
                    <Button variant="outline" size="sm" className="mt-4 gap-2">
                      <QrCode className="w-4 h-4" />
                      Generate QR
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="max-w-2xl">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
                <DialogDescription>
                  {selectedAppointment.appointmentId && `#${selectedAppointment.appointmentId}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="font-semibold mb-2">Patient Information</h3>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedAppointment.patientAvatar} />
                      <AvatarFallback>
                        {getInitials(selectedAppointment.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedAppointment.patientName}</p>
                      {selectedAppointment.specialty && (
                        <p className="text-sm text-muted-foreground">{selectedAppointment.specialty}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Appointment Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm text-muted-foreground">Scheduled</span>
                      <span className="font-medium">{formatDateLong(selectedAppointment.scheduledAt)}</span>
                    </div>
                    {selectedAppointment.startedAt && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm text-muted-foreground">Started</span>
                        <span className="font-medium">{formatDateLong(selectedAppointment.startedAt)}</span>
                      </div>
                    )}
                    {selectedAppointment.endedAt && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm text-muted-foreground">Ended</span>
                        <span className="font-medium">{formatDateLong(selectedAppointment.endedAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {getStatusBadge(selectedAppointment.status)}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm text-muted-foreground">Mode</span>
                      {selectedAppointment.isOnline ? (
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          <Video className="w-3 h-3 mr-1" /> Online
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <MapPin className="w-3 h-3 mr-1" /> In-Person
                        </Badge>
                      )}
                    </div>
                    {selectedAppointment.title && (
                      <div className="p-2 bg-muted rounded">
                        <span className="text-sm text-muted-foreground">Reason:</span>
                        <p className="font-medium mt-1">{selectedAppointment.title}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                {selectedAppointment.status === 'scheduled' && (
                  <Link href={`/meeting/${selectedAppointment.id}`}>
                    <Button>
                      <Play className="w-4 h-4 mr-2" />
                      Start Appointment
                    </Button>
                  </Link>
                )}
                {selectedAppointment.patientId && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Chat with {selectedAppointment.patientName}</DialogTitle>
                      </DialogHeader>
                      <PatientChatDialog patientId={selectedAppointment.patientId} patientName={selectedAppointment.patientName} />
                    </DialogContent>
                  </Dialog>
                )}
                <Button variant="outline" onClick={() => setShowAppointmentDetails(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}