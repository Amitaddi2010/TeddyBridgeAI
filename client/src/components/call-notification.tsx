import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Notification | null>(null);
  const processedNotificationIdsRef = useRef<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const hasShownDialogRef = useRef(false);

  const { data } = useQuery({
    queryKey: ["/api/user/notifications/list"],
    refetchInterval: 5000, // Check every 5 seconds for incoming calls
  });

  const notifications: Notification[] = data?.notifications || [];

  useEffect(() => {
    // Only process if dialog is not showing and not processing
    if (showCallDialog || isProcessing || hasShownDialogRef.current) {
      return;
    }

    // Find unread call notifications that haven't been processed yet
    const callNotification = notifications.find(
      (n) => 
        !n.isRead && 
        (n.type === "call" || n.title === "Incoming Call") && 
        n.link?.startsWith("/meeting/") &&
        !processedNotificationIdsRef.current.has(n.id)
    );

    if (callNotification) {
      setIncomingCall(callNotification);
      setShowCallDialog(true);
      hasShownDialogRef.current = true;
      // Mark as processed immediately to prevent re-triggering
      processedNotificationIdsRef.current.add(callNotification.id);
      
      // OPTIMISTIC: Mark as read immediately on the client to prevent re-triggering
      // Then mark as read on the server (don't wait for it)
      apiRequest("POST", `/api/user/notifications/${callNotification.id}/read`).catch(console.error);
      // Invalidate query to get updated state
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications/list"] });
    }
  }, [notifications, showCallDialog, isProcessing, queryClient]);

  const handleAccept = async () => {
    if (!incomingCall?.link || isProcessing) return;
    
    setIsProcessing(true);
    const notificationId = incomingCall.id;
    const link = incomingCall.link;
    
    // Clear state immediately to prevent re-triggering
    setShowCallDialog(false);
    setIncomingCall(null);
    hasShownDialogRef.current = false;
    
    try {
      // Mark notification as read (already marked optimistically, but ensure it's saved)
      await apiRequest("POST", `/api/user/notifications/${notificationId}/read`);
      // Invalidate query to refetch updated notifications
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications/list"] });
    } catch (error) {
      console.error("Failed to accept call:", error);
    }
    
    setIsProcessing(false);
    
    // Navigate to meeting
    setTimeout(() => {
      setLocation(link);
    }, 100);
  };

  const handleDecline = async () => {
    if (!incomingCall || isProcessing) return;
    
    setIsProcessing(true);
    const notificationId = incomingCall.id;
    
    // Clear state immediately to prevent re-triggering
    setShowCallDialog(false);
    const currentCall = incomingCall;
    setIncomingCall(null);
    hasShownDialogRef.current = false;
    
    try {
      // Mark notification as read (already marked optimistically, but ensure it's saved)
      await apiRequest("POST", `/api/user/notifications/${notificationId}/read`);
      // Invalidate query to refetch updated notifications
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications/list"] });
    } catch (error) {
      console.error("Failed to decline call:", error);
    }
    
    setIsProcessing(false);
  };

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

