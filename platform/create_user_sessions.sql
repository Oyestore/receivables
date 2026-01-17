-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_user_session_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_userId ON user_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiresAt ON user_sessions("expiresAt");
CREATE INDEX IF NOT EXISTS idx_user_sessions_isActive ON user_sessions("isActive");
