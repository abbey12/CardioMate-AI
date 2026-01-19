-- Default Language Setting
-- Adds a platform setting for default language

INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('default_language', '{"language": "en"}', 'Default language for new facilities')
ON CONFLICT (setting_key) DO NOTHING;


