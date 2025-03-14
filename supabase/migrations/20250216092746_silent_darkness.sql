/*
  # Add status column to rounds table

  1. Changes
    - Add `status` column to `rounds` table with possible values:
      - 'in_progress' (default)
      - 'completed'
    - Update existing rounds to 'in_progress'

  2. Notes
    - Uses enum type for status to ensure data integrity
    - Sets default value for new rounds
*/

-- Create enum type for round status
CREATE TYPE round_status AS ENUM ('in_progress', 'completed');

-- Add status column to rounds table
ALTER TABLE rounds 
ADD COLUMN status round_status NOT NULL DEFAULT 'in_progress';

-- Update existing rounds to in_progress
UPDATE rounds SET status = 'in_progress' WHERE status IS NULL;