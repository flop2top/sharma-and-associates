-- Sharma & Associates Law Firm Database Schema
-- Compatible with Cloudflare D1 SQLite

-- Table for storing client inquiries from the contact form
CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,                    -- Unique inquiry ID (INQ_timestamp_random)
    firstName TEXT NOT NULL,               -- Client first name
    lastName TEXT NOT NULL,                -- Client last name
    email TEXT NOT NULL,                   -- Client email address
    phone TEXT NOT NULL,                   -- Client phone number
    city TEXT,                             -- Client city/location (optional)
    legalMatter TEXT NOT NULL,             -- Type of legal matter (divorce, custody, etc.)
    urgency TEXT DEFAULT 'flexible',       -- Urgency level (emergency, urgent, soon, flexible)
    message TEXT NOT NULL,                 -- Client's message/description
    hearAbout TEXT,                        -- How they heard about the firm (optional)
    createdAt TEXT NOT NULL,               -- Timestamp when inquiry was created
    status TEXT DEFAULT 'new',             -- Status (new, contacted, scheduled, closed)
    followedUp BOOLEAN DEFAULT FALSE,      -- Whether follow-up has been done
    assignedTo TEXT,                       -- Attorney assigned to case
    notes TEXT,                            -- Internal notes about the inquiry
    lastContactDate TEXT,                  -- Last time client was contacted
    consultationDate TEXT,                 -- Scheduled consultation date
    consultationNotes TEXT,                -- Notes from consultation
    caseValue TEXT,                        -- Estimated case value
    retainerSigned BOOLEAN DEFAULT FALSE,  -- Whether retainer agreement signed
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP -- Last update timestamp
);

-- Table for tracking follow-up communications
CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Auto-incrementing ID
    inquiryId TEXT NOT NULL,               -- Reference to inquiry
    type TEXT NOT NULL,                    -- Type (call, email, meeting, note)
    method TEXT,                           -- Communication method
    subject TEXT,                          -- Subject/title of follow-up
    content TEXT,                          -- Content of communication
    scheduledFor TEXT,                     -- When follow-up is scheduled
    completedAt TEXT,                      -- When follow-up was completed
    createdBy TEXT,                        -- Staff member who created follow-up
    priority TEXT DEFAULT 'normal',        -- Priority level (high, normal, low)
    status TEXT DEFAULT 'pending',         -- Status (pending, completed, cancelled)
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inquiryId) REFERENCES inquiries(id)
);

-- Table for managing attorneys/staff
CREATE TABLE IF NOT EXISTS attorneys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    title TEXT,                            -- Position/title
    specialization TEXT,                   -- Legal specialization
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table for case management
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,                   -- Case ID (CASE_timestamp_random)
    inquiryId TEXT,                        -- Original inquiry that led to case
    clientFirstName TEXT NOT NULL,
    clientLastName TEXT NOT NULL,
    clientEmail TEXT NOT NULL,
    clientPhone TEXT NOT NULL,
    caseType TEXT NOT NULL,               -- Type of case
    status TEXT DEFAULT 'active',         -- Status (active, closed, on_hold)
    assignedAttorney TEXT,                -- Attorney handling case
    startDate TEXT NOT NULL,
    endDate TEXT,
    description TEXT,
    fees REAL,                            -- Total fees
    retainerAmount REAL,                  -- Retainer amount
    nextCourtDate TEXT,                   -- Next court appearance
    caseNotes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inquiryId) REFERENCES inquiries(id)
);

-- Table for appointments/consultations
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inquiryId TEXT,                       -- Reference to inquiry (optional)
    caseId TEXT,                          -- Reference to case (optional)
    clientName TEXT NOT NULL,
    clientEmail TEXT NOT NULL,
    clientPhone TEXT NOT NULL,
    appointmentType TEXT NOT NULL,        -- consultation, meeting, court, etc.
    scheduledDate TEXT NOT NULL,
    scheduledTime TEXT NOT NULL,
    duration INTEGER DEFAULT 30,         -- Duration in minutes
    attorney TEXT,                        -- Assigned attorney
    location TEXT,                        -- Meeting location
    status TEXT DEFAULT 'scheduled',      -- scheduled, completed, cancelled, no_show
    notes TEXT,
    reminderSent BOOLEAN DEFAULT FALSE,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inquiryId) REFERENCES inquiries(id),
    FOREIGN KEY (caseId) REFERENCES cases(id)
);

-- Table for email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    htmlContent TEXT NOT NULL,
    textContent TEXT,
    variables TEXT,                       -- JSON array of template variables
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default attorneys
INSERT OR IGNORE INTO attorneys (name, email, phone, title, specialization) VALUES
('Rajesh Sharma', 'rajesh@sharmaassociates.co.in', '+91 11 1234 5678', 'Senior Partner & Founder', 'Divorce & High Net Worth Cases'),
('Priya Sharma', 'priya@sharmaassociates.co.in', '+91 11 1234 5679', 'Senior Partner', 'Child Custody & Family Welfare'),
('Arjun Patel', 'arjun@sharmaassociates.co.in', '+91 11 1234 5680', 'Associate Attorney', 'Property Disputes & NRI Cases'),
('Kavya Menon', 'kavya@sharmaassociates.co.in', '+91 11 1234 5681', 'Associate Attorney', 'Mediation & Family Counseling'),
('Rohit Singh', 'rohit@sharmaassociates.co.in', '+91 11 1234 5682', 'Legal Research Associate', 'Research & Documentation');

-- Insert default email templates
INSERT OR IGNORE INTO email_templates (name, subject, htmlContent, textContent, variables) VALUES
('initial_response', 'Thank you for contacting Sharma & Associates', 
 '<h1>Thank you for your inquiry</h1><p>Dear {{firstName}},</p><p>We have received your inquiry regarding {{legalMatter}} and will respond within 24 hours.</p>',
 'Dear {{firstName}}, We have received your inquiry regarding {{legalMatter}} and will respond within 24 hours.',
 '["firstName", "legalMatter"]'),
 
('consultation_reminder', 'Reminder: Your consultation with Sharma & Associates',
 '<h1>Consultation Reminder</h1><p>This is a reminder of your consultation scheduled for {{date}} at {{time}}.</p>',
 'This is a reminder of your consultation scheduled for {{date}} at {{time}}.',
 '["date", "time"]'),
 
('follow_up_call', 'Following up on your legal inquiry',
 '<h1>Follow-up on your inquiry</h1><p>Dear {{firstName}},</p><p>We wanted to follow up on your recent inquiry about {{legalMatter}}.</p>',
 'Dear {{firstName}}, We wanted to follow up on your recent inquiry about {{legalMatter}}.',
 '["firstName", "legalMatter"]');

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(createdAt);
CREATE INDEX IF NOT EXISTS idx_inquiries_urgency ON inquiries(urgency);
CREATE INDEX IF NOT EXISTS idx_follow_ups_inquiry ON follow_ups(inquiryId);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(scheduledFor);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduledDate);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status); 