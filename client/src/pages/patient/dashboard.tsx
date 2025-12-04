import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Stethoscope,
  ClipboardList,
  ArrowRight,
  Clock,
  Video,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { TeddyIcon } from "@/components/teddy-icon";

interface DashboardStats {
  totalDoctors: number;
  upcomingAppointments: number;
  pendingSurveys: number;
  completedSurveys: number;
  previousTotalDoctors?: number;
  previousCompletedSurveys?: number;
}

interface LinkedDoctor {
  id: string;
  name: string;
  specialty?: string;
  avatar?: string;
  linkedAt: string;
}

interface UpcomingAppointment {
  id: string;
  doctorName: string;
  doctorAvatar?: string;
  scheduledAt: string;
  title?: string;
}

interface PendingSurvey {
  id: string;
  title: string;
  doctorName: string;
  assignedAt: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/patient/stats"],
    refetchInterval: 5000, // Refetch every 5 seconds to catch new links
    refetchOnMount: true,
  });

  const { data: doctors, isLoading: doctorsLoading } = useQuery<LinkedDoctor[]>({
    queryKey: ["/api/patient/doctors"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<UpcomingAppointment[]>({
    queryKey: ["/api/patient/appointments/upcoming"],
  });

  const { data: surveys, isLoading: surveysLoading } = useQuery<PendingSurvey[]>({
    queryKey: ["/api/patient/surveys/pending"],
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
      title: "My Doctors",
      value: stats?.totalDoctors ?? 0,
      icon: Stethoscope,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      trend: calculateGrowth(stats?.totalDoctors ?? 0, stats?.previousTotalDoctors),
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
      title: "Pending Surveys",
      value: stats?.pendingSurveys ?? 0,
      icon: ClipboardList,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      trend: null, // No historical data for pending surveys
    },
    {
      title: "Completed Surveys",
      value: stats?.completedSurveys ?? 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      trend: calculateGrowth(stats?.completedSurveys ?? 0, stats?.previousCompletedSurveys),
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
                  <CardDescription className="text-sm">Your scheduled consultations</CardDescription>
                </div>
                <Link href="/patient/appointments">
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
                        <p className="font-semibold truncate">{apt.doctorName}</p>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(apt.scheduledAt)}
                        </div>
                      </div>
                      <Link href={`/meeting/${apt.id}`}>
                        <Button size="sm" data-testid={`button-join-${apt.id}`}>
                          <Video className="w-4 h-4 mr-2" />
                          Join
                        </Button>
                      </Link>
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

          {/* Pending Surveys */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Pending Surveys</CardTitle>
                  <CardDescription className="text-sm">Health questionnaires from your doctors</CardDescription>
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
              {surveysLoading ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : surveys && surveys.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {surveys.slice(0, 4).map((survey) => (
                    <Card 
                      key={survey.id} 
                      className="border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                      data-testid={`survey-${survey.id}`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{survey.title}</CardTitle>
                        <CardDescription className="text-sm">From Dr. {survey.doctorName}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Assigned {formatDate(survey.assignedAt).split(",")[0]}
                          </span>
                          <Link href={`/survey/${survey.id}`}>
                            <Button size="sm" data-testid={`button-take-survey-${survey.id}`}>
                              Take Survey
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No pending surveys</p>
                </div>
              )}
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
                  <CardDescription className="text-sm">Healthcare providers linked to you</CardDescription>
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
                        <p className="font-medium text-sm truncate">{doctor.name}</p>
                        {doctor.specialty && (
                          <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        <Stethoscope className="w-3 h-3 mr-1" />
                        MD
                      </Badge>
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
    </div>
  );
}
