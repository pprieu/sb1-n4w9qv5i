-- Suppression de toutes les politiques existantes
DROP POLICY IF EXISTS "Gestion des scores par le propriétaire de la partie" ON hole_scores;

-- Désactiver puis réactiver RLS pour s'assurer qu'il n'y a pas de politique cachée
ALTER TABLE hole_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;

-- Création d'une politique unique pour toutes les opérations
CREATE POLICY "Gestion des scores par le propriétaire de la partie"
  ON hole_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = hole_scores.round_id 
      AND rounds.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = hole_scores.round_id 
      AND rounds.user_id = auth.uid()
    )
  );