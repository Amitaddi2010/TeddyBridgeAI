import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description?: string;
  doctorName: string;
  assignedAt: string;
  completedAt?: string;
  questionCount: number;
}

export default function PatientSurveys() {
  const { data: pendingSurveys, isLoading: pendingLoading } = useQuery<Survey[]>({
    queryKey: ["/api/patient/surveys/pending"],
  });

  const { data: completedSurveys, isLoading: completedLoading } = useQuery<Survey[]>({
    queryKey: ["/api/patient/surveys/completed"],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const SurveyCard = ({ survey, isPending }: { survey: Survey; isPending: boolean }) => (
    <Card className="hover-elevate" data-testid={`survey-${survey.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg">{survey.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {survey.description || `Health survey from Dr. ${survey.doctorName}`}
            </CardDescription>
          </div>
          {isPending ? (
            <Badge className="shrink-0 gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <CheckCircle className="w-3 h-3" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Dr. {survey.doctorName}</span>
            <span>{survey.questionCount} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(isPending ? survey.assignedAt : survey.completedAt!)}
          </div>
        </div>
        {isPending && (
          <Link href={`/survey/${survey.id}`}>
            <Button className="w-full gap-2" data-testid={`button-take-${survey.id}`}>
              Take Survey
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-page-title">
          Surveys
        </h1>
        <p className="text-muted-foreground mt-1">
          Health questionnaires assigned by your doctors
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
            <Clock className="w-4 h-4" />
            Pending
            {pendingSurveys && pendingSurveys.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingSurveys.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
            <CheckCircle className="w-4 h-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingSurveys && pendingSurveys.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingSurveys.map((survey) => (
                <SurveyCard key={survey.id} survey={survey} isPending={true} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No pending surveys. You're all caught up!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : completedSurveys && completedSurveys.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSurveys.map((survey) => (
                <SurveyCard key={survey.id} survey={survey} isPending={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No completed surveys yet
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
