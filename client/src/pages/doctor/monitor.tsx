import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api-config";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, FileText, Plus, Download, Loader2 } from "lucide-react";

interface DashboardData {
  patientId: string;
  patientName: string;
  preScore: number | null;
  postScore: number | null;
  improvement: number | null;
  lastUpdated: string | null;
}

export default function Monitor() {
  const { toast } = useToast();
  const [showAddScoreModal, setShowAddScoreModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [scoreForm, setScoreForm] = useState({
    scoreType: "pre_surgery",
    score: "",
    billableCodes: "",
    notes: "",
  });

  // Filters for trends
  const [filters, setFilters] = useState({
    patientId: "all",
    scoreType: "all",
    timeRange: "all",
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData[]>({
    queryKey: ["/api/doctor/monitor/dashboard"],
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/doctor/monitor/trends", filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const res = await apiRequest("GET", `/api/doctor/monitor/trends?${params}`);
      return res.json();
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["/api/doctor/patients"],
  });

  const addScoreMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/doctor/monitor/scores/add", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/monitor/dashboard"] });
      queryClient.refetchQueries({ queryKey: ["/api/doctor/monitor/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/monitor/trends"] });
      setShowAddScoreModal(false);
      setScoreForm({ scoreType: "pre_surgery", score: "", billableCodes: "", notes: "" });
      toast({ title: "Score Added", description: "PROMS score has been recorded successfully." });
    },
  });

  const handleAddScore = () => {
    if (!selectedPatient || !scoreForm.score) {
      toast({ title: "Missing Information", description: "Please select patient and enter score", variant: "destructive" });
      return;
    }

    addScoreMutation.mutate({
      patientId: selectedPatient,
      scoreType: scoreForm.scoreType,
      score: parseInt(scoreForm.score),
      billableCodes: scoreForm.billableCodes.split(",").map(c => c.trim()).filter(c => c),
      notes: scoreForm.notes,
    });
  };

  const handleDownloadPDF = async (patientId: string) => {
    try {
      const response = await fetch(getApiUrl(`/doctor/monitor/document/${patientId}`), {
        credentials: 'include',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proms_report_${patientId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "PDF Downloaded", description: "PROMS report has been downloaded." });
    } catch (error) {
      toast({ title: "Download Failed", description: "Could not generate PDF", variant: "destructive" });
    }
  };

  const getImprovementBadge = (improvement: number | null) => {
    if (improvement === null) return <Badge variant="secondary">N/A</Badge>;
    if (improvement > 20) return <Badge className="bg-green-500">Excellent</Badge>;
    if (improvement > 10) return <Badge className="bg-blue-500">Good</Badge>;
    if (improvement > 0) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">PROMS Monitor</h1>
          <p className="text-muted-foreground mt-1">Track patient outcomes and trends</p>
        </div>
        <Button onClick={() => setShowAddScoreModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Score
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <Activity className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient PROMS Overview</CardTitle>
              <CardDescription>Pre and post-surgery scores for all patients</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashboardData && dashboardData.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.map((patient) => (
                    <div key={patient.patientId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold">{patient.patientName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Pre: <span className="font-medium text-foreground">{patient.preScore ?? "N/A"}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Post: <span className="font-medium text-foreground">{patient.postScore ?? "N/A"}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Improvement: <span className="font-medium text-foreground">{patient.improvement ?? "N/A"}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getImprovementBadge(patient.improvement)}
                        <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(patient.patientId)} className="gap-1">
                          <Download className="w-3 h-3" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No PROMS data recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={filters.patientId} onValueChange={(value) => setFilters({ ...filters, patientId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Patients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patients</SelectItem>
                      {patients?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Score Type</Label>
                  <Select value={filters.scoreType} onValueChange={(value) => setFilters({ ...filters, scoreType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pre_surgery">Pre-Surgery</SelectItem>
                      <SelectItem value="post_surgery">Post-Surgery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select value={filters.timeRange} onValueChange={(value) => setFilters({ ...filters, timeRange: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PROMS Score Trend</CardTitle>
              <CardDescription>Visual representation of patient outcomes over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : trendsData && trendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} name="PROMS Score" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddScoreModal} onOpenChange={setShowAddScoreModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PROMS Score</DialogTitle>
            <DialogDescription>Record a new pre or post-surgery score</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Score Type</Label>
              <Select value={scoreForm.scoreType} onValueChange={(value) => setScoreForm({ ...scoreForm, scoreType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_surgery">Pre-Surgery</SelectItem>
                  <SelectItem value="post_surgery">Post-Surgery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Score (0-100)</Label>
              <Input type="number" min="0" max="100" value={scoreForm.score} onChange={(e) => setScoreForm({ ...scoreForm, score: e.target.value })} placeholder="Enter score" />
            </div>
            <div className="space-y-2">
              <Label>Billable Codes (comma-separated)</Label>
              <Input value={scoreForm.billableCodes} onChange={(e) => setScoreForm({ ...scoreForm, billableCodes: e.target.value })} placeholder="27447, 27446, G0421" />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input value={scoreForm.notes} onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddScoreModal(false)}>Cancel</Button>
            <Button onClick={handleAddScore} disabled={addScoreMutation.isPending}>
              {addScoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
