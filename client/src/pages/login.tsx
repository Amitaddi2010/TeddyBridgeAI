import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Stethoscope, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const [location, setLocation] = useLocation();
  const { login, loginWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Get redirect parameter from URL
  const redirectUrl = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('redirect') 
    : null;
  
  // Get role from URL query params (for Google sign-in)
  const roleParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('role') as "doctor" | "patient" | null
    : null;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && redirectUrl) {
      setLocation(redirectUrl);
    } else if (user) {
      // Default redirect based on role
      setLocation(user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [user, redirectUrl, setLocation]);

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      // Redirect will be handled by useEffect above
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid credentials";
      // Don't show error toast if user is already logged in (redirecting)
      if (!user) {
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Link href="/">
          <div className="flex items-center justify-center gap-3 cursor-pointer" data-testid="link-logo">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">TeddyBridge</span>
          </div>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Your PROMS AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="doctor@example.com"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || isGoogleLoading}
                  data-testid="button-submit"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading || isGoogleLoading}
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    try {
                      await loginWithGoogle(roleParam || "patient");
                      // Only show success if user isn't already logged in
                      if (!user) {
                        toast({
                          title: "Welcome!",
                          description: "You have successfully signed in with Google.",
                        });
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : "Failed to sign in with Google";
                      // Don't show error for user cancellation
                      if (!errorMessage.toLowerCase().includes("cancelled") && !errorMessage.toLowerCase().includes("cancel")) {
                        toast({
                          title: "Sign-in failed",
                          description: errorMessage,
                          variant: "destructive",
                        });
                      }
                    } finally {
                      setIsGoogleLoading(false);
                    }
                  }}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : "/register"}>
                <span className="text-primary font-medium cursor-pointer hover:underline" data-testid="link-register">
                  Create one
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
