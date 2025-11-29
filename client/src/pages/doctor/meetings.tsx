import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Video,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Play,
} from "lucide-react";

interface Meeting {
  id: string;
  patientName: string;
  patientAvatar?: string;
  title?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: string;
  hasTranscript: boolean;
  hasNotes: boolean;
}

export default function DoctorMeetings() {
  const { data: meetings, isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/doctor/meetings"],
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startedAt?: string, endedAt?: string) => {
    if (!startedAt || !endedAt) return "N/A";
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="gap-1"><Clock className="w-3 h-3" /> Scheduled</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="gap-1"><Play className="w-3 h-3" /> In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const upcomingMeetings = meetings?.filter(m => m.status === "scheduled" || m.status === "in_progress") || [];
  const pastMeetings = meetings?.filter(m => m.status === "completed" || m.status === "cancelled") || [];

  const MeetingTable = ({ meetingsList }: { meetingsList: Meeting[] }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Date/Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Documentation</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetingsList.map((meeting) => (
            <TableRow key={meeting.id} data-testid={`meeting-row-${meeting.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={meeting.patientAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(meeting.patientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{meeting.patientName}</p>
                    {meeting.title && (
                      <p className="text-sm text-muted-foreground">{meeting.title}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {formatDate(meeting.scheduledAt)}
                </div>
              </TableCell>
              <TableCell>
                {formatDuration(meeting.startedAt, meeting.endedAt)}
              </TableCell>
              <TableCell>
                {getStatusBadge(meeting.status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {meeting.hasTranscript && (
                    <Badge variant="secondary" className="text-xs">
                      Transcript
                    </Badge>
                  )}
                  {meeting.hasNotes && (
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      Notes
                    </Badge>
                  )}
                  {!meeting.hasTranscript && !meeting.hasNotes && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {meeting.status === "scheduled" || meeting.status === "in_progress" ? (
                  <Link href={`/meeting/${meeting.id}`}>
                    <Button size="sm" className="gap-1" data-testid={`button-join-${meeting.id}`}>
                      <Video className="w-3 h-3" />
                      {meeting.status === "in_progress" ? "Rejoin" : "Start"}
                    </Button>
                  </Link>
                ) : meeting.hasNotes ? (
                  <Link href="/doctor/notes">
                    <Button variant="outline" size="sm" className="gap-1">
                      <FileText className="w-3 h-3" />
                      View Notes
                    </Button>
                  </Link>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-page-title">
            Meetings
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your video consultations
          </p>
        </div>
        <Link href="/doctor/appointments">
          <Button className="gap-2" data-testid="button-schedule">
            <Video className="w-4 h-4" />
            Schedule New Meeting
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming">
            <Clock className="w-4 h-4" />
            Upcoming
            {upcomingMeetings.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingMeetings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2" data-testid="tab-past">
            <CheckCircle className="w-4 h-4" />
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Upcoming Meetings</CardTitle>
              <CardDescription>
                {upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? "s" : ""} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : upcomingMeetings.length > 0 ? (
                <MeetingTable meetingsList={upcomingMeetings} />
              ) : (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No upcoming meetings</p>
                  <Link href="/doctor/appointments">
                    <Button variant="outline" size="sm" className="mt-4">
                      Schedule a Meeting
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Past Meetings</CardTitle>
              <CardDescription>
                View your completed consultations and documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : pastMeetings.length > 0 ? (
                <MeetingTable meetingsList={pastMeetings} />
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No past meetings yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
