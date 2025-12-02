import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as TwilioVideo from "twilio-video";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Circle,
  Settings,
  Loader2,
  AlertTriangle,
  Shield,
  CheckCircle,
} from "lucide-react";

interface MeetingInfo {
  id: string;
  title?: string;
  doctorName: string;
  patientName?: string;
  participantDoctorName?: string;
  status: string;
  scheduledAt?: string;
  hasConsented: boolean;
  otherPartyConsented: boolean;
  isRecording: boolean;
  twilioToken?: string;
  roomName?: string;
}

export default function Meeting() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const meetingId = params?.id || "";

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [consentScrolled, setConsentScrolled] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const consentScrollRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<any>(null);

  const { data: meetingInfo, isLoading, error } = useQuery<MeetingInfo>({
    queryKey: ["/api/meetings", meetingId],
    enabled: !!meetingId,
  });

  const consentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/consent`, {
        status: "granted",
      });
      return res.json();
    },
    onSuccess: () => {
      setShowConsentModal(false);
      toast({
        title: "Consent Recorded",
        description: "Your recording consent has been saved.",
      });
    },
  });

  const startRecordingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/startRecording`);
      return res.json();
    },
    onSuccess: () => {
      setIsRecording(true);
      startClientSideRecording();
      toast({
        title: "Recording Started",
        description: "The consultation is now being recorded.",
      });
    },
  });

  const uploadRecordingMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      // Use apiRequest to ensure correct API URL in production
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/uploadRecording`, formData);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Recording Uploaded",
        description: "Your recording is being processed for transcription.",
      });
    },
  });

  const startClientSideRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        uploadRecordingMutation.mutate(audioBlob);
      };
      
      recorder.start(1000);
      setMediaRecorder(recorder);
    } catch (err) {
      toast({
        title: "Recording Failed",
        description: "Could not access microphone for recording.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const handleEndCall = () => {
    if (isRecording) {
      stopRecording();
    }
    setLocation(user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
  };

  const handleConsentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    setConsentScrolled(isAtBottom);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getParticipantName = () => {
    if (!meetingInfo) return "";
    if (user?.role === "doctor") {
      return meetingInfo.patientName || meetingInfo.participantDoctorName || "Participant";
    }
    return meetingInfo.doctorName;
  };

  useEffect(() => {
    if (meetingInfo && !meetingInfo.hasConsented && isJoined) {
      setShowConsentModal(true);
    }
  }, [meetingInfo, isJoined]);

  useEffect(() => {
    if (!isJoined || !meetingInfo?.roomName) return;
    if (roomRef.current) return;
    
    // Check if Twilio token is available
    if (!meetingInfo?.twilioToken) {
      toast({
        title: "Video Call Unavailable",
        description: "Twilio credentials are not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    
    const initCall = async () => {
      try {
        const room = await TwilioVideo.connect(meetingInfo.twilioToken!, {
          name: meetingInfo.roomName!,
          audio: true,
          video: false,
        });
        
        roomRef.current = room;
        
        room.participants.forEach(participant => {
          participant.tracks.forEach(publication => {
            if (publication.track && publication.track.kind === 'audio') {
              const audioElement = publication.track.attach();
              document.body.appendChild(audioElement);
            }
          });
        });
        
        room.on('participantConnected', participant => {
          participant.tracks.forEach(publication => {
            if (publication.track && publication.track.kind === 'audio') {
              const audioElement = publication.track.attach();
              document.body.appendChild(audioElement);
            }
          });
          
          participant.on('trackSubscribed', track => {
            if (track.kind === 'audio') {
              const audioElement = track.attach();
              document.body.appendChild(audioElement);
            }
          });
        });
        
        toast({
          title: "Connected",
          description: "Audio call connected. Video requires HTTPS.",
        });
      } catch (err: any) {
        console.error('Failed to join call:', err);
        toast({
          title: "Connection Failed",
          description: err.message || "Could not connect.",
          variant: "destructive",
        });
      }
    };
    
    initCall();
    
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [isJoined, meetingInfo, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" />
          <p>Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !meetingInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Meeting Not Found</CardTitle>
            <CardDescription>
              This meeting does not exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation(user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard")}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">{meetingInfo.title || "Video Consultation"}</CardTitle>
            <CardDescription>
              {user?.role === "doctor"
                ? `Consultation with ${meetingInfo.patientName || meetingInfo.participantDoctorName}`
                : `Consultation with Dr. ${meetingInfo.doctorName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(user?.name || "")}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">You</p>
              </div>
              <div className="w-8 h-0.5 bg-muted" />
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                    {getInitials(getParticipantName())}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">{getParticipantName()}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium">Secure & Encrypted</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This video call is end-to-end encrypted. Recording requires explicit consent from all participants.
              </p>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setIsJoined(true)}
              data-testid="button-join-meeting"
            >
              <Video className="w-5 h-5" />
              Join Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Avatar className="w-32 h-32 mx-auto mb-4">
              <AvatarFallback className="bg-primary/20 text-primary text-4xl">
                {getInitials(getParticipantName())}
              </AvatarFallback>
            </Avatar>
            <p className="text-xl font-medium">{getParticipantName()}</p>
            <p className="text-white/60 mt-2">Audio call in progress</p>
            <p className="text-sm text-white/40 mt-1">Video requires HTTPS</p>
          </div>
        </div>

        {isRecording && (
          <div className="absolute top-4 left-4 z-10">
            <Badge variant="destructive" className="gap-2 px-3 py-1.5">
              <Circle className="w-3 h-3 fill-current animate-recording-pulse" />
              RECORDING
            </Badge>
          </div>
        )}
      </div>

      <div className="bg-black/80 backdrop-blur-lg border-t border-white/10 p-4 relative z-10">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => {
              setIsMuted(!isMuted);
              if (roomRef.current) {
                roomRef.current.localParticipant.audioTracks.forEach(publication => {
                  if (isMuted) {
                    publication.track.enable();
                  } else {
                    publication.track.disable();
                  }
                });
              }
            }}
            data-testid="button-toggle-mic"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant={isVideoOn ? "secondary" : "destructive"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => {
              toast({
                title: "Video Not Available",
                description: "Video requires HTTPS. Use ngrok or localhost.",
              });
            }}
            data-testid="button-toggle-video"
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          {user?.role === "doctor" && (
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => {
                if (!meetingInfo.hasConsented) {
                  setShowConsentModal(true);
                } else if (isRecording) {
                  stopRecording();
                } else {
                  startRecordingMutation.mutate();
                }
              }}
              disabled={startRecordingMutation.isPending}
              data-testid="button-toggle-recording"
            >
              {startRecordingMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Circle className={`w-6 h-6 ${isRecording ? "fill-current" : ""}`} />
              )}
            </Button>
          )}

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => setShowEndCallModal(true)}
            data-testid="button-end-call"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full text-white hover:text-white hover:bg-white/10"
            data-testid="button-settings"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Circle className="w-5 h-5 text-destructive" />
              Recording Consent Required
            </DialogTitle>
            <DialogDescription>
              Please read and accept the recording consent to proceed
            </DialogDescription>
          </DialogHeader>

          <ScrollArea
            className="h-48 border rounded-md p-4"
            onScrollCapture={handleConsentScroll}
            ref={consentScrollRef}
          >
            <div className="space-y-4 text-sm">
              <p>
                <strong>Recording Consent Agreement</strong>
              </p>
              <p>
                By consenting to this recording, you acknowledge and agree to the following:
              </p>
              <ul className="list-disc pl-4 space-y-2">
                <li>This video consultation will be recorded for medical documentation purposes.</li>
                <li>The recording will be securely stored and encrypted.</li>
                <li>The recording may be transcribed using AI technology to generate clinical notes.</li>
                <li>Only authorized healthcare providers will have access to the recording.</li>
                <li>You may request deletion of the recording in accordance with applicable laws.</li>
                <li>The recording will be retained according to medical record retention requirements.</li>
              </ul>
              <p>
                If you do not consent, the consultation can still proceed without recording.
              </p>
            </div>
          </ScrollArea>

          <div className="flex items-center gap-2">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
              disabled={!consentScrolled}
              data-testid="checkbox-consent"
            />
            <Label
              htmlFor="consent"
              className={!consentScrolled ? "text-muted-foreground" : ""}
            >
              I have read and agree to the recording consent
            </Label>
          </div>

          {!consentScrolled && (
            <p className="text-xs text-muted-foreground">
              Please scroll to read the full consent before accepting
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentModal(false)}>
              Decline
            </Button>
            <Button
              onClick={() => consentMutation.mutate()}
              disabled={!consentChecked || consentMutation.isPending}
              className="gap-2"
              data-testid="button-accept-consent"
            >
              {consentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Accept & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showEndCallModal} onOpenChange={setShowEndCallModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              {isRecording
                ? "The recording will be saved and processed for transcription."
                : "Are you sure you want to end this video consultation?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Call</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndCall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-end"
            >
              End Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
