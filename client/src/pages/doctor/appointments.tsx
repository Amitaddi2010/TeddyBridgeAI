import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Video,
  User,
  Loader2,
} from "lucide-react";

interface Appointment {
  id: string;
  patientName: string;
  patientAvatar?: string;
  patientId: string;
  scheduledAt: string;
  title?: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  avatar?: string;
}

export default function DoctorAppointments() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newAppointment, setNewAppointment] = useState({
    patientId: "",
    title: "",
    time: "09:00",
  });

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/doctor/appointments"],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/doctor/patients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/meetings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/appointments"] });
      setShowCreateModal(false);
      setNewAppointment({ patientId: "", title: "", time: "09:00" });
      toast({
        title: "Appointment Created",
        description: "The patient will be notified of the scheduled appointment.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create appointment",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
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
        return <Badge variant="outline" className="gap-1">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateAppointment = () => {
    if (!selectedDate || !newAppointment.patientId) {
      toast({
        title: "Missing information",
        description: "Please select a patient and date",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = newAppointment.time.split(":");
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    createMutation.mutate({
      patientId: newAppointment.patientId,
      title: newAppointment.title || "Video Consultation",
      scheduledAt: scheduledAt.toISOString(),
      status: "scheduled",
    });
  };

  const groupAppointmentsByDate = (appointments: Appointment[]) => {
    const grouped: Record<string, Appointment[]> = {};
    appointments?.forEach((apt) => {
      const dateKey = new Date(apt.scheduledAt).toLocaleDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    return grouped;
  };

  const groupedAppointments = appointments ? groupAppointmentsByDate(appointments) : {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-page-title">
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your scheduled consultations
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
          data-testid="button-new-appointment"
        >
          <Plus className="w-4 h-4" />
          Schedule Appointment
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">All Appointments</CardTitle>
            <CardDescription>
              {appointments?.length ?? 0} appointments scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedAppointments).map(([date, apts]) => (
                  <div key={date}>
                    <h3 className="font-medium text-sm text-muted-foreground mb-3">
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    <div className="space-y-3">
                      {apts.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
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
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDate(apt.scheduledAt)}
                            </div>
                            {apt.title && (
                              <p className="text-sm text-muted-foreground truncate">{apt.title}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(apt.status)}
                            {apt.status === "scheduled" && (
                              <Link href={`/meeting/${apt.id}`}>
                                <Button size="sm" className="gap-1" data-testid={`button-start-${apt.id}`}>
                                  <Video className="w-3 h-3" />
                                  Start
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No appointments scheduled</p>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Schedule Your First Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              Create a new video consultation with a patient
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient</Label>
              <Select
                value={newAppointment.patientId}
                onValueChange={(value) =>
                  setNewAppointment({ ...newAppointment, patientId: value })
                }
              >
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {patient.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Follow-up Consultation"
                value={newAppointment.title}
                onChange={(e) =>
                  setNewAppointment({ ...newAppointment, title: e.target.value })
                }
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={newAppointment.time}
                onChange={(e) =>
                  setNewAppointment({ ...newAppointment, time: e.target.value })
                }
                data-testid="input-time"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={createMutation.isPending || !newAppointment.patientId}
              className="gap-2"
              data-testid="button-create"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
