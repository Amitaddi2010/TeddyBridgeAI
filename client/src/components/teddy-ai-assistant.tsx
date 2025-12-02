import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, MessageCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getApiUrl } from "@/lib/api-config";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TeddyAIAssistantProps {
  onClose?: () => void;
}

export function TeddyAIAssistant({ onClose }: TeddyAIAssistantProps) {
  const { toast } = useToast();
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
      {/* Enhanced Header */}
      <div className="relative p-6 border-b bg-gradient-to-r from-primary via-primary/90 to-chart-3 shadow-lg overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-chart-3 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Animated Bot Icon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-xl transform transition-transform hover:scale-110">
                <Bot className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              {/* Pulsing indicator */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-bold text-xl text-white drop-shadow-md">Teddy AI Assistant</h3>
              <p className="text-sm text-white/90 flex items-center gap-1 mt-0.5">
                <MessageCircle className="w-3 h-3" />
                Your intelligent healthcare companion
              </p>
            </div>
          </div>
          <Badge className="gap-2 bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-medium">AI-Powered</span>
          </Badge>
        </div>
        
        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="space-y-5">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center shrink-0 shadow-md border-2 border-primary/20">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl rounded-tr-sm p-4 shadow-lg border border-primary/20"
                    : "bg-card border-2 border-border rounded-2xl rounded-tl-sm p-4 shadow-md hover:shadow-lg transition-shadow"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-sm prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
                <p
                  className={`text-xs mt-3 ${
                    message.role === "user"
                      ? "opacity-80"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-3 animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center shrink-0 shadow-md border-2 border-primary/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border-2 border-border rounded-2xl rounded-tl-sm p-4 shadow-md">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 animate-pulse" />
                    Teddy is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Input */}
      <div className="p-6 border-t bg-gradient-to-t from-background via-background to-primary/5 backdrop-blur-sm">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Teddy anything about TeddyBridge..."
              disabled={isLoading}
              className="min-h-[52px] pr-12 text-base border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl shadow-sm transition-all"
            />
            {input && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded-md">
                  Enter
                </kbd>
              </div>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="lg"
            className="h-[52px] px-6 gap-2 bg-gradient-to-r from-primary to-chart-3 hover:from-primary/90 hover:to-chart-3/90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3" />
            <span>Powered by Groq AI • HIPAA Compliant • Always learning</span>
          </p>
        </div>
      </div>
    </div>
  );
}

