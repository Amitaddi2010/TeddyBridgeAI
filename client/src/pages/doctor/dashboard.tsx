import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TeddyIcon } from "@/components/teddy-icon";
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
  Sparkles,
  Search,
  ArrowRightCircle,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api-config";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalPatients: number;
  upcomingAppointments: number;
  completedMeetings: number;
  pendingNotes: number;
  previousTotalPatients?: number;
  previousCompletedMeetings?: number;
}

interface UpcomingAppointment {
  id: string;
  patientName: string;
  patientAvatar?: string;
  scheduledAt: string;
  title?: string;
}

interface RecentPatient {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  lastVisit: string;
  unreadMessageCount?: number;
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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/doctor/stats"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<UpcomingAppointment[]>({
    queryKey: ["/api/doctor/appointments/upcoming"],
  });

  const { data: recentPatients, isLoading: patientsLoading } = useQuery<RecentPatient[]>({
    queryKey: ["/api/doctor/patients/recent"],
    refetchInterval: 10000,
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

  // Helper function to calculate growth percentage
  const calculateGrowth = (current: number, previous: number | undefined): string | null => {
    if (previous === undefined || previous === 0) {
      return null; // No historical data
    }
    if (current === 0 && previous === 0) {
      return null; // Both are zero
    }
    const growth = ((current - previous) / previous) * 100;
    return growth > 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`;
  };

  const statCards = [
    {
      title: "Total Patients",
      value: stats?.totalPatients ?? 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      trend: calculateGrowth(stats?.totalPatients ?? 0, stats?.previousTotalPatients),
    },
    {
      title: "Upcoming Appointments",
      value: stats?.upcomingAppointments ?? 0,
      icon: Calendar,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      trend: null, // No historical data for appointments
    },
    {
      title: "Completed Meetings",
      value: stats?.completedMeetings ?? 0,
      icon: Video,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      trend: calculateGrowth(stats?.completedMeetings ?? 0, stats?.previousCompletedMeetings),
    },
    {
      title: "Pending Notes",
      value: stats?.pendingNotes ?? 0,
      icon: FileText,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      trend: null, // No historical data for pending notes
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.name?.split(" ")[0]}</span>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
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
                  {stat.trend ? (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${
                      stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className={`w-3 h-3 ${
                        stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600 rotate-180'
                      }`} />
                      {stat.trend} from last month
                    </p>
                  ) : stat.value === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">No data yet</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">No change</p>
                  )}
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
                  <CardDescription className="text-sm">Your scheduled consultations today</CardDescription>
                </div>
                <Link href="/doctor/appointments">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
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
                          <p className="font-semibold truncate">{apt.patientName}</p>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(apt.scheduledAt)}
                          </div>
                          {isMissed && (
                            <Badge variant="destructive" className="mt-2 text-xs">Missed</Badge>
                          )}
                        </div>
                        {isMissed ? (
                          <Link href="/doctor/appointments">
                            <Button size="sm" variant="outline">
                              Reschedule
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/meeting/${apt.id}`}>
                            <Button size="sm" data-testid={`button-join-${apt.id}`}>
                              Join
                            </Button>
                          </Link>
                        )}
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
        </div>

        {/* Recent Patients - Takes 1 column */}
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Patients</CardTitle>
                  <CardDescription className="text-sm">Recently visited patients</CardDescription>
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
              {patientsLoading ? (
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
              ) : recentPatients && recentPatients.length > 0 ? (
                <div className="space-y-3">
                  {recentPatients.slice(0, 5).map((patient) => (
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
                        <p className="text-xs text-muted-foreground">
                          {formatDate(patient.lastVisit)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                              <MessageCircle className="w-4 h-4" />
                              {(patient.unreadMessageCount ?? 0) > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center px-0.5 text-[10px]"
                                >
                                  {(patient.unreadMessageCount ?? 0) > 9 ? "9+" : patient.unreadMessageCount}
                                </Badge>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                Chat with {patient.name}
                                {(patient.unreadMessageCount ?? 0) > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {(patient.unreadMessageCount ?? 0)} new
                                  </Badge>
                                )}
                              </DialogTitle>
                            </DialogHeader>
                            <PatientChatDialog patientId={patient.userId || patient.id} patientName={patient.name} />
                          </DialogContent>
                        </Dialog>
                        <Link href={`/doctor/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="h-8">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No patients linked yet</p>
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

      {/* Quick Actions */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          <CardDescription className="text-sm">Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/doctor/qr">
              <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 cursor-pointer text-center space-y-2 transition-all group">
                <div className="w-12 h-12 mx-auto rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="font-medium text-sm">Generate QR</p>
              </div>
            </Link>
            <Link href="/doctor/appointments">
              <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 cursor-pointer text-center space-y-2 transition-all group">
                <div className="w-12 h-12 mx-auto rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="font-medium text-sm">Schedule Meeting</p>
              </div>
            </Link>
            <Link href="/doctor/surveys">
              <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 cursor-pointer text-center space-y-2 transition-all group">
                <div className="w-12 h-12 mx-auto rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-medium text-sm">Create Survey</p>
              </div>
            </Link>
            <Link href="/doctor/notes">
              <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 cursor-pointer text-center space-y-2 transition-all group">
                <div className="w-12 h-12 mx-auto rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="font-medium text-sm">View Notes</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
