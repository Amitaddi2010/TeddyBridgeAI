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
  const [processedNotificationIds, setProcessedNotificationIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { data } = useQuery({
    queryKey: ["/api/user/notifications/list"],
    refetchInterval: 5000, // Check every 5 seconds for incoming calls
  });

  const notifications: Notification[] = data?.notifications || [];

  useEffect(() => {
    // Find unread call notifications that haven't been processed yet
    const callNotification = notifications.find(
      (n) => 
        !n.isRead && 
        (n.type === "call" || n.title === "Incoming Call") && 
        n.link?.startsWith("/meeting/") &&
        !processedNotificationIds.has(n.id) &&
        !isProcessing
    );

    if (callNotification && !showCallDialog) {
      setIncomingCall(callNotification);
      setShowCallDialog(true);
      // Mark as processed to prevent re-triggering
      setProcessedNotificationIds(prev => new Set(prev).add(callNotification.id));
    }
  }, [notifications, showCallDialog, processedNotificationIds, isProcessing]);

  const handleAccept = async () => {
    if (!incomingCall?.link || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Mark notification as read
      await apiRequest("POST", `/api/user/notifications/${incomingCall.id}/read`);
      const link = incomingCall.link;
      // Clear state first
      setShowCallDialog(false);
      setIncomingCall(null);
      // Small delay to ensure state is cleared before navigation
      setTimeout(() => {
        setLocation(link);
      }, 100);
    } catch (error) {
      console.error("Failed to accept call:", error);
      // Still navigate even if marking as read fails
      const link = incomingCall.link;
      setShowCallDialog(false);
      setIncomingCall(null);
      setTimeout(() => {
        setLocation(link);
      }, 100);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Mark notification as read
      await apiRequest("POST", `/api/user/notifications/${incomingCall.id}/read`);
    } catch (error) {
      console.error("Failed to decline call:", error);
    } finally {
      setShowCallDialog(false);
      setIncomingCall(null);
      setIsProcessing(false);
    }
  };

  if (!incomingCall) return null;

  if (!incomingCall) return null;

  return (
    <Dialog 
      open={showCallDialog && !isProcessing} 
      onOpenChange={(open) => {
        // Prevent closing by clicking outside or pressing ESC
        if (!open && !isProcessing) {
          // Only allow closing via buttons
          return;
        }
        if (open && !isProcessing) {
          setShowCallDialog(open);
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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
            type="button"
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-primary hover:bg-primary/90"
            type="button"
            disabled={isProcessing}
          >
            <Phone className="w-4 h-4 mr-2" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

