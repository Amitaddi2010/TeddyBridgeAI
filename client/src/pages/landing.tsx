import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingTeddyAssistant } from "@/components/floating-teddy-assistant";
import { Teddy3DRobot } from "@/components/teddy-3d-robot";
import {
  Video,
  Shield,
  Stethoscope,
  ArrowRight,
  UserPlus,
  Zap,
  BarChart3,
  FileCheck,
  TrendingUp,
  MessageCircle,
  Activity,
} from "lucide-react";
import { TeddyIcon } from "@/components/teddy-icon";

const doctorFeatures = [
  {
    icon: MessageCircle,
    title: "Peer-to-Peer Connection",
    description: "Connect with specialists for joint replacement consultations and second opinions",
  },
  {
    icon: Video,
    title: "Secure Video Consultations",
    description: "HIPAA-compliant video calls with end-to-end encryption for safe doctor-to-doctor communication",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Built-in security and compliance for all your peer-to-peer communications",
  },
];

const patientFeatures = [
  {
    icon: TeddyIcon,
    title: "Teddy Talk AI Assistant",
    description: "Connect with specialized doctors instantly using our AI assistant that understands your medical needs",
  },
  {
    icon: UserPlus,
    title: "Quick Patient Add",
    description: "Patients join via TeddyBridge with easy QR code linking or quick add functionality",
  },
  {
    icon: Zap,
    title: "Automated PROMS",
    description: "Automate your PROMS pathway - Pre, Post, and follow-up assessments powered by CAT PROMIS",
  },
  {
    icon: BarChart3,
    title: "Monitor Dashboard",
    description: "Track patient progress with comprehensive dashboards showing Pre and Post-surgery scores",
  },
  {
    icon: FileCheck,
    title: "Generate Documents",
    description: "Automatically generate documents with PROMS results and billable codes (27447, 27446, G0421)",
  },
  {
    icon: TrendingUp,
    title: "PROMS Score Trends",
    description: "Analyze trends with filtering options - Last 30 days, Last 90 days, or All time",
  },
  {
    icon: Activity,
    title: "PROMIS, KOOS & Custom",
    description: "Support for multiple PROMS including PROMIS, KOOS, and custom assessment tools",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm animate-fade-in">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md flex-shrink-0">
              <Stethoscope className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <span className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
              TeddyBridge
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 sm:gap-2 font-medium border-2 text-xs sm:text-sm px-2 sm:px-3" 
              data-testid="button-talk-teddy"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-teddy"));
              }}
            >
              <TeddyIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" size={16} />
              <span className="hidden sm:inline">Talk to Teddy</span>
              <span className="sm:hidden">Teddy</span>
            </Button>
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="button-login" className="font-medium text-xs sm:text-sm px-2 sm:px-4 hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="button-register" className="font-semibold shadow-lg text-xs sm:text-sm px-2 sm:px-4">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section - 3D Robot */}
        <section
          className="relative min-h-[90vh] w-full overflow-hidden bg-gradient-to-br from-background via-primary/5 to-chart-3/5"
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-chart-3/10 rounded-full blur-3xl animate-float delay-300"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full min-h-[90vh]">
            <Teddy3DRobot />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-chart-3/5">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                Key Features
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
                Everything you need for seamless healthcare connections
              </p>
            </div>

            {/* Combined Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...doctorFeatures, ...patientFeatures.slice(0, 3)].map((feature, index) => (
                <Card 
                  key={index} 
                  className="border-2 transition-all duration-500 hover:border-primary/20 hover:shadow-xl hover:-translate-y-2 group"
                >
                  <CardHeader>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm group-hover:shadow-lg">
                      <feature.icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <CardTitle className="text-lg transition-colors duration-300 group-hover:text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed transition-colors duration-300 group-hover:text-foreground/80">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Get Started */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-32 px-4 sm:px-6 relative overflow-hidden border-y-2" style={{
          backgroundColor: 'hsl(var(--muted) / 0.6)',
          borderColor: 'hsl(var(--primary) / 0.3)'
        }}>
          {/* Strong Visible Background Layer */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.1) 50%, hsl(var(--chart-2) / 0.1) 50%, hsl(var(--chart-2) / 0.2) 100%)'
          }}></div>
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-float" style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }}></div>
            <div className="absolute bottom-0 right-1/2 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-float delay-300" style={{ backgroundColor: 'hsl(var(--chart-2) / 0.2)' }}></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10 px-4">
            <div className="relative animate-scale-in delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <div className="absolute -inset-2 sm:-inset-4 rounded-xl sm:rounded-2xl blur-2xl animate-pulse" style={{ 
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--chart-2) / 0.2))',
                opacity: 0.6
              }}></div>
              <div className="relative space-y-4 sm:space-y-6 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-2xl hover:shadow-2xl transition-all duration-500" style={{
                backgroundColor: 'hsl(var(--card))',
                border: '2px solid hsl(var(--primary) / 0.4)'
              }}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--chart-2)))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Get Started Today
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-foreground leading-relaxed px-2">
                  Whether you're a doctor looking to connect with peers or a patient tracking your outcomes, 
                  TeddyBridge and PROMSBridge have you covered.
                </p>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Link href="/register">
                    <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all bg-gradient-to-r from-primary to-chart-3 hover:from-primary/90 hover:to-chart-3/90" data-testid="button-cta-register">
                      Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="gap-2 border-2 hover:bg-primary/5">
                      Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30 py-8 sm:py-10 md:py-12 px-4 sm:px-6 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md flex-shrink-0">
                <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-base sm:text-lg">TeddyBridge</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">How it works</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Brought to you by CareBridge AI
            </p>
          </div>
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              © 2025 TeddyBridge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating AI Assistant */}
      <FloatingTeddyAssistant />
    </div>
  );
}
