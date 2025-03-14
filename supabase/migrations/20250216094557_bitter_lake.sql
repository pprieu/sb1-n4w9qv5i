/*
  # Fix hole_scores RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create new, more permissive policies for hole_scores table
    - Add explicit policies for each operation type
  
  2. Security
    - Ensure users can only access their own scores
    - Allow all operations for authenticated users on their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Gestion des scores par le propriétaire de la partie" ON hole_scores;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE hole_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;

-- Create separate policies for each operation
CREATE POLICY "Lecture des scores par le propriétaire"
  ON hole_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = hole_scores.round_id 
      AND rounds.user_id = auth.uid()
    )
  );

CREATE POLICY "Création des scores par le propriétaire"
  ON hole_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = round_id 
      AND rounds.user_id = auth.uid()
      AND rounds.status = 'in_progress'
    )
  );

CREATE POLICY "Modification des scores par le propriétaire"
  ON hole_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = hole_scores.round_id 
      AND rounds.user_id = auth.uid()
      AND rounds.status = 'in_progress'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = round_id 
      AND rounds.user_id = auth.uid()
      AND rounds.status = 'in_progress'
    )
  );

CREATE POLICY "Suppression des scores par le propriétaire"
  ON hole_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = hole_scores.round_id 
      AND rounds.user_id = auth.uid()
    )
  );