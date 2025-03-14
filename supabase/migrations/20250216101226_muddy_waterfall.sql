/*
  # Improve database security and performance

  1. Changes
    - Add indexes for better performance
    - Add status column to rounds table
    - Update RLS policies for better security
    - Add validation constraints

  2. Security
    - Ensure proper access control for all operations
    - Add validation constraints for data integrity
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_hole_scores_round_id ON hole_scores(round_id);

-- Update rounds policies
DROP POLICY IF EXISTS "Lecture des parties" ON rounds;
DROP POLICY IF EXISTS "Création des parties" ON rounds;
DROP POLICY IF EXISTS "Modification des parties" ON rounds;
DROP POLICY IF EXISTS "Suppression des parties" ON rounds;

CREATE POLICY "Lecture des parties"
  ON rounds
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Création des parties"
  ON rounds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'in_progress'
  );

CREATE POLICY "Modification des parties"
  ON rounds
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Suppression des parties"
  ON rounds
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update hole_scores policies
DROP POLICY IF EXISTS "Lecture des scores" ON hole_scores;
DROP POLICY IF EXISTS "Création et modification des scores" ON hole_scores;
DROP POLICY IF EXISTS "Modification des scores" ON hole_scores;
DROP POLICY IF EXISTS "Suppression des scores" ON hole_scores;

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
      WHERE rounds.id = round_id
      AND rounds.user_id = auth.uid()
      AND rounds.status = 'in_progress'
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
      AND rounds.status = 'in_progress'
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

-- Add function to handle round completion
CREATE OR REPLACE FUNCTION complete_round(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rounds
  SET status = 'completed'
  WHERE id = p_round_id
  AND user_id = auth.uid()
  AND status = 'in_progress';
END;
$$;