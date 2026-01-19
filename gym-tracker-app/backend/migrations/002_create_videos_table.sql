CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    process_type VARCHAR(50) NOT NULL,
    processed_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);

COMMENT ON TABLE videos IS 'Stores processed video records';
COMMENT ON COLUMN videos.process_type IS 'Type of processing: pose_estimation or barbell_tracking';
COMMENT ON COLUMN videos.processed_url IS 'URL to access the processed video';
