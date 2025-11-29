import { db } from "./db";
import { eq, and, desc, gt, or, sql } from "drizzle-orm";
import {
  users, doctors, patients, meetings, qrTokens, doctorPatientLinks,
  callNotes, surveys, surveyAssignments, surveyResponses, recordingConsents, auditLogs,
  type User, type Doctor, type Patient, type Meeting, type QrToken,
  type DoctorPatientLink, type CallNote, type Survey, type SurveyAssignment,
  type SurveyResponse, type RecordingConsent, type AuditLog,
  type InsertUser, type InsertDoctor, type InsertPatient, type InsertMeeting,
  type InsertQrToken, type InsertDoctorPatientLink, type InsertCallNote,
  type InsertSurvey, type InsertSurveyResponse, type InsertRecordingConsent, type InsertAuditLog,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Doctors
  getDoctor(id: string): Promise<Doctor | undefined>;
  getDoctorByUserId(userId: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor | undefined>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined>;

  // QR Tokens
  createQrToken(token: InsertQrToken): Promise<QrToken>;
  getQrToken(token: string): Promise<QrToken | undefined>;
  getQrTokensByDoctor(doctorId: string): Promise<QrToken[]>;
  markQrTokenUsed(token: string): Promise<void>;

  // Doctor-Patient Links
  createDoctorPatientLink(link: InsertDoctorPatientLink): Promise<DoctorPatientLink>;
  getDoctorPatientLink(doctorId: string, patientId: string): Promise<DoctorPatientLink | undefined>;
  getPatientsByDoctor(doctorId: string): Promise<{ patient: Patient; user: User; linkedAt: Date }[]>;
  getDoctorsByPatient(patientId: string): Promise<{ doctor: Doctor; user: User; linkedAt: Date }[]>;

  // Meetings
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined>;
  getMeetingsByDoctor(doctorId: string): Promise<Meeting[]>;
  getMeetingsByPatient(patientId: string): Promise<Meeting[]>;
  getUpcomingMeetingsByDoctor(doctorId: string): Promise<Meeting[]>;
  getUpcomingMeetingsByPatient(patientId: string): Promise<Meeting[]>;

  // Recording Consents
  createRecordingConsent(consent: InsertRecordingConsent): Promise<RecordingConsent>;
  getRecordingConsent(meetingId: string, userId: string): Promise<RecordingConsent | undefined>;
  updateRecordingConsent(id: string, updates: Partial<RecordingConsent>): Promise<RecordingConsent | undefined>;

  // Call Notes
  createCallNote(note: InsertCallNote): Promise<CallNote>;
  getCallNote(id: string): Promise<CallNote | undefined>;
  getCallNoteByMeeting(meetingId: string): Promise<CallNote | undefined>;
  getCallNotesByMeeting(meetingId: string): Promise<CallNote[]>;
  updateCallNote(id: string, updates: Partial<CallNote>): Promise<CallNote | undefined>;
  getCallNotesByDoctor(doctorId: string): Promise<CallNote[]>;

  // Surveys
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  getSurvey(id: string): Promise<Survey | undefined>;
  updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey | undefined>;
  getSurveysByDoctor(doctorId: string): Promise<Survey[]>;

  // Survey Assignments
  assignSurvey(surveyId: string, patientId: string): Promise<SurveyAssignment>;
  getSurveyAssignment(surveyId: string, patientId: string): Promise<SurveyAssignment | undefined>;
  getPendingSurveysByPatient(patientId: string): Promise<Survey[]>;
  getCompletedSurveysByPatient(patientId: string): Promise<Survey[]>;

  // Survey Responses
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponsesByPatient(patientId: string): Promise<SurveyResponse[]>;
  getSurveyResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  // Doctors
  async getDoctor(id: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doctor;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [created] = await db.insert(doctors).values(doctor).returning();
    return created;
  }

  async updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor | undefined> {
    const [updated] = await db.update(doctors).set(updates).where(eq(doctors.id, id)).returning();
    return updated;
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, userId));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient).returning();
    return created;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients).set(updates).where(eq(patients.id, id)).returning();
    return updated;
  }

  // QR Tokens
  async createQrToken(token: InsertQrToken): Promise<QrToken> {
    const [created] = await db.insert(qrTokens).values(token).returning();
    return created;
  }

  async getQrToken(token: string): Promise<QrToken | undefined> {
    const [qrToken] = await db.select().from(qrTokens).where(eq(qrTokens.token, token));
    return qrToken;
  }

  async getQrTokensByDoctor(doctorId: string): Promise<QrToken[]> {
    return db.select().from(qrTokens).where(eq(qrTokens.doctorId, doctorId)).orderBy(desc(qrTokens.createdAt));
  }

  async markQrTokenUsed(token: string): Promise<void> {
    await db.update(qrTokens).set({ used: true }).where(eq(qrTokens.token, token));
  }

  // Doctor-Patient Links
  async createDoctorPatientLink(link: InsertDoctorPatientLink): Promise<DoctorPatientLink> {
    const [created] = await db.insert(doctorPatientLinks).values(link).returning();
    return created;
  }

  async getDoctorPatientLink(doctorId: string, patientId: string): Promise<DoctorPatientLink | undefined> {
    const [link] = await db.select().from(doctorPatientLinks)
      .where(and(eq(doctorPatientLinks.doctorId, doctorId), eq(doctorPatientLinks.patientId, patientId)));
    return link;
  }

  async getPatientsByDoctor(doctorId: string): Promise<{ patient: Patient; user: User; linkedAt: Date }[]> {
    const results = await db
      .select({
        patient: patients,
        user: users,
        linkedAt: doctorPatientLinks.linkedAt,
      })
      .from(doctorPatientLinks)
      .innerJoin(patients, eq(doctorPatientLinks.patientId, patients.id))
      .innerJoin(users, eq(patients.userId, users.id))
      .where(eq(doctorPatientLinks.doctorId, doctorId))
      .orderBy(desc(doctorPatientLinks.linkedAt));
    return results;
  }

  async getDoctorsByPatient(patientId: string): Promise<{ doctor: Doctor; user: User; linkedAt: Date }[]> {
    const results = await db
      .select({
        doctor: doctors,
        user: users,
        linkedAt: doctorPatientLinks.linkedAt,
      })
      .from(doctorPatientLinks)
      .innerJoin(doctors, eq(doctorPatientLinks.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctorPatientLinks.patientId, patientId))
      .orderBy(desc(doctorPatientLinks.linkedAt));
    return results;
  }

  // Meetings
  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [created] = await db.insert(meetings).values(meeting).returning();
    return created;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined> {
    const [updated] = await db.update(meetings).set(updates).where(eq(meetings.id, id)).returning();
    return updated;
  }

  async getMeetingsByDoctor(doctorId: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(eq(meetings.doctorId, doctorId)).orderBy(desc(meetings.createdAt));
  }

  async getMeetingsByPatient(patientId: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(eq(meetings.patientId, patientId)).orderBy(desc(meetings.createdAt));
  }

  async getUpcomingMeetingsByDoctor(doctorId: string): Promise<Meeting[]> {
    return db.select().from(meetings)
      .where(and(
        eq(meetings.doctorId, doctorId),
        or(eq(meetings.status, "scheduled"), eq(meetings.status, "in_progress"))
      ))
      .orderBy(meetings.scheduledAt);
  }

  async getUpcomingMeetingsByPatient(patientId: string): Promise<Meeting[]> {
    return db.select().from(meetings)
      .where(and(
        eq(meetings.patientId, patientId),
        or(eq(meetings.status, "scheduled"), eq(meetings.status, "in_progress"))
      ))
      .orderBy(meetings.scheduledAt);
  }

  // Recording Consents
  async createRecordingConsent(consent: InsertRecordingConsent): Promise<RecordingConsent> {
    const [created] = await db.insert(recordingConsents).values(consent).returning();
    return created;
  }

  async getRecordingConsent(meetingId: string, userId: string): Promise<RecordingConsent | undefined> {
    const [consent] = await db.select().from(recordingConsents)
      .where(and(eq(recordingConsents.meetingId, meetingId), eq(recordingConsents.userId, userId)));
    return consent;
  }

  async updateRecordingConsent(id: string, updates: Partial<RecordingConsent>): Promise<RecordingConsent | undefined> {
    const [updated] = await db.update(recordingConsents).set(updates).where(eq(recordingConsents.id, id)).returning();
    return updated;
  }

  // Call Notes
  async createCallNote(note: InsertCallNote): Promise<CallNote> {
    const [created] = await db.insert(callNotes).values(note).returning();
    return created;
  }

  async getCallNote(id: string): Promise<CallNote | undefined> {
    const [note] = await db.select().from(callNotes).where(eq(callNotes.id, id));
    return note;
  }

  async getCallNoteByMeeting(meetingId: string): Promise<CallNote | undefined> {
    const [note] = await db.select().from(callNotes).where(eq(callNotes.meetingId, meetingId));
    return note;
  }

  async getCallNotesByMeeting(meetingId: string): Promise<CallNote[]> {
    return db.select().from(callNotes).where(eq(callNotes.meetingId, meetingId)).orderBy(desc(callNotes.createdAt));
  }

  async updateCallNote(id: string, updates: Partial<CallNote>): Promise<CallNote | undefined> {
    const [updated] = await db.update(callNotes).set(updates).where(eq(callNotes.id, id)).returning();
    return updated;
  }

  async getCallNotesByDoctor(doctorId: string): Promise<CallNote[]> {
    const doctorMeetings = await this.getMeetingsByDoctor(doctorId);
    const meetingIds = doctorMeetings.map(m => m.id);
    if (meetingIds.length === 0) return [];
    
    return db.select().from(callNotes)
      .where(sql`${callNotes.meetingId} IN ${meetingIds}`)
      .orderBy(desc(callNotes.createdAt));
  }

  // Surveys
  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [created] = await db.insert(surveys).values(survey).returning();
    return created;
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey | undefined> {
    const [updated] = await db.update(surveys).set(updates).where(eq(surveys.id, id)).returning();
    return updated;
  }

  async getSurveysByDoctor(doctorId: string): Promise<Survey[]> {
    return db.select().from(surveys).where(eq(surveys.doctorId, doctorId)).orderBy(desc(surveys.createdAt));
  }

  // Survey Assignments
  async assignSurvey(surveyId: string, patientId: string): Promise<SurveyAssignment> {
    const [created] = await db.insert(surveyAssignments).values({ surveyId, patientId }).returning();
    return created;
  }

  async getSurveyAssignment(surveyId: string, patientId: string): Promise<SurveyAssignment | undefined> {
    const [assignment] = await db.select().from(surveyAssignments)
      .where(and(eq(surveyAssignments.surveyId, surveyId), eq(surveyAssignments.patientId, patientId)));
    return assignment;
  }

  async getPendingSurveysByPatient(patientId: string): Promise<Survey[]> {
    const assignments = await db.select()
      .from(surveyAssignments)
      .innerJoin(surveys, eq(surveyAssignments.surveyId, surveys.id))
      .where(and(
        eq(surveyAssignments.patientId, patientId),
        sql`${surveyAssignments.completedAt} IS NULL`
      ));
    return assignments.map(a => a.surveys);
  }

  async getCompletedSurveysByPatient(patientId: string): Promise<Survey[]> {
    const assignments = await db.select()
      .from(surveyAssignments)
      .innerJoin(surveys, eq(surveyAssignments.surveyId, surveys.id))
      .where(and(
        eq(surveyAssignments.patientId, patientId),
        sql`${surveyAssignments.completedAt} IS NOT NULL`
      ));
    return assignments.map(a => a.surveys);
  }

  // Survey Responses
  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const [created] = await db.insert(surveyResponses).values(response).returning();
    // Mark assignment as completed
    await db.update(surveyAssignments)
      .set({ completedAt: new Date() })
      .where(and(
        eq(surveyAssignments.surveyId, response.surveyId),
        eq(surveyAssignments.patientId, response.patientId)
      ));
    return created;
  }

  async getSurveyResponsesByPatient(patientId: string): Promise<SurveyResponse[]> {
    return db.select().from(surveyResponses).where(eq(surveyResponses.patientId, patientId));
  }

  async getSurveyResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]> {
    return db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, surveyId));
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
