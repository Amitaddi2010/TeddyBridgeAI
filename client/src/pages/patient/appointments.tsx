import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  Stethoscope,
} from "lucide-react";

interface Appointment {
  id: string;
  doctorName: string;
  doctorAvatar?: string;
  specialty?: string;
  title?: string;
  scheduledAt: string;
  status: string;
}

export default function PatientAppointments() {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/patient/appointments"],
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
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="gap-1"><Clock className="w-3 h-3" /> Scheduled</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="gap-1"><Video className="w-3 h-3" /> In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const upcomingAppointments = appointments?.filter(a => a.status === "scheduled" || a.status === "in_progress") || [];
  const pastAppointments = appointments?.filter(a => a.status === "completed" || a.status === "cancelled") || [];

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="hover-elevate" data-testid={`appointment-${appointment.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={appointment.doctorAvatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(appointment.doctorName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{appointment.doctorName}</CardTitle>
              {appointment.specialty && (
                <CardDescription>{appointment.specialty}</CardDescription>
              )}
            </div>
          </div>
          {getStatusBadge(appointment.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointment.title && (
          <p className="text-sm text-muted-foreground">{appointment.title}</p>
        )}
        
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{formatDate(appointment.scheduledAt)}</span>
        </div>

        {(appointment.status === "scheduled" || appointment.status === "in_progress") && (
          <Link href={`/meeting/${appointment.id}`}>
            <Button className="w-full gap-2" data-testid={`button-join-${appointment.id}`}>
              <Video className="w-4 h-4" />
              {appointment.status === "in_progress" ? "Rejoin Call" : "Join Call"}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-page-title">
          Appointments
        </h1>
        <p className="text-muted-foreground mt-1">
          View your scheduled consultations with healthcare providers
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming">
            <Clock className="w-4 h-4" />
            Upcoming
            {upcomingAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2" data-testid="tab-past">
            <CheckCircle className="w-4 h-4" />
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Upcoming Appointments</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You don't have any scheduled appointments. Contact your doctor to schedule a consultation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pastAppointments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Past Appointments</h3>
                  <p className="text-muted-foreground">
                    Your appointment history will appear here after your first consultation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
