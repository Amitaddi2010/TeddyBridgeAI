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
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

interface DashboardStats {
  totalDoctors: number;
  upcomingAppointments: number;
  pendingSurveys: number;
  completedSurveys: number;
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

  const statCards = [
    {
      title: "My Doctors",
      value: stats?.totalDoctors ?? 0,
      icon: Stethoscope,
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
      title: "Pending Surveys",
      value: stats?.pendingSurveys ?? 0,
      icon: ClipboardList,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      title: "Completed Surveys",
      value: stats?.completedSurveys ?? 0,
      icon: CheckCircle,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-dashboard-title">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your healthcare appointments and surveys
        </p>
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
              <CardTitle className="text-xl">My Doctors</CardTitle>
              <CardDescription>Healthcare providers linked to you</CardDescription>
            </div>
            <Link href="/patient/doctors">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {doctorsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : doctors && doctors.length > 0 ? (
              <div className="space-y-4">
                {doctors.slice(0, 4).map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover-elevate bg-muted/30"
                    data-testid={`doctor-${doctor.id}`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={doctor.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(doctor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doctor.name}</p>
                      {doctor.specialty && (
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Stethoscope className="w-3 h-3 mr-1" />
                      Doctor
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No doctors linked yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan a QR code from your doctor to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
              <CardDescription>Your scheduled consultations</CardDescription>
            </div>
            <Link href="/patient/appointments">
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
                {appointments.slice(0, 4).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover-elevate bg-muted/30"
                    data-testid={`appointment-${apt.id}`}
                  >
                    <Avatar>
                      <AvatarImage src={apt.doctorAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(apt.doctorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.doctorName}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(apt.scheduledAt)}
                      </div>
                    </div>
                    <Link href={`/meeting/${apt.id}`}>
                      <Button size="sm" className="gap-1" data-testid={`button-join-${apt.id}`}>
                        <Video className="w-3 h-3" />
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Pending Surveys</CardTitle>
            <CardDescription>Health questionnaires from your doctors</CardDescription>
          </div>
          <Link href="/patient/surveys">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : surveys && surveys.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveys.slice(0, 6).map((survey) => (
                <Card key={survey.id} className="hover-elevate" data-testid={`survey-${survey.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{survey.title}</CardTitle>
                    <CardDescription>From Dr. {survey.doctorName}</CardDescription>
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
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No pending surveys</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
