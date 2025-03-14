/*
  # Update department default value

  1. Changes
    - Set default value for department column to '00'
    - Update existing null or empty departments to '00'
    - Add check constraint to ensure valid department format
  
  2. Security
    - No changes to RLS policies
*/

-- Update existing records with empty or null departments
UPDATE golf_courses 
SET department = '00'
WHERE department IS NULL OR department = '';

-- Set default value for department column
ALTER TABLE golf_courses 
ALTER COLUMN department SET DEFAULT '00';

-- Add check constraint to ensure valid department format
ALTER TABLE golf_courses 
ADD CONSTRAINT valid_department_format 
CHECK (department ~ '^\d{2}$');