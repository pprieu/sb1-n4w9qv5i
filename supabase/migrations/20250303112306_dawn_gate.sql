/*
  # Email Templates Configuration

  1. Custom Email Templates
    - Confirmation email template
    - Password reset email template
  
  2. Branding
    - Custom styling for emails
    - Golf Performance Tracker branding
*/

-- Create a function to set email templates
CREATE OR REPLACE FUNCTION set_email_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmation_template text;
  recovery_template text;
BEGIN
  -- Define confirmation email template
  confirmation_template := '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmez votre inscription à Golf Performance Tracker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #eaeaea;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #15803d;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #15803d;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      padding-top: 20px;
      border-top: 1px solid #eaeaea;
    }
    .help {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Golf Performance Tracker</div>
    </div>
    <div class="content">
      <h2>Bienvenue sur Golf Performance Tracker !</h2>
      <p>Merci de vous être inscrit. Pour finaliser votre inscription et commencer à suivre vos performances de golf, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
      
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Confirmer mon email</a>
      </div>
      
      <p>Ce lien expirera dans 24 heures. Si vous n''avez pas créé de compte, vous pouvez ignorer cet email.</p>
      
      <div class="help">
        <p><strong>Besoin d''aide ?</strong></p>
        <p>Si vous rencontrez des problèmes avec la confirmation de votre email, essayez de copier et coller le lien suivant dans votre navigateur :</p>
        <p style="word-break: break-all; font-size: 12px;">{{ .ConfirmationURL }}</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 Golf Performance Tracker. Tous droits réservés.</p>
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
';

  -- Define recovery (password reset) email template
  recovery_template := '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe - Golf Performance Tracker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #eaeaea;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #15803d;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #15803d;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      padding-top: 20px;
      border-top: 1px solid #eaeaea;
    }
    .help {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Golf Performance Tracker</div>
    </div>
    <div class="content">
      <h2>Réinitialisation de votre mot de passe</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
      
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Réinitialiser mon mot de passe</a>
      </div>
      
      <p>Ce lien expirera dans 1 heure. Si vous n''avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
      
      <div class="help">
        <p><strong>Besoin d''aide ?</strong></p>
        <p>Si vous rencontrez des problèmes avec la réinitialisation de votre mot de passe, essayez de copier et coller le lien suivant dans votre navigateur :</p>
        <p style="word-break: break-all; font-size: 12px;">{{ .ConfirmationURL }}</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 Golf Performance Tracker. Tous droits réservés.</p>
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
';

  -- Set confirmation template
  PERFORM set_config('auth.email.template.confirmation', confirmation_template, false);
  
  -- Set recovery template
  PERFORM set_config('auth.email.template.recovery', recovery_template, false);
  
  -- Configure email settings
  PERFORM set_config('auth.email.enable_signup', 'true', false);
  PERFORM set_config('auth.email.double_confirm_changes', 'true', false);
  PERFORM set_config('auth.email.enable_confirmations', 'true', false);
  
  -- Set sender name
  PERFORM set_config('auth.email.sender_name', 'Golf Performance Tracker', false);
  
  -- Set confirmation URL expiry (24 hours in seconds)
  PERFORM set_config('auth.email.confirmation_url_expiry_seconds', '86400', false);
  
  -- Set password reset URL expiry (1 hour in seconds)
  PERFORM set_config('auth.email.reset_password_url_expiry_seconds', '3600', false);
END;
$$;

-- Execute the function to set email templates
SELECT set_email_templates();

-- Create a table to store app email settings if it doesn't exist
CREATE TABLE IF NOT EXISTS app_email_settings (
  id SERIAL PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store email settings for reference
INSERT INTO app_email_settings (setting_name, setting_value)
VALUES 
  ('sender_name', 'Golf Performance Tracker'),
  ('confirmation_expiry_hours', '24'),
  ('reset_password_expiry_hours', '1'),
  ('email_templates_version', '1.0')
ON CONFLICT (setting_name) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Enable row level security on the settings table
ALTER TABLE app_email_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for app_email_settings
CREATE POLICY "Only authenticated users can read email settings"
  ON app_email_settings
  FOR SELECT
  TO authenticated
  USING (true);