import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Edit,
  Save,
  AlertTriangle,
  Calendar,
  User,
  CheckCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { CallNote } from "@shared/schema";

interface CallNoteWithPatient extends CallNote {
  patientName: string;
  patientAvatar?: string;
  meetingDate: string;
}

export default function DoctorNotes() {
  const { toast } = useToast();
  const [editingNote, setEditingNote] = useState<CallNoteWithPatient | null>(null);
  const [editedFields, setEditedFields] = useState<Partial<CallNote>>({});

  const { data: notes, isLoading } = useQuery<CallNoteWithPatient[]>({
    queryKey: ["/api/doctor/notes"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      noteId,
      updates,
    }: {
      noteId: string;
      updates: Partial<CallNote>;
    }) => {
      const res = await apiRequest("PATCH", `/api/notes/${noteId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/notes"] });
      setEditingNote(null);
      setEditedFields({});
      toast({
        title: "Note Updated",
        description: "Your clinical note has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save note",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Clean HTML tags and convert to markdown-friendly format
  const cleanNoteText = (text: string | undefined): string => {
    if (!text) return '';
    
    return text
      // Convert <br> and <br/> to newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Convert bullet points with <br> prefix to markdown lists
      .replace(/<br>\s*•\s*/g, '\n- ')
      .replace(/•\s*/g, '- ')
      // Remove other HTML tags (but keep content)
      .replace(/<[^>]+>/g, '')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  };

  const noteFields = [
    { key: "chiefComplaint", label: "Chief Complaint" },
    { key: "hpi", label: "History of Present Illness" },
    { key: "pastMedicalHistory", label: "Past Medical History" },
    { key: "medications", label: "Medications" },
    { key: "allergies", label: "Allergies" },
    { key: "examObservations", label: "Examination Observations" },
    { key: "assessment", label: "Assessment" },
    { key: "plan", label: "Plan" },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-page-title">
          Call Notes
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-generated clinical documentation from your consultations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Notes</CardTitle>
          <CardDescription>
            Review and edit AI-generated notes from your video consultations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.id} data-testid={`note-${note.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={note.patientAvatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(note.patientName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{note.patientName}</p>
                            {note.isEdited && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(note.meetingDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {note.urgentFlags && note.urgentFlags.length > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {note.urgentFlags.length} Urgent
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setEditingNote(note);
                            setEditedFields({
                              chiefComplaint: note.chiefComplaint,
                              hpi: note.hpi,
                              pastMedicalHistory: note.pastMedicalHistory,
                              medications: note.medications,
                              allergies: note.allergies,
                              examObservations: note.examObservations,
                              assessment: note.assessment,
                              plan: note.plan,
                            });
                          }}
                          data-testid={`button-edit-${note.id}`}
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {noteFields.map(({ key, label }) => {
                        const value = note[key];
                        if (!value) return null;
                        
                        // Clean HTML tags from the text
                        const cleanedValue = cleanNoteText(value);
                        
                        return (
                          <AccordionItem key={key} value={key}>
                            <AccordionTrigger className="text-sm font-medium">
                              {label}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="prose prose-sm max-w-none text-sm text-muted-foreground">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto my-4">
                                        <table className="min-w-full divide-y divide-border border border-border rounded-lg">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children }) => (
                                      <thead className="bg-muted">{children}</thead>
                                    ),
                                    tbody: ({ children }) => (
                                      <tbody className="divide-y divide-border bg-card">{children}</tbody>
                                    ),
                                    tr: ({ children }) => (
                                      <tr className="hover:bg-muted/50 transition-colors">{children}</tr>
                                    ),
                                    th: ({ children }) => (
                                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-normal">
                                        {children}
                                      </td>
                                    ),
                                    h1: ({ children }) => (
                                      <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h3>
                                    ),
                                    p: ({ children }) => (
                                      <p className="mb-3 leading-relaxed">{children}</p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-inside mb-3 space-y-1 ml-4">{children}</ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-inside mb-3 space-y-1 ml-4">{children}</ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="leading-relaxed">{children}</li>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-foreground">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic">{children}</em>
                                    ),
                                    code: ({ children }) => (
                                      <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                        {children}
                                      </code>
                                    ),
                                    blockquote: ({ children }) => (
                                      <blockquote className="border-l-4 border-primary pl-4 italic my-3">
                                        {children}
                                      </blockquote>
                                    ),
                                    // Handle HTML breaks and other inline elements
                                    br: () => <br />,
                                  }}
                                >
                                  {cleanedValue}
                                </ReactMarkdown>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}

                      {note.urgentFlags && note.urgentFlags.length > 0 && (
                        <AccordionItem value="urgent">
                          <AccordionTrigger className="text-sm font-medium text-destructive">
                            Urgent Flags
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-1">
                              {note.urgentFlags.map((flag, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 text-sm text-destructive"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  {flag}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {note.followUpQuestions && note.followUpQuestions.length > 0 && (
                        <AccordionItem value="followup">
                          <AccordionTrigger className="text-sm font-medium">
                            Follow-up Questions
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-1">
                              {note.followUpQuestions.map((q, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">
                                    {i + 1}
                                  </span>
                                  {q}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>

                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3" />
                      Generated by AI from call transcript
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No call notes yet. Notes will be generated after your video consultations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editingNote}
        onOpenChange={() => {
          setEditingNote(null);
          setEditedFields({});
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Clinical Note
            </DialogTitle>
            <DialogDescription>
              Review and correct the AI-generated note for{" "}
              <span className="font-medium">{editingNote?.patientName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {noteFields.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Textarea
                  id={key}
                  value={(editedFields as any)[key] || ""}
                  onChange={(e) =>
                    setEditedFields({
                      ...editedFields,
                      [key]: e.target.value,
                    })
                  }
                  className="min-h-[80px]"
                  data-testid={`textarea-${key}`}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingNote(null);
                setEditedFields({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingNote) {
                  updateMutation.mutate({
                    noteId: editingNote.id,
                    updates: editedFields,
                  });
                }
              }}
              disabled={updateMutation.isPending}
              className="gap-2"
              data-testid="button-save-note"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
