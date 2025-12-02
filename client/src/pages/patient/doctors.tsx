import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api-config";
import {
  Stethoscope,
  Calendar,
  Video,
  Mail,
  QrCode,
  Send,
  MessageCircle,
  Star,
} from "lucide-react";

interface LinkedDoctor {
  id: string;
  userId?: string;  // User ID for peer chat
  name: string;
  email: string;
  specialty?: string;
  avatar?: string;
  bio?: string;
  linkedAt: string;
  avgRating?: number;
  reviewCount?: number;
  patientRating?: number;
  unreadMessageCount?: number;
}

function DoctorChatDialog({ doctorId, doctorName }: { doctorId: string; doctorName: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadMessages = async () => {
    try {
      const res = await fetch(getApiUrl(`/peers/chat/${doctorId}`), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/peers/chat/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiverId: doctorId, message: newMessage }),
      });
      
      if (res.ok) {
        setNewMessage("");
        await loadMessages();
      } else {
        const error = await res.json();
        toast({
          title: "Failed to send message",
          description: error.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  return (
    <div className="space-y-2 sm:space-y-3 flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 sm:space-y-3 p-2 sm:p-3 md:p-4 border rounded-lg bg-muted/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[180px] sm:min-h-[200px] text-muted-foreground">
            <div className="text-center px-3 sm:px-4">
              <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm md:text-base">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-xs p-2 sm:p-2.5 md:p-3 rounded-lg ${
                msg.senderId === user?.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card border-2"
              }`}>
                <p className="text-xs sm:text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                <p className={`text-[10px] sm:text-xs mt-1 ${
                  msg.senderId === user?.id ? "opacity-70" : "text-muted-foreground"
                }`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-xs sm:text-sm md:text-base h-9 sm:h-10"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
        />
        <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()} size="icon" className="flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10">
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );
}

function ReviewDialog({ doctorId, doctorName, currentRating }: { doctorId: string; doctorName: string; currentRating?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/patient/reviews/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          doctorId,
          rating,
          comment,
          isAnonymous,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit review");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.updated ? "Review updated!" : "Review submitted!",
        description: "Thank you for your feedback.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patient/doctors"] });
      setIsOpen(false);
      setRating(0);
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-1 text-xs sm:text-sm">
          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          <span>{currentRating ? "Update Review" : "Leave Review"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg md:text-xl pr-8">Review {doctorName}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Share your experience and help others make informed decisions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <div className="flex items-center gap-2">
              <StarRating
                rating={rating}
                interactive={true}
                onRatingChange={setRating}
                size="lg"
              />
              {rating > 0 && (
                <span className="text-sm text-muted-foreground">
                  {rating} star{rating !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Recommendation (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this doctor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <Label
              htmlFor="anonymous"
              className="text-sm font-normal cursor-pointer"
            >
              Post anonymously
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || rating === 0}
              className="flex-1"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientDoctors() {
  const { data: doctors, isLoading } = useQuery<LinkedDoctor[]>({
    queryKey: ["/api/patient/doctors"],
    refetchInterval: 10000, // Refetch every 10 seconds for unread counts
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
    <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-page-title">
          My Doctors
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
          Healthcare providers linked to your account
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Linked Providers</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {doctors?.length ?? 0} doctor{(doctors?.length ?? 0) !== 1 ? "s" : ""} linked to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0" />
                      <div className="space-y-2 min-w-0 flex-1">
                        <Skeleton className="h-5 w-full max-w-32" />
                        <Skeleton className="h-4 w-full max-w-24" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="hover-elevate overflow-hidden" data-testid={`doctor-${doctor.id}`}>
                  <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-base sm:text-lg md:text-xl">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base md:text-lg truncate leading-tight">{doctor.name}</CardTitle>
                        {doctor.specialty && (
                          <CardDescription className="text-xs sm:text-sm truncate mt-0.5">{doctor.specialty}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 sm:space-y-3 md:space-y-4 p-4 sm:p-6 pt-0">
                    {doctor.bio && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {doctor.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate min-w-0">{doctor.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate min-w-0">Linked on {formatDate(doctor.linkedAt)}</span>
                    </div>

                    {/* Rating Display */}
                    {doctor.avgRating !== undefined && doctor.avgRating !== null && (
                      <div className="flex items-center gap-1.5 sm:gap-2 pt-1 flex-wrap">
                        <StarRating rating={Math.round(doctor.avgRating)} size="sm" />
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                          {doctor.avgRating.toFixed(1)}
                        </span>
                        {doctor.reviewCount !== undefined && doctor.reviewCount > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            ({doctor.reviewCount} review{doctor.reviewCount !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2 sm:pt-3 border-t border-border/50">
                      <div className="w-full">
                        <ReviewDialog 
                          doctorId={doctor.id} 
                          doctorName={doctor.name} 
                          currentRating={doctor.patientRating}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full gap-1 relative text-xs sm:text-sm" data-testid={`button-message-${doctor.id}`}>
                              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="truncate">Message</span>
                              {(doctor.unreadMessageCount ?? 0) > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 min-w-4 sm:min-w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs font-semibold"
                                >
                                  {(doctor.unreadMessageCount ?? 0) > 9 ? "9+" : doctor.unreadMessageCount}
                                </Badge>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
                            <DialogHeader className="pb-3 sm:pb-4">
                              <DialogTitle className="text-base sm:text-lg md:text-xl pr-8 break-words flex items-center gap-2 flex-wrap">
                                <span>Chat with {doctor.name}</span>
                                {(doctor.unreadMessageCount ?? 0) > 0 && (
                                  <Badge variant="destructive" className="text-xs font-semibold">
                                    {(doctor.unreadMessageCount ?? 0)} new message{(doctor.unreadMessageCount ?? 0) > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 min-h-0 overflow-hidden">
                              <DoctorChatDialog doctorId={doctor.userId || doctor.id} doctorName={doctor.name} />
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Link href="/patient/appointments" className="w-full">
                          <Button size="sm" className="w-full gap-1 text-xs sm:text-sm" data-testid={`button-schedule-${doctor.id}`}>
                            <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span className="truncate">Schedule</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 md:py-12 px-3 sm:px-4">
              <Stethoscope className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
              <h3 className="text-sm sm:text-base md:text-lg font-medium mb-2">No Doctors Linked</h3>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 md:mb-6 max-w-md mx-auto px-2">
                To connect with a healthcare provider, ask your doctor for a QR code 
                that you can scan to link your accounts.
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 p-2.5 sm:p-3 md:p-4 rounded-lg bg-muted/50 border max-w-sm mx-auto">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary flex-shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="font-medium text-xs sm:text-sm">How to connect</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
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
