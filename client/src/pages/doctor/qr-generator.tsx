import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  QrCode,
  Copy,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface QRToken {
  id: string;
  token: string;
  used: boolean;
  expiresAt: string;
  createdAt: string;
}

export default function QRGenerator() {
  const { toast } = useToast();
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentQR, setCurrentQR] = useState<{ token: string; qrDataUrl: string } | null>(null);

  const { data: tokens, isLoading: tokensLoading } = useQuery<QRToken[]>({
    queryKey: ["/api/qr/tokens"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/qr/generate");
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentQR(data);
      setShowQRModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/qr/tokens"] });
      toast({
        title: "QR Code Generated",
        description: "Share this code with your patient to link them to your practice.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate QR",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const copyLink = () => {
    if (!currentQR) return;
    const link = `${window.location.origin}/link/${currentQR.token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "The patient linking URL has been copied to your clipboard.",
    });
  };

  const downloadQR = () => {
    if (!currentQR) return;
    const link = document.createElement("a");
    link.download = `teleclinic-qr-${Date.now()}.png`;
    link.href = currentQR.qrDataUrl;
    link.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-page-title">
            Patient QR Codes
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate QR codes for patients to link to your practice
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-2"
          data-testid="button-generate-qr"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <QrCode className="w-4 h-4" />
          )}
          Generate New QR
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">How It Works</CardTitle>
          <CardDescription>Simple steps to connect with patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Generate QR Code</p>
                <p className="text-sm text-muted-foreground">
                  Click the button above to create a unique, time-limited QR code
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Share with Patient</p>
                <p className="text-sm text-muted-foreground">
                  Display or send the QR code to your patient securely
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Patient Links</p>
                <p className="text-sm text-muted-foreground">
                  Patient scans QR, creates account, and connects to you
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Generated Tokens</CardTitle>
          <CardDescription>History of your QR code tokens</CardDescription>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : tokens && tokens.length > 0 ? (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border"
                  data-testid={`token-${token.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-mono text-sm">
                        {token.token.slice(0, 8)}...{token.token.slice(-8)}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Created {formatDate(token.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {token.used ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Used
                      </Badge>
                    ) : isExpired(token.expiresAt) ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge className="gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(token.expiresAt)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCode className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No QR codes generated yet
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                Generate Your First QR
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Patient QR Code</DialogTitle>
            <DialogDescription>
              This QR code is valid for 24 hours and can only be used once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {currentQR && (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={currentQR.qrDataUrl}
                    alt="Patient linking QR code"
                    className="w-64 h-64"
                    data-testid="img-qr-code"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={copyLink}
                    data-testid="button-copy-link"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={downloadQR}
                    data-testid="button-download-qr"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  The patient will be prompted to create an account or sign in
                  before being linked to your practice.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
