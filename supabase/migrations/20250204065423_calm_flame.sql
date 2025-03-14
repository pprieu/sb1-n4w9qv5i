/*
  # Fix hole_scores RLS policies

  1. Changes
    - Drop existing hole_scores RLS policy
    - Add specific policies for CRUD operations on hole_scores
    - Fix the policy to allow inserting new scores before the round exists

  2. Security
    - Enable RLS on hole_scores table
    - Add policies for authenticated users to manage their scores
    - Ensure users can only access their own scores
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leurs scores" ON hole_scores;

-- Create new specific policies
CREATE POLICY "Lecture des scores"
  ON hole_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = hole_scores.round_id
      AND rounds.user_id = auth.uid()
    )
  );

CREATE POLICY "Création des scores"
  ON hole_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = hole_scores.round_id
      AND rounds.user_id = auth.uid()
    )
  );

CREATE POLICY "Modification des scores"
  ON hole_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = hole_scores.round_id
      AND rounds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = hole_scores.round_id
      AND rounds.user_id = auth.uid()
    )
  );

CREATE POLICY "Suppression des scores"
  ON hole_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = hole_scores.round_id
      AND rounds.user_id = auth.uid()
    )
  );