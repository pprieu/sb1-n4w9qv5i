/*
  # Correction des politiques RLS pour les scores

  1. Changements
    - Suppression de toutes les politiques existantes sur hole_scores
    - Création d'une nouvelle politique unique pour toutes les opérations
    - Simplification de la logique de vérification

  2. Sécurité
    - Vérifie que l'utilisateur est propriétaire de la partie (round)
    - Utilise une seule politique pour toutes les opérations (SELECT, INSERT, UPDATE, DELETE)
*/

-- Suppression de toutes les politiques existantes
DROP POLICY IF EXISTS "Lecture des scores" ON hole_scores;
DROP POLICY IF EXISTS "Création des scores" ON hole_scores;
DROP POLICY IF EXISTS "Modification des scores" ON hole_scores;
DROP POLICY IF EXISTS "Suppression des scores" ON hole_scores;
DROP POLICY IF EXISTS "Création et modification des scores" ON hole_scores;

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
  );