import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Users,
  UserPlus,
  UserMinus,
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
  const queryClient = useQueryClient();
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
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const audioStreamRef = useRef<MediaStream | null>(null);
  const consentScrollRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const isConnectingRef = useRef<boolean>(false);

  const { data: meetingInfo, isLoading, error } = useQuery<MeetingInfo>({
    queryKey: ["/api/meetings", meetingId],
    enabled: !!meetingId,
    refetchInterval: 5000, // Refetch every 5 seconds to get updated consent status
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
      // Invalidate and refetch meeting info to get updated consent status
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
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
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    // Clean up local tracks
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
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

  // Send notification when participant joins/leaves
  const notifyParticipantEvent = async (event: 'joined' | 'left', participantName: string) => {
    try {
      await apiRequest("POST", `/api/meetings/${meetingId}/participant-event`, {
        event,
        participantName,
      });
    } catch (error) {
      console.error("Failed to send participant event notification:", error);
    }
  };

  useEffect(() => {
    if (meetingInfo && !meetingInfo.hasConsented && isJoined && user?.role === "doctor") {
      setShowConsentModal(true);
    }
  }, [meetingInfo, isJoined, user?.role]);

  useEffect(() => {
    if (!isJoined || !meetingInfo?.roomName) return;
    if (roomRef.current) return;
    if (isConnectingRef.current) return; // Prevent multiple simultaneous connection attempts
    
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
      // Mark as connecting to prevent duplicate attempts
      isConnectingRef.current = true;
      
      try {
        // Clean up any existing connection first
        if (roomRef.current) {
          try {
            roomRef.current.disconnect();
          } catch (err) {
            console.error("Error disconnecting existing room:", err);
          }
          roomRef.current = null;
        }
        
        // Clean up any existing local tracks
        if (localVideoTrackRef.current) {
          try {
            localVideoTrackRef.current.stop();
          } catch (err) {
            console.error("Error stopping video track:", err);
          }
          localVideoTrackRef.current = null;
        }
        if (localAudioTrackRef.current) {
          try {
            localAudioTrackRef.current.stop();
          } catch (err) {
            console.error("Error stopping audio track:", err);
          }
          localAudioTrackRef.current = null;
        }
        // Create local audio and video tracks
        const localTracks: any[] = [];
        
        // Create audio track
        try {
          const audioTrack = await TwilioVideo.createLocalAudioTrack();
          localAudioTrackRef.current = audioTrack;
          localTracks.push(audioTrack);
        } catch (err) {
          console.error("Failed to create local audio track:", err);
        }
        
        // Create video track if video is enabled
        if (isVideoOn) {
          try {
            const videoTrack = await TwilioVideo.createLocalVideoTrack({
              width: 1280,
              height: 720,
            });
            localVideoTrackRef.current = videoTrack;
            localTracks.push(videoTrack);
          } catch (err) {
            console.error("Failed to create local video track:", err);
            toast({
              title: "Video Unavailable",
              description: "Could not access camera. Continuing with audio only.",
              variant: "destructive",
            });
          }
        }
        
        // Connect to room with tracks
        const room = await TwilioVideo.connect(meetingInfo.twilioToken!, {
          name: meetingInfo.roomName!,
          tracks: localTracks,
        });
        
        roomRef.current = room;
        
        // Publish local tracks
        localTracks.forEach(track => {
          room.localParticipant.publishTrack(track);
        });
        
        // Notify that we joined
        await notifyParticipantEvent('joined', user?.name || 'User');
        
        // Handle existing participants
        room.participants.forEach(participant => {
          setParticipants(prev => new Set(prev).add(participant.identity));
          
          participant.tracks.forEach(publication => {
            if (publication.track) {
              const element = publication.track.attach();
              if (publication.track.kind === 'video') {
                element.setAttribute('id', `remote-video-${participant.identity}`);
                element.style.width = '100%';
                element.style.height = '100%';
                element.style.objectFit = 'cover';
                const videoContainer = document.getElementById('remote-video-container');
                const fallback = document.getElementById('video-fallback');
                if (videoContainer) {
                  videoContainer.appendChild(element);
                  if (fallback) fallback.style.display = 'none';
                } else {
                  document.body.appendChild(element);
                }
              } else {
                element.setAttribute('autoplay', 'true');
                element.setAttribute('playsinline', 'true');
                document.body.appendChild(element);
              }
            }
          });
        });
        
        // Handle new participants joining
        room.on('participantConnected', async (participant) => {
          setParticipants(prev => new Set(prev).add(participant.identity));
          
          const participantName = getParticipantName();
          toast({
            title: "Participant Joined",
            description: `${participantName} has joined the call.`,
          });
          
          participant.tracks.forEach(publication => {
            if (publication.track) {
              const element = publication.track.attach();
              if (publication.track.kind === 'video') {
                element.setAttribute('id', `remote-video-${participant.identity}`);
                element.style.width = '100%';
                element.style.height = '100%';
                element.style.objectFit = 'cover';
                const videoContainer = document.getElementById('remote-video-container');
                const fallback = document.getElementById('video-fallback');
                if (videoContainer) {
                  videoContainer.appendChild(element);
                  if (fallback) fallback.style.display = 'none';
                } else {
                  document.body.appendChild(element);
                }
              } else {
                element.setAttribute('autoplay', 'true');
                element.setAttribute('playsinline', 'true');
                document.body.appendChild(element);
              }
            }
          });
          
          participant.on('trackSubscribed', (track) => {
            const element = track.attach();
            if (track.kind === 'video') {
              element.setAttribute('id', `remote-video-${participant.identity}`);
              element.style.width = '100%';
              element.style.height = '100%';
              element.style.objectFit = 'cover';
              const videoContainer = document.getElementById('remote-video-container');
              const fallback = document.getElementById('video-fallback');
              if (videoContainer) {
                videoContainer.appendChild(element);
                if (fallback) fallback.style.display = 'none';
              } else {
                document.body.appendChild(element);
              }
            } else {
              element.setAttribute('autoplay', 'true');
              element.setAttribute('playsinline', 'true');
              document.body.appendChild(element);
            }
          });
        });
        
        // Handle participants leaving
        room.on('participantDisconnected', async (participant) => {
          setParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(participant.identity);
            return newSet;
          });
          
          const participantName = getParticipantName();
          toast({
            title: "Participant Left",
            description: `${participantName} has left the call.`,
          });
          
          // Remove video elements
          const videoElement = document.getElementById(`remote-video-${participant.identity}`);
          if (videoElement) {
            videoElement.remove();
          }
          
          // Show fallback if no participants
          if (participants.size === 0) {
            const fallback = document.getElementById('video-fallback');
            if (fallback) fallback.style.display = 'flex';
          }
        });
        
        // Handle local video track
        room.localParticipant.videoTracks.forEach(publication => {
          if (publication.track) {
            const element = publication.track.attach();
            element.setAttribute('id', 'local-video');
            element.style.width = '100%';
            element.style.height = '100%';
            element.style.objectFit = 'cover';
            const videoContainer = document.getElementById('local-video-container');
            if (videoContainer) {
              videoContainer.appendChild(element);
            } else {
              document.body.appendChild(element);
            }
          }
        });
        
        // Handle track published events
        room.localParticipant.on('trackPublished', (publication) => {
          if (publication.track && publication.track.kind === 'video') {
            const element = publication.track.attach();
            element.setAttribute('id', 'local-video');
            element.style.width = '100%';
            element.style.height = '100%';
            element.style.objectFit = 'cover';
            const videoContainer = document.getElementById('local-video-container');
            if (videoContainer) {
              videoContainer.appendChild(element);
            }
          }
        });
        
        toast({
          title: "Connected",
          description: isVideoOn ? "Video call connected." : "Audio call connected.",
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
      // Clean up local tracks
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
    };
  }, [isJoined, meetingInfo, isVideoOn, toast, user?.name, getParticipantName, participants.size]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="text-lg font-medium">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !meetingInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-2">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-chart-2/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-2 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-lg">
              <Video className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{meetingInfo.title || "Video Consultation"}</CardTitle>
            <CardDescription className="text-base">
              {user?.role === "doctor"
                ? `Consultation with ${meetingInfo.patientName || meetingInfo.participantDoctorName}`
                : `Consultation with Dr. ${meetingInfo.doctorName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center space-y-2">
                <Avatar className="w-20 h-20 mx-auto border-2 border-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials(user?.name || "")}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">You</p>
              </div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-muted to-primary to-muted" />
              <div className="text-center space-y-2">
                <Avatar className="w-20 h-20 mx-auto border-2 border-muted">
                  <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
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
              className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
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
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{meetingInfo.title || "Video Consultation"}</h2>
              <p className="text-white/60 text-xs">{getParticipantName()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {participants.size > 0 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Users className="w-3 h-3 mr-1" />
                {participants.size + 1} participant{participants.size > 0 ? 's' : ''}
              </Badge>
            )}
            {isRecording && (
              <Badge variant="destructive" className="gap-2 px-3 py-1">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                RECORDING
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative mt-14">
        {/* Remote video container */}
        <div id="remote-video-container" className="absolute inset-0 w-full h-full bg-black">
          {/* Remote video will be inserted here by Twilio */}
        </div>
        
        {/* Local video container (picture-in-picture) */}
        <div id="local-video-container" className="absolute bottom-24 right-4 w-56 h-40 rounded-xl overflow-hidden border-2 border-white shadow-2xl bg-black z-10">
          {/* Local video will be inserted here by Twilio */}
        </div>
        
        {/* Fallback when no video */}
        <div className="absolute inset-0 flex items-center justify-center" id="video-fallback">
          <div className="text-center text-white space-y-4">
            <Avatar className="w-32 h-32 mx-auto border-4 border-white/20">
              <AvatarFallback className="bg-primary/20 text-primary text-4xl">
                {getInitials(getParticipantName())}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-2xl font-semibold">{getParticipantName()}</p>
              <p className="text-white/60 mt-2">{isVideoOn ? "Video call in progress" : "Audio call in progress"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-black/90 backdrop-blur-lg border-t border-white/10 p-4 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={() => {
              const newMutedState = !isMuted;
              setIsMuted(newMutedState);
              if (roomRef.current) {
                roomRef.current.localParticipant.audioTracks.forEach(publication => {
                  if (publication.track) {
                    if (newMutedState) {
                      publication.track.disable();
                    } else {
                      publication.track.enable();
                    }
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
            className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={async () => {
              const newVideoState = !isVideoOn;
              setIsVideoOn(newVideoState);
              
              if (roomRef.current) {
                if (newVideoState) {
                  // Enable video - create and publish track
                  try {
                    const videoTrack = await TwilioVideo.createLocalVideoTrack({
                      width: 1280,
                      height: 720,
                    });
                    localVideoTrackRef.current = videoTrack;
                    roomRef.current.localParticipant.publishTrack(videoTrack);
                    
                    // Attach to UI
                    const element = videoTrack.attach();
                    element.setAttribute('id', 'local-video');
                    element.style.width = '100%';
                    element.style.height = '100%';
                    element.style.objectFit = 'cover';
                    const videoContainer = document.getElementById('local-video-container');
                    if (videoContainer) {
                      videoContainer.appendChild(element);
                    }
                  } catch (err) {
                    console.error("Failed to enable video:", err);
                    toast({
                      title: "Video Unavailable",
                      description: "Could not access camera.",
                      variant: "destructive",
                    });
                    setIsVideoOn(false);
                  }
                } else {
                  // Disable video - unpublish and stop track
                  roomRef.current.localParticipant.videoTracks.forEach(publication => {
                    if (publication.track) {
                      roomRef.current.localParticipant.unpublishTrack(publication.track);
                      publication.track.stop();
                      const element = document.getElementById('local-video');
                      if (element) element.remove();
                    }
                  });
                  if (localVideoTrackRef.current) {
                    localVideoTrackRef.current.stop();
                    localVideoTrackRef.current = null;
                  }
                }
              }
            }}
            data-testid="button-toggle-video"
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          {user?.role === "doctor" && (
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
              onClick={async () => {
                // Refetch meeting info to get latest consent status
                await queryClient.refetchQueries({ queryKey: ["/api/meetings", meetingId] });
                const updatedInfo = queryClient.getQueryData<MeetingInfo>(["/api/meetings", meetingId]);
                
                if (!updatedInfo?.hasConsented) {
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
            className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={() => setShowEndCallModal(true)}
            data-testid="button-end-call"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full text-white hover:text-white hover:bg-white/10 shadow-lg"
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
          <ScrollArea className="h-64 w-full rounded border p-4" onScrollCapture={handleConsentScroll} ref={consentScrollRef}>
            <div className="space-y-4 text-sm">
              <p>
                <strong>Recording Consent Agreement</strong>
              </p>
              <p>
                By consenting to this recording, you acknowledge and agree to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>The consultation may be recorded for medical documentation purposes.</li>
                <li>The recording will be securely stored and only accessible to authorized personnel.</li>
                <li>The recording may be transcribed using AI technology to generate clinical notes.</li>
                <li>You have the right to withdraw consent at any time during the consultation.</li>
                <li>If you do not consent, the consultation can still proceed without recording.</li>
              </ul>
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
            <AlertDialogTitle>End Call?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this call? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndCall} className="bg-destructive hover:bg-destructive/90">
              End Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
