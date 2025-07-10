-- Performance indexes for PostgreSQL
-- This script creates strategic indexes for optimal query performance

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_timestamp ON chat_messages(user_id, timestamp DESC);

-- Conversation messages indexes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_timestamp ON conversation_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role ON conversation_messages(role);

-- Memory entries indexes
CREATE INDEX IF NOT EXISTS idx_memory_entries_user_id ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_category ON memory_entries(category);
CREATE INDEX IF NOT EXISTS idx_memory_entries_user_category ON memory_entries(user_id, category);
CREATE INDEX IF NOT EXISTS idx_memory_entries_created_at ON memory_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_importance ON memory_entries(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_labels_gin ON memory_entries USING GIN (labels);

-- Memory access log indexes
CREATE INDEX IF NOT EXISTS idx_memory_access_log_memory_entry_id ON memory_access_log(memory_entry_id);
CREATE INDEX IF NOT EXISTS idx_memory_access_log_conversation_id ON memory_access_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_access_log_created_at ON memory_access_log(created_at DESC);

-- Health data indexes
CREATE INDEX IF NOT EXISTS idx_health_data_user_id ON health_data(user_id);
CREATE INDEX IF NOT EXISTS idx_health_data_timestamp ON health_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_data_user_timestamp ON health_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_data_data_type ON health_data(data_type);
CREATE INDEX IF NOT EXISTS idx_health_data_category ON health_data(category);
CREATE INDEX IF NOT EXISTS idx_health_data_user_type_timestamp ON health_data(user_id, data_type, timestamp DESC);

-- Connected devices indexes
CREATE INDEX IF NOT EXISTS idx_connected_devices_user_id ON connected_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_devices_device_type ON connected_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_connected_devices_is_active ON connected_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_connected_devices_last_sync ON connected_devices(last_sync DESC);

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_conversation_id ON files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_files_category_id ON files(category_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_retention_policy ON files(retention_policy);
CREATE INDEX IF NOT EXISTS idx_files_scheduled_deletion ON files(scheduled_deletion);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);

-- File access log indexes
CREATE INDEX IF NOT EXISTS idx_file_access_log_file_id ON file_access_log(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_user_id ON file_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_created_at ON file_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_access_log_access_type ON file_access_log(access_type);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_health_data_user_category_timestamp ON health_data(user_id, category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_files_user_category_created ON files(user_id, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_user_importance ON memory_entries(user_id, importance_score DESC);

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_users_preferences_gin ON users USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_health_data_metadata_gin ON health_data USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_connected_devices_metadata_gin ON connected_devices USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_files_metadata_gin ON files USING GIN (metadata);

-- Text search indexes for content
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_gin ON chat_messages USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_conversation_messages_content_gin ON conversation_messages USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_memory_entries_content_gin ON memory_entries USING GIN (to_tsvector('english', content));

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_connected_devices_active ON connected_devices(user_id, last_sync DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_files_not_deleted ON files(user_id, created_at DESC) WHERE is_deleted = false;