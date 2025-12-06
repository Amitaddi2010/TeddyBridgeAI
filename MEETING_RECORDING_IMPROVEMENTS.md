# Meeting Recording & AI Notes Improvements

## 📋 Overview

Fixed the meeting recording and AI note generation system to capture **BOTH doctor and patient audio/video**, enabling accurate two-way conversation transcription and comprehensive AI-generated clinical notes.

## 🐛 Problem Identified

**Before:** The recording system only captured the doctor's (local) audio/video tracks, missing the patient's (remote) audio/video. This resulted in:
- ❌ One-sided transcripts (only doctor's speech)
- ❌ Missing patient responses and symptoms
- ❌ Incomplete and inaccurate AI-generated clinical notes

## ✅ Solution Implemented

### 1. **Frontend: Enhanced Recording to Capture Both Participants**

**File:** `client/src/pages/meeting.tsx`

**Changes:**
- Added tracking of remote audio/video tracks (`remoteAudioTracksRef`, `remoteVideoTracksRef`)
- Modified `startRecording()` to include:
  - Local (doctor) audio/video tracks
  - Remote (patient) audio/video tracks from connected participants
  - Real-time track addition as participants join
- Records complete two-way conversation

**Key Code:**
```typescript
// Now captures BOTH local and remote tracks
remoteAudioTracksRef.current.forEach((track, participantId) => {
  if (track && track.readyState === 'live') {
    stream.addTrack(track);
  }
});
```

### 2. **Backend: Enabled Speaker Diarization**

**File:** `teddybridge/apps/meetings/views.py`

**Changes:**
- Enabled AssemblyAI speaker diarization with:
  - `speaker_labels=True` - Identifies different speakers
  - `speakers_expected=2` - Expects doctor and patient
  - Formats transcript with speaker labels (Speaker A, Speaker B)

**Key Code:**
```python
config = aai.TranscriptionConfig(
    speaker_labels=True,  # Enable speaker diarization
    speakers_expected=2,  # Expect 2 speakers (doctor and patient)
    language_code="en"
)
transcript = transcriber.transcribe(audio_file, config=config)
```

### 3. **AI Prompt: Improved for Two-Way Conversations**

**File:** `teddybridge/apps/meetings/views.py`

**Changes:**
- Updated AI prompt to use speaker-labeled transcripts
- Explicitly instructs AI to extract information from:
  - **Patient statements**: Symptoms, history, medications, allergies
  - **Doctor statements**: Observations, assessments, treatment plans
- Added `urgentFlags` and `followUpQuestions` to JSON structure
- Stores formatted transcript with speaker labels

**Key Improvements:**
```python
# Formats transcript with speaker labels
formatted_parts = []
for utterance in transcript.utterances:
    speaker_label = f"Speaker {utterance.speaker}"
    formatted_parts.append(f"{speaker_label}: {utterance.text}")
formatted_transcript = "\n".join(formatted_parts)
```

## 📊 Results

### Before:
- ❌ Recording: Only doctor's audio/video
- ❌ Transcription: No speaker identification
- ❌ AI Notes: Incomplete (missing patient responses)

### After:
- ✅ Recording: **BOTH doctor AND patient audio/video**
- ✅ Transcription: **Speaker diarization enabled** (identifies who said what)
- ✅ AI Notes: **Complete two-way conversation** with accurate clinical notes

## 🎯 Benefits

1. **Complete Conversation Capture**: Both sides of the consultation are recorded
2. **Accurate Transcription**: Speaker labels distinguish doctor vs patient statements
3. **Better AI Notes**: 
   - Patient symptoms and history from patient's own words
   - Doctor's observations and assessments clearly identified
   - Comprehensive clinical notes with all information
4. **Improved Clinical Documentation**: More accurate medical records

## 🔧 Technical Details

### Recording Flow:
1. Doctor starts recording in meeting
2. System captures:
   - Local tracks (doctor's mic/camera)
   - Remote tracks (patient's mic/camera)
   - Mixed into single recording file
3. Recording uploaded to backend after meeting ends

### Transcription Flow:
1. Backend receives recording file
2. AssemblyAI transcribes with speaker diarization
3. Transcript formatted with speaker labels:
   ```
   Speaker A: Hello, how can I help you today?
   Speaker B: I've been having headaches for the past week.
   ```
4. Formatted transcript stored in database

### AI Notes Generation:
1. Speaker-labeled transcript sent to AI
2. AI extracts information from both speakers:
   - Patient: Chief complaint, symptoms, history, medications
   - Doctor: Assessment, observations, treatment plan
3. Structured JSON notes saved to database
4. Doctor notified when notes are ready

## 📝 Files Modified

1. **Frontend:**
   - `client/src/pages/meeting.tsx` - Enhanced recording to capture both participants

2. **Backend:**
   - `teddybridge/apps/meetings/views.py` - Enabled speaker diarization and improved AI prompt

## ✅ Testing Checklist

- [ ] Start a meeting between doctor and patient
- [ ] Start recording during the meeting
- [ ] Verify both audio tracks are being captured (check console logs)
- [ ] End meeting and verify recording is uploaded
- [ ] Check backend logs for speaker diarization
- [ ] Verify transcript has speaker labels
- [ ] Confirm AI notes include information from both doctor and patient
- [ ] Review generated clinical notes for completeness

## 🚀 Next Steps

1. Test in a real meeting scenario
2. Monitor transcription quality with speaker diarization
3. Review AI-generated notes for accuracy
4. Consider adding speaker name mapping (Doctor/Patient instead of Speaker A/B)

---

**Status:** ✅ **COMPLETE** - All changes implemented and ready for testing

