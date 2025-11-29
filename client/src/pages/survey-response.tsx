import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { SurveyQuestion } from "@shared/schema";

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  doctorName: string;
  questions: SurveyQuestion[];
}

export default function SurveyResponse() {
  const [, params] = useRoute("/survey/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const surveyId = params?.id || "";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: survey, isLoading, error } = useQuery<SurveyData>({
    queryKey: ["/api/surveys", surveyId],
    enabled: !!surveyId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/surveys/${surveyId}/respond`, { answers });
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Survey Submitted",
        description: "Thank you for completing this health survey.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Survey Not Found</CardTitle>
            <CardDescription>
              This survey does not exist or has already been completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation("/patient/surveys")}
            >
              Back to Surveys
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Survey Completed!</CardTitle>
            <CardDescription>
              Thank you for completing the {survey.title} survey. Your responses have been
              submitted to Dr. {survey.doctorName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation("/patient/dashboard")}
              data-testid="button-return-dashboard"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = survey.questions;
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const canProceed = !currentQuestion.required || answers[currentQuestion.id] !== undefined;

  const updateAnswer = (value: any) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const renderQuestionInput = () => {
    switch (currentQuestion.type) {
      case "text":
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => updateAnswer(e.target.value)}
            className="min-h-[120px]"
            data-testid="input-text-answer"
          />
        );

      case "multiple_choice":
        return (
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={updateAnswer}
            className="space-y-3"
          >
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <RadioGroupItem
                  value={option}
                  id={`option-${index}`}
                  data-testid={`radio-option-${index}`}
                />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "scale":
        const scaleValue = answers[currentQuestion.id] || 5;
        return (
          <div className="space-y-6">
            <Slider
              value={[scaleValue]}
              onValueChange={([value]) => updateAnswer(value)}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-scale"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 - Low</span>
              <span className="text-2xl font-bold text-primary">{scaleValue}</span>
              <span>10 - High</span>
            </div>
          </div>
        );

      case "yes_no":
        return (
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={updateAnswer}
            className="flex gap-4"
          >
            <div className="flex-1">
              <RadioGroupItem
                value="yes"
                id="yes"
                className="peer sr-only"
                data-testid="radio-yes"
              />
              <Label
                htmlFor="yes"
                className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
              >
                Yes
              </Label>
            </div>
            <div className="flex-1">
              <RadioGroupItem
                value="no"
                id="no"
                className="peer sr-only"
                data-testid="radio-no"
              />
              <Label
                htmlFor="no"
                className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
              >
                No
              </Label>
            </div>
          </RadioGroup>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{survey.title}</CardTitle>
              <CardDescription>From Dr. {survey.doctorName}</CardDescription>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="font-medium">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-medium">
              {currentQuestion.question}
              {currentQuestion.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </h3>
            {renderQuestionInput()}
          </div>

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="gap-2"
              data-testid="button-previous"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canProceed || submitMutation.isPending}
                className="gap-2"
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Survey
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                disabled={!canProceed}
                className="gap-2"
                data-testid="button-next"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
