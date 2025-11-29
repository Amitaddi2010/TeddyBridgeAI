# TeleClinic Design Guidelines

## Design Approach
**Selected System**: Material Design 3 with healthcare-specific adaptations
**Rationale**: Medical applications require clarity, accessibility, and trust. Material Design provides robust patterns for information-dense interfaces, form validation, data tables, and complex workflows while maintaining professional credibility essential for healthcare.

## Core Design Principles
1. **Medical Clarity**: All critical information (patient data, consent status, recording state) must be immediately visible without hunting
2. **Trust Through Consistency**: Predictable patterns reduce cognitive load for doctors managing multiple patients
3. **Compliance-First UX**: Every consent, recording, and data action must be explicit and auditable

---

## Typography

**Primary Font**: Inter (Google Fonts)
**Secondary Font**: System UI fallback

**Hierarchy**:
- H1: `text-4xl font-bold` - Page titles (Dashboard, Meeting Room)
- H2: `text-2xl font-semibold` - Section headers (Linked Patients, Call Notes)
- H3: `text-xl font-medium` - Card titles, Modal headers
- Body: `text-base font-normal` - Standard content, patient details
- Small: `text-sm font-normal` - Metadata, timestamps, secondary info
- Caption: `text-xs font-medium uppercase tracking-wide` - Labels, badges (RECORDING, CONSENT REQUIRED)

---

## Layout System

**Spacing Units**: Tailwind units of **2, 4, 6, and 12** (e.g., `p-4`, `gap-6`, `mt-12`)
- Tight spacing: `gap-2` for related form fields
- Standard: `p-4` for cards, `gap-6` for grid items
- Section breathing room: `py-12` between major dashboard sections

**Container Strategy**:
- Dashboard layouts: `max-w-7xl mx-auto px-6`
- Forms/modals: `max-w-2xl`
- Video meeting: Full viewport with overlay controls

**Grid Patterns**:
- Patient/doctor cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Dashboard stats: `grid grid-cols-2 lg:grid-cols-4 gap-4`
- Single-column forms: Always stack on mobile

---

## Component Library

### Navigation
- **Doctor Dashboard**: Sticky top nav with logo, search, profile dropdown, notification bell
- **Sidebar** (desktop): Fixed left sidebar (w-64) with dashboard sections (Appointments, Patients, Surveys, Profile)
- **Mobile**: Hamburger menu transforming to overlay drawer

### Cards
- **Patient Cards**: Elevated cards (`shadow-md rounded-lg p-6`) with avatar, name, last visit date, quick-action buttons
- **Appointment Cards**: Timeline-style with time badge, patient info, Join Call CTA
- **Call Note Cards**: Expandable with AI-generated summary preview, edit button, timestamp

### Forms
- **Inputs**: `border rounded-md px-4 py-2` with floating labels
- **Consent Checkbox**: Extra-large checkbox (`w-6 h-6`) with bold consent text before recording
- **Survey Builder**: Drag-and-drop question blocks with type selector (multiple choice, text, scale)

### Video Meeting Interface
- **Layout**: Full-screen Daily.co iframe with floating control bar (bottom) and participant thumbnails (top-right)
- **Control Bar**: Semi-transparent backdrop blur with icons: Mic, Camera, Record (red dot when active), End Call, Settings
- **Consent Modal**: Center modal (`max-w-md`) appearing before recording with clear YES/NO buttons, must scroll to accept terms

### Data Display
- **Patient Records Table**: Sortable table with sticky header, alternating row backgrounds, expandable rows for details
- **AI Note Display**: Structured sections (Chief Complaint, HPI, Assessment, Plan) with edit-in-place capability
- **Audit Log**: Read-only table with timestamp, user, action, immutable indicator badge

### Modals & Overlays
- **QR Code Modal**: Center modal showing generated QR code (large, 300x300px), copy link button, expiration countdown
- **Confirmation Dialogs**: For critical actions (delete patient link, end recording) with destructive action warnings

### Buttons
- **Primary CTA**: `px-6 py-3 rounded-md font-semibold` - Start Call, Generate QR, Save Note
- **Secondary**: `border px-4 py-2 rounded-md` - Cancel, View Details
- **Icon Buttons**: Circular (`w-10 h-10 rounded-full`) for quick actions in cards

### Status Indicators
- **Badges**: `px-3 py-1 rounded-full text-xs font-semibold uppercase` - Recording, Verified Doctor, Pending Consent
- **Progress States**: Linear progress bar for transcription/AI processing

---

## Accessibility Requirements
- **WCAG AA compliance minimum**
- Form inputs: Always include `aria-label` and visible labels
- Consent flows: Keyboard-navigable with focus indicators (`focus:ring-2`)
- Video controls: Screen reader announcements for recording state changes
- High contrast mode support for all critical UI elements

---

## Images

### Where to Use Images
1. **Landing Page Hero**: Professional medical team consultation image (approx 1400x600px), positioned left with text overlay on right third
2. **Doctor Profile**: Headshot placeholder (circular, 128x128px)
3. **Patient Dashboard**: Small doctor avatar (48x48px) in linked doctors list
4. **Empty States**: Illustrations for "No appointments scheduled" (300x200px centered)

### Image Treatment
- Rounded corners: `rounded-lg` for rectangular images, `rounded-full` for avatars
- Slight shadow: `shadow-sm` on profile images
- No hero image with blurred button - Landing page uses side-by-side layout (image left, CTA right)

---

## Animations
**Minimal Use Only**:
- Page transitions: Simple fade-in (`opacity-0 to opacity-100` over 200ms)
- Modal entry: Scale from 95% to 100%
- **NO** scroll animations, parallax, or decorative motion
- Recording indicator: Subtle pulse animation on red dot only

---

## Special Healthcare Considerations
- **Consent UI**: Must be impossible to miss - full-screen modal, require scroll-to-bottom before enabling "I Consent" button
- **Recording State**: Always visible indicator when recording active (persistent red dot in nav + meeting controls)
- **Data Sensitivity**: Mask patient identifiers in non-essential contexts, blur screenshots in demo mode
- **Error States**: Medical-specific error messages (e.g., "Recording failed - patient data not compromised")