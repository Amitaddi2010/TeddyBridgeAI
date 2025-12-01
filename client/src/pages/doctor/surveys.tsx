import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ClipboardList,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  MoreVertical,
  Eye,
  Send,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Survey, SurveyQuestion } from "@shared/schema";

interface SurveyWithStats extends Survey {
  responseCount: number;
  assignedCount: number;
}

export default function DoctorSurveys() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyWithStats | null>(null);
  const [editSurvey, setEditSurvey] = useState({
    title: "",
    description: "",
    questions: [] as SurveyQuestion[],
    isActive: true,
  });
  const [newSurvey, setNewSurvey] = useState({
    title: "",
    description: "",
    questions: [] as SurveyQuestion[],
    assignedPatients: [] as string[],
  });
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  const { data: patients } = useQuery({
    queryKey: ["/api/doctor/patients"],
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    type: "text" as SurveyQuestion["type"],
    question: "",
    options: [""],
    required: true,
  });

  const { data: surveys, isLoading } = useQuery<SurveyWithStats[]>({
    queryKey: ["/api/doctor/surveys"],
  });

  const { data: surveyResponses } = useQuery({
    queryKey: [`/api/doctor/surveys/${selectedSurvey?.id}/responses`],
    enabled: !!selectedSurvey && showResponsesModal,
  });

  const { data: surveyDetails } = useQuery({
    queryKey: [`/api/doctor/surveys/${selectedSurvey?.id}`],
    enabled: !!selectedSurvey && showDetailsModal,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newSurvey) => {
      const res = await apiRequest("POST", "/api/surveys", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/surveys"] });
      queryClient.refetchQueries({ queryKey: ["/api/doctor/surveys"] });
      setShowCreateModal(false);
      setNewSurvey({ title: "", description: "", questions: [] });
      toast({
        title: "Survey Created",
        description: "Your survey has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create survey",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: typeof editSurvey }) => {
      const res = await apiRequest("PATCH", `/api/doctor/surveys/${data.id}/update`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/surveys"] });
      queryClient.refetchQueries({ queryKey: ["/api/doctor/surveys"] });
      setShowEditModal(false);
      setSelectedSurvey(null);
      toast({
        title: "Survey Updated",
        description: "Your survey has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update survey",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    const question: SurveyQuestion = {
      id: crypto.randomUUID(),
      type: currentQuestion.type,
      question: currentQuestion.question,
      required: currentQuestion.required,
      ...(currentQuestion.type === "multiple_choice" && {
        options: currentQuestion.options.filter((o) => o.trim()),
      }),
    };

    setNewSurvey({
      ...newSurvey,
      questions: [...newSurvey.questions, question],
    });
    setCurrentQuestion({
      type: "text",
      question: "",
      options: [""],
      required: true,
    });
  };

  const removeQuestion = (id: string) => {
    setNewSurvey({
      ...newSurvey,
      questions: newSurvey.questions.filter((q) => q.id !== id),
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getQuestionTypeLabel = (type: SurveyQuestion["type"]) => {
    switch (type) {
      case "text":
        return "Text Response";
      case "multiple_choice":
        return "Multiple Choice";
      case "scale":
        return "Rating Scale";
      case "yes_no":
        return "Yes/No";
      default:
        return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-page-title">
            Surveys
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage patient health surveys
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
          data-testid="button-create-survey"
        >
          <Plus className="w-4 h-4" />
          Create Survey
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your Surveys</CardTitle>
          <CardDescription>
            {surveys?.length ?? 0} surveys created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : surveys && surveys.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveys.map((survey) => (
                <Card key={survey.id} className="hover-elevate" data-testid={`survey-${survey.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{survey.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {survey.description || "No description"}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedSurvey(survey); setShowDetailsModal(true); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedSurvey(survey); setShowResponsesModal(true); }}>
                            <Users className="w-4 h-4 mr-2" />
                            View Responses ({survey.responseCount})
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedSurvey(survey);
                            setEditSurvey({
                              title: survey.title,
                              description: survey.description || "",
                              questions: survey.questions || [],
                              isActive: survey.isActive,
                            });
                            setShowEditModal(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Survey
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast({ title: "Send feature", description: "Send to patients functionality coming soon" })}>
                            <Send className="w-4 h-4 mr-2" />
                            Send to Patients
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => toast({ title: "Delete feature", description: "Delete functionality coming soon" })}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ClipboardList className="w-4 h-4" />
                        {survey.questions?.length || 0} questions
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {survey.responseCount} responses
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(survey.createdAt as unknown as string)}
                      </div>
                      <Badge variant={survey.isActive ? "default" : "secondary"}>
                        {survey.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No surveys created yet
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Survey
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Survey</DialogTitle>
            <DialogDescription>
              Build a health survey to send to your patients
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Survey Title</Label>
              <Input
                id="title"
                placeholder="e.g., Pre-visit Health Assessment"
                value={newSurvey.title}
                onChange={(e) =>
                  setNewSurvey({ ...newSurvey, title: e.target.value })
                }
                data-testid="input-survey-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this survey..."
                value={newSurvey.description}
                onChange={(e) =>
                  setNewSurvey({ ...newSurvey, description: e.target.value })
                }
                data-testid="input-survey-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Assign to Patients</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {patients && patients.length > 0 ? (
                  patients.map((patient: any) => (
                    <div key={patient.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`patient-${patient.id}`}
                        checked={selectedPatients.includes(patient.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPatients([...selectedPatients, patient.id]);
                            setNewSurvey({ ...newSurvey, assignedPatients: [...selectedPatients, patient.id] });
                          } else {
                            const updated = selectedPatients.filter(id => id !== patient.id);
                            setSelectedPatients(updated);
                            setNewSurvey({ ...newSurvey, assignedPatients: updated });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`patient-${patient.id}`} className="cursor-pointer">
                        {patient.name} ({patient.email})
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No patients linked yet</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPatients.length} patient(s) selected
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Add Question</h4>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={currentQuestion.type}
                    onValueChange={(value: SurveyQuestion["type"]) =>
                      setCurrentQuestion({ ...currentQuestion, type: value })
                    }
                  >
                    <SelectTrigger data-testid="select-question-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Response</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="scale">Rating Scale (1-10)</SelectItem>
                      <SelectItem value="yes_no">Yes/No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input
                    placeholder="Enter your question..."
                    value={currentQuestion.question}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        question: e.target.value,
                      })
                    }
                    data-testid="input-question-text"
                  />
                </div>

                {currentQuestion.type === "multiple_choice" && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({
                              ...currentQuestion,
                              options: newOptions,
                            });
                          }}
                        />
                        {index === currentQuestion.options.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setCurrentQuestion({
                                ...currentQuestion,
                                options: [...currentQuestion.options, ""],
                              })
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  className="gap-2"
                  data-testid="button-add-question"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </Button>
              </div>
            </div>

            {newSurvey.questions.length > 0 && (
              <div className="space-y-2">
                <Label>Questions ({newSurvey.questions.length})</Label>
                <div className="space-y-2">
                  {newSurvey.questions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {index + 1}. {q.question}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getQuestionTypeLabel(q.type)}
                          {q.options && ` • ${q.options.length} options`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(q.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newSurvey)}
              disabled={
                createMutation.isPending ||
                !newSurvey.title ||
                newSurvey.questions.length === 0
              }
              data-testid="button-save-survey"
            >
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Survey Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{surveyDetails?.title}</DialogTitle>
            <DialogDescription>{surveyDetails?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {surveyDetails?.questions?.map((q: SurveyQuestion, index: number) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {index + 1}. {q.question}
                  </CardTitle>
                  <CardDescription>
                    {getQuestionTypeLabel(q.type)}
                    {q.required && <Badge className="ml-2" variant="outline">Required</Badge>}
                  </CardDescription>
                </CardHeader>
                {q.options && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">Options:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {q.options.map((opt, i) => (
                        <li key={i} className="text-sm">{opt}</li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Survey Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey</DialogTitle>
            <DialogDescription>Update survey details and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Survey Title</Label>
              <Input
                id="edit-title"
                value={editSurvey.title}
                onChange={(e) => setEditSurvey({ ...editSurvey, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editSurvey.description}
                onChange={(e) => setEditSurvey({ ...editSurvey, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editSurvey.isActive}
                onChange={(e) => setEditSurvey({ ...editSurvey, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="edit-active">Active (patients can respond)</Label>
            </div>
            {editSurvey.questions.length > 0 && (
              <div className="space-y-2">
                <Label>Questions ({editSurvey.questions.length})</Label>
                <div className="space-y-2">
                  {editSurvey.questions.map((q, index) => (
                    <div key={q.id} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm">{index + 1}. {q.question}</p>
                      <p className="text-xs text-muted-foreground">{getQuestionTypeLabel(q.type)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button
              onClick={() => selectedSurvey && updateMutation.mutate({ id: selectedSurvey.id, updates: editSurvey })}
              disabled={updateMutation.isPending || !editSurvey.title}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Survey Responses Modal */}
      <Dialog open={showResponsesModal} onOpenChange={setShowResponsesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Responses</DialogTitle>
            <DialogDescription>
              {surveyResponses?.length || 0} responses received for {selectedSurvey?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {surveyResponses && surveyResponses.length > 0 ? (
              surveyResponses.map((response: any) => (
                <Card key={response.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{response.patientName}</CardTitle>
                        <CardDescription>{response.patientEmail}</CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(response.submittedAt)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(response.answers).map(([questionId, answer]: [string, any]) => {
                        const question = surveyDetails?.questions?.find((q: SurveyQuestion) => q.id === questionId);
                        return (
                          <div key={questionId} className="border-l-2 pl-3">
                            <p className="text-sm font-medium">{question?.question || 'Question'}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof answer === 'string' ? answer : JSON.stringify(answer)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No responses yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
