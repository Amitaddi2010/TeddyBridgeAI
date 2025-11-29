import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Users,
  Video,
  QrCode,
  ArrowRight,
  Clock,
  FileText,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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
  name: string;
  avatar?: string;
  lastVisit: string;
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-dashboard-title">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your practice today
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/doctor/qr">
            <Button variant="outline" className="gap-2" data-testid="button-generate-qr">
              <QrCode className="w-4 h-4" />
              Generate QR
            </Button>
          </Link>
          <Link href="/doctor/meetings/new">
            <Button className="gap-2" data-testid="button-new-meeting">
              <Video className="w-4 h-4" />
              Start Meeting
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                  {stat.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
              <CardDescription>Your scheduled consultations</CardDescription>
            </div>
            <Link href="/doctor/appointments">
              <Button variant="ghost" size="sm" className="gap-1">
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
                {appointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover-elevate bg-muted/30"
                    data-testid={`appointment-${apt.id}`}
                  >
                    <Avatar>
                      <AvatarImage src={apt.patientAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(apt.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.patientName}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(apt.scheduledAt)}
                      </div>
                    </div>
                    <Link href={`/meeting/${apt.id}`}>
                      <Button size="sm" data-testid={`button-join-${apt.id}`}>
                        Join
                      </Button>
                    </Link>
                  </div>
                ))}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Recent Patients</CardTitle>
              <CardDescription>Patients you've seen recently</CardDescription>
            </div>
            <Link href="/doctor/patients">
              <Button variant="ghost" size="sm" className="gap-1">
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
                    className="flex items-center gap-4 p-3 rounded-lg hover-elevate bg-muted/30"
                    data-testid={`patient-${patient.id}`}
                  >
                    <Avatar>
                      <AvatarImage src={patient.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last visit: {formatDate(patient.lastVisit)}
                      </p>
                    </div>
                    <Link href={`/doctor/patients/${patient.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/doctor/qr">
              <div className="p-4 rounded-lg border hover-elevate cursor-pointer text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-sm">Generate QR</p>
              </div>
            </Link>
            <Link href="/doctor/meetings/new">
              <div className="p-4 rounded-lg border hover-elevate cursor-pointer text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-chart-2" />
                </div>
                <p className="font-medium text-sm">New Meeting</p>
              </div>
            </Link>
            <Link href="/doctor/surveys/new">
              <div className="p-4 rounded-lg border hover-elevate cursor-pointer text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-chart-4" />
                </div>
                <p className="font-medium text-sm">Create Survey</p>
              </div>
            </Link>
            <Link href="/doctor/notes">
              <div className="p-4 rounded-lg border hover-elevate cursor-pointer text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-chart-5" />
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
