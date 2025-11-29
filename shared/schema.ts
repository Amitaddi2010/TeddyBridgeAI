import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["doctor", "patient"]);
export const meetingStatusEnum = pgEnum("meeting_status", ["scheduled", "in_progress", "completed", "cancelled", "transcription_pending", "transcription_failed"]);
export const consentStatusEnum = pgEnum("consent_status", ["pending", "granted", "denied"]);
export const questionTypeEnum = pgEnum("question_type", ["text", "multiple_choice", "scale", "yes_no"]);

// Users table - base authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Doctor profiles
export const doctors = pgTable("doctors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  specialty: text("specialty"),
  licenseNumber: text("license_number"),
  verified: boolean("verified").default(false).notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patient profiles
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: text("date_of_birth"),
  phone: text("phone"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  medicalHistory: text("medical_history"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// QR tokens for patient linking
export const qrTokens = pgTable("qr_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  doctorId: varchar("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  used: boolean("used").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Doctor-Patient links
export const doctorPatientLinks = pgTable("doctor_patient_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  source: text("source").default("qr").notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

// Doctor-Doctor links for consultations
export const doctorDoctorLinks = pgTable("doctor_doctor_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  targetId: varchar("target_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

// Meetings/Video Calls
export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: "set null" }),
  participantDoctorId: varchar("participant_doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  title: text("title"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  status: meetingStatusEnum("status").default("scheduled").notNull(),
  meetingUrl: text("meeting_url"),
  recordingUrl: text("recording_url"),
  transcriptUrl: text("transcript_url"),
  transcriptText: text("transcript_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recording consents
export const recordingConsents = pgTable("recording_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: consentStatusEnum("status").default("pending").notNull(),
  consentedAt: timestamp("consented_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI-generated call notes
export const callNotes = pgTable("call_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  chiefComplaint: text("chief_complaint"),
  hpi: text("hpi"),
  pastMedicalHistory: text("past_medical_history"),
  medications: text("medications"),
  allergies: text("allergies"),
  examObservations: text("exam_observations"),
  assessment: text("assessment"),
  plan: text("plan"),
  urgentFlags: jsonb("urgent_flags").$type<string[]>(),
  followUpQuestions: jsonb("follow_up_questions").$type<string[]>(),
  aiMetadata: jsonb("ai_metadata"),
  isEdited: boolean("is_edited").default(false).notNull(),
  editedBy: varchar("edited_by").references(() => users.id),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Surveys
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").$type<SurveyQuestion[]>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Survey assignments
export const surveyAssignments = pgTable("survey_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Survey responses
export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<Record<string, any>>().notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// Audit logs - immutable
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  data: jsonb("data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  patientLinks: many(doctorPatientLinks),
  meetings: many(meetings),
  surveys: many(surveys),
  qrTokens: many(qrTokens),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  doctorLinks: many(doctorPatientLinks),
  meetings: many(meetings),
  surveyResponses: many(surveyResponses),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  doctor: one(doctors, { fields: [meetings.doctorId], references: [doctors.id] }),
  patient: one(patients, { fields: [meetings.patientId], references: [patients.id] }),
  participantDoctor: one(doctors, { fields: [meetings.participantDoctorId], references: [doctors.id] }),
  callNotes: many(callNotes),
  consents: many(recordingConsents),
}));

// Types
export interface SurveyQuestion {
  id: string;
  type: "text" | "multiple_choice" | "scale" | "yes_no";
  question: string;
  options?: string[];
  required: boolean;
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, submittedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertQrTokenSchema = createInsertSchema(qrTokens).omit({ id: true, createdAt: true });
export const insertDoctorPatientLinkSchema = createInsertSchema(doctorPatientLinks).omit({ id: true, linkedAt: true });
export const insertCallNoteSchema = createInsertSchema(callNotes).omit({ id: true, createdAt: true });
export const insertRecordingConsentSchema = createInsertSchema(recordingConsents).omit({ id: true, createdAt: true });

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertQrToken = z.infer<typeof insertQrTokenSchema>;
export type InsertDoctorPatientLink = z.infer<typeof insertDoctorPatientLinkSchema>;
export type InsertCallNote = z.infer<typeof insertCallNoteSchema>;
export type InsertRecordingConsent = z.infer<typeof insertRecordingConsentSchema>;

// Select types
export type User = typeof users.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Survey = typeof surveys.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type QrToken = typeof qrTokens.$inferSelect;
export type DoctorPatientLink = typeof doctorPatientLinks.$inferSelect;
export type CallNote = typeof callNotes.$inferSelect;
export type RecordingConsent = typeof recordingConsents.$inferSelect;
export type SurveyAssignment = typeof surveyAssignments.$inferSelect;
export type DoctorDoctorLink = typeof doctorDoctorLinks.$inferSelect;

// Auth schemas for login/register
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["doctor", "patient"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
