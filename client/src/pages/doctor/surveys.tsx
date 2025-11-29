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
  const [newSurvey, setNewSurvey] = useState({
    title: "",
    description: "",
    questions: [] as SurveyQuestion[],
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof newSurvey) => {
      const res = await apiRequest("POST", "/api/surveys", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/surveys"] });
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
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Survey
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="w-4 h-4 mr-2" />
                            Send to Patients
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
