import { useState, useRef, useEffect, useCallback } from "react";
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
  PhoneOff,
  Circle,
  Settings,
  Loader2,
  AlertTriangle,
  Shield,
  CheckCircle,
  Users,
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
  meetingType?: 'patient-doctor' | 'doctor-doctor';
  recordingEnabled?: boolean;
}

export default function Meeting() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meetingId = params?.id || "";

  // UI State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [consentScrolled, setConsentScrolled] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOnly, setIsAudioOnly] = useState(false); // New: Audio-only mode
  const [isRecording, setIsRecording] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  
  // Refs for stable references
  const roomRef = useRef<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const connectedParticipantsRef = useRef<Set<string>>(new Set());
  const consentScrollRef = useRef<HTMLDivElement>(null);
  const recordingUploadPromiseRef = useRef<Promise<void> | null>(null);
  
  // Track element refs - prevent duplicate attachments
  const attachedVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const attachedAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  
  // Store remote tracks for recording
  const remoteAudioTracksRef = useRef<Map<string, MediaStreamTrack>>(new Map());
  const remoteVideoTracksRef = useRef<Map<string, MediaStreamTrack>>(new Map());

  // Configure Twilio logging
  useEffect(() => {
    if (typeof TwilioVideo !== 'undefined' && TwilioVideo.Logger) {
      TwilioVideo.Logger.setLevel('error');
    }
  }, []);

  const { data: meetingInfo, isLoading, error } = useQuery<MeetingInfo>({
    queryKey: ["/api/meetings", meetingId],
    enabled: !!meetingId,
    refetchInterval: 5000,
  });

  const consentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/consent`, {
        status: "granted",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
      setShowConsentModal(false);
    },
  });

  const startRecordingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/startRecording`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
    },
  });

  const stopRecordingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/stopRecording`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
    },
  });

  const uploadRecordingMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append("recording", blob, "recording.webm");
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/uploadRecording`, formData);
      return res.json();
    },
  });

  const endMeetingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/endMeeting`, {});
      return res.json();
    },
  });

  // Stable track attachment function - prevents duplicate attachments
  const attachVideoTrack = useCallback((track: any, participantIdentity: string, isLocal: boolean = false) => {
    try {
      if (isLocal) {
        // Local video
        const container = document.getElementById('local-video-container');
        if (!container) return;
        
        // Remove existing local video element
        if (localVideoElementRef.current) {
          localVideoElementRef.current.remove();
          localVideoElementRef.current = null;
        }
        
        const element = track.attach();
        element.id = 'local-video';
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.objectFit = 'cover';
        container.appendChild(element);
        localVideoElementRef.current = element;
      } else {
        // Store remote track for recording
        if (track && track.mediaStreamTrack) {
          remoteVideoTracksRef.current.set(participantIdentity, track.mediaStreamTrack);
        }
        
        // Remote video - check if already attached
        if (attachedVideoElementsRef.current.has(participantIdentity)) {
          const existing = attachedVideoElementsRef.current.get(participantIdentity);
          if (existing && existing.srcObject === track.mediaStream) {
            return; // Already attached with same track
          }
          existing?.remove();
        }
        
        const container = document.getElementById('remote-video-container');
        const fallback = document.getElementById('video-fallback');
        if (!container) return;
        
        const element = track.attach();
        element.id = `remote-video-${participantIdentity}`;
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.objectFit = 'cover';
        
        container.appendChild(element);
        attachedVideoElementsRef.current.set(participantIdentity, element);
        
        if (fallback) {
          fallback.style.display = 'none';
        }
      }
    } catch (error) {
      console.error("Error attaching video track:", error);
    }
  }, []);

  const attachAudioTrack = useCallback((track: any, participantIdentity: string) => {
    try {
      // Store remote track for recording
      if (track && track.mediaStreamTrack) {
        remoteAudioTracksRef.current.set(participantIdentity, track.mediaStreamTrack);
      }
      
      // Check if already attached
      if (attachedAudioElementsRef.current.has(participantIdentity)) {
        const existing = attachedAudioElementsRef.current.get(participantIdentity);
        if (existing && existing.srcObject === track.mediaStream) {
          return; // Already attached
        }
        existing?.remove();
      }
      
      const element = track.attach();
      element.id = `remote-audio-${participantIdentity}`;
      element.setAttribute('autoplay', 'true');
      element.setAttribute('playsinline', 'true');
      element.style.display = 'none';
      
      // Create hidden audio container if needed
      let audioContainer = document.getElementById('remote-audio-container');
      if (!audioContainer) {
        audioContainer = document.createElement('div');
        audioContainer.id = 'remote-audio-container';
        audioContainer.style.display = 'none';
        document.body.appendChild(audioContainer);
      }
      
      audioContainer.appendChild(element);
      attachedAudioElementsRef.current.set(participantIdentity, element);
      
      // Try to play
      if (element instanceof HTMLAudioElement) {
        element.play().catch(() => {
          // Silent fail - autoplay might be blocked
        });
      }
    } catch (error) {
      console.error("Error attaching audio track:", error);
    }
  }, []);

  const detachTrack = useCallback((track: any, participantIdentity: string) => {
    try {
      if (track.kind === 'video') {
        const element = attachedVideoElementsRef.current.get(participantIdentity);
        if (element) {
          element.remove();
          attachedVideoElementsRef.current.delete(participantIdentity);
          
          // Show fallback if no remote videos
          const container = document.getElementById('remote-video-container');
          const fallback = document.getElementById('video-fallback');
          if (container && container.children.length === 0 && fallback) {
            fallback.style.display = 'flex';
          }
        }
        // Remove from recording refs
        remoteVideoTracksRef.current.delete(participantIdentity);
      } else {
        const element = attachedAudioElementsRef.current.get(participantIdentity);
        if (element) {
          element.remove();
          attachedAudioElementsRef.current.delete(participantIdentity);
        }
        // Remove from recording refs
        remoteAudioTracksRef.current.delete(participantIdentity);
      }
      track.detach();
    } catch (error) {
      console.error("Error detaching track:", error);
    }
  }, []);

  // Connect to room
  const connectToRoom = useCallback(async () => {
    if (!meetingInfo?.twilioToken || !meetingInfo?.roomName) return;
    if (isConnectingRef.current || roomRef.current) return;
    
    isConnectingRef.current = true;
    
    try {
      const localTracks: any[] = [];
      
      // Create audio track
      try {
        const audioTrack = await TwilioVideo.createLocalAudioTrack();
        localAudioTrackRef.current = audioTrack;
        localTracks.push(audioTrack);
      } catch (err) {
        console.error("Failed to create audio track:", err);
      }
      
      // Create video track only if not audio-only mode and video is enabled
      if (!isAudioOnly && isVideoOn) {
        try {
          const videoTrack = await TwilioVideo.createLocalVideoTrack({
            width: 1280,
            height: 720,
          });
          localVideoTrackRef.current = videoTrack;
          localTracks.push(videoTrack);
    } catch (err) {
          console.error("Failed to create video track:", err);
        }
      }
      
      // Connect to room
      const room = await TwilioVideo.connect(meetingInfo.twilioToken!, {
        name: meetingInfo.roomName!,
        tracks: localTracks,
      });
      
      roomRef.current = room;
      
      // Publish tracks
      for (const track of localTracks) {
        await room.localParticipant.publishTrack(track);
      }
      
      // Attach local video if available
      if (localVideoTrackRef.current) {
        attachVideoTrack(localVideoTrackRef.current, 'local', true);
      }
      
      // Handle existing participants
      room.participants.forEach((participant: any) => {
        handleParticipantConnected(participant);
      });
      
      // Handle new participants
      room.on('participantConnected', (participant: any) => {
        handleParticipantConnected(participant);
      });
      
      // Handle participants leaving
      room.on('participantDisconnected', (participant: any) => {
        handleParticipantDisconnected(participant);
      });
      
      // Handle local track published
      room.localParticipant.on('trackPublished', (publication: any) => {
        if (publication.track && publication.track.kind === 'video' && !isAudioOnly) {
          attachVideoTrack(publication.track, 'local', true);
        }
      });
      
      setParticipants(new Set(Array.from(room.participants.values()).map((p: any) => p.identity)));
      setIsJoined(true);
      
    } catch (err: any) {
      console.error("Failed to connect:", err);
      toast({
        title: "Connection Failed",
        description: "Could not connect to the call. Please try again.",
        variant: "destructive",
      });
    } finally {
      isConnectingRef.current = false;
    }
  }, [meetingInfo?.twilioToken, meetingInfo?.roomName, isVideoOn, isAudioOnly, attachVideoTrack, toast]);

  // Handle participant connected
  const handleParticipantConnected = useCallback((participant: any) => {
    if (connectedParticipantsRef.current.has(participant.identity)) {
      return; // Already handled
    }
    connectedParticipantsRef.current.add(participant.identity);
    
    // Handle existing tracks
    participant.tracks.forEach((publication: any) => {
      handleTrackPublished(publication, participant);
    });
    
    // Handle new tracks
    participant.on('trackPublished', (publication: any) => {
      handleTrackPublished(publication, participant);
    });
    
    setParticipants(prev => {
      const newSet = new Set(prev);
      newSet.add(participant.identity);
      return newSet;
    });
  }, []);

  // Handle participant disconnected
  const handleParticipantDisconnected = useCallback((participant: any) => {
    connectedParticipantsRef.current.delete(participant.identity);
    
    // Clean up all tracks for this participant
    participant.tracks.forEach((publication: any) => {
      if (publication.track) {
        detachTrack(publication.track, participant.identity);
      }
    });
    
    setParticipants(prev => {
      const newSet = new Set(prev);
      newSet.delete(participant.identity);
      return newSet;
    });
  }, [detachTrack]);

  // Handle track published
  const handleTrackPublished = useCallback((publication: any, participant: any) => {
    if (publication.track) {
      // Attach immediately if track is available
      if (publication.track.kind === 'video') {
        attachVideoTrack(publication.track, participant.identity);
      } else {
        attachAudioTrack(publication.track, participant.identity);
      }
    }
    
    // Listen for subscription events
    publication.on('subscribed', (track: any) => {
      if (track.kind === 'video') {
        attachVideoTrack(track, participant.identity);
      } else {
        attachAudioTrack(track, participant.identity);
      }
    });
    
    publication.on('unsubscribed', (track: any) => {
      detachTrack(track, participant.identity);
    });
  }, [attachVideoTrack, attachAudioTrack, detachTrack]);

  // Connect when ready
  useEffect(() => {
    if (isJoined || !meetingInfo?.roomName || !meetingInfo?.twilioToken) return;
    if (isConnectingRef.current || roomRef.current) return;
    
    connectToRoom();
  }, [isJoined, meetingInfo?.roomName, meetingInfo?.twilioToken, connectToRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
    };
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (localAudioTrackRef.current) {
      if (newMuted) {
        localAudioTrackRef.current.disable();
      } else {
        localAudioTrackRef.current.enable();
      }
    }
    
    if (roomRef.current) {
      const audioPublications = Array.from(roomRef.current.localParticipant.audioTracks.values());
      for (const publication of audioPublications) {
        if (publication.track) {
          if (newMuted) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      }
    }
  }, [isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) {
      setIsVideoOn(!isVideoOn);
      return;
    }
    
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    
    try {
      if (newVideoState && !isAudioOnly) {
        // Enable video
        if (!localVideoTrackRef.current) {
          const videoTrack = await TwilioVideo.createLocalVideoTrack({
            width: 1280,
            height: 720,
          });
          localVideoTrackRef.current = videoTrack;
          await roomRef.current.localParticipant.publishTrack(videoTrack);
          attachVideoTrack(videoTrack, 'local', true);
        } else {
          localVideoTrackRef.current.enable();
          const isPublished = Array.from(roomRef.current.localParticipant.videoTracks.values())
            .some(pub => pub.track === localVideoTrackRef.current);
          if (!isPublished) {
            await roomRef.current.localParticipant.publishTrack(localVideoTrackRef.current);
          }
        }
      } else {
        // Disable video
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.disable();
          const videoPublications = Array.from(roomRef.current.localParticipant.videoTracks.values());
          for (const publication of videoPublications) {
            if (publication.track === localVideoTrackRef.current) {
              await roomRef.current.localParticipant.unpublishTrack(publication.track);
            }
          }
          if (localVideoElementRef.current) {
            localVideoElementRef.current.remove();
            localVideoElementRef.current = null;
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle video:", err);
      setIsVideoOn(!newVideoState);
    }
  }, [isVideoOn, isAudioOnly, attachVideoTrack]);

  // Toggle audio-only mode
  const toggleAudioOnly = useCallback(() => {
    const newAudioOnly = !isAudioOnly;
    setIsAudioOnly(newAudioOnly);
    
    if (newAudioOnly) {
      // Switch to audio-only: disable video
      setIsVideoOn(false);
      if (localVideoTrackRef.current && roomRef.current) {
        localVideoTrackRef.current.disable();
        const videoPublications = Array.from(roomRef.current.localParticipant.videoTracks.values());
        for (const publication of videoPublications) {
          if (publication.track === localVideoTrackRef.current) {
            roomRef.current.localParticipant.unpublishTrack(publication.track);
          }
        }
        if (localVideoElementRef.current) {
          localVideoElementRef.current.remove();
          localVideoElementRef.current = null;
        }
      }
    }
    // If switching back to video mode, user can enable video manually
  }, [isAudioOnly]);

  // End call - ensure recording is uploaded and meeting status is updated
  const handleEndCall = useCallback(async () => {
    try {
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        console.log("Stopping recording before ending call...");
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        
        // Wait for upload to complete (max 15 seconds)
        if (recordingUploadPromiseRef.current) {
          try {
            await Promise.race([
              recordingUploadPromiseRef.current,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 15000))
            ]);
            console.log("Recording upload completed before ending call");
          } catch (err) {
            console.warn("Recording upload not completed yet, but proceeding to end call:", err);
          }
        } else {
          // Wait a bit for the upload promise to be created
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Mark meeting as ended on backend
      try {
        await endMeetingMutation.mutateAsync();
        console.log("Meeting marked as ended");
      } catch (err) {
        console.error("Failed to mark meeting as ended:", err);
        // Continue anyway - don't block user from leaving
      }
      
      // Clean up media streams
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // Disconnect from room
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      
      // Stop local tracks
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
      
      // Navigate away
      setLocation(user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    } catch (err) {
      console.error("Error ending call:", err);
      // Navigate away even if there's an error
      setLocation(user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [user?.role, setLocation, endMeetingMutation]);

  // Recording functions - Capture BOTH doctor and patient audio/video
  const startRecording = useCallback(async () => {
    try {
      if (roomRef.current) {
        // Create a mixed stream with BOTH local (doctor) and remote (patient) tracks
        const stream = new MediaStream();
        
        // Add local (doctor) audio track
        if (localAudioTrackRef.current) {
          stream.addTrack(localAudioTrackRef.current.mediaStreamTrack);
        }
        
        // Add local (doctor) video track
        if (localVideoTrackRef.current) {
          stream.addTrack(localVideoTrackRef.current.mediaStreamTrack);
        }
        
        // IMPORTANT: Add remote (patient) audio tracks for complete conversation
        // This ensures both sides of the conversation are recorded
        remoteAudioTracksRef.current.forEach((track, participantId) => {
          if (track && track.readyState === 'live') {
            stream.addTrack(track);
            console.log(`Added remote audio track from participant: ${participantId}`);
          }
        });
        
        // Add remote (patient) video tracks if available
        remoteVideoTracksRef.current.forEach((track, participantId) => {
          if (track && track.readyState === 'live') {
            stream.addTrack(track);
            console.log(`Added remote video track from participant: ${participantId}`);
          }
        });
        
        // Also add tracks from currently connected participants
        if (roomRef.current.participants) {
          roomRef.current.participants.forEach((participant: any) => {
            participant.audioTracks.forEach((publication: any) => {
              if (publication.track && publication.track.mediaStreamTrack) {
                const track = publication.track.mediaStreamTrack;
                if (track.readyState === 'live' && !stream.getAudioTracks().some(t => t.id === track.id)) {
                  stream.addTrack(track);
                  console.log(`Added remote audio track from participant: ${participant.identity}`);
                }
              }
            });
            participant.videoTracks.forEach((publication: any) => {
              if (publication.track && publication.track.mediaStreamTrack) {
                const track = publication.track.mediaStreamTrack;
                if (track.readyState === 'live' && !stream.getVideoTracks().some(t => t.id === track.id)) {
                  stream.addTrack(track);
                  console.log(`Added remote video track from participant: ${participant.identity}`);
                }
              }
            });
          });
        }
        
        console.log(`Recording stream created with ${stream.getAudioTracks().length} audio tracks and ${stream.getVideoTracks().length} video tracks`);
        
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log(`Recording stopped, uploading blob of size ${blob.size} bytes...`);
          setIsRecording(false);
          
          // Store the upload promise so we can wait for it
          recordingUploadPromiseRef.current = uploadRecordingMutation.mutateAsync(blob)
            .then(() => {
              console.log("Recording uploaded successfully");
              recordingUploadPromiseRef.current = null;
            })
            .catch((err) => {
              console.error("Failed to upload recording:", err);
              recordingUploadPromiseRef.current = null;
            });
          
          // Wait for upload to complete (with timeout)
          try {
            await Promise.race([
              recordingUploadPromiseRef.current,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 30000))
            ]);
          } catch (err) {
            console.error("Recording upload error or timeout:", err);
          }
        };
        
        recorder.start();
        mediaRecorderRef.current = recorder;
        audioStreamRef.current = stream;
        setIsRecording(true);
        startRecordingMutation.mutate();
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [startRecordingMutation, uploadRecordingMutation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopRecordingMutation.mutate();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  }, [stopRecordingMutation]);

  // UI Helpers
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getParticipantName = () => {
    if (!meetingInfo) return "";
    if (user?.role === "doctor") {
      return meetingInfo.patientName || meetingInfo.participantDoctorName || "Participant";
    }
    return meetingInfo.doctorName;
  };

  const handleConsentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Get the actual scroll container inside ScrollArea
    const scrollContainer = consentScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (scrollContainer) {
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10;
      
      if (isAtBottom) {
        setConsentScrolled(true);
      }
    }
  };
  
  // Check scroll position when consent modal opens and reset state
  useEffect(() => {
    if (showConsentModal) {
      setConsentScrolled(false);
      setConsentChecked(false);
      
      // Check if content fits without scrolling (auto-enable scroll requirement)
      setTimeout(() => {
        if (consentScrollRef.current) {
          const scrollContainer = consentScrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (scrollContainer) {
            const hasScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
            if (!hasScroll) {
              // Content fits without scrolling, auto-enable
              setConsentScrolled(true);
            } else {
              // Content requires scrolling, check if already at bottom
              const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 10;
              if (isAtBottom) {
                setConsentScrolled(true);
              }
            }
          }
        }
      }, 100);
    }
  }, [showConsentModal]);

  // Consent modal (only show if recording is enabled and user is a doctor)
  useEffect(() => {
    if (meetingInfo && meetingInfo.recordingEnabled !== false && !meetingInfo.hasConsented && isJoined && user?.role === "doctor") {
      setShowConsentModal(true);
    }
  }, [meetingInfo, isJoined, user?.role]);

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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Meeting Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The meeting you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => setLocation(user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-lg border-b border-white/10 p-4 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">{meetingInfo.title || "Video Consultation"}</h1>
            {participants.size > 0 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Users className="w-3 h-3 mr-1" />
                {participants.size + 1} participant{(participants.size + 1) !== 1 ? 's' : ''}
              </Badge>
            )}
            {isRecording && (
              <Badge variant="destructive" className="gap-2 px-3 py-1">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                RECORDING
              </Badge>
            )}
            </div>
          <div className="flex items-center gap-2">
            {!isAudioOnly && (
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full text-white hover:text-white hover:bg-white/10"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndCallModal(true)}
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </Button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative mt-0">
        {/* Remote video container */}
        <div id="remote-video-container" className="absolute inset-0 w-full h-full bg-black">
          {/* Remote videos will be inserted here */}
        </div>
        
        {/* Local video container (picture-in-picture) */}
        {!isAudioOnly && (
          <div id="local-video-container" className="absolute bottom-24 right-4 w-56 h-40 rounded-xl overflow-hidden border-2 border-white shadow-2xl bg-black z-10">
            {/* Local video will be inserted here */}
          </div>
        )}
        
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
              <p className="text-white/60 mt-2">
                {isAudioOnly ? "Audio call in progress" : isVideoOn ? "Video call in progress" : "Audio call in progress"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-black/90 backdrop-blur-lg border-t border-white/10 p-4 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          {/* Audio-Only Toggle */}
          <Button
            variant={isAudioOnly ? "default" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={toggleAudioOnly}
            title={isAudioOnly ? "Switch to Video Call" : "Switch to Audio Call"}
          >
            {isAudioOnly ? <Phone className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {/* Mute/Unmute */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={toggleMute}
            data-testid="button-toggle-mic"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Video On/Off (only show if not audio-only) */}
          {!isAudioOnly && (
          <Button
            variant={isVideoOn ? "secondary" : "destructive"}
            size="icon"
              className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
              onClick={toggleVideo}
            data-testid="button-toggle-video"
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          )}

          {/* Recording (only for doctors - enabled for all meetings to support AI note generation) */}
          {user?.role === "doctor" && meetingInfo?.recordingEnabled !== false && (
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={startRecordingMutation.isPending || stopRecordingMutation.isPending}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              <Circle className={`w-6 h-6 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
            </Button>
          )}

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full text-white hover:text-white hover:bg-white/10 shadow-lg"
            onClick={() => setShowSettingsModal(true)}
            data-testid="button-settings"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Consent Modal */}
      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Recording Consent Required
            </DialogTitle>
            <DialogDescription>
              Please read and accept the recording consent to continue with the consultation.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4" onScroll={handleConsentScroll} ref={consentScrollRef}>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                By proceeding, you consent to the recording of this video consultation for medical record purposes.
                The recording will be securely stored and used only for your medical care.
              </p>
              <p>
                <strong>Your Rights:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You can request to stop recording at any time</li>
                <li>You have the right to access your recordings</li>
                <li>Recordings are stored securely and encrypted</li>
                <li>Recordings are only used for medical purposes</li>
              </ul>
            </div>
          </ScrollArea>
          <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
                id="consent-checkbox"
              checked={consentChecked}
              onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
              />
              <Label htmlFor="consent-checkbox" className="text-sm">
                I have read and agree to the consent terms
            </Label>
          </div>
            <Button
              onClick={() => consentMutation.mutate()}
              disabled={!consentScrolled || !consentChecked || consentMutation.isPending}
              className={(!consentScrolled || !consentChecked) ? "opacity-50 cursor-not-allowed" : ""}
            >
              {consentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Grant Consent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Call Modal */}
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
            <AlertDialogAction onClick={handleEndCall} className="bg-destructive text-destructive-foreground">
              End Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Call Settings
            </DialogTitle>
            <DialogDescription>
              Adjust your audio and video settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mic-settings">Microphone</Label>
                <p className="text-sm text-muted-foreground">
                  {isMuted ? "Muted" : "Unmuted"}
                </p>
              </div>
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="sm"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>
            
            {!isAudioOnly && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="video-settings">Camera</Label>
                  <p className="text-sm text-muted-foreground">
                    {isVideoOn ? "On" : "Off"}
                  </p>
                </div>
                <Button
                  variant={isVideoOn ? "secondary" : "destructive"}
                  size="sm"
                  onClick={toggleVideo}
                >
                  {isVideoOn ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                  {isVideoOn ? "Turn Off" : "Turn On"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}