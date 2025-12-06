import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Stethoscope, Mail, MapPin, Star, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { StarRating } from "@/components/ui/star-rating";

interface Appointment {
  id: string;
  title?: string;
  scheduledAt?: string;
  status: string;
}

interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty?: string;
  city?: string;
  avatar?: string;
  bio?: string;
  linkedAt: string;
  avgRating?: number;
  reviewCount?: number;
  patientRating?: number;
  totalAppointments: number;
  completedAppointments: number;
  recentAppointments: Appointment[];
}

export default function DoctorDetail() {
  const [, params] = useRoute("/patient/doctors/:id");
  const doctorId = params?.id;

  const { data: doctor, isLoading } = useQuery<Doctor>({
    queryKey: [`/api/patient/doctors/${doctorId}`],
    enabled: !!doctorId,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Doctor not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patient/doctors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-4xl font-bold">Doctor Details</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={doctor.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(doctor.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{doctor.name}</CardTitle>
                <p className="text-muted-foreground">{doctor.email}</p>
                {doctor.specialty && (
                  <p className="text-sm text-muted-foreground mt-1">{doctor.specialty}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Linked since {new Date(doctor.linkedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {doctor.specialty && (
                <div className="flex items-start gap-3">
                  <Stethoscope className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Specialty</p>
                    <p>{doctor.specialty}</p>
                  </div>
                </div>
              )}
              {doctor.city && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">City</p>
                    <p>{doctor.city}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{doctor.email}</p>
                </div>
              </div>
            </div>

            {doctor.bio && (
              <div>
                <h3 className="font-semibold mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doctor.bio}</p>
              </div>
            )}

            {doctor.avgRating !== undefined && doctor.avgRating !== null && (
              <div>
                <h3 className="font-semibold mb-2">Rating</h3>
                <div className="flex items-center gap-3">
                  <StarRating rating={Math.round(doctor.avgRating)} size="lg" />
                  <span className="text-lg font-medium">
                    {doctor.avgRating.toFixed(1)}
                  </span>
                  {doctor.reviewCount !== undefined && doctor.reviewCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({doctor.reviewCount} review{doctor.reviewCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Recent Appointments</h3>
              {doctor.recentAppointments.length > 0 ? (
                <div className="space-y-2">
                  {doctor.recentAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{apt.title || "Consultation"}</p>
                        {apt.scheduledAt && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(apt.scheduledAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={apt.status === "completed" ? "outline" : "default"}>
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No appointments yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{doctor.totalAppointments}</p>
                  <p className="text-sm text-muted-foreground">Total Appointments</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{doctor.completedAppointments}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/patient/appointments?doctorId=${doctor.id}`}>
                <Button className="w-full" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              </Link>
              <Link href={`/patient/doctors?chat=${doctor.userId}`}>
                <Button className="w-full" variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

