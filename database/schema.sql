-- Email classification database schema
CREATE TABLE IF NOT EXISTS email_classifications (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    subject TEXT,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE,
    classification VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(5,4),
    raw_classification_data JSONB,
    action_taken VARCHAR(50),
    is_quarantined BOOLEAN DEFAULT FALSE,
    quarantined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_classifications_message_id ON email_classifications(message_id);
CREATE INDEX IF NOT EXISTS idx_email_classifications_email_address ON email_classifications(email_address);
CREATE INDEX IF NOT EXISTS idx_email_classifications_classification ON email_classifications(classification);
CREATE INDEX IF NOT EXISTS idx_email_classifications_received_at ON email_classifications(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_classifications_is_quarantined ON email_classifications(is_quarantined);

-- Classification statistics tracking
CREATE TABLE IF NOT EXISTS classification_stats (
    id SERIAL PRIMARY KEY,
    classification_date DATE NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    total_emails INTEGER DEFAULT 0,
    phishing_count INTEGER DEFAULT 0,
    spam_count INTEGER DEFAULT 0,
    benign_count INTEGER DEFAULT 0,
    quarantined_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_stats_per_day UNIQUE (classification_date, email_address)
);

CREATE INDEX IF NOT EXISTS idx_classification_stats_date ON classification_stats(classification_date);
CREATE INDEX IF NOT EXISTS idx_classification_stats_email ON classification_stats(email_address);

-- Processing history for debugging
CREATE TABLE IF NOT EXISTS processing_log (
    id SERIAL PRIMARY KEY,
    process_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message_id VARCHAR(255),
    details TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processing_log_created_at ON processing_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_log_message_id ON processing_log(message_id);

-- Email metadata cache for performance
CREATE TABLE IF NOT EXISTS email_metadata_cache (
    message_id VARCHAR(255) PRIMARY KEY,
    gmail_id VARCHAR(255) UNIQUE NOT NULL,
    thread_id VARCHAR(255),
    label_ids TEXT[],
    snippet TEXT,
    history_id BIGINT,
    internal_date BIGINT,
    headers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_metadata_gmail_id ON email_metadata_cache(gmail_id);

-- System logs for winston logger persistence
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
