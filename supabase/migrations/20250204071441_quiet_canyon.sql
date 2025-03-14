-- Drop existing policies
DROP POLICY IF EXISTS "Lecture des scores" ON hole_scores;
DROP POLICY IF EXISTS "Création des scores" ON hole_scores;
DROP POLICY IF EXISTS "Modification des scores" ON hole_scores;
DROP POLICY IF EXISTS "Suppression des scores" ON hole_scores;

-- Create new policies with corrected security
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

CREATE POLICY "Création et modification des scores"
  ON hole_scores
  FOR ALL
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