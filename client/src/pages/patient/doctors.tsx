import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  Calendar,
  Video,
  Mail,
  QrCode,
} from "lucide-react";

interface LinkedDoctor {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  avatar?: string;
  bio?: string;
  linkedAt: string;
}

export default function PatientDoctors() {
  const { data: doctors, isLoading } = useQuery<LinkedDoctor[]>({
    queryKey: ["/api/patient/doctors"],
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
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-page-title">
          My Doctors
        </h1>
        <p className="text-muted-foreground mt-1">
          Healthcare providers linked to your account
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Linked Providers</CardTitle>
          <CardDescription>
            {doctors?.length ?? 0} doctor{(doctors?.length ?? 0) !== 1 ? "s" : ""} linked to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : doctors && doctors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="hover-elevate" data-testid={`doctor-${doctor.id}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                        {doctor.specialty && (
                          <CardDescription>{doctor.specialty}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {doctor.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {doctor.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{doctor.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Linked on {formatDate(doctor.linkedAt)}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" data-testid={`button-message-${doctor.id}`}>
                        <Mail className="w-3 h-3" />
                        Message
                      </Button>
                      <Link href="/patient/appointments">
                        <Button size="sm" className="gap-1" data-testid={`button-schedule-${doctor.id}`}>
                          <Video className="w-3 h-3" />
                          Schedule
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Doctors Linked</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                To connect with a healthcare provider, ask your doctor for a QR code 
                that you can scan to link your accounts.
              </p>
              <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50 border max-w-sm mx-auto">
                <QrCode className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">How to connect</p>
                  <p className="text-xs text-muted-foreground">
                    Scan your doctor's QR code to link your accounts instantly
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
