/*
  # Correction de la politique RLS pour hole_scores

  1. Changements
    - Suppression de la politique existante
    - Création d'une nouvelle politique plus permissive pour l'insertion
    - Ajout d'une vérification explicite de l'utilisateur propriétaire de la partie

  2. Sécurité
    - Maintien de la sécurité en vérifiant toujours que l'utilisateur est propriétaire de la partie
    - Permet l'insertion de nouveaux scores tout en maintenant les restrictions d'accès
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