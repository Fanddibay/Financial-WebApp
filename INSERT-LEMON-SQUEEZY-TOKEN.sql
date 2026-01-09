-- Insert Lemon Squeezy License Token to Database
-- Run this SQL in Supabase SQL Editor to add your Lemon Squeezy license for testing

-- Replace 'YOUR_LEMON_SQUEEZY_LICENSE_KEY' with your actual Lemon Squeezy license key
-- Example: 'E7C4B885-2F81-4836-ABB6-EE39A48FF428'

INSERT INTO license_tokens (token, status) 
VALUES ('E7C4B885-2F81-4836-ABB6-EE39A48FF428', 'inactive')
ON CONFLICT (token) DO NOTHING;

-- Verify the token was inserted
SELECT token, status, device_id, activated_at 
FROM license_tokens 
WHERE token = 'E7C4B885-2F81-4836-ABB6-EE39A48FF428';

-- Or list all tokens
SELECT token, status, device_id, activated_at 
FROM license_tokens 
ORDER BY token;

