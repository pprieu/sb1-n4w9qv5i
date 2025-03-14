/*
  # Correction des politiques RLS pour les scores

  1. Modifications
    - Simplification des politiques RLS pour hole_scores
    - Ajout d'une politique unique pour toutes les opérations
    - Vérification basée sur l'utilisateur propriétaire de la partie

  2. Sécurité
    - Maintien de la sécurité au niveau de la partie (round)
    - Vérification de l'appartenance de la partie à l'utilisateur
*/

-- Suppression des politiques existantes
DROP POLICY IF EXISTS "Lecture des scores" ON hole_scores;
DROP POLICY IF EXISTS "Création des scores" ON hole_scores;
DROP POLICY IF EXISTS "Modification des scores" ON hole_scores;
DROP POLICY IF EXISTS "Suppression des scores" ON hole_scores;

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
  );

-- Mise à jour de la fonction de complétion de partie
CREATE OR REPLACE FUNCTION complete_round(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est propriétaire de la partie
  IF NOT EXISTS (
    SELECT 1 
    FROM rounds 
    WHERE id = p_round_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Mettre à jour le statut de la partie
  UPDATE rounds
  SET status = 'completed'
  WHERE id = p_round_id
  AND user_id = auth.uid()
  AND status = 'in_progress';
END;
$$;