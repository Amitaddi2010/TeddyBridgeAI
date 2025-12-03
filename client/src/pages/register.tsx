import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Stethoscope, Loader2, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function Register() {
  const [location, setLocation] = useLocation();
  const { register, loginWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Get redirect parameter from URL
  const redirectUrl = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('redirect') 
    : null;
  
  // Check if this is a Google sign-in flow
  const isGoogleSignIn = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('googleSignIn') === 'true'
    : false;
  
  // Get Google sign-in data from sessionStorage
  const googleSignInData = typeof window !== 'undefined' 
    ? (() => {
        try {
          const data = sessionStorage.getItem('googleSignInData');
          return data ? JSON.parse(data) : null;
        } catch {
          return null;
        }
      })()
    : null;

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: typeof window !== 'undefined' 
        ? (new URLSearchParams(window.location.search).get('email') || googleSignInData?.email || "")
        : "",
      password: "",
      confirmPassword: "",
      name: typeof window !== 'undefined' 
        ? (new URLSearchParams(window.location.search).get('name') || googleSignInData?.name || "")
        : "",
      username: "",
      role: "patient",
      specialty: "",
      city: "",
      gender: "",
      age: "",
      procedure: "",
      connectToPeers: false,
    },
  });

  const selectedRole = form.watch("role");

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && redirectUrl) {
      setLocation(redirectUrl);
    } else if (user) {
      // Default redirect based on role
      setLocation(user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [user, redirectUrl, setLocation]);

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      // If this is a Google sign-in flow, complete the Google authentication
      if (isGoogleSignIn && googleSignInData) {
        // Complete Google sign-in with selected role
        await loginWithGoogle(data.role);
        // Clear Google sign-in data
        sessionStorage.removeItem('googleSignInData');
        toast({
          title: "Account created!",
          description: "Welcome to TeddyBridge. Your account has been created successfully.",
        });
      } else {
        // Regular registration
        await register(data.email, data.password, data.name, data.role);
        toast({
          title: "Account created!",
          description: "Welcome to TeddyBridge. Your account has been created successfully.",
        });
      }
      // Redirect will be handled by useEffect above
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Unable to create account",
        variant: "destructive",
      });
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
            <span className="text-2xl font-bold">
              {selectedRole === "doctor" ? "PROMSBridge" : "TeddyBridge"}
            </span>
          </div>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {selectedRole === "doctor" ? "Provider Sign Up" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {selectedRole === "doctor" ? "" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Role Selection */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I am a...</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-4 mb-6"
                        >
                          <div>
                            <RadioGroupItem
                              value="patient"
                              id="patient"
                              className="peer sr-only"
                              data-testid="radio-patient"
                            />
                            <label
                              htmlFor="patient"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <span className="text-sm font-medium">Patient</span>
                            </label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="doctor"
                              id="doctor"
                              className="peer sr-only"
                              data-testid="radio-doctor"
                            />
                            <label
                              htmlFor="doctor"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <span className="text-sm font-medium">Healthcare Provider</span>
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Doctor Form */}
                {selectedRole === "doctor" ? (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                              placeholder="Full Name"
                          data-testid="input-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Username"
                              data-testid="input-username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Email"
                          data-testid="input-email"
                          {...field}
                          disabled={isGoogleSignIn}
                        />
                      </FormControl>
                      <FormMessage />
                      {isGoogleSignIn && (
                        <FormDescription className="text-xs text-muted-foreground">
                          Email from your Google account
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />

                    <FormField
                      control={form.control}
                      name="specialty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialty</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Specialty"
                              data-testid="input-specialty"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City"
                              data-testid="input-city"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                {!isGoogleSignIn && (
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Password"
                              data-testid="input-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm Password"
                              data-testid="input-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {isGoogleSignIn && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-100">
                    <Info className="w-4 h-4 inline mr-2" />
                    Please select your role below to complete your Google sign-in.
                  </div>
                )}
                  </>
                ) : (
                  /* Patient Form */
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="First Name"
                              data-testid="input-name"
                              {...field}
                              disabled={isGoogleSignIn}
                            />
                          </FormControl>
                          <FormMessage />
                          {isGoogleSignIn && (
                            <FormDescription className="text-xs text-muted-foreground">
                              Name from your Google account
                            </FormDescription>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Username"
                              data-testid="input-username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                  render={({ field }) => (
                    <FormItem>
                          <FormLabel>Email</FormLabel>
                      <FormControl>
                            <Input
                              type="email"
                              placeholder="Email"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Gender"
                                data-testid="input-gender"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Age"
                                data-testid="input-age"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                          </div>

                    <FormField
                      control={form.control}
                      name="procedure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Procedure</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Procedure"
                              data-testid="input-procedure"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="connectToPeers"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="input-connect-peers"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Connect to Peers</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Password"
                                data-testid="input-password"
                                {...field}
                              />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm Password"
                                data-testid="input-confirm-password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                      <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <FormDescription className="text-xs text-muted-foreground mt-0">
                        Password must be at least 8 characters and can't be entirely numeric.
                      </FormDescription>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isLoading || isGoogleLoading}
                  data-testid="button-submit"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {selectedRole === "doctor" ? "Create Account" : "Sign Up"}
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
              
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading || isGoogleLoading}
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    try {
                      await loginWithGoogle(selectedRole);
                      toast({
                        title: "Account created!",
                        description: "Welcome to TeddyBridge. Your account has been created successfully.",
                      });
                    } catch (error: any) {
                      const errorMessage = error instanceof Error ? error.message : "Failed to sign up with Google";
                      
                      // Handle Firebase configuration errors
                      if (error.isConfigurationError) {
                        toast({
                          title: "Configuration Error",
                          description: "Firebase authentication is not properly configured. Please contact the administrator.",
                          variant: "destructive",
                          duration: 10000,
                        });
                      } else {
                        toast({
                          title: "Registration failed",
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
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}>
                <span className="text-orange-500 font-medium cursor-pointer hover:underline" data-testid="link-login">
                  Login
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
