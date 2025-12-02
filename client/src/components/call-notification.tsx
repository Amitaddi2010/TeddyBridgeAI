import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Video, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function CallNotification() {
  const [, setLocation] = useLocation();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Notification | null>(null);

  const { data } = useQuery({
    queryKey: ["/api/user/notifications/list"],
    refetchInterval: 5000, // Check every 5 seconds for incoming calls
  });

  const notifications: Notification[] = data?.notifications || [];

  useEffect(() => {
    // Find unread call notifications
    const callNotification = notifications.find(
      (n) => !n.isRead && (n.type === "call" || n.title === "Incoming Call") && n.link?.startsWith("/meeting/")
    );

    if (callNotification && !showCallDialog && !incomingCall) {
      setIncomingCall(callNotification);
      setShowCallDialog(true);
    }
  }, [notifications, showCallDialog, incomingCall]);

  const handleAccept = async () => {
    if (incomingCall?.link) {
      try {
        // Mark notification as read
        await apiRequest("POST", `/api/user/notifications/${incomingCall.id}/read`);
        setShowCallDialog(false);
        setIncomingCall(null);
        // Navigate to meeting
        setLocation(incomingCall.link);
      } catch (error) {
        console.error("Failed to accept call:", error);
        // Still navigate even if marking as read fails
        setShowCallDialog(false);
        setIncomingCall(null);
        setLocation(incomingCall.link);
      }
    }
  };

  const handleDecline = async () => {
    if (incomingCall) {
      try {
        // Mark notification as read
        await apiRequest("POST", `/api/user/notifications/${incomingCall.id}/read`);
      } catch (error) {
        console.error("Failed to decline call:", error);
      } finally {
        setShowCallDialog(false);
        setIncomingCall(null);
      }
    }
  };

  if (!incomingCall) return null;

  return (
    <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10">
            <Video className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-center text-2xl">Incoming Call</DialogTitle>
          <DialogDescription className="text-center text-base">
            {incomingCall.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={handleDecline}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Phone className="w-4 h-4 mr-2" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

