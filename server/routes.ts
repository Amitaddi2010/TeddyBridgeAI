import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertSurveySchema, insertMeetingSchema } from "@shared/schema";
import QRCode from "qrcode";
import OpenAI from "openai";

declare module "express-session" {
  interface SessionData {
    passport: { user: string };
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: "doctor" | "patient";
      avatarUrl?: string | null;
    }
  }
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).send("Not authenticated");
}

// Middleware to require specific role
function requireRole(role: "doctor" | "patient") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === role) {
      return next();
    }
    return res.status(403).send("Forbidden");
  };
}

// Audit logging helper
async function auditLog(userId: string | undefined, action: string, resourceType?: string, resourceId?: string, data?: any, req?: Request) {
  try {
    await storage.createAuditLog({
      userId: userId || null,
      action,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      data: data || null,
      ipAddress: req?.ip || null,
      userAgent: req?.get("user-agent") || null,
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "teleclinic-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
          });
        } catch (e) {
          return done(e);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        });
      } else {
        done(null, false);
      }
    } catch (e) {
      done(e);
    }
  });

  // ==================== AUTH ROUTES ====================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).send(parsed.error.message);
      }

      const { email, password, name, role } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).send("Email already registered");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        avatarUrl: null,
      });

      // Create role-specific profile
      if (role === "doctor") {
        await storage.createDoctor({ userId: user.id });
      } else {
        await storage.createPatient({ userId: user.id });
      }

      await auditLog(user.id, "user_registered", "user", user.id, { role }, req);

      // Auto login after registration
      req.login({ id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl }, (err) => {
        if (err) {
          return res.status(500).send("Login failed after registration");
        }
        return res.json({ success: true });
      });
    } catch (e) {
      console.error("Registration error:", e);
      return res.status(500).send("Registration failed");
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).send(info?.message || "Login failed");
      
      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        await auditLog(user.id, "user_login", "user", user.id, {}, req);
        return res.json({ success: true });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) return res.status(500).send("Logout failed");
      if (userId) auditLog(userId, "user_logout", "user", userId, {}, req);
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).send("User not found");

      let doctor = null;
      let patient = null;

      if (user.role === "doctor") {
        doctor = await storage.getDoctorByUserId(user.id);
      } else {
        patient = await storage.getPatientByUserId(user.id);
      }

      return res.json({
        ...user,
        password: undefined,
        doctor,
        patient,
      });
    } catch (e) {
      return res.status(500).send("Failed to fetch user");
    }
  });

  // ==================== DOCTOR ROUTES ====================
  app.get("/api/doctor/stats", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const patients = await storage.getPatientsByDoctor(doctor.id);
      const meetings = await storage.getMeetingsByDoctor(doctor.id);
      const upcomingMeetings = meetings.filter(m => m.status === "scheduled" || m.status === "in_progress");
      const completedMeetings = meetings.filter(m => m.status === "completed");
      const notesNeeded = meetings.filter(m => m.status === "completed" && m.transcriptText);

      return res.json({
        totalPatients: patients.length,
        upcomingAppointments: upcomingMeetings.length,
        completedMeetings: completedMeetings.length,
        pendingNotes: notesNeeded.length,
      });
    } catch (e) {
      return res.status(500).send("Failed to fetch stats");
    }
  });

  app.get("/api/doctor/patients", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const patients = await storage.getPatientsByDoctor(doctor.id);
      const result = patients.map(p => ({
        id: p.patient.id,
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        avatar: p.user.avatarUrl,
        phone: p.patient.phone,
        dateOfBirth: p.patient.dateOfBirth,
        linkedAt: p.linkedAt.toISOString(),
      }));

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch patients");
    }
  });

  app.get("/api/doctor/patients/recent", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const patients = await storage.getPatientsByDoctor(doctor.id);
      const result = patients.slice(0, 5).map(p => ({
        id: p.patient.id,
        name: p.user.name,
        avatar: p.user.avatarUrl,
        lastVisit: p.linkedAt.toISOString(),
      }));

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch patients");
    }
  });

  app.get("/api/doctor/appointments/upcoming", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const meetings = await storage.getUpcomingMeetingsByDoctor(doctor.id);
      const result = await Promise.all(
        meetings.map(async (m) => {
          let patientName = "Unknown";
          if (m.patientId) {
            const patient = await storage.getPatient(m.patientId);
            if (patient) {
              const user = await storage.getUser(patient.userId);
              patientName = user?.name || "Unknown";
            }
          }
          return {
            id: m.id,
            patientName,
            scheduledAt: m.scheduledAt?.toISOString(),
            title: m.title,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch appointments");
    }
  });

  // ==================== QR ROUTES ====================
  app.post("/api/qr/generate", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createQrToken({
        token,
        doctorId: doctor.id,
        expiresAt,
        used: false,
      });

      const linkUrl = `${req.protocol}://${req.get("host")}/link/${token}`;
      const qrDataUrl = await QRCode.toDataURL(linkUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      await auditLog(req.user!.id, "qr_generated", "qr_token", token, {}, req);

      return res.json({ token, qrDataUrl });
    } catch (e) {
      console.error("QR generation error:", e);
      return res.status(500).send("Failed to generate QR code");
    }
  });

  app.get("/api/qr/tokens", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const tokens = await storage.getQrTokensByDoctor(doctor.id);
      return res.json(tokens.map(t => ({
        id: t.id,
        token: t.token,
        used: t.used,
        expiresAt: t.expiresAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })));
    } catch (e) {
      return res.status(500).send("Failed to fetch tokens");
    }
  });

  app.get("/api/link/verify/:token", async (req, res) => {
    try {
      const qrToken = await storage.getQrToken(req.params.token);
      
      if (!qrToken) {
        return res.json({ valid: false, expired: false, used: false });
      }

      const isExpired = new Date(qrToken.expiresAt) < new Date();
      
      if (isExpired || qrToken.used) {
        return res.json({
          valid: false,
          expired: isExpired,
          used: qrToken.used,
        });
      }

      const doctor = await storage.getDoctor(qrToken.doctorId);
      if (!doctor) {
        return res.json({ valid: false, expired: false, used: false });
      }

      const doctorUser = await storage.getUser(doctor.userId);

      return res.json({
        valid: true,
        expired: false,
        used: false,
        doctor: {
          id: doctor.id,
          name: doctorUser?.name,
          specialty: doctor.specialty,
          avatar: doctorUser?.avatarUrl,
        },
      });
    } catch (e) {
      return res.status(500).send("Failed to verify token");
    }
  });

  app.post("/api/link/patient", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const { token } = req.body;
      const qrToken = await storage.getQrToken(token);

      if (!qrToken || qrToken.used || new Date(qrToken.expiresAt) < new Date()) {
        return res.status(400).send("Invalid or expired token");
      }

      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) {
        return res.status(404).send("Patient profile not found");
      }

      const existingLink = await storage.getDoctorPatientLink(qrToken.doctorId, patient.id);
      if (existingLink) {
        return res.status(400).send("Already linked to this doctor");
      }

      await storage.createDoctorPatientLink({
        doctorId: qrToken.doctorId,
        patientId: patient.id,
        source: "qr",
      });

      await storage.markQrTokenUsed(token);
      await auditLog(req.user!.id, "patient_linked", "doctor_patient_link", `${qrToken.doctorId}:${patient.id}`, {}, req);

      return res.json({ success: true });
    } catch (e) {
      console.error("Link patient error:", e);
      return res.status(500).send("Failed to link patient");
    }
  });

  // ==================== PATIENT ROUTES ====================
  app.get("/api/patient/stats", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      const doctors = await storage.getDoctorsByPatient(patient.id);
      const meetings = await storage.getMeetingsByPatient(patient.id);
      const upcomingMeetings = meetings.filter(m => m.status === "scheduled" || m.status === "in_progress");
      const pendingSurveys = await storage.getPendingSurveysByPatient(patient.id);
      const completedSurveys = await storage.getCompletedSurveysByPatient(patient.id);

      return res.json({
        totalDoctors: doctors.length,
        upcomingAppointments: upcomingMeetings.length,
        pendingSurveys: pendingSurveys.length,
        completedSurveys: completedSurveys.length,
      });
    } catch (e) {
      return res.status(500).send("Failed to fetch stats");
    }
  });

  app.get("/api/patient/doctors", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      const doctors = await storage.getDoctorsByPatient(patient.id);
      const result = doctors.map(d => ({
        id: d.doctor.id,
        name: d.user.name,
        specialty: d.doctor.specialty,
        avatar: d.user.avatarUrl,
        linkedAt: d.linkedAt.toISOString(),
      }));

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch doctors");
    }
  });

  app.get("/api/patient/appointments/upcoming", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      const meetings = await storage.getUpcomingMeetingsByPatient(patient.id);
      const result = await Promise.all(
        meetings.map(async (m) => {
          const doctor = await storage.getDoctor(m.doctorId);
          const doctorUser = doctor ? await storage.getUser(doctor.userId) : null;
          return {
            id: m.id,
            doctorName: doctorUser?.name || "Unknown",
            scheduledAt: m.scheduledAt?.toISOString(),
            title: m.title,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch appointments");
    }
  });

  app.get("/api/patient/surveys/pending", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      const surveys = await storage.getPendingSurveysByPatient(patient.id);
      const result = await Promise.all(
        surveys.map(async (s) => {
          const doctor = await storage.getDoctor(s.doctorId);
          const doctorUser = doctor ? await storage.getUser(doctor.userId) : null;
          return {
            id: s.id,
            title: s.title,
            doctorName: doctorUser?.name || "Unknown",
            assignedAt: s.createdAt.toISOString(),
            questionCount: s.questions?.length || 0,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch surveys");
    }
  });

  app.get("/api/patient/surveys/completed", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      const surveys = await storage.getCompletedSurveysByPatient(patient.id);
      const result = await Promise.all(
        surveys.map(async (s) => {
          const doctor = await storage.getDoctor(s.doctorId);
          const doctorUser = doctor ? await storage.getUser(doctor.userId) : null;
          return {
            id: s.id,
            title: s.title,
            doctorName: doctorUser?.name || "Unknown",
            questionCount: s.questions?.length || 0,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch surveys");
    }
  });

  // ==================== MEETING ROUTES ====================
  app.get("/api/meetings/:id", requireAuth, async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) return res.status(404).send("Meeting not found");

      const doctor = await storage.getDoctor(meeting.doctorId);
      const doctorUser = doctor ? await storage.getUser(doctor.userId) : null;

      let patientName = null;
      if (meeting.patientId) {
        const patient = await storage.getPatient(meeting.patientId);
        if (patient) {
          const patientUser = await storage.getUser(patient.userId);
          patientName = patientUser?.name;
        }
      }

      const consent = await storage.getRecordingConsent(meeting.id, req.user!.id);

      return res.json({
        id: meeting.id,
        title: meeting.title,
        doctorName: doctorUser?.name,
        patientName,
        status: meeting.status,
        scheduledAt: meeting.scheduledAt?.toISOString(),
        hasConsented: consent?.status === "granted",
        otherPartyConsented: false, // Simplified for now
        isRecording: meeting.status === "in_progress",
      });
    } catch (e) {
      return res.status(500).send("Failed to fetch meeting");
    }
  });

  app.post("/api/meetings/:id/consent", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      const existing = await storage.getRecordingConsent(req.params.id, req.user!.id);

      if (existing) {
        await storage.updateRecordingConsent(existing.id, {
          status,
          consentedAt: status === "granted" ? new Date() : null,
        });
      } else {
        await storage.createRecordingConsent({
          meetingId: req.params.id,
          userId: req.user!.id,
          status,
          consentedAt: status === "granted" ? new Date() : null,
        });
      }

      await auditLog(req.user!.id, "recording_consent", "meeting", req.params.id, { status }, req);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).send("Failed to update consent");
    }
  });

  app.post("/api/meetings/:id/startRecording", requireAuth, async (req, res) => {
    try {
      await storage.updateMeeting(req.params.id, { status: "in_progress" });
      await auditLog(req.user!.id, "recording_started", "meeting", req.params.id, {}, req);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).send("Failed to start recording");
    }
  });

  // ==================== SURVEY ROUTES ====================
  app.get("/api/doctor/surveys", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const surveys = await storage.getSurveysByDoctor(doctor.id);
      const result = await Promise.all(
        surveys.map(async (s) => {
          const responses = await storage.getSurveyResponsesBySurvey(s.id);
          return {
            ...s,
            responseCount: responses.length,
            assignedCount: 0,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch surveys");
    }
  });

  app.post("/api/surveys", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const survey = await storage.createSurvey({
        doctorId: doctor.id,
        title: req.body.title,
        description: req.body.description,
        questions: req.body.questions,
        isActive: true,
      });

      await auditLog(req.user!.id, "survey_created", "survey", survey.id, {}, req);
      return res.json(survey);
    } catch (e) {
      console.error("Survey creation error:", e);
      return res.status(500).send("Failed to create survey");
    }
  });

  app.get("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) return res.status(404).send("Survey not found");

      const doctor = await storage.getDoctor(survey.doctorId);
      const doctorUser = doctor ? await storage.getUser(doctor.userId) : null;

      return res.json({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        doctorName: doctorUser?.name,
        questions: survey.questions,
      });
    } catch (e) {
      return res.status(500).send("Failed to fetch survey");
    }
  });

  app.post("/api/surveys/:id/respond", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      await storage.createSurveyResponse({
        surveyId: req.params.id,
        patientId: patient.id,
        answers: req.body.answers,
      });

      await auditLog(req.user!.id, "survey_response", "survey", req.params.id, {}, req);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).send("Failed to submit response");
    }
  });

  // ==================== NOTES ROUTES ====================
  app.get("/api/doctor/notes", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const notes = await storage.getCallNotesByDoctor(doctor.id);
      const result = await Promise.all(
        notes.map(async (n) => {
          const meeting = await storage.getMeeting(n.meetingId);
          let patientName = "Unknown";
          if (meeting?.patientId) {
            const patient = await storage.getPatient(meeting.patientId);
            if (patient) {
              const user = await storage.getUser(patient.userId);
              patientName = user?.name || "Unknown";
            }
          }
          return {
            ...n,
            patientName,
            meetingDate: meeting?.createdAt?.toISOString(),
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch notes");
    }
  });

  app.patch("/api/notes/:id", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const updated = await storage.updateCallNote(req.params.id, {
        ...req.body,
        isEdited: true,
        editedBy: req.user!.id,
        editedAt: new Date(),
      });

      await auditLog(req.user!.id, "note_edited", "call_note", req.params.id, {}, req);
      return res.json(updated);
    } catch (e) {
      return res.status(500).send("Failed to update note");
    }
  });

  // ==================== DOCTOR APPOINTMENT/MEETING ROUTES ====================
  app.get("/api/doctor/appointments", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const meetings = await storage.getMeetingsByDoctor(doctor.id);
      const result = await Promise.all(
        meetings.map(async (m) => {
          let patientName = "Unknown";
          let patientAvatar = null;
          if (m.patientId) {
            const patient = await storage.getPatient(m.patientId);
            if (patient) {
              const user = await storage.getUser(patient.userId);
              patientName = user?.name || "Unknown";
              patientAvatar = user?.avatarUrl;
            }
          }
          return {
            id: m.id,
            patientName,
            patientAvatar,
            patientId: m.patientId,
            scheduledAt: m.scheduledAt?.toISOString(),
            title: m.title,
            status: m.status,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch appointments");
    }
  });

  app.get("/api/doctor/meetings", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const meetings = await storage.getMeetingsByDoctor(doctor.id);
      const result = await Promise.all(
        meetings.map(async (m) => {
          let patientName = "Unknown";
          let patientAvatar = null;
          if (m.patientId) {
            const patient = await storage.getPatient(m.patientId);
            if (patient) {
              const user = await storage.getUser(patient.userId);
              patientName = user?.name || "Unknown";
              patientAvatar = user?.avatarUrl;
            }
          }
          const notes = await storage.getCallNotesByMeeting(m.id);
          return {
            id: m.id,
            patientName,
            patientAvatar,
            title: m.title,
            scheduledAt: m.scheduledAt?.toISOString(),
            startedAt: m.startedAt?.toISOString(),
            endedAt: m.endedAt?.toISOString(),
            status: m.status,
            hasTranscript: !!m.transcriptText,
            hasNotes: notes.length > 0,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch meetings");
    }
  });

  app.post("/api/meetings", requireAuth, requireRole("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(404).send("Doctor profile not found");

      const meeting = await storage.createMeeting({
        doctorId: doctor.id,
        patientId: req.body.patientId,
        title: req.body.title,
        scheduledAt: new Date(req.body.scheduledAt),
        status: "scheduled",
      });

      await auditLog(req.user!.id, "meeting_created", "meeting", meeting.id, {}, req);
      return res.json(meeting);
    } catch (e) {
      console.error("Meeting creation error:", e);
      return res.status(500).send("Failed to create meeting");
    }
  });

  // ==================== PATIENT APPOINTMENT ROUTES ====================
  app.get("/api/patient/appointments", requireAuth, requireRole("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.id);
      if (!patient) return res.status(404).send("Patient profile not found");

      const meetings = await storage.getMeetingsByPatient(patient.id);
      const result = await Promise.all(
        meetings.map(async (m) => {
          const doctor = await storage.getDoctor(m.doctorId);
          const doctorUser = doctor ? await storage.getUser(doctor.userId) : null;
          return {
            id: m.id,
            doctorName: doctorUser?.name || "Unknown",
            doctorAvatar: doctorUser?.avatarUrl,
            specialty: doctor?.specialty,
            title: m.title,
            scheduledAt: m.scheduledAt?.toISOString(),
            status: m.status,
          };
        })
      );

      return res.json(result);
    } catch (e) {
      return res.status(500).send("Failed to fetch appointments");
    }
  });

  // ==================== PROFILE ROUTES ====================
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const { name, specialty, licenseNumber, bio, phone, address } = req.body;

      await storage.updateUser(req.user!.id, { name });

      if (req.user!.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(req.user!.id);
        if (doctor) {
          await storage.updateDoctor(doctor.id, { specialty, licenseNumber, bio });
        }
      } else {
        const patient = await storage.getPatientByUserId(req.user!.id);
        if (patient) {
          await storage.updatePatient(patient.id, { phone, address });
        }
      }

      await auditLog(req.user!.id, "profile_updated", "user", req.user!.id, {}, req);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).send("Failed to update profile");
    }
  });

  return httpServer;
}
