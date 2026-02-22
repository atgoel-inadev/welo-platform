-- =============================================================================
-- Welo Platform - Extended Seed Data (06)
-- Adds 5 annotation projects (TEXT, IMAGE, AUDIO, VIDEO, CSV),
-- 17 new users (1 PM, 13 Annotators, 3 Reviewers), and 50 QUEUED tasks.
-- =============================================================================

\c welo_platform;

-- =============================================================================
-- PRE-MIGRATION: Ensure TypeORM-managed columns exist on tasks table
-- (TypeORM synchronize adds these when the app starts; guard for cold init)
-- =============================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_type                  VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_url                   TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_metadata              JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_consensus         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS consensus_reached          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS consensus_score            NUMERIC(5,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_review_level      INT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_review_level          INT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS all_reviews_approved      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_assignments_required INT NOT NULL DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_assignments     INT NOT NULL DEFAULT 0;

-- =============================================================================
-- NEW USERS (17 total)
-- IDs: 650e8400-e29b-41d4-a716-446655440007 → 0023
-- =============================================================================
INSERT INTO users (id, email, username, first_name, last_name, role, status, skills, performance_metrics, availability) VALUES

-- PM 2
('650e8400-e29b-41d4-a716-446655440007', 'pm2@welo.com', 'pm_frank', 'Frank', 'Morgan', 'PROJECT_MANAGER', 'ACTIVE',
 '[{"skillName": "Project Management", "proficiency": "ADVANCED"}, {"skillName": "Data Quality", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 28, "averageQuality": 93.1, "averageSpeed": 85.0, "accuracyRate": 94.5}'::jsonb,
 '{"timezone": "America/Chicago", "workingHours": {"monday": "8-17", "wednesday": "8-17"}, "capacity": 100}'::jsonb),

-- Annotators 3 – 15
('650e8400-e29b-41d4-a716-446655440008', 'annotator3@welo.com', 'ann_grace', 'Grace', 'Lee', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Text Annotation", "proficiency": "ADVANCED"}, {"skillName": "Sentiment Analysis", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 312, "averageQuality": 91.7, "averageSpeed": 88.2, "accuracyRate": 93.4}'::jsonb,
 '{"timezone": "Asia/Singapore", "workingHours": {"monday": "9-17", "tuesday": "9-17"}, "capacity": 80}'::jsonb),

('650e8400-e29b-41d4-a716-446655440009', 'annotator4@welo.com', 'ann_henry', 'Henry', 'Park', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Image Annotation", "proficiency": "EXPERT"}, {"skillName": "Medical Imaging", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 445, "averageQuality": 94.2, "averageSpeed": 79.6, "accuracyRate": 95.8}'::jsonb,
 '{"timezone": "Asia/Seoul", "workingHours": {"monday": "9-18", "tuesday": "9-18"}, "capacity": 60}'::jsonb),

('650e8400-e29b-41d4-a716-446655440010', 'annotator5@welo.com', 'ann_iris', 'Iris', 'Chen', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Audio Transcription", "proficiency": "EXPERT"}, {"skillName": "Chinese Language", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 267, "averageQuality": 96.1, "averageSpeed": 74.3, "accuracyRate": 97.2}'::jsonb,
 '{"timezone": "Asia/Shanghai", "workingHours": {"tuesday": "9-17", "wednesday": "9-17"}, "capacity": 70}'::jsonb),

('650e8400-e29b-41d4-a716-446655440011', 'annotator6@welo.com', 'ann_jack', 'Jack', 'Taylor', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Video Annotation", "proficiency": "ADVANCED"}, {"skillName": "Content Moderation", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 198, "averageQuality": 89.5, "averageSpeed": 91.0, "accuracyRate": 90.3}'::jsonb,
 '{"timezone": "America/Los_Angeles", "workingHours": {"monday": "10-18", "friday": "10-18"}, "capacity": 50}'::jsonb),

('650e8400-e29b-41d4-a716-446655440012', 'annotator7@welo.com', 'ann_karen', 'Karen', 'White', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Data Quality", "proficiency": "EXPERT"}, {"skillName": "CSV Analysis", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 534, "averageQuality": 93.8, "averageSpeed": 82.1, "accuracyRate": 94.9}'::jsonb,
 '{"timezone": "Europe/London", "workingHours": {"monday": "8-16", "wednesday": "8-16"}, "capacity": 90}'::jsonb),

('650e8400-e29b-41d4-a716-446655440013', 'annotator8@welo.com', 'ann_liam', 'Liam', 'Brown', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Text Annotation", "proficiency": "INTERMEDIATE"}, {"skillName": "NLP", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 156, "averageQuality": 87.3, "averageSpeed": 93.5, "accuracyRate": 88.9}'::jsonb,
 '{"timezone": "Europe/Dublin", "workingHours": {"monday": "9-17", "thursday": "9-17"}, "capacity": 60}'::jsonb),

('650e8400-e29b-41d4-a716-446655440014', 'annotator9@welo.com', 'ann_maya', 'Maya', 'Rodriguez', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Image Annotation", "proficiency": "ADVANCED"}, {"skillName": "Spanish Language", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 389, "averageQuality": 92.6, "averageSpeed": 86.7, "accuracyRate": 93.5}'::jsonb,
 '{"timezone": "America/Mexico_City", "workingHours": {"monday": "9-17", "friday": "9-17"}, "capacity": 75}'::jsonb),

('650e8400-e29b-41d4-a716-446655440015', 'annotator10@welo.com', 'ann_noah', 'Noah', 'Williams', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Audio Transcription", "proficiency": "ADVANCED"}, {"skillName": "Music Analysis", "proficiency": "INTERMEDIATE"}]'::jsonb,
 '{"tasksCompleted": 223, "averageQuality": 90.4, "averageSpeed": 80.9, "accuracyRate": 91.7}'::jsonb,
 '{"timezone": "America/New_York", "workingHours": {"tuesday": "9-17", "thursday": "9-17"}, "capacity": 55}'::jsonb),

('650e8400-e29b-41d4-a716-446655440016', 'annotator11@welo.com', 'ann_olivia', 'Olivia', 'Martinez', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Video Annotation", "proficiency": "EXPERT"}, {"skillName": "Content Safety", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 478, "averageQuality": 95.3, "averageSpeed": 77.2, "accuracyRate": 96.1}'::jsonb,
 '{"timezone": "America/Chicago", "workingHours": {"monday": "8-16", "tuesday": "8-16"}, "capacity": 65}'::jsonb),

('650e8400-e29b-41d4-a716-446655440017', 'annotator12@welo.com', 'ann_paul', 'Paul', 'Thompson', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Data Quality", "proficiency": "ADVANCED"}, {"skillName": "Statistical Analysis", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 301, "averageQuality": 91.2, "averageSpeed": 85.8, "accuracyRate": 92.4}'::jsonb,
 '{"timezone": "America/Denver", "workingHours": {"wednesday": "9-17", "thursday": "9-17"}, "capacity": 70}'::jsonb),

('650e8400-e29b-41d4-a716-446655440018', 'annotator13@welo.com', 'ann_quinn', 'Quinn', 'Adams', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Text Annotation", "proficiency": "ADVANCED"}, {"skillName": "Legal Review", "proficiency": "INTERMEDIATE"}]'::jsonb,
 '{"tasksCompleted": 189, "averageQuality": 88.9, "averageSpeed": 76.4, "accuracyRate": 89.8}'::jsonb,
 '{"timezone": "America/Toronto", "workingHours": {"monday": "10-18", "wednesday": "10-18"}, "capacity": 50}'::jsonb),

('650e8400-e29b-41d4-a716-446655440019', 'annotator14@welo.com', 'ann_rachel', 'Rachel', 'Garcia', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Image Annotation", "proficiency": "EXPERT"}, {"skillName": "Fashion/Retail", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 562, "averageQuality": 93.7, "averageSpeed": 89.3, "accuracyRate": 94.6}'::jsonb,
 '{"timezone": "Europe/Madrid", "workingHours": {"monday": "9-17", "tuesday": "9-17", "wednesday": "9-17"}, "capacity": 85}'::jsonb),

('650e8400-e29b-41d4-a716-446655440020', 'annotator15@welo.com', 'ann_sam', 'Sam', 'Mitchell', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Audio Transcription", "proficiency": "INTERMEDIATE"}, {"skillName": "Podcast Analysis", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 134, "averageQuality": 86.5, "averageSpeed": 90.2, "accuracyRate": 87.8}'::jsonb,
 '{"timezone": "Australia/Sydney", "workingHours": {"thursday": "9-17", "friday": "9-17"}, "capacity": 40}'::jsonb),

-- Reviewers 3 – 5
('650e8400-e29b-41d4-a716-446655440021', 'reviewer3@welo.com', 'rev_tara', 'Tara', 'Rivera', 'REVIEWER', 'ACTIVE',
 '[{"skillName": "Quality Review", "proficiency": "EXPERT"}, {"skillName": "Image Annotation", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 189, "averageQuality": 97.2, "averageSpeed": 76.3, "accuracyRate": 97.8}'::jsonb,
 '{"timezone": "America/Phoenix", "workingHours": {"monday": "9-17", "tuesday": "9-17"}, "capacity": 35}'::jsonb),

('650e8400-e29b-41d4-a716-446655440022', 'reviewer4@welo.com', 'rev_uma', 'Uma', 'Singh', 'REVIEWER', 'ACTIVE',
 '[{"skillName": "Quality Review", "proficiency": "EXPERT"}, {"skillName": "Audio Transcription", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 267, "averageQuality": 98.4, "averageSpeed": 71.6, "accuracyRate": 98.9}'::jsonb,
 '{"timezone": "Asia/Kolkata", "workingHours": {"monday": "10-18", "tuesday": "10-18"}, "capacity": 30}'::jsonb),

('650e8400-e29b-41d4-a716-446655440023', 'reviewer5@welo.com', 'rev_victor', 'Victor', 'Zhao', 'REVIEWER', 'ACTIVE',
 '[{"skillName": "Quality Review", "proficiency": "ADVANCED"}, {"skillName": "Video Annotation", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 145, "averageQuality": 96.8, "averageSpeed": 79.4, "accuracyRate": 97.3}'::jsonb,
 '{"timezone": "Asia/Hong_Kong", "workingHours": {"wednesday": "9-17", "thursday": "9-17"}, "capacity": 40}'::jsonb);

-- =============================================================================
-- NEW PROJECTS (5 total)
-- IDs: 850e8400-e29b-41d4-a716-446655440003 → 0007
-- Each project has 10 widgets (INSTRUCTION_TEXT + 9 question widgets)
-- =============================================================================
INSERT INTO projects (id, customer_id, name, description, project_type, status, default_workflow_id, configuration, created_by, start_date, end_date) VALUES

-- ─────────────────────────────────────────────────────────────────────────────
-- Project 3: Customer Sentiment Analysis  |  TEXT  |  Layout: sequential-card
-- ─────────────────────────────────────────────────────────────────────────────
('850e8400-e29b-41d4-a716-446655440003',
 '550e8400-e29b-41d4-a716-446655440001',
 'Customer Sentiment Analysis',
 'Classify customer reviews for sentiment with intensity scoring, topic tagging, and authenticity assessment.',
 'TEXT', 'ACTIVE',
 '750e8400-e29b-41d4-a716-446655440001',
 '{
   "annotationSchema": {
     "type": "classification",
     "labels": ["Positive", "Negative", "Neutral", "Mixed"]
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.85,
     "agreementThreshold": 0.80,
     "consensusRequired": false
   },
   "workflowConfiguration": {
     "maxReviewLevels": 1,
     "requiresConsensus": false,
     "annotationsPerTask": 1
   },
   "annotationQuestions": [],
   "uiConfiguration": {
     "theme": "light",
     "layout": "sequential-card",
     "showConfidence": true,
     "widgets": [
       {"id": "instr",        "type": "INSTRUCTION_TEXT", "label": "Instructions",                          "text": "Read the customer review carefully before annotating. Focus on the overall tone, key topics, and whether the review appears genuine."},
       {"id": "sentiment",    "type": "RADIO_GROUP",      "label": "Overall Sentiment",                     "required": true,  "options": ["Positive", "Negative", "Neutral", "Mixed"]},
       {"id": "intensity",    "type": "SLIDER",           "label": "Sentiment Intensity (1=Mild, 10=Extreme)", "required": true, "min": 1, "max": 10, "step": 1},
       {"id": "topics",       "type": "MULTI_SELECT",     "label": "Topics Mentioned",                      "required": false, "options": ["Product Quality", "Shipping Speed", "Customer Service", "Price/Value", "Packaging", "Return Policy", "Durability"]},
       {"id": "profanity",    "type": "CHECKBOX",         "label": "Contains Profanity or Offensive Language", "required": false},
       {"id": "confidence",   "type": "RATING",           "label": "Your Annotation Confidence",            "required": true,  "max": 5},
       {"id": "keyphrases",   "type": "TEXTAREA",         "label": "Notable Key Phrases",                   "required": false, "placeholder": "List the most telling phrases from the review...", "rows": 3},
       {"id": "language",     "type": "SELECT",           "label": "Review Language",                       "required": false, "options": ["English", "Spanish", "French", "German", "Portuguese", "Other"]},
       {"id": "authenticity", "type": "RADIO_GROUP",      "label": "Review Authenticity",                   "required": true,  "options": ["Genuine", "Likely Genuine", "Suspicious", "Bot-generated"]},
       {"id": "category",     "type": "TEXT_INPUT",       "label": "Product Category",                      "required": false, "placeholder": "e.g. Electronics, Clothing, Food..."}
     ]
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440007',
 '2026-02-01', '2026-12-31'),

-- ─────────────────────────────────────────────────────────────────────────────
-- Project 4: Medical Image Analysis  |  IMAGE  |  Layout: wide-media / dark
-- ─────────────────────────────────────────────────────────────────────────────
('850e8400-e29b-41d4-a716-446655440004',
 '550e8400-e29b-41d4-a716-446655440003',
 'Medical Image Analysis',
 'Identify radiological findings in medical imaging scans and assess clinical urgency for AI-assisted diagnostics.',
 'IMAGE', 'ACTIVE',
 '750e8400-e29b-41d4-a716-446655440002',
 '{
   "annotationSchema": {
     "type": "multi-label",
     "categories": ["Normal", "Pulmonary Nodule", "Lung Mass", "Pleural Effusion", "Cardiomegaly", "Atelectasis", "Pneumothorax"]
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.92,
     "agreementThreshold": 0.95,
     "consensusRequired": true
   },
   "workflowConfiguration": {
     "maxReviewLevels": 2,
     "requiresConsensus": true,
     "annotationsPerTask": 2
   },
   "annotationQuestions": [],
   "uiConfiguration": {
     "theme": "dark",
     "layout": "wide-media",
     "showConfidence": true,
     "widgets": [
       {"id": "instr",       "type": "INSTRUCTION_TEXT", "label": "Instructions",                           "text": "Examine the medical image carefully and completely before annotating. Identify ALL visible findings. In cases of uncertainty, lean toward flagging rather than dismissing. Do not skip required fields."},
       {"id": "findings",    "type": "MULTI_SELECT",     "label": "Findings Present",                       "required": true,  "options": ["Normal - No Findings", "Pulmonary Nodule", "Lung Mass", "Pleural Effusion", "Cardiomegaly", "Atelectasis", "Pneumothorax", "Consolidation", "Ground-Glass Opacity"]},
       {"id": "img_quality", "type": "RADIO_GROUP",      "label": "Image Quality",                          "required": true,  "options": ["Excellent", "Good", "Fair", "Poor - Unreadable"]},
       {"id": "urgency",     "type": "RADIO_GROUP",      "label": "Clinical Urgency",                       "required": true,  "options": ["Routine", "Urgent (within 24h)", "Critical (immediate action)"]},
       {"id": "diag_conf",   "type": "SLIDER",           "label": "Diagnostic Confidence (%)",              "required": true,  "min": 0, "max": 100, "step": 5},
       {"id": "region",      "type": "SELECT",           "label": "Primary Anatomy Region",                 "required": true,  "options": ["Chest/Thorax", "Abdomen", "Head/Brain", "Cervical Spine", "Lumbar Spine", "Extremity", "Pelvis", "Other"]},
       {"id": "notes",       "type": "TEXTAREA",         "label": "Clinical Observations",                  "required": false, "placeholder": "Describe your findings in clinical detail, including location and estimated size...", "rows": 4},
       {"id": "followup",    "type": "CHECKBOX",         "label": "Requires Specialist Follow-up",          "required": false},
       {"id": "selfrating",  "type": "RATING",           "label": "Self-Assessment of Annotation Quality",  "required": true,  "max": 5},
       {"id": "studydate",   "type": "DATE_PICKER",      "label": "Estimated Study Date (if visible on image)", "required": false}
     ]
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440002',
 '2026-03-01', '2026-12-31'),

-- ─────────────────────────────────────────────────────────────────────────────
-- Project 5: Podcast Transcription  |  AUDIO  |  Layout: stacked-player
-- ─────────────────────────────────────────────────────────────────────────────
('850e8400-e29b-41d4-a716-446655440005',
 '550e8400-e29b-41d4-a716-446655440002',
 'Podcast Transcription',
 'Transcribe audio segments verbatim, identify speakers, assess audio quality, and categorize content type.',
 'AUDIO', 'ACTIVE',
 '750e8400-e29b-41d4-a716-446655440001',
 '{
   "annotationSchema": {
     "type": "transcription"
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.90,
     "agreementThreshold": 0.85,
     "consensusRequired": false
   },
   "workflowConfiguration": {
     "maxReviewLevels": 1,
     "requiresConsensus": false,
     "annotationsPerTask": 1
   },
   "annotationQuestions": [],
   "uiConfiguration": {
     "theme": "light",
     "layout": "stacked-player",
     "showConfidence": false,
     "widgets": [
       {"id": "instr",          "type": "INSTRUCTION_TEXT", "label": "Instructions",                         "text": "Listen to the entire audio clip before transcribing. Include all spoken words verbatim. Mark unclear or inaudible sections with [inaudible]. Use [crosstalk] when speakers overlap."},
       {"id": "transcription",  "type": "TEXTAREA",         "label": "Full Transcription",                   "required": true,  "placeholder": "Type the exact words spoken in the audio clip...", "rows": 8},
       {"id": "speakers",       "type": "RADIO_GROUP",      "label": "Number of Distinct Speakers",          "required": true,  "options": ["1 Speaker", "2 Speakers", "3 Speakers", "4+ Speakers"]},
       {"id": "audio_issues",   "type": "MULTI_SELECT",     "label": "Audio Quality Issues",                 "required": false, "options": ["No Issues", "Background Noise", "Low Volume", "Echo/Reverb", "Distortion", "Crosstalk/Overlap", "Recording Cuts"]},
       {"id": "language",       "type": "SELECT",           "label": "Primary Language Spoken",              "required": true,  "options": ["English", "Spanish", "French", "German", "Mandarin", "Hindi", "Portuguese", "Arabic", "Japanese", "Other"]},
       {"id": "music",          "type": "CHECKBOX",         "label": "Contains Background Music or Jingles", "required": false},
       {"id": "clarity",        "type": "SLIDER",           "label": "Overall Audio Clarity (1=Poor, 10=Crystal Clear)", "required": true, "min": 1, "max": 10, "step": 1},
       {"id": "difficulty",     "type": "RATING",           "label": "Transcription Difficulty",             "required": true,  "max": 5},
       {"id": "speaker_names",  "type": "TEXT_INPUT",       "label": "Speaker Labels (if identifiable)",     "required": false, "placeholder": "e.g. Host: John, Guest: Dr. Smith, Caller: Unknown"},
       {"id": "content_type",   "type": "RADIO_GROUP",      "label": "Content Category",                     "required": false, "options": ["Interview", "Monologue/Solo", "Panel Discussion", "Advertisement", "News Report", "Educational Lecture"]}
     ]
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440007',
 '2026-02-15', '2026-11-30'),

-- ─────────────────────────────────────────────────────────────────────────────
-- Project 6: Content Safety Review  |  VIDEO  |  Layout: immersive / dark
-- ─────────────────────────────────────────────────────────────────────────────
('850e8400-e29b-41d4-a716-446655440006',
 '550e8400-e29b-41d4-a716-446655440001',
 'Content Safety Review',
 'Assess video content for policy violations, rate severity, and recommend moderation actions for platform trust and safety.',
 'VIDEO', 'ACTIVE',
 '750e8400-e29b-41d4-a716-446655440002',
 '{
   "annotationSchema": {
     "type": "content-moderation",
     "categories": ["Safe", "Warning", "Restricted", "Unsafe", "Severely Harmful"]
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.95,
     "agreementThreshold": 0.90,
     "consensusRequired": true
   },
   "workflowConfiguration": {
     "maxReviewLevels": 2,
     "requiresConsensus": true,
     "annotationsPerTask": 2
   },
   "annotationQuestions": [],
   "uiConfiguration": {
     "theme": "dark",
     "layout": "immersive",
     "showConfidence": true,
     "widgets": [
       {"id": "instr",       "type": "INSTRUCTION_TEXT", "label": "Instructions",                         "text": "Watch the complete video segment before rating. Apply platform content safety guidelines strictly. When in doubt, escalate rather than approve. Note specific timestamps for violations."},
       {"id": "safety",      "type": "RADIO_GROUP",      "label": "Overall Safety Rating",                "required": true,  "options": ["Safe for All Ages", "Safe with Content Warning", "Restricted (18+)", "Unsafe - Harmful", "Severely Harmful - Immediate Action"]},
       {"id": "violations",  "type": "MULTI_SELECT",     "label": "Policy Violations Detected",           "required": true,  "options": ["No Violations", "Violence/Graphic Content", "Sexual/Adult Content", "Hate Speech/Discrimination", "Harassment/Bullying", "Self-Harm/Suicide", "Dangerous Activities", "Misinformation/Deepfake", "Copyright Infringement"]},
       {"id": "severity",    "type": "SLIDER",           "label": "Severity Score (0=None, 10=Extreme)",  "required": true,  "min": 0, "max": 10, "step": 1},
       {"id": "audience",    "type": "RADIO_GROUP",      "label": "Appropriate Audience",                 "required": true,  "options": ["All Ages (G)", "Teen+ (PG-13)", "Adults Only (R)", "No Appropriate Audience - Remove"]},
       {"id": "content_type","type": "SELECT",           "label": "Content Type",                         "required": false, "options": ["User Generated Content", "News/Journalism", "Entertainment", "Educational", "Advertisement/Sponsored", "Livestream Clip", "Other"]},
       {"id": "immediate",   "type": "CHECKBOX",         "label": "Requires Immediate Action (Do Not Delay)", "required": false},
       {"id": "assessment",  "type": "TEXTAREA",         "label": "Detailed Safety Assessment",           "required": false, "placeholder": "Describe specific safety concerns, include timestamps (e.g. 0:32-0:45) and context...", "rows": 4},
       {"id": "confidence",  "type": "RATING",           "label": "Confidence in Your Assessment",        "required": true,  "max": 5},
       {"id": "actions",     "type": "MULTI_SELECT",     "label": "Recommended Moderation Actions",       "required": true,  "options": ["Approve as Safe", "Add Content Warning Label", "Age-Restrict", "Remove from Platform", "Escalate to Senior Reviewer", "Report to Authorities"]}
     ]
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440002',
 '2026-03-15', '2026-12-31'),

-- ─────────────────────────────────────────────────────────────────────────────
-- Project 7: Data Quality Assessment  |  CSV  |  Layout: data-analyst
-- ─────────────────────────────────────────────────────────────────────────────
('850e8400-e29b-41d4-a716-446655440007',
 '550e8400-e29b-41d4-a716-446655440002',
 'Data Quality Assessment',
 'Review structured data records for completeness, accuracy, formatting, and consistency to support ML pipeline hygiene.',
 'CSV', 'ACTIVE',
 '750e8400-e29b-41d4-a716-446655440001',
 '{
   "annotationSchema": {
     "type": "data-quality",
     "categories": ["Valid", "Partial", "Invalid", "Uncertain"]
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.88,
     "agreementThreshold": 0.85,
     "consensusRequired": false
   },
   "workflowConfiguration": {
     "maxReviewLevels": 1,
     "requiresConsensus": false,
     "annotationsPerTask": 1
   },
   "annotationQuestions": [],
   "uiConfiguration": {
     "theme": "light",
     "layout": "data-analyst",
     "showConfidence": false,
     "widgets": [
       {"id": "instr",          "type": "INSTRUCTION_TEXT", "label": "Instructions",                       "text": "Review the data record displayed above carefully. Check each field against the expected format, value range, and consistency with related fields. Provide clear reasoning in the notes field."},
       {"id": "validity",       "type": "RADIO_GROUP",      "label": "Record Validity",                    "required": true,  "options": ["Valid - Meets All Standards", "Partially Valid - Minor Issues", "Invalid - Major Issues", "Uncertain - Needs Expert Review"]},
       {"id": "issues",         "type": "MULTI_SELECT",     "label": "Data Quality Issues Found",          "required": false, "options": ["No Issues", "Missing Required Fields", "Incorrect Data Format", "Duplicate Entry Suspected", "Out of Valid Range", "Inconsistent with Related Records", "Typographical Error", "Encoding Problem", "Logical Inconsistency"]},
       {"id": "quality_score",  "type": "SLIDER",           "label": "Overall Data Quality Score (0-100)", "required": true,  "min": 0, "max": 100, "step": 10},
       {"id": "action",         "type": "SELECT",           "label": "Recommended Action",                 "required": true,  "options": ["Accept As-Is", "Accept with Minor Correction", "Flag for Expert Review", "Reject - Cannot Use", "Request Source Clarification"]},
       {"id": "pii",            "type": "CHECKBOX",         "label": "Contains PII or Sensitive Personal Data", "required": false},
       {"id": "notes",          "type": "TEXTAREA",         "label": "Annotator Notes",                    "required": false, "placeholder": "Describe specific issues or your reasoning for the assessment...", "rows": 3},
       {"id": "completeness",   "type": "RATING",           "label": "Data Completeness Rating",           "required": true,  "max": 5},
       {"id": "correction",     "type": "TEXT_INPUT",       "label": "Suggested Correction (if applicable)", "required": false, "placeholder": "Enter the corrected value or format if a fix is straightforward..."},
       {"id": "collect_date",   "type": "DATE_PICKER",      "label": "Data Collection Date (if determinable from record)", "required": false}
     ]
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440007',
 '2026-02-01', '2026-10-31');

-- =============================================================================
-- NEW BATCHES (5 total — one per new project)
-- IDs: 950e8400-e29b-41d4-a716-446655440004 → 0008
-- =============================================================================
INSERT INTO batches (id, project_id, name, description, status, priority, total_tasks, completed_tasks, quality_score, due_date) VALUES
('950e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440003', 'Customer Reviews – Batch 1', 'First batch of 10 customer sentiment review tasks across product categories', 'CREATED', 7, 10, 0, NULL, '2026-06-30'),
('950e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440004', 'Radiology Scans – Batch 1',  'First batch of 10 medical imaging annotation tasks for AI diagnostic training', 'CREATED', 9, 10, 0, NULL, '2026-07-31'),
('950e8400-e29b-41d4-a716-446655440006', '850e8400-e29b-41d4-a716-446655440005', 'Podcast Segments – Batch 1', 'First batch of 10 podcast audio transcription tasks (3–5 minutes each)', 'CREATED', 6, 10, 0, NULL, '2026-06-15'),
('950e8400-e29b-41d4-a716-446655440007', '850e8400-e29b-41d4-a716-446655440006', 'Video Clips – Batch 1',      'First batch of 10 video content safety review tasks (60–120 seconds each)', 'CREATED', 8, 10, 0, NULL, '2026-07-15'),
('950e8400-e29b-41d4-a716-446655440008', '850e8400-e29b-41d4-a716-446655440007', 'Data Records – Batch 1',     'First batch of 10 structured data quality assessment tasks', 'CREATED', 5, 10, 0, NULL, '2026-05-31');

-- =============================================================================
-- NEW TASKS (50 total)
-- Prefix: a60e8400-e29b-41d4-a716-446655440001 → 0050
-- Tasks 0001–0010 : TEXT  (Batch 4, Project 3)
-- Tasks 0011–0020 : IMAGE (Batch 5, Project 4)
-- Tasks 0021–0030 : AUDIO (Batch 6, Project 5)
-- Tasks 0031–0040 : VIDEO (Batch 7, Project 6)
-- Tasks 0041–0050 : CSV   (Batch 8, Project 7)
-- =============================================================================
INSERT INTO tasks (
  id, batch_id, project_id, workflow_id, external_id,
  task_type, status, priority, machine_state, data_payload,
  file_type, file_url, file_metadata,
  requires_consensus, total_assignments_required, completed_assignments,
  current_review_level, max_review_level, attempt_count
) VALUES

-- ─────────────────────────────────────────────────────────────────────────────
-- TEXT TASKS (0001–0010)  |  Customer Sentiment Analysis
-- ─────────────────────────────────────────────────────────────────────────────
('a60e8400-e29b-41d4-a716-446655440001',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-001', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Just received my order and I''m absolutely thrilled! The packaging was pristine and the product quality exceeded every expectation. Customer service was also top-notch when I had a question. Will definitely purchase again!"}, "references": [], "context": {"description": "Positive product review with shipping and service feedback"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-001.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440002',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-002', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Extremely disappointing experience. The item arrived damaged and customer service was completely unhelpful. Spent three days trying to get a resolution with no success. I want a full refund immediately."}, "references": [], "context": {"description": "Negative review citing damaged goods and poor customer service"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-002.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440003',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-003', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "It''s okay, nothing extraordinary. Works as advertised but doesn''t quite live up to the marketing claims. Shipping was fast, I''ll give them that. Might reorder if there''s a sale."}, "references": [], "context": {"description": "Neutral review with moderate satisfaction and price sensitivity"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-003.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440004',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-004', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Incredible value for the price! I was skeptical given how cheap it was, but this product has absolutely exceeded every expectation. My whole family loves it. Already recommended it to several friends."}, "references": [], "context": {"description": "Strongly positive review highlighting value and family satisfaction"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-004.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440005',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-005', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Second purchase from this store and they''ve once again delivered a top-notch product. The build quality is excellent and it arrived two days ahead of schedule. Excellent communication throughout the entire process."}, "references": [], "context": {"description": "Repeat customer positive review emphasizing reliability and communication"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-005.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440006',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-006', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "The product stopped working after just two weeks of completely normal use. This is unacceptable for the price point. Very frustrated and won''t be purchasing from this brand again. Durability is terrible."}, "references": [], "context": {"description": "Negative review focused on product durability and failure"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-006.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440007',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-007', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Mixed feelings about this purchase. The product quality itself is great and the materials feel premium, but the size runs significantly small. Had to return and exchange for a larger size which took an extra week."}, "references": [], "context": {"description": "Mixed review with positive quality but sizing/fulfillment issues"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-007.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440008',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-008', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Fast shipping, great packaging, and an absolutely amazing product. Exactly what I needed for my home renovation project. The instructions were clear and setup was a breeze. Five stars without hesitation!"}, "references": [], "context": {"description": "Enthusiastic positive review of a home product with fast shipping"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-008.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440009',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-009', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Price is slightly higher than competitors, but the quality difference is very noticeable. The craftsmanship is exceptional and I can tell this will last for years. Worth every penny for a long-term investment."}, "references": [], "context": {"description": "Price-justifying positive review focused on quality and longevity"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-009.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440010',
 '950e8400-e29b-41d4-a716-446655440004',
 '850e8400-e29b-41d4-a716-446655440003',
 '750e8400-e29b-41d4-a716-446655440001',
 'TEXT-010', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Completely wrong item was shipped. The box has the correct product name on it but the contents don''t match the description at all. This is a fulfillment error. Still waiting for the correct replacement after 10 days."}, "references": [], "context": {"description": "Negative review due to wrong item shipped - fulfillment error"}}'::jsonb,
 'TXT', NULL,
 '{"fileName": "review-010.txt", "mimeType": "text/plain"}'::jsonb,
 false, 1, 0, 0, 1, 0),

-- ─────────────────────────────────────────────────────────────────────────────
-- IMAGE TASKS (0011–0020)  |  Medical Image Analysis
-- ─────────────────────────────────────────────────────────────────────────────
('a60e8400-e29b-41d4-a716-446655440011',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-001', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Chest X-ray image — posterior-anterior (PA) view — for radiological findings annotation"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med001/1200/900',
 '{"fileName": "chest-xray-001.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440012',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-002', 'ANNOTATION', 'QUEUED', 9,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Chest CT scan — axial slice — suspected pulmonary nodule for measurement and characterization"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med002/1200/900',
 '{"fileName": "ct-scan-002.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440013',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-003', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Abdominal MRI — coronal view — assess for effusion and organ abnormalities"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med003/1200/900',
 '{"fileName": "mri-abdomen-003.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440014',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-004', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Chest X-ray — lateral view — cardiomegaly assessment and pleural space evaluation"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med004/1200/900',
 '{"fileName": "chest-xray-004-lateral.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440015',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-005', 'ANNOTATION', 'QUEUED', 9,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Brain MRI — T2 weighted — assess for lesions, edema, or structural abnormalities"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med005/1200/900',
 '{"fileName": "brain-mri-005.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440016',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-006', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Lumbar spine X-ray — AP and lateral views — assess for disc space narrowing and alignment"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med006/1200/900',
 '{"fileName": "spine-xray-006.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440017',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-007', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Chest X-ray — pneumothorax screening — evaluate pleural space and lung markings"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med007/1200/900',
 '{"fileName": "chest-xray-007.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440018',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-008', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Pelvis X-ray — hip joint assessment — evaluate for fracture, dislocation, or arthritic changes"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med008/1200/900',
 '{"fileName": "pelvis-xray-008.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440019',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-009', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Chest high-resolution CT — interstitial lung disease pattern identification and severity grading"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med009/1200/900',
 '{"fileName": "hrct-chest-009.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440020',
 '950e8400-e29b-41d4-a716-446655440005',
 '850e8400-e29b-41d4-a716-446655440004',
 '750e8400-e29b-41d4-a716-446655440002',
 'IMG-010', 'ANNOTATION', 'QUEUED', 9,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Chest X-ray — atelectasis and consolidation assessment — right lower lobe evaluation"}}'::jsonb,
 'IMAGE', 'https://picsum.photos/seed/med010/1200/900',
 '{"fileName": "chest-xray-010.jpg", "mimeType": "image/jpeg", "dimensions": {"width": 1200, "height": 900}}'::jsonb,
 true, 2, 0, 0, 2, 0),

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIO TASKS (0021–0030)  |  Podcast Transcription
-- ─────────────────────────────────────────────────────────────────────────────
('a60e8400-e29b-41d4-a716-446655440021',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-001', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Podcast interview segment — technology and AI ethics discussion — approx. 4 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
 '{"fileName": "podcast-segment-001.mp3", "mimeType": "audio/mpeg", "duration": 240}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440022',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-002', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Business podcast — startup funding strategies — panel discussion with 3 speakers — approx. 5 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
 '{"fileName": "podcast-segment-002.mp3", "mimeType": "audio/mpeg", "duration": 300}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440023',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-003', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Health and wellness podcast — nutrition myths episode — single host monologue — approx. 3.5 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
 '{"fileName": "podcast-segment-003.mp3", "mimeType": "audio/mpeg", "duration": 210}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440024',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-004', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "True crime podcast — background noise present — two hosts discussing a case — approx. 4.5 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
 '{"fileName": "podcast-segment-004.mp3", "mimeType": "audio/mpeg", "duration": 270}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440025',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-005', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Educational podcast — history lecture segment — clear audio with one speaker — approx. 5 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
 '{"fileName": "podcast-segment-005.mp3", "mimeType": "audio/mpeg", "duration": 300}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440026',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-006', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Sports podcast — post-match analysis — two commentators with background crowd noise — approx. 4 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
 '{"fileName": "podcast-segment-006.mp3", "mimeType": "audio/mpeg", "duration": 240}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440027',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-007', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Finance podcast — investment strategies interview — expert guest with moderate audio distortion — approx. 4 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
 '{"fileName": "podcast-segment-007.mp3", "mimeType": "audio/mpeg", "duration": 240}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440028',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-008', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Comedy podcast — scripted sketch with 4 speakers and sound effects — approx. 3.5 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
 '{"fileName": "podcast-segment-008.mp3", "mimeType": "audio/mpeg", "duration": 210}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440029',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-009', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Science podcast — climate change interview — two speakers with call-in quality on one — approx. 5 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
 '{"fileName": "podcast-segment-009.mp3", "mimeType": "audio/mpeg", "duration": 300}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440030',
 '950e8400-e29b-41d4-a716-446655440006',
 '850e8400-e29b-41d4-a716-446655440005',
 '750e8400-e29b-41d4-a716-446655440001',
 'AUD-010', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "News radio segment — breaking news report — single anchor with brief field reporter — approx. 3 minutes"}}'::jsonb,
 'AUDIO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
 '{"fileName": "podcast-segment-010.mp3", "mimeType": "audio/mpeg", "duration": 180}'::jsonb,
 false, 1, 0, 0, 1, 0),

-- ─────────────────────────────────────────────────────────────────────────────
-- VIDEO TASKS (0031–0040)  |  Content Safety Review
-- ─────────────────────────────────────────────────────────────────────────────
('a60e8400-e29b-41d4-a716-446655440031',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-001', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Action video clip — vehicle chase sequence — assess for gratuitous violence and age appropriateness"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
 '{"fileName": "video-clip-001.mp4", "mimeType": "video/mp4", "duration": 60}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440032',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-002', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Adventure travel video — outdoor extreme sports — assess for dangerous activity promotion and safety warnings needed"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
 '{"fileName": "video-clip-002.mp4", "mimeType": "video/mp4", "duration": 75}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440033',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-003', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Entertainment clip — comedy sketch — assess for offensive language, stereotyping, and audience suitability"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
 '{"fileName": "video-clip-003.mp4", "mimeType": "video/mp4", "duration": 90}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440034',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-004', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "User-generated road trip video — driving footage — flag any reckless driving, distracting behavior, or dangerous road conditions"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
 '{"fileName": "video-clip-004.mp4", "mimeType": "video/mp4", "duration": 65}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440035',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-005', 'ANNOTATION', 'QUEUED', 9,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Reaction/meltdown video — emotional confrontation — assess for harassment, public shaming, and privacy violations"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
 '{"fileName": "video-clip-005.mp4", "mimeType": "video/mp4", "duration": 55}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440036',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-006', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Automotive review video — off-road test drive — assess for sponsored content disclosure and stunt safety disclaimers"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
 '{"fileName": "video-clip-006.mp4", "mimeType": "video/mp4", "duration": 120}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440037',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-007', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Short film clip — dramatic action sequence — assess for realistic violence, weapons depiction, and suitability for general audiences"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
 '{"fileName": "video-clip-007.mp4", "mimeType": "video/mp4", "duration": 90}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440038',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-008', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Car review video — test drive on public roads — check for traffic violations, excessive speed, and misleading performance claims"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
 '{"fileName": "video-clip-008.mp4", "mimeType": "video/mp4", "duration": 100}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440039',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-009', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Rally racing event footage — competitive motorsport — assess for dangerous crowd proximity and safety protocol compliance"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
 '{"fileName": "video-clip-009.mp4", "mimeType": "video/mp4", "duration": 80}'::jsonb,
 true, 2, 0, 0, 2, 0),

('a60e8400-e29b-41d4-a716-446655440040',
 '950e8400-e29b-41d4-a716-446655440007',
 '850e8400-e29b-41d4-a716-446655440006',
 '750e8400-e29b-41d4-a716-446655440002',
 'VID-010', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {}, "references": [], "context": {"description": "Consumer advice video — used car buying tips — check for misleading financial advice and predatory dealer promotion"}}'::jsonb,
 'VIDEO', 'https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
 '{"fileName": "video-clip-010.mp4", "mimeType": "video/mp4", "duration": 110}'::jsonb,
 true, 2, 0, 0, 2, 0),

-- ─────────────────────────────────────────────────────────────────────────────
-- CSV TASKS (0041–0050)  |  Data Quality Assessment
-- ─────────────────────────────────────────────────────────────────────────────
('a60e8400-e29b-41d4-a716-446655440041',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-001', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "customer_id,first_name,last_name,email,phone,country,registration_date,total_orders,lifetime_value\nC-10042,Alice,Johnson,alice.j@email.com,+1-555-0192,USA,2023-03-15,12,1456.78", "headers": ["customer_id","first_name","last_name","email","phone","country","registration_date","total_orders","lifetime_value"], "rowCount": 1}, "references": [], "context": {"description": "E-commerce customer profile record — verify completeness, email format, and phone format"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-001.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440042',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-002', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "patient_id,full_name,dob,gender,blood_type,allergies,primary_diagnosis,attending_physician\nP-20891,Robert Chen,,Male,O+,Penicillin,Type 2 Diabetes,Dr. Sarah Williams", "headers": ["patient_id","full_name","dob","gender","blood_type","allergies","primary_diagnosis","attending_physician"], "rowCount": 1}, "references": [], "context": {"description": "Healthcare patient record — DOB field missing — assess impact and required action"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-002.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440043',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-003', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "transaction_id,timestamp,account_from,account_to,amount,currency,transaction_type,status,reference\nTXN-384920,2026-01-15T14:23:45Z,ACC-10029,ACC-20847,2500.00,USD,WIRE_TRANSFER,COMPLETED,REF-48203", "headers": ["transaction_id","timestamp","account_from","account_to","amount","currency","transaction_type","status","reference"], "rowCount": 1}, "references": [], "context": {"description": "Financial transaction record — standard wire transfer — verify all fields for compliance and accuracy"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-003.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440044',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-004', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "post_id,platform,author_id,content_type,timestamp,likes,shares,comments,reach,engagement_rate\nPOST-99321,Twitter,USER-44821,text,2026-02-10T09:15:00Z,1247,389,156,45830,0.0391", "headers": ["post_id","platform","author_id","content_type","timestamp","likes","shares","comments","reach","engagement_rate"], "rowCount": 1}, "references": [], "context": {"description": "Social media analytics record — engagement metrics — verify consistency between reach, likes, and engagement rate"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-004.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440045',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-005', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "sensor_id,location,timestamp,temperature_c,humidity_pct,pressure_hpa,battery_pct,signal_strength\nSENSOR-0044,Warehouse-B3,2026-02-15T07:30:00Z,42.8,88.3,1013.25,-5,85", "headers": ["sensor_id","location","timestamp","temperature_c","humidity_pct","pressure_hpa","battery_pct","signal_strength"], "rowCount": 1}, "references": [], "context": {"description": "IoT sensor reading — battery_pct value is -5 (impossible range) — classify the data quality issue and recommend action"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-005.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440046',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-006', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "employee_id,full_name,department,job_title,start_date,salary,manager_id,status\nEMP-05821,David Park,Engineering,Junior Developer,2024-09-01,120000,EMP-02341,Active", "headers": ["employee_id","full_name","department","job_title","start_date","salary","manager_id","status"], "rowCount": 1}, "references": [], "context": {"description": "HR employee record — salary of 120000 for Junior Developer may be inconsistent with role — flag for review"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-006.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440047',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-007', 'ANNOTATION', 'QUEUED', 7,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "product_id,sku,name,category,subcategory,price,stock_qty,supplier_id,weight_kg\nPRD-10293,SKU-A4921,Premium Wireless Headphones,Electronics,,159.99,234,,0.35", "headers": ["product_id","sku","name","category","subcategory","price","stock_qty","supplier_id","weight_kg"], "rowCount": 1}, "references": [], "context": {"description": "Product catalog entry — subcategory and supplier_id are missing — assess completeness impact for catalog operations"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-007.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440048',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-008', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "response_id,survey_id,respondent_age,respondent_gender,q1_rating,q2_rating,q3_rating,q4_text,q5_nps,completion_time_secs\nRESP-77421,SRV-2026-Q1,29,Female,4,5,4,The service was excellent and very responsive,9,342", "headers": ["response_id","survey_id","respondent_age","respondent_gender","q1_rating","q2_rating","q3_rating","q4_text","q5_nps","completion_time_secs"], "rowCount": 1}, "references": [], "context": {"description": "Survey response record — all fields present and in valid range — assess overall quality and completeness"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-008.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440049',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-009', 'ANNOTATION', 'QUEUED', 6,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "session_id,user_id,start_time,end_time,pages_viewed,bounce,device_type,country,conversion,revenue\nSESS-994821,USR-104829,2026-02-18T10:15:00Z,2026-02-18T10:47:23Z,8,false,mobile,Germany,true,89.99", "headers": ["session_id","user_id","start_time","end_time","pages_viewed","bounce","device_type","country","conversion","revenue"], "rowCount": 1}, "references": [], "context": {"description": "Web analytics session — 8 pages viewed with conversion and revenue — verify consistency between bounce=false and pages_viewed=8"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-009.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0),

('a60e8400-e29b-41d4-a716-446655440050',
 '950e8400-e29b-41d4-a716-446655440008',
 '850e8400-e29b-41d4-a716-446655440007',
 '750e8400-e29b-41d4-a716-446655440001',
 'CSV-010', 'ANNOTATION', 'QUEUED', 5,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"csvContent": "study_id,participant_id,wave,measurement_date,outcome_score,control_group,dropout,notes\nSTD-2026-A,PART-0421,3,2026-01-28,73.5,false,false,Participant reported mild side effects on day 12", "headers": ["study_id","participant_id","wave","measurement_date","outcome_score","control_group","dropout","notes"], "rowCount": 1}, "references": [], "context": {"description": "Clinical research record — wave 3 measurement with side effects noted — verify score validity and note completeness"}}'::jsonb,
 'CSV', NULL,
 '{"fileName": "record-010.csv", "mimeType": "text/csv"}'::jsonb,
 false, 1, 0, 0, 1, 0);

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT 'Extended seed data loaded successfully!' AS status;
SELECT 'Total users: '    || COUNT(*) AS count FROM users;
SELECT 'Total projects: ' || COUNT(*) AS count FROM projects;
SELECT 'Total batches: '  || COUNT(*) AS count FROM batches;
SELECT 'Total tasks: '    || COUNT(*) AS count FROM tasks;
