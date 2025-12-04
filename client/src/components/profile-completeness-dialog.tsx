import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ProfileCompletenessDialog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const hasShownRef = useRef(false);
  const userProfileCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only show dialog if:
    // 1. User is loaded
    // 2. Profile is incomplete
    // 3. We haven't shown it for this user yet
    // 4. User profile has changed (new login)
    if (user) {
      const userId = user.id;
      const isNewUserSession = userProfileCheckedRef.current !== userId;
      
      if (isNewUserSession && !user.isProfileComplete && user.missingFields && user.missingFields.length > 0) {
        // Only show if we haven't shown it before for this user in this session
        if (!hasShownRef.current) {
          setOpen(true);
          hasShownRef.current = true;
          userProfileCheckedRef.current = userId;
        }
      } else if (user.isProfileComplete) {
        // Reset flag when profile becomes complete
        hasShownRef.current = false;
        setOpen(false);
        userProfileCheckedRef.current = userId;
      }
    }
  }, [user]);

  if (!user || !user.missingFields || user.missingFields.length === 0) {
    return null;
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      specialty: "Specialty",
      city: "City",
      gender: "Gender",
      age: "Age",
    };
    return labels[field] || field;
  };

  const handleCompleteProfile = () => {
    setOpen(false);
    setLocation("/settings?section=profile");
    // Mark as shown - will reset when profile is saved and becomes complete
    hasShownRef.current = true;
  };

  const handleDismiss = () => {
    setOpen(false);
    // Mark as shown so it doesn't appear again until next login
    hasShownRef.current = true;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Your profile information is incomplete. Please fill in the missing details to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            Missing required fields:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {user.missingFields.map((field) => (
              <li key={field} className="text-foreground">
                {getFieldLabel(field)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleDismiss}>
            Later
          </Button>
          <Button onClick={handleCompleteProfile}>
            Complete Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

