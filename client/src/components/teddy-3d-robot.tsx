import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { TeddyIcon } from "@/components/teddy-icon";

interface Teddy3DRobotProps {
  className?: string;
}

export function Teddy3DRobot({ className }: Teddy3DRobotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const appRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const spotlight = spotlightRef.current;

    if (!canvas || !container || !spotlight) return;

    // Initialize Spline scene
    const initSpline = async () => {
      try {
        // Dynamically import Spline runtime
        const { Application } = await import(
          "https://unpkg.com/@splinetool/runtime@1.2.6/build/runtime.js"
        );

        // Spline scene URL - you can replace this with your own Spline scene
        const splineSceneUrl =
          "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

        // Wait for container to be properly sized and DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Set canvas dimensions explicitly
        const container = canvas.parentElement;
        let rect = container?.getBoundingClientRect();
        
        // Retry getting rect if not available
        if (!rect || rect.width === 0 || rect.height === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
          rect = container?.getBoundingClientRect();
        }
        
        // Use container dimensions or fallback
        const dpr = window.devicePixelRatio || 1;
        const width = rect && rect.width > 0 ? Math.floor(rect.width * dpr) : 1200;
        const height = rect && rect.height > 0 ? Math.floor(rect.height * dpr) : 800;
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Set canvas styles - ensure it's visible
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.display = "block";
        canvas.style.visibility = "visible";
        canvas.style.zIndex = "30";
        canvas.style.background = "transparent";

        console.log("Initializing Spline with canvas:", {
          width,
          height,
          containerRect: rect,
          canvasStyle: {
            display: canvas.style.display,
            visibility: canvas.style.visibility,
            position: canvas.style.position
          }
        });

        // Initialize Spline application
        const app = new Application(canvas);
        appRef.current = app;

        // Load the Spline scene
        await app.load(splineSceneUrl);
        
        // Force canvas to be visible
        canvas.style.display = "block";
        canvas.style.visibility = "visible";
        canvas.style.opacity = "1";
        canvas.style.zIndex = "30";
        
        // Hide loader and show canvas once loaded
        setIsLoading(false);
        
        // Double-check visibility after state update
        requestAnimationFrame(() => {
          canvas.style.display = "block";
          canvas.style.visibility = "visible";
          canvas.style.opacity = "1";
          canvas.style.zIndex = "30";
          
          console.log("Spline scene loaded successfully!", {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasVisible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
            canvasDisplay: window.getComputedStyle(canvas).display,
            canvasVisibility: window.getComputedStyle(canvas).visibility,
            canvasOpacity: window.getComputedStyle(canvas).opacity,
            rect: canvas.getBoundingClientRect()
          });
        });

        // Initialize spotlight effect after scene loads
        initSpotlight();
      } catch (error) {
        console.error("Failed to load Spline scene:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          canvas: canvas ? "exists" : "missing",
          canvasDimensions: canvas ? { width: canvas.width, height: canvas.height } : null,
          containerDimensions: container ? container.getBoundingClientRect() : null
        });
        setLoadError(`Failed to load 3D scene: ${error instanceof Error ? error.message : "Unknown error"}`);
        setIsLoading(false);
      }
    };

    // Initialize spotlight effect
    const initSpotlight = () => {
      if (!container || !spotlight) return;

      const spotlightSize = 300;

      const handleMouseMove = (event: MouseEvent) => {
        const { left, top } = container.getBoundingClientRect();
        const mouseX = event.clientX - left;
        const mouseY = event.clientY - top;

        spotlight.style.transform = `translate(${mouseX - spotlightSize / 2}px, ${mouseY - spotlightSize / 2}px)`;
      };

      const handleMouseEnter = () => {
        spotlight.classList.remove("opacity-0");
        spotlight.classList.add("opacity-100");
      };

      const handleMouseLeave = () => {
        spotlight.classList.remove("opacity-100");
        spotlight.classList.add("opacity-0");
      };

      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);

      spotlight.style.transform = `translate(${-spotlightSize / 2}px, ${-spotlightSize / 2}px)`;
    };

    initSpline();

    // Cleanup
    return () => {
      if (appRef.current) {
        // Cleanup Spline application if needed
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
    >
      {/* Spotlight effect */}
      <div
        ref={spotlightRef}
        className="spotlight opacity-0 pointer-events-none absolute rounded-full z-0"
        style={{
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.15), hsl(var(--chart-3) / 0.1), transparent 70%)",
          filter: "blur(40px)",
          transition: "opacity 0.3s ease-out, transform 0.1s ease-out",
        }}
      />

      <div className="flex h-full min-h-[90vh] flex-col lg:flex-row items-center gap-8 lg:gap-12 py-12 sm:py-16 lg:py-20">
          {/* Left content */}
          <div className="w-full lg:w-2/5 flex flex-col justify-center space-y-6 sm:space-y-8 text-center lg:text-left animate-fade-in-up delay-100">
            <Badge variant="secondary" className="w-fit mx-auto lg:mx-0 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5 font-medium">
              Brought to you by CareBridge AI
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              I'm{" "}
              <span className="bg-gradient-to-r from-primary via-primary/90 to-chart-3 bg-clip-text text-transparent animate-pulse-glow inline-block">
                TeddyBridge
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
              Your joint replacement peer-to-peer connector. Connect with specialized doctors and track your PROMS with our intelligent AI assistant.
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
              <Button 
                size="lg" 
                className="gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-chart-3 hover:from-primary/90 hover:to-chart-3/90 text-sm sm:text-base"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-teddy"));
                }}
              >
                <TeddyIcon className="w-4 h-4 sm:w-5 sm:h-5" size={20} />
                Talk to Teddy
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <Link href="/register">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-2 text-sm sm:text-base"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Right content for Spline Scene */}
          <div className="w-full lg:w-3/5 relative min-h-[480px] sm:min-h-[560px] lg:min-h-[760px] rounded-[32px] overflow-hidden bg-gradient-to-br from-muted/30 via-background/40 to-primary/10 backdrop-blur-xl shadow-2xl group transition-all duration-500">
            {/* Decorative glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-chart-3/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            
            <div className="w-full h-[65vh] min-h-[520px] sm:min-h-[600px] lg:min-h-[780px] relative bg-background/30">
              {/* Corner accent - background layer */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full blur-2xl pointer-events-none z-0"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-chart-3/10 rounded-tr-full blur-2xl pointer-events-none z-0"></div>
              
              {/* Spline canvas - Always render, control visibility */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 rounded-2xl"
                style={{ 
                  width: "100%", 
                  height: "100%",
                  display: "block",
                  visibility: isLoading || loadError ? "hidden" : "visible",
                  opacity: isLoading || loadError ? "0" : "1",
                  background: "transparent",
                  zIndex: 25,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "auto",
                  transition: "opacity 0.3s ease-in-out",
                  objectFit: "contain"
                }}
              />

              {/* Loader for Spline - Top layer */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background/95 via-background/90 to-primary/10 backdrop-blur-sm rounded-2xl" style={{ zIndex: 30 }}>
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <TeddyIcon className="w-16 h-16 mx-auto text-primary/50 animate-pulse mb-4" />
                      <span className="loader absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Loading 3D scene...</p>
                  </div>
                </div>
              )}

              {/* Error message - Top layer */}
              {loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background/95 via-background/90 to-primary/10 backdrop-blur-sm rounded-2xl" style={{ zIndex: 30 }}>
                  <div className="text-center space-y-4 p-6 max-w-md">
                    <TeddyIcon className="w-16 h-16 mx-auto text-primary/50 mb-4" />
                    <p className="text-destructive font-medium text-sm">{loadError}</p>
                    <p className="text-xs text-muted-foreground">
                      The 3D scene may take a moment to load. Please check your internet connection.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setLoadError(null);
                        setIsLoading(true);
                        window.location.reload();
                      }}
                    >
                      Reload
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      <style>{`
        .loader {
          width: 48px;
          height: 48px;
          border: 5px solid hsl(var(--primary));
          border-bottom-color: transparent;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          animation: rotation 1s linear infinite;
        }

        @keyframes rotation {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
