import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  Bot,
  Sparkles,
  Search,
  ArrowRightCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalPatients: number;
  upcomingAppointments: number;
  completedMeetings: number;
  pendingNotes: number;
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
      const res = await fetch(`/api/peers/chat/${patientId}`, { credentials: "include" });
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
      const res = await fetch("/api/peers/chat/send", {
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
    refetchInterval: 10000, // Refetch every 10 seconds for unread counts
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

  const statCards = [
    {
      title: "Total Patients",
      value: stats?.totalPatients ?? 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Upcoming Appointments",
      value: stats?.upcomingAppointments ?? 0,
      icon: Calendar,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Completed Meetings",
      value: stats?.completedMeetings ?? 0,
      icon: Video,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      title: "Pending Notes",
      value: stats?.pendingNotes ?? 0,
      icon: FileText,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
  ];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your practice today
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/doctor/qr">
            <Button variant="outline" className="gap-2 border-2 font-medium" data-testid="button-generate-qr">
              <QrCode className="w-4 h-4" />
              Generate QR
            </Button>
          </Link>
          <Link href="/doctor/appointments">
            <Button className="gap-2 shadow-lg font-semibold" data-testid="button-new-meeting">
              <Video className="w-4 h-4" />
              Schedule Meeting
            </Button>
          </Link>
        </div>
      </div>

      {/* Teddy Talk AI Assistant Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-chart-3/10 to-primary/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-chart-3/10 rounded-full blur-2xl"></div>
        <CardHeader className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-primary/20 border-primary/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered Assistant
                </Badge>
              </div>
              <CardTitle className="text-2xl mb-2">
                Talk to <span className="bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">Teddy</span>
              </CardTitle>
              <CardDescription className="text-base">
                Help your patients connect with specialized doctors using our AI assistant. Teddy matches patients with the right specialists based on their medical needs.
              </CardDescription>
            </div>
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center shrink-0">
              <Bot className="w-8 h-8 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-primary/10">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Smart Matching</p>
                <p className="text-xs text-muted-foreground">AI finds specialists</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-chart-3/10">
              <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-semibold">24/7 Available</p>
                <p className="text-xs text-muted-foreground">Always accessible</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-primary/10">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ArrowRightCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Quick Connect</p>
                <p className="text-xs text-muted-foreground">Instant referrals</p>
              </div>
            </div>
          </div>
          <Button 
            className="w-full gap-2 bg-gradient-to-r from-primary to-chart-3 hover:from-primary/90 hover:to-chart-3/90"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-teddy"));
            }}
          >
            <TeddyIcon className="w-4 h-4" size={16} />
            Talk to Teddy AI
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className="border-2 transition-all duration-300 hover:border-primary/20 hover:shadow-md group"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform shadow-sm`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <p className="text-3xl font-bold tracking-tight" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                  {stat.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">Upcoming Appointments</CardTitle>
              <CardDescription className="text-base">Your scheduled consultations</CardDescription>
            </div>
            <Link href="/doctor/appointments">
              <Button variant="ghost" size="sm" className="gap-1 font-medium">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
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
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${isMissed ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/30 border-transparent hover:border-primary/20'}`}
                      data-testid={`appointment-${apt.id}`}
                    >
                      <Avatar className="border-2 border-background shadow-sm">
                        <AvatarImage src={apt.patientAvatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {getInitials(apt.patientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{apt.patientName}</p>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(apt.scheduledAt)}
                        </div>
                        {isMissed && (
                          <Badge variant="destructive" className="mt-2 text-xs font-medium">Missed</Badge>
                        )}
                      </div>
                      {isMissed ? (
                        <Link href="/doctor/appointments">
                          <Button size="sm" variant="outline" className="border-2" data-testid={`button-reschedule-${apt.id}`}>
                            Reschedule
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/meeting/${apt.id}`}>
                          <Button size="sm" className="shadow-md font-medium" data-testid={`button-join-${apt.id}`}>
                            Join
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No upcoming appointments</p>
                <Link href="/doctor/appointments/new">
                  <Button variant="outline" size="sm" className="mt-4">
                    Schedule Appointment
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">Recent Patients</CardTitle>
              <CardDescription className="text-base">Patients you've seen recently</CardDescription>
            </div>
            <Link href="/doctor/patients">
              <Button variant="ghost" size="sm" className="gap-1 font-medium">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {patientsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentPatients && recentPatients.length > 0 ? (
              <div className="space-y-4">
                {recentPatients.slice(0, 5).map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-primary/20 bg-muted/30 transition-all duration-200 hover:shadow-md"
                    data-testid={`patient-${patient.id}`}
                  >
                    <Avatar className="border-2 border-background shadow-sm">
                      <AvatarImage src={patient.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{patient.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Last visit: {formatDate(patient.lastVisit)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 relative">
                            <MessageCircle className="w-3 h-3 flex-shrink-0" />
                            <span>Message</span>
                            {(patient.unreadMessageCount ?? 0) > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs font-semibold"
                              >
                                {(patient.unreadMessageCount ?? 0) > 9 ? "9+" : patient.unreadMessageCount}
                              </Badge>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 flex-wrap">
                              <span>Chat with {patient.name}</span>
                              {(patient.unreadMessageCount ?? 0) > 0 && (
                                <Badge variant="destructive" className="text-xs font-semibold">
                                  {(patient.unreadMessageCount ?? 0)} new message{(patient.unreadMessageCount ?? 0) > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </DialogTitle>
                          </DialogHeader>
                          <PatientChatDialog patientId={patient.userId || patient.id} patientName={patient.name} />
                        </DialogContent>
                      </Dialog>
                      <Link href={`/doctor/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" className="font-medium">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No patients linked yet</p>
                <Link href="/doctor/qr">
                  <Button variant="outline" size="sm" className="mt-4 gap-2">
                    <QrCode className="w-4 h-4" />
                    Generate QR to Link
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
          <CardDescription className="text-base">Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/doctor/qr">
              <div className="p-6 rounded-xl border-2 border-transparent hover:border-primary/20 hover:shadow-md cursor-pointer text-center space-y-3 transition-all duration-200 group">
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <QrCode className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-sm">Generate QR</p>
              </div>
            </Link>
            <Link href="/doctor/appointments">
              <div className="p-6 rounded-xl border-2 border-transparent hover:border-chart-2/20 hover:shadow-md cursor-pointer text-center space-y-3 transition-all duration-200 group">
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-chart-2/10 to-chart-2/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Video className="w-7 h-7 text-chart-2" />
                </div>
                <p className="font-semibold text-sm">Schedule Meeting</p>
              </div>
            </Link>
            <Link href="/doctor/surveys">
              <div className="p-6 rounded-xl border-2 border-transparent hover:border-chart-4/20 hover:shadow-md cursor-pointer text-center space-y-3 transition-all duration-200 group">
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-chart-4/10 to-chart-4/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7 text-chart-4" />
                </div>
                <p className="font-semibold text-sm">Create Survey</p>
              </div>
            </Link>
            <Link href="/doctor/notes">
              <div className="p-6 rounded-xl border-2 border-transparent hover:border-chart-5/20 hover:shadow-md cursor-pointer text-center space-y-3 transition-all duration-200 group">
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-chart-5/10 to-chart-5/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-chart-5" />
                </div>
                <p className="font-semibold text-sm">View Notes</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
