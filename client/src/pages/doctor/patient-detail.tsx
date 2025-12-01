import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, FileText, Phone, MapPin, AlertCircle, Clock } from "lucide-react";
import { Link } from "wouter";

interface Appointment {
  id: string;
  title?: string;
  scheduledAt?: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  linkedAt: string;
  totalAppointments: number;
  surveysCompleted: number;
  recentAppointments: Appointment[];
}

export default function PatientDetail() {
  const [, params] = useRoute("/doctor/patients/:id");
  const patientId = params?.id;

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: [`/api/doctor/patients/${patientId}`],
    enabled: !!patientId,
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

  if (!patient) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Patient not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/doctor/patients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-4xl font-bold">Patient Details</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{patient.name}</CardTitle>
                <p className="text-muted-foreground">{patient.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Patient since {new Date(patient.linkedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {patient.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{patient.phone}</p>
                  </div>
                </div>
              )}
              {patient.dateOfBirth && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p>{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{patient.address}</p>
                  </div>
                </div>
              )}
              {patient.emergencyContact && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                    <p>{patient.emergencyContact}</p>
                  </div>
                </div>
              )}
            </div>

            {patient.medicalHistory && (
              <div>
                <h3 className="font-semibold mb-2">Medical History</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.medicalHistory}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Recent Appointments</h3>
              {patient.recentAppointments.length > 0 ? (
                <div className="space-y-2">
                  {patient.recentAppointments.map((apt) => (
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
                  <p className="text-2xl font-bold">{patient.totalAppointments}</p>
                  <p className="text-sm text-muted-foreground">Total Appointments</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{patient.surveysCompleted}</p>
                  <p className="text-sm text-muted-foreground">Surveys Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/doctor/patients/${patient.id}/survey`}>
                <Button className="w-full" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Assign Survey
                </Button>
              </Link>
              <Link href="/doctor/appointments">
                <Button className="w-full" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
