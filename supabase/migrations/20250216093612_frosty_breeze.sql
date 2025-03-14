/*
  # Fix hole_scores RLS policy

  1. Changes
    - Suppression et recréation de la politique RLS pour hole_scores
    - Ajout d'une politique plus permissive pour permettre l'insertion de nouveaux scores

  2. Security
    - Maintient la sécurité en vérifiant toujours que l'utilisateur est propriétaire de la partie
    - Permet l'insertion de nouveaux scores pour une nouvelle partie
*/

-- Suppression de la politique existante
DROP POLICY IF EXISTS "Gestion des scores par le propriétaire de la partie" ON hole_scores;

-- Désactiver puis réactiver RLS pour s'assurer qu'il n'y a pas de politique cachée
ALTER TABLE hole_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;

-- Création d'une nouvelle politique plus permissive
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