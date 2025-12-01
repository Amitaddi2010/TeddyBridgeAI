import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
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
  Trash2,
  RefreshCw,
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
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(new Date());
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
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
      queryClient.refetchQueries({ queryKey: ["/api/doctor/appointments"] });
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

  const deleteMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await apiRequest("DELETE", `/api/meetings/${meetingId}/delete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/appointments"] });
      queryClient.refetchQueries({ queryKey: ["/api/doctor/appointments"] });
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete appointment",
        variant: "destructive",
      });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ meetingId, scheduledAt }: { meetingId: string; scheduledAt: string }) => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/reschedule`, { scheduledAt });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/appointments"] });
      queryClient.refetchQueries({ queryKey: ["/api/doctor/appointments"] });
      setShowRescheduleModal(false);
      setSelectedMeeting(null);
      toast({
        title: "Appointment Rescheduled",
        description: "The appointment has been rescheduled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to reschedule",
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
      case "missed":
        return <Badge variant="destructive" className="gap-1">Missed</Badge>;
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

  const handleReschedule = () => {
    if (!selectedMeeting || !rescheduleDate) {
      toast({
        title: "Missing information",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = rescheduleTime.split(":");
    const scheduledAt = new Date(rescheduleDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    rescheduleMutation.mutate({
      meetingId: selectedMeeting,
      scheduledAt: scheduledAt.toISOString(),
    });
  };

  const groupAppointmentsByStatus = (appointments: Appointment[]) => {
    const now = new Date();
    const upcoming: Appointment[] = [];
    const missed: Appointment[] = [];
    const completed = appointments?.filter(a => a.status === 'completed') || [];
    
    appointments?.forEach(apt => {
      const scheduledDate = new Date(apt.scheduledAt);
      const gracePeriod = new Date(scheduledDate.getTime() + 30 * 60000); // 30 minutes grace
      
      if (apt.status === 'missed') {
        missed.push(apt);
      } else if (apt.status === 'completed') {
        // Already filtered above
      } else if (apt.status === 'scheduled') {
        if (now > gracePeriod) {
          // Past the grace period, should be missed
          missed.push(apt);
        } else {
          // Still upcoming
          upcoming.push(apt);
        }
      } else {
        upcoming.push(apt);
      }
    });
    
    return { upcoming, missed, completed };
  };

  const { upcoming, missed, completed } = appointments ? groupAppointmentsByStatus(appointments) : { upcoming: [], missed: [], completed: [] };

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

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="gap-1">
            <Clock className="w-4 h-4 hidden sm:inline" />
            <span>Upcoming</span>
            <Badge variant="secondary" className="ml-1">{upcoming.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="missed" className="gap-1">
            <span>Missed</span>
            {missed.length > 0 && <Badge variant="destructive" className="ml-1">{missed.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <span>Done</span>
            <Badge variant="outline" className="ml-1">{completed.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
              <CardDescription>
                {upcoming.length} scheduled appointments
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
              ) : upcoming.length > 0 ? (
                <div className="space-y-3">
                  {upcoming.map((apt) => (
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
                              <>
                                <Link href={`/meeting/${apt.id}`}>
                                  <Button size="sm" className="gap-1" data-testid={`button-start-${apt.id}`}>
                                    <Video className="w-3 h-3" />
                                    Start
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(apt.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${apt.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
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
        </TabsContent>

        <TabsContent value="missed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Missed Appointments</CardTitle>
              <CardDescription>
                {missed.length} appointments not attended
              </CardDescription>
            </CardHeader>
            <CardContent>
              {missed.length > 0 ? (
                <div className="space-y-3">
                  {missed.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-destructive/5"
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
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(apt.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMeeting(apt.id);
                            setShowRescheduleModal(true);
                          }}
                          className="gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(apt.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No missed appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Completed Appointments</CardTitle>
              <CardDescription>
                {completed.length} appointments completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completed.length > 0 ? (
                <div className="space-y-3">
                  {completed.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-4 rounded-lg border"
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
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No completed appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule Appointment
            </DialogTitle>
            <DialogDescription>
              Create a new video consultation with a patient
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient
                </Label>
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
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={newAppointment.time}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, time: e.target.value })
                  }
                  data-testid="input-time"
                  className="text-lg"
                />
              </div>

              {selectedDate && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium mb-1">Selected Date & Time</p>
                  <p className="text-lg font-bold">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    at {newAppointment.time}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Select Date
              </Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border w-full"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={createMutation.isPending || !newAppointment.patientId}
              className="gap-2 w-full sm:w-auto"
              data-testid="button-create"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CalendarIcon className="w-4 h-4" />
              Schedule Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for this appointment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={setRescheduleDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduleMutation.isPending || !rescheduleDate}
              className="gap-2"
            >
              {rescheduleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
