import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, X, Minimize2, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { TeddyIcon } from "@/components/teddy-icon";
import { getApiUrl } from "@/lib/api-config";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function FloatingTeddyAssistant() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm **Teddy**, your AI assistant for TeddyBridge. 👋\n\nI can help you with:\n- Finding and recommending doctors based on reviews\n- Understanding platform features\n- PROMS assessments\n- Connecting with healthcare providers\n\nHow can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(getApiUrl("/auth/teddy/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get response");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to get response from Teddy",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to communicate with Teddy",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    chatMutation.mutate(input.trim());
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Listen for custom event to open Teddy from anywhere
  useEffect(() => {
    const handleOpenTeddy = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener("open-teddy", handleOpenTeddy);
    return () => {
      window.removeEventListener("open-teddy", handleOpenTeddy);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "bg-background border-2 border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
            isMinimized
              ? "w-72 sm:w-80 h-14 sm:h-16"
              : "w-[calc(100vw-1.5rem)] sm:w-[380px] h-[calc(100vh-7rem)] sm:h-[600px] max-w-[380px] max-h-[600px] animate-in slide-in-from-bottom-4 fade-in"
          )}
        >
          {/* Header */}
          <div className="relative p-3 sm:p-4 border-b bg-gradient-to-r from-primary via-primary/90 to-chart-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
                  <TeddyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" size={20} />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              {!isMinimized && (
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-white truncate drop-shadow-md">Teddy - An AI assistant</h3>
                  <p className="text-xs text-white/90 truncate">Always here to help</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label="Minimize"
                >
                  <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Container */}
          {!isMinimized && (
            <>
              <ScrollArea className="flex-1 p-3 sm:p-4 bg-gradient-to-b from-background to-muted/20">
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center shrink-0 border border-primary/20">
                          <TeddyIcon className="w-4 h-4 text-white" size={16} />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl p-3 text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-tr-sm"
                            : "bg-card border border-border rounded-tl-sm"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none text-sm prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="leading-relaxed">{message.content}</p>
                        )}
                        <p
                          className={cn(
                            "text-xs mt-2",
                            message.role === "user" ? "opacity-80" : "text-muted-foreground"
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                          <div className="w-5 h-5 rounded-full bg-primary/40"></div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start gap-2 animate-in fade-in">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center shrink-0 border border-primary/20">
                        <TeddyIcon className="w-4 h-4 text-white" size={16} />
                      </div>
                      <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Teddy is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 sm:p-4 border-t bg-background shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 text-xs sm:text-sm border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl h-9 sm:h-10"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-r from-primary to-chart-3 hover:from-primary/90 hover:to-chart-3/90 shadow-lg shrink-0 rounded-xl"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2 text-center flex items-center justify-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="text-[10px] sm:text-xs">Powered by Groq AI</span>
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={cn(
          "h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl bg-gradient-to-r from-primary to-chart-3 hover:from-primary/90 hover:to-chart-3/90 text-white border-[3px] sm:border-4 border-background transition-all duration-300 hover:scale-110 active:scale-95 relative animate-float",
          isOpen && "scale-95"
        )}
        size="icon"
        aria-label="Open Teddy AI Assistant"
      >
        <TeddyIcon className="w-5 h-5 sm:w-6 sm:h-6" size={24} />
        {!isOpen && (
          <>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-background animate-ping"></span>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-background"></span>
          </>
        )}
      </Button>
    </div>
  );
}

