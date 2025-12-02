import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Shield,
} from "lucide-react";

interface TokenInfo {
  valid: boolean;
  expired: boolean;
  used: boolean;
  doctor?: {
    id: string;
    name: string;
    specialty?: string;
    avatar?: string;
  };
}

export default function LinkPatient() {
  const [, params] = useRoute("/link/:token");
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const token = params?.token || "";

  const { data: tokenInfo, isLoading: tokenLoading, error } = useQuery<TokenInfo>({
    queryKey: ["/api/link/verify", token],
    enabled: !!token,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/link/patient", { token });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Successfully Linked!",
        description: `You are now connected with Dr. ${tokenInfo?.doctor?.name}`,
      });
      setLocation("/patient/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Link Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  // Auto-link when user is authenticated as patient and token is valid
  useEffect(() => {
    if (
      user && 
      user.role === "patient" && 
      tokenInfo?.valid && 
      !tokenInfo?.used && 
      !tokenInfo?.expired && 
      !linkMutation.isPending &&
      !linkMutation.isSuccess
    ) {
      // Automatically link if user just signed up/logged in via QR redirect
      linkMutation.mutate();
    }
  }, [user, tokenInfo?.valid, tokenInfo?.used, tokenInfo?.expired, linkMutation.isPending, linkMutation.isSuccess]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || tokenLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle>Verifying Link</CardTitle>
            <CardDescription>Please wait while we verify your QR code...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Connect with Your Doctor</CardTitle>
            <CardDescription>
              Sign in or create an account to link with your healthcare provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenInfo?.doctor && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={tokenInfo.doctor.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getInitials(tokenInfo.doctor.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{tokenInfo.doctor.name}</p>
                  {tokenInfo.doctor.specialty && (
                    <p className="text-sm text-muted-foreground">{tokenInfo.doctor.specialty}</p>
                  )}
                  <Badge variant="secondary" className="mt-1 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified Provider
                  </Badge>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Link href={`/login?redirect=/link/${token}`}>
                <Button className="w-full gap-2" data-testid="button-sign-in">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href={`/register?redirect=/link/${token}`}>
                <Button variant="outline" className="w-full" data-testid="button-register">
                  Create Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "patient") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Doctor Account Detected</CardTitle>
            <CardDescription>
              This QR code is for patients only. You are currently signed in as a doctor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              If you want to link as a patient, please create a separate patient account.
            </p>
            <Link href="/doctor/dashboard">
              <Button className="w-full" data-testid="button-go-dashboard">
                Go to Doctor Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tokenInfo?.valid) {
    const isExpired = tokenInfo?.expired;
    const isUsed = tokenInfo?.used;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              {isExpired
                ? "This QR code has expired. Please ask your doctor for a new one."
                : isUsed
                ? "This QR code has already been used. Please ask your doctor for a new one."
                : "This QR code is invalid or has been revoked."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/patient/dashboard">
              <Button className="w-full" data-testid="button-go-dashboard">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Connect with Your Doctor</CardTitle>
          <CardDescription>
            You're about to link your account with a healthcare provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tokenInfo.doctor && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
              <Avatar className="w-14 h-14">
                <AvatarImage src={tokenInfo.doctor.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(tokenInfo.doctor.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{tokenInfo.doctor.name}</p>
                {tokenInfo.doctor.specialty && (
                  <p className="text-sm text-muted-foreground">{tokenInfo.doctor.specialty}</p>
                )}
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified Provider
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">By linking, you agree to:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Allow this doctor to schedule video consultations with you
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Receive health surveys and questionnaires
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Share basic profile information with the provider
              </li>
            </ul>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => linkMutation.mutate()}
            disabled={linkMutation.isPending}
            data-testid="button-confirm-link"
          >
            {linkMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Confirm Link
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can unlink from this provider at any time from your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
