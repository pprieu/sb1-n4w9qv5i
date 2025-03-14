/*
  # Correction des politiques RLS pour les scores

  1. Changements
    - Simplification de la politique RLS pour les scores
    - Ajout d'une politique unique avec vérification du propriétaire
    - Suppression des politiques redondantes

  2. Sécurité
    - Maintien de la vérification du propriétaire de la partie
    - Autorisation de toutes les opérations CRUD pour le propriétaire
*/

-- Suppression des politiques existantes
DROP POLICY IF EXISTS "Gestion des scores par l'utilisateur" ON hole_scores;

-- Désactiver puis réactiver RLS pour s'assurer qu'il n'y a pas de politique cachée
ALTER TABLE hole_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;

-- Création d'une politique unique et simplifiée
CREATE POLICY "Gestion des scores par l'utilisateur"
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
      WHERE rounds.id = round_id 
      AND rounds.user_id = auth.uid()
    )
  );