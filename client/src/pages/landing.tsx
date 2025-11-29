import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Video,
  FileText,
  Shield,
  QrCode,
  Stethoscope,
  Users,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Secure Video Consultations",
    description: "HIPAA-compliant video calls with end-to-end encryption for safe doctor-patient communication",
  },
  {
    icon: FileText,
    title: "AI-Powered Clinical Notes",
    description: "Automatic transcription and structured clinical documentation generated from your consultations",
  },
  {
    icon: QrCode,
    title: "Easy Patient Linking",
    description: "Generate QR codes for patients to quickly connect with your practice securely",
  },
  {
    icon: Shield,
    title: "Compliance & Consent",
    description: "Built-in consent management and immutable audit logs for regulatory compliance",
  },
  {
    icon: Users,
    title: "Doctor Collaboration",
    description: "Connect with specialists for consultations and second opinions with full documentation",
  },
  {
    icon: Stethoscope,
    title: "Patient Surveys",
    description: "Create and send customizable health surveys to gather patient information",
  },
];

const benefits = [
  "Reduce administrative burden with AI documentation",
  "Improve patient engagement with easy access",
  "Maintain compliance with comprehensive audit trails",
  "Scale your practice with efficient workflows",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TeleClinic</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button data-testid="button-register">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Badge variant="secondary" className="text-sm">
                    Trusted by Healthcare Professionals
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                    Modern Telemedicine Platform for{" "}
                    <span className="text-primary">Healthcare Providers</span>
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Connect with patients through secure video consultations, 
                    powered by AI documentation that saves you hours of administrative work.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <Button size="lg" className="gap-2" data-testid="button-get-started">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" data-testid="button-sign-in">
                      Sign In
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <Video className="w-12 h-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Secure Video Consultation</p>
                      <p className="text-sm text-muted-foreground">
                        Crystal clear video with real-time transcription
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-2xl bg-card border p-4 flex flex-col justify-center items-center gap-2">
                  <FileText className="w-10 h-10 text-primary" />
                  <p className="text-sm font-medium text-center">AI Clinical Notes</p>
                  <Badge variant="secondary" className="text-xs">Automated</Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-3xl font-bold">Everything You Need for Modern Healthcare</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A comprehensive platform designed specifically for healthcare professionals 
                to deliver exceptional patient care while maintaining compliance.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-bold">Ready to Transform Your Practice?</h2>
            <p className="text-xl text-muted-foreground">
              Join healthcare professionals who are already saving time and 
              improving patient care with TeleClinic.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2" data-testid="button-cta-register">
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">TeleClinic</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Secure telemedicine platform for healthcare professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
