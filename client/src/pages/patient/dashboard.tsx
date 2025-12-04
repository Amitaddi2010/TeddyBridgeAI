import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Calendar,
  Stethoscope,
  ClipboardList,
  ArrowRight,
  Clock,
  Video,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  XCircle,
  Star,
  MessageCircle,
  MapPin,
  Phone,
  Eye,
  Play,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api-config";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalDoctors: number;
  upcomingAppointments: number;
  completedAppointments?: number;
  cancelledAppointments?: number;
  totalConsultations?: number;
  pendingSurveys: number;
  completedSurveys: number;
  previousTotalDoctors?: number;
  previousCompletedSurveys?: number;
  previousCompletedAppointments?: number;
  previousCancelledAppointments?: number;
}

interface LinkedDoctor {
  id: string;
  userId?: string;
  name: string;
  specialty?: string;
  avatar?: string;
  linkedAt: string;
  avgRating?: number;
  reviewCount?: number;
  patientRating?: number;
  unreadMessageCount?: number;
  appointmentCount?: number;
  lastConsultation?: string;
}

interface UpcomingAppointment {
  id: string;
  appointmentId?: string;
  doctorName: string;
  doctorAvatar?: string;
  doctorId?: string;
  specialty?: string;
  scheduledAt: string;
  title?: string;
  status?: string;
  meetingUrl?: string;
  isOnline?: boolean;
}

interface RecentAppointment {
  id: string;
  appointmentId?: string;
  doctorName: string;
  doctorAvatar?: string;
  doctorId?: string;
  specialty?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  title?: string;
  status: string;
  meetingUrl?: string;
  isOnline?: boolean;
  createdAt?: string;
}

interface PendingSurvey {
  id: string;
  title: string;
  doctorName: string;
  assignedAt: string;
  questionCount?: number;
}

interface ChartData {
  date: string;
  completed: number;
  upcoming: number;
  cancelled: number;
}

function DoctorChatDialog({ doctorId, doctorName }: { doctorId: string; doctorName: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadMessages = async () => {
    try {
      const res = await fetch(getApiUrl(`/peers/chat/${doctorId}`), { credentials: "include" });
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
        body: JSON.stringify({ receiverId: doctorId, message: newMessage }),
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
  }, [doctorId]);

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

export default function PatientDashboard() {
  const { user } = useAuth();
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedAppointment, setSelectedAppointment] = useState<RecentAppointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/patient/stats", { period: statsPeriod }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/patient/stats?period=${statsPeriod}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 5000,
    refetchOnMount: true,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<UpcomingAppointment[]>({
    queryKey: ["/api/patient/appointments/upcoming", { filter: appointmentFilter }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/patient/appointments/upcoming?filter=${appointmentFilter}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  const { data: recentAppointments, isLoading: recentAppointmentsLoading } = useQuery<RecentAppointment[]>({
    queryKey: ["/api/patient/appointments/recent", { limit: 10 }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/patient/appointments/recent?limit=10`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recent appointments");
      return res.json();
    },
  });

  const { data: doctors, isLoading: doctorsLoading } = useQuery<LinkedDoctor[]>({
    queryKey: ["/api/patient/doctors"],
  });

  const { data: surveys, isLoading: surveysLoading } = useQuery<PendingSurvey[]>({
    queryKey: ["/api/patient/surveys/pending"],
  });

  const { data: completedSurveys } = useQuery({
    queryKey: ["/api/patient/surveys/completed"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/patient/surveys/completed"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch completed surveys");
      return res.json();
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<ChartData[]>({
    queryKey: ["/api/patient/appointments/statistics", { period: chartPeriod }],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/patient/appointments/statistics?period=${chartPeriod}`), { credentials: "include" });
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

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const statCards = [
    {
      title: "My Doctors",
      value: stats?.totalDoctors ?? 0,
      icon: Stethoscope,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      trend: calculateGrowth(stats?.totalDoctors ?? 0, stats?.previousTotalDoctors),
      subtitle: `+${statsPeriod === 'week' ? '7' : statsPeriod === 'month' ? '30' : '365'} days`,
    },
    {
      title: "Upcoming Appointments",
      value: stats?.upcomingAppointments ?? 0,
      icon: Calendar,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      trend: null,
      subtitle: null,
    },
    {
      title: "Completed Appointments",
      value: stats?.completedAppointments ?? 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      trend: calculateGrowth(stats?.completedAppointments ?? 0, stats?.previousCompletedAppointments),
      subtitle: `+${statsPeriod === 'week' ? '7' : statsPeriod === 'month' ? '30' : '365'} days`,
    },
    {
      title: "Total Consultations",
      value: stats?.totalConsultations ?? 0,
      icon: Video,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      trend: null,
      subtitle: "All time",
    },
  ];

  const surveyProgress = {
    total: (surveys?.length ?? 0) + (completedSurveys?.length ?? 0),
    completed: completedSurveys?.length ?? 0,
    pending: surveys?.length ?? 0,
  };

  const surveyChartData = [
    { name: 'Completed', value: surveyProgress.completed, color: '#22c55e' },
    { name: 'Pending', value: surveyProgress.pending, color: '#f59e0b' },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Patient Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.name?.split(" ")[0]}</span>
          </p>
        </div>
      </div>

      {/* Stats Period Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Health Statistics</h2>
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
                  <Link href="/patient/appointments">
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
                  {appointments.slice(0, 5).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                      data-testid={`appointment-${apt.id}`}
                    >
                      <Avatar className="w-12 h-12 border-2">
                        <AvatarImage src={apt.doctorAvatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(apt.doctorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{apt.doctorName}</p>
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
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link href={`/meeting/${apt.id}`}>
                          <Button size="sm" data-testid={`button-join-${apt.id}`} className="w-full">
                            <Play className="w-4 h-4 mr-1" />
                            Join
                          </Button>
                        </Link>
                        {apt.doctorId && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="w-full">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Chat with Dr. {apt.doctorName}</DialogTitle>
                              </DialogHeader>
                              <DoctorChatDialog doctorId={apt.doctorId} doctorName={apt.doctorName} />
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No upcoming appointments</p>
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
                        <TableHead>Doctor</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
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
                                <AvatarImage src={apt.doctorAvatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(apt.doctorName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{apt.doctorName}</p>
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
                    <Bar dataKey="upcoming" fill="#3b82f6" name="Upcoming" />
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

          {/* Survey Progress Section */}
          <Card>
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Survey Progress</CardTitle>
                  <CardDescription>Track your health questionnaire completion</CardDescription>
                </div>
                <Link href="/patient/surveys">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Completion Overview</h3>
                  {surveyProgress.total > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Completion Rate</span>
                          <span className="font-semibold">
                            {((surveyProgress.completed / surveyProgress.total) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${(surveyProgress.completed / surveyProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30">
                          <p className="text-2xl font-bold text-green-600">{surveyProgress.completed}</p>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/30">
                          <p className="text-2xl font-bold text-orange-600">{surveyProgress.pending}</p>
                          <p className="text-sm text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No surveys assigned yet</p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Pending Surveys</h3>
                  {surveysLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : surveys && surveys.length > 0 ? (
                    <div className="space-y-2">
                      {surveys.slice(0, 3).map((survey) => (
                        <Card key={survey.id} className="border hover:border-primary/50 transition-all">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{survey.title}</p>
                                <p className="text-xs text-muted-foreground">From Dr. {survey.doctorName}</p>
                                {survey.questionCount !== undefined && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {survey.questionCount} questions
                                  </p>
                                )}
                              </div>
                              <Link href={`/survey/${survey.id}`}>
                                <Button size="sm">Take</Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>All surveys completed!</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Doctors - Takes 1 column */}
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">My Doctors</CardTitle>
                  <CardDescription className="text-sm">Healthcare providers</CardDescription>
                </div>
                <Link href="/patient/doctors">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {doctorsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : doctors && doctors.length > 0 ? (
                <div className="space-y-3">
                  {doctors.slice(0, 6).map((doctor) => (
                    <div
                      key={doctor.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
                      data-testid={`doctor-${doctor.id}`}
                    >
                      <Avatar className="w-10 h-10 border">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{doctor.name}</p>
                          {doctor.avgRating && renderStars(doctor.avgRating)}
                        </div>
                        {doctor.specialty && (
                          <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                        )}
                        {doctor.appointmentCount !== undefined && doctor.appointmentCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {doctor.appointmentCount} consultation{doctor.appointmentCount !== 1 ? 's' : ''}
                          </p>
                        )}
                        {doctor.lastConsultation && (
                          <p className="text-xs text-muted-foreground">
                            Last: {formatDate(doctor.lastConsultation)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {doctor.userId && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                                <MessageCircle className="w-4 h-4" />
                                {(doctor.unreadMessageCount ?? 0) > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center px-0.5 text-[10px]"
                                  >
                                    {(doctor.unreadMessageCount ?? 0) > 9 ? "9+" : doctor.unreadMessageCount}
                                  </Badge>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Chat with Dr. {doctor.name}</DialogTitle>
                              </DialogHeader>
                              <DoctorChatDialog doctorId={doctor.userId} doctorName={doctor.name} />
                            </DialogContent>
                          </Dialog>
                        )}
                        <Link href={`/patient/doctors/${doctor.id}`}>
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
                  <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium mb-2">No doctors linked yet</p>
                  <p className="text-xs text-muted-foreground">
                    Scan a QR code from your doctor to get started
                  </p>
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
                  <h3 className="font-semibold mb-2">Doctor Information</h3>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedAppointment.doctorAvatar} />
                      <AvatarFallback>
                        {getInitials(selectedAppointment.doctorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Dr. {selectedAppointment.doctorName}</p>
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
                      Join Appointment
                    </Button>
                  </Link>
                )}
                {selectedAppointment.doctorId && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Chat with Dr. {selectedAppointment.doctorName}</DialogTitle>
                      </DialogHeader>
                      <DoctorChatDialog doctorId={selectedAppointment.doctorId} doctorName={selectedAppointment.doctorName} />
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
