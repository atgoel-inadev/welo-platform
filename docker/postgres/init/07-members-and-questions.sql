-- =============================================================================
-- Welo Platform Seed Data (07)
-- Populates:
--   1. project_team_members — users assigned to each project
--   2. annotationQuestions  — added to project.configuration JSONB
-- =============================================================================

\c welo_platform;

-- =============================================================================
-- PROJECT TEAM MEMBERS
-- Roles: ANNOTATOR | REVIEWER
-- ON CONFLICT DO NOTHING so re-running is safe
-- =============================================================================

INSERT INTO project_team_members (project_id, user_id, role, quota, is_active)
VALUES

-- ─── Project 1: Sentiment Analysis Dataset ────────────────────────────────
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440003', 'ANNOTATOR', 50, true),  -- Bob
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440004', 'ANNOTATOR', 50, true),  -- Carol
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440008', 'ANNOTATOR', 40, true),  -- Grace
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440013', 'ANNOTATOR', 30, true),  -- Liam
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'REVIEWER',  20, true),  -- David
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440021', 'REVIEWER',  15, true),  -- Tara

-- ─── Project 2: Image Classification Project ──────────────────────────────
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'ANNOTATOR', 50, true),  -- Bob
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004', 'ANNOTATOR', 50, true),  -- Carol
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440009', 'ANNOTATOR', 30, true),  -- Henry
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440014', 'ANNOTATOR', 35, true),  -- Maya
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005', 'REVIEWER',  20, true),  -- David
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440022', 'REVIEWER',  15, true),  -- Uma

-- ─── Project 3: Customer Sentiment Analysis (TEXT) ────────────────────────
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440008', 'ANNOTATOR', 50, true),  -- Grace
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440013', 'ANNOTATOR', 40, true),  -- Liam
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440018', 'ANNOTATOR', 30, true),  -- Quinn
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'ANNOTATOR', 35, true),  -- Bob
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440004', 'ANNOTATOR', 25, true),  -- Carol
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440021', 'REVIEWER',  20, true),  -- Tara
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440005', 'REVIEWER',  15, true),  -- David

-- ─── Project 4: Medical Image Analysis (IMAGE) ────────────────────────────
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440009', 'ANNOTATOR', 40, true),  -- Henry
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440014', 'ANNOTATOR', 35, true),  -- Maya
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440019', 'ANNOTATOR', 40, true),  -- Rachel
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'ANNOTATOR', 30, true),  -- Carol
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440022', 'REVIEWER',  15, true),  -- Uma
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440023', 'REVIEWER',  15, true),  -- Victor

-- ─── Project 5: Podcast Transcription (AUDIO) ─────────────────────────────
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440010', 'ANNOTATOR', 40, true),  -- Iris
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440015', 'ANNOTATOR', 35, true),  -- Noah
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440020', 'ANNOTATOR', 25, true),  -- Sam
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440004', 'ANNOTATOR', 30, true),  -- Carol
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440021', 'REVIEWER',  15, true),  -- Tara
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440023', 'REVIEWER',  15, true),  -- Victor

-- ─── Project 6: Content Safety Review (VIDEO) ─────────────────────────────
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440011', 'ANNOTATOR', 35, true),  -- Jack
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440016', 'ANNOTATOR', 40, true),  -- Olivia
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440019', 'ANNOTATOR', 35, true),  -- Rachel
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440003', 'ANNOTATOR', 25, true),  -- Bob
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440023', 'REVIEWER',  15, true),  -- Victor
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440022', 'REVIEWER',  15, true),  -- Uma

-- ─── Project 7: Data Quality Assessment (CSV) ─────────────────────────────
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440012', 'ANNOTATOR', 50, true),  -- Karen
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440017', 'ANNOTATOR', 40, true),  -- Paul
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440018', 'ANNOTATOR', 30, true),  -- Quinn
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440013', 'ANNOTATOR', 35, true),  -- Liam
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440005', 'REVIEWER',  20, true),  -- David
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440021', 'REVIEWER',  15, true)   -- Tara

ON CONFLICT (project_id, user_id) DO NOTHING;

-- =============================================================================
-- ANNOTATION QUESTIONS
-- Added to configuration.annotationQuestions via jsonb_set.
-- Format per question: { id, question, questionType, required, options? }
-- Valid questionType values: TEXT | SINGLE_SELECT | MULTI_SELECT | NUMBER | DATE
-- =============================================================================

-- ─── Project 3: Customer Sentiment Analysis (TEXT) ────────────────────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{annotationQuestions}',
  '[
    {
      "id": "aq-sent-01",
      "question": "What is the overall sentiment of this customer review?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Positive",  "value": "positive"},
        {"id": "opt2", "label": "Negative",  "value": "negative"},
        {"id": "opt3", "label": "Neutral",   "value": "neutral"},
        {"id": "opt4", "label": "Mixed",     "value": "mixed"}
      ]
    },
    {
      "id": "aq-sent-02",
      "question": "How intense is the sentiment? Rate on a scale of 1 (mild) to 10 (extreme).",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 10}
    },
    {
      "id": "aq-sent-03",
      "question": "Which topics does the review mention? (Select all that apply)",
      "questionType": "MULTI_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "Product Quality",  "value": "product_quality"},
        {"id": "opt2", "label": "Shipping Speed",   "value": "shipping_speed"},
        {"id": "opt3", "label": "Customer Service", "value": "customer_service"},
        {"id": "opt4", "label": "Price / Value",    "value": "price_value"},
        {"id": "opt5", "label": "Packaging",        "value": "packaging"},
        {"id": "opt6", "label": "Return Policy",    "value": "return_policy"},
        {"id": "opt7", "label": "Durability",       "value": "durability"}
      ]
    },
    {
      "id": "aq-sent-04",
      "question": "Does the review appear to be authentic?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Genuine",        "value": "genuine"},
        {"id": "opt2", "label": "Likely Genuine", "value": "likely_genuine"},
        {"id": "opt3", "label": "Suspicious",     "value": "suspicious"},
        {"id": "opt4", "label": "Bot-generated",  "value": "bot_generated"}
      ]
    },
    {
      "id": "aq-sent-05",
      "question": "What is the primary language of the review?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "English",    "value": "english"},
        {"id": "opt2", "label": "Spanish",    "value": "spanish"},
        {"id": "opt3", "label": "French",     "value": "french"},
        {"id": "opt4", "label": "German",     "value": "german"},
        {"id": "opt5", "label": "Portuguese", "value": "portuguese"},
        {"id": "opt6", "label": "Other",      "value": "other"}
      ]
    },
    {
      "id": "aq-sent-06",
      "question": "List the most significant key phrases from the review.",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-sent-07",
      "question": "What product category is being reviewed? (e.g. Electronics, Clothing, Food)",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-sent-08",
      "question": "Does the review contain any policy violations?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "No Violations",  "value": "none"},
        {"id": "opt2", "label": "Contains Profanity", "value": "profanity"},
        {"id": "opt3", "label": "Spam / Fake",    "value": "spam"},
        {"id": "opt4", "label": "Misleading",     "value": "misleading"}
      ]
    },
    {
      "id": "aq-sent-09",
      "question": "Rate your confidence in this annotation (1 = low, 5 = very high).",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 5}
    },
    {
      "id": "aq-sent-10",
      "question": "What specific improvement or complaint does the reviewer highlight? Summarise in one sentence.",
      "questionType": "TEXT",
      "required": false
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440003';

-- ─── Project 4: Medical Image Analysis (IMAGE) ────────────────────────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{annotationQuestions}',
  '[
    {
      "id": "aq-med-01",
      "question": "Which findings are present in this image? (Select all that apply)",
      "questionType": "MULTI_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Normal — No Findings",    "value": "normal"},
        {"id": "opt2", "label": "Pulmonary Nodule",         "value": "nodule"},
        {"id": "opt3", "label": "Lung Mass",                "value": "mass"},
        {"id": "opt4", "label": "Pleural Effusion",         "value": "effusion"},
        {"id": "opt5", "label": "Cardiomegaly",             "value": "cardiomegaly"},
        {"id": "opt6", "label": "Atelectasis",              "value": "atelectasis"},
        {"id": "opt7", "label": "Pneumothorax",             "value": "pneumothorax"},
        {"id": "opt8", "label": "Consolidation",            "value": "consolidation"},
        {"id": "opt9", "label": "Ground-Glass Opacity",     "value": "ggo"}
      ]
    },
    {
      "id": "aq-med-02",
      "question": "What is the overall quality of this image?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Excellent",          "value": "excellent"},
        {"id": "opt2", "label": "Good",               "value": "good"},
        {"id": "opt3", "label": "Fair",               "value": "fair"},
        {"id": "opt4", "label": "Poor — Unreadable", "value": "poor"}
      ]
    },
    {
      "id": "aq-med-03",
      "question": "What is the clinical urgency level?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Routine",                    "value": "routine"},
        {"id": "opt2", "label": "Urgent (within 24 hours)",   "value": "urgent"},
        {"id": "opt3", "label": "Critical (immediate action)", "value": "critical"}
      ]
    },
    {
      "id": "aq-med-04",
      "question": "What is your diagnostic confidence? Enter a percentage from 0 to 100.",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 0, "max": 100}
    },
    {
      "id": "aq-med-05",
      "question": "What is the primary anatomy region shown?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Chest / Thorax",  "value": "chest"},
        {"id": "opt2", "label": "Abdomen",          "value": "abdomen"},
        {"id": "opt3", "label": "Head / Brain",     "value": "head"},
        {"id": "opt4", "label": "Cervical Spine",   "value": "cervical_spine"},
        {"id": "opt5", "label": "Lumbar Spine",     "value": "lumbar_spine"},
        {"id": "opt6", "label": "Extremity",        "value": "extremity"},
        {"id": "opt7", "label": "Pelvis",           "value": "pelvis"},
        {"id": "opt8", "label": "Other",            "value": "other"}
      ]
    },
    {
      "id": "aq-med-06",
      "question": "Describe your clinical observations in detail, including location and estimated size of any findings.",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-med-07",
      "question": "Does this case require specialist follow-up?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "Yes",      "value": "yes"},
        {"id": "opt2", "label": "No",       "value": "no"},
        {"id": "opt3", "label": "Possibly", "value": "possibly"}
      ]
    },
    {
      "id": "aq-med-08",
      "question": "Rate your self-assessment of annotation quality (1 = low, 5 = expert-level).",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 5}
    },
    {
      "id": "aq-med-09",
      "question": "What is the estimated study date (if visible on the image)?",
      "questionType": "DATE",
      "required": false
    },
    {
      "id": "aq-med-10",
      "question": "Note any limitations or caveats in your assessment (e.g. image artefacts, motion blur, partial view).",
      "questionType": "TEXT",
      "required": false
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440004';

-- ─── Project 5: Podcast Transcription (AUDIO) ─────────────────────────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{annotationQuestions}',
  '[
    {
      "id": "aq-pod-01",
      "question": "Provide the full verbatim transcription of the audio clip. Mark inaudible sections with [inaudible] and overlapping speech with [crosstalk].",
      "questionType": "TEXT",
      "required": true
    },
    {
      "id": "aq-pod-02",
      "question": "How many distinct speakers are in this clip?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "1 Speaker",    "value": "1"},
        {"id": "opt2", "label": "2 Speakers",   "value": "2"},
        {"id": "opt3", "label": "3 Speakers",   "value": "3"},
        {"id": "opt4", "label": "4+ Speakers",  "value": "4_plus"}
      ]
    },
    {
      "id": "aq-pod-03",
      "question": "What audio quality issues are present in this clip? (Select all that apply)",
      "questionType": "MULTI_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "No Issues",          "value": "none"},
        {"id": "opt2", "label": "Background Noise",   "value": "background_noise"},
        {"id": "opt3", "label": "Low Volume",         "value": "low_volume"},
        {"id": "opt4", "label": "Echo / Reverb",      "value": "echo"},
        {"id": "opt5", "label": "Distortion",         "value": "distortion"},
        {"id": "opt6", "label": "Crosstalk / Overlap","value": "crosstalk"},
        {"id": "opt7", "label": "Recording Cuts",     "value": "recording_cuts"}
      ]
    },
    {
      "id": "aq-pod-04",
      "question": "What is the primary language spoken in the clip?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "English",    "value": "english"},
        {"id": "opt2", "label": "Spanish",    "value": "spanish"},
        {"id": "opt3", "label": "French",     "value": "french"},
        {"id": "opt4", "label": "German",     "value": "german"},
        {"id": "opt5", "label": "Mandarin",   "value": "mandarin"},
        {"id": "opt6", "label": "Hindi",      "value": "hindi"},
        {"id": "opt7", "label": "Portuguese", "value": "portuguese"},
        {"id": "opt8", "label": "Arabic",     "value": "arabic"},
        {"id": "opt9", "label": "Japanese",   "value": "japanese"},
        {"id": "opt10","label": "Other",      "value": "other"}
      ]
    },
    {
      "id": "aq-pod-05",
      "question": "Does the clip contain background music or jingles?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "Yes", "value": "yes"},
        {"id": "opt2", "label": "No",  "value": "no"}
      ]
    },
    {
      "id": "aq-pod-06",
      "question": "Rate the overall audio clarity. (1 = very poor, 10 = crystal clear)",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 10}
    },
    {
      "id": "aq-pod-07",
      "question": "Rate the transcription difficulty. (1 = very easy, 5 = very hard)",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 5}
    },
    {
      "id": "aq-pod-08",
      "question": "List the speaker labels or names if identifiable (e.g. Host: John, Guest: Dr. Smith).",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-pod-09",
      "question": "What type of audio content is this clip?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "Interview",             "value": "interview"},
        {"id": "opt2", "label": "Monologue / Solo",      "value": "monologue"},
        {"id": "opt3", "label": "Panel Discussion",      "value": "panel"},
        {"id": "opt4", "label": "Advertisement",         "value": "advertisement"},
        {"id": "opt5", "label": "News Report",           "value": "news"},
        {"id": "opt6", "label": "Educational Lecture",   "value": "educational"}
      ]
    },
    {
      "id": "aq-pod-10",
      "question": "Note any unclear or inaudible sections with approximate timestamps (e.g. 1:23–1:31 inaudible).",
      "questionType": "TEXT",
      "required": false
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440005';

-- ─── Project 6: Content Safety Review (VIDEO) ─────────────────────────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{annotationQuestions}',
  '[
    {
      "id": "aq-vid-01",
      "question": "What is the overall content safety rating for this video?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Safe for All Ages",          "value": "safe"},
        {"id": "opt2", "label": "Safe with Content Warning",  "value": "warning"},
        {"id": "opt3", "label": "Restricted (18+)",           "value": "restricted"},
        {"id": "opt4", "label": "Unsafe — Harmful",           "value": "unsafe"},
        {"id": "opt5", "label": "Severely Harmful",           "value": "severely_harmful"}
      ]
    },
    {
      "id": "aq-vid-02",
      "question": "Which policy violations were detected? (Select all that apply)",
      "questionType": "MULTI_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "No Violations",                   "value": "none"},
        {"id": "opt2", "label": "Violence / Graphic Content",      "value": "violence"},
        {"id": "opt3", "label": "Sexual / Adult Content",          "value": "sexual"},
        {"id": "opt4", "label": "Hate Speech / Discrimination",    "value": "hate_speech"},
        {"id": "opt5", "label": "Harassment / Bullying",           "value": "harassment"},
        {"id": "opt6", "label": "Self-Harm / Suicide",             "value": "self_harm"},
        {"id": "opt7", "label": "Dangerous Activities",            "value": "dangerous"},
        {"id": "opt8", "label": "Misinformation / Deepfake",       "value": "misinformation"},
        {"id": "opt9", "label": "Copyright Infringement",          "value": "copyright"}
      ]
    },
    {
      "id": "aq-vid-03",
      "question": "What is the severity score? (0 = no issue, 10 = extreme harm)",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 0, "max": 10}
    },
    {
      "id": "aq-vid-04",
      "question": "What is the appropriate target audience for this video?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "All Ages (G)",           "value": "all_ages"},
        {"id": "opt2", "label": "Teen+ (PG-13)",          "value": "teen_plus"},
        {"id": "opt3", "label": "Adults Only (R)",        "value": "adults"},
        {"id": "opt4", "label": "No Appropriate Audience","value": "none"}
      ]
    },
    {
      "id": "aq-vid-05",
      "question": "What type of content is this video?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "User Generated Content",   "value": "ugc"},
        {"id": "opt2", "label": "News / Journalism",        "value": "news"},
        {"id": "opt3", "label": "Entertainment",            "value": "entertainment"},
        {"id": "opt4", "label": "Educational",              "value": "educational"},
        {"id": "opt5", "label": "Advertisement / Sponsored","value": "ad"},
        {"id": "opt6", "label": "Livestream Clip",          "value": "livestream"},
        {"id": "opt7", "label": "Other",                    "value": "other"}
      ]
    },
    {
      "id": "aq-vid-06",
      "question": "Does this video require immediate moderation action (do not delay)?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "Yes", "value": "yes"},
        {"id": "opt2", "label": "No",  "value": "no"}
      ]
    },
    {
      "id": "aq-vid-07",
      "question": "Provide a detailed safety assessment. Include specific timestamps for any violations (e.g. 0:32–0:45 — graphic content).",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-vid-08",
      "question": "Rate your confidence in this safety assessment. (1 = low, 5 = very high)",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 5}
    },
    {
      "id": "aq-vid-09",
      "question": "What moderation actions do you recommend? (Select all that apply)",
      "questionType": "MULTI_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Approve as Safe",              "value": "approve"},
        {"id": "opt2", "label": "Add Content Warning Label",    "value": "warn_label"},
        {"id": "opt3", "label": "Age-Restrict",                 "value": "age_restrict"},
        {"id": "opt4", "label": "Remove from Platform",         "value": "remove"},
        {"id": "opt5", "label": "Escalate to Senior Reviewer",  "value": "escalate"},
        {"id": "opt6", "label": "Report to Authorities",        "value": "report"}
      ]
    },
    {
      "id": "aq-vid-10",
      "question": "Additional context or notes for the moderation team.",
      "questionType": "TEXT",
      "required": false
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440006';

-- ─── Project 7: Data Quality Assessment (CSV) ─────────────────────────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{annotationQuestions}',
  '[
    {
      "id": "aq-csv-01",
      "question": "What is the overall validity of this data record?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Valid — Meets All Standards",   "value": "valid"},
        {"id": "opt2", "label": "Partially Valid — Minor Issues","value": "partial"},
        {"id": "opt3", "label": "Invalid — Major Issues",        "value": "invalid"},
        {"id": "opt4", "label": "Uncertain — Needs Expert Review","value": "uncertain"}
      ]
    },
    {
      "id": "aq-csv-02",
      "question": "What data quality issues were found? (Select all that apply)",
      "questionType": "MULTI_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "No Issues",                          "value": "none"},
        {"id": "opt2", "label": "Missing Required Fields",             "value": "missing"},
        {"id": "opt3", "label": "Incorrect Data Format",              "value": "format"},
        {"id": "opt4", "label": "Duplicate Entry Suspected",          "value": "duplicate"},
        {"id": "opt5", "label": "Out of Valid Range",                 "value": "out_of_range"},
        {"id": "opt6", "label": "Inconsistent with Related Records",  "value": "inconsistent"},
        {"id": "opt7", "label": "Typographical Error",                "value": "typo"},
        {"id": "opt8", "label": "Encoding Problem",                   "value": "encoding"},
        {"id": "opt9", "label": "Logical Inconsistency",              "value": "logical"}
      ]
    },
    {
      "id": "aq-csv-03",
      "question": "What is the overall data quality score? Enter a value from 0 to 100.",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 0, "max": 100}
    },
    {
      "id": "aq-csv-04",
      "question": "What action do you recommend for this record?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "opt1", "label": "Accept As-Is",                      "value": "accept"},
        {"id": "opt2", "label": "Accept with Minor Correction",       "value": "accept_correct"},
        {"id": "opt3", "label": "Flag for Expert Review",             "value": "flag"},
        {"id": "opt4", "label": "Reject — Cannot Use",               "value": "reject"},
        {"id": "opt5", "label": "Request Source Clarification",       "value": "clarify"}
      ]
    },
    {
      "id": "aq-csv-05",
      "question": "Does this record contain PII or sensitive personal data?",
      "questionType": "SINGLE_SELECT",
      "required": false,
      "options": [
        {"id": "opt1", "label": "Yes",      "value": "yes"},
        {"id": "opt2", "label": "No",       "value": "no"},
        {"id": "opt3", "label": "Possibly", "value": "possibly"}
      ]
    },
    {
      "id": "aq-csv-06",
      "question": "Describe the specific issues found and your reasoning for the assessment.",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-csv-07",
      "question": "Rate the data completeness. (1 = largely incomplete, 5 = fully complete)",
      "questionType": "NUMBER",
      "required": true,
      "validation": {"min": 1, "max": 5}
    },
    {
      "id": "aq-csv-08",
      "question": "What correction would you suggest, if applicable? (Provide the corrected value or format.)",
      "questionType": "TEXT",
      "required": false
    },
    {
      "id": "aq-csv-09",
      "question": "What is the data collection date, if determinable from the record?",
      "questionType": "DATE",
      "required": false
    },
    {
      "id": "aq-csv-10",
      "question": "Note any patterns suggesting systemic data quality issues beyond this single record.",
      "questionType": "TEXT",
      "required": false
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440007';

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Team members populated successfully!' AS status;

SELECT
  p.name                                                              AS project,
  p.project_type                                                      AS type,
  COUNT(ptm.id) FILTER (WHERE ptm.role = 'ANNOTATOR')               AS annotators,
  COUNT(ptm.id) FILTER (WHERE ptm.role = 'REVIEWER')                AS reviewers,
  jsonb_array_length(COALESCE(p.configuration->'annotationQuestions','[]'::jsonb)) AS questions
FROM projects p
LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.is_active = true
WHERE p.id LIKE '850e8400%'
GROUP BY p.id, p.name, p.project_type
ORDER BY p.id;
