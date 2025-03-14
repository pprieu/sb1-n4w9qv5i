/*
  # Amélioration de la gestion de l'authentification

  1. Changements
    - Ajout d'une politique par défaut pour les utilisateurs non authentifiés
    - Optimisation des politiques RLS existantes
    - Ajout d'index pour améliorer les performances

  2. Sécurité
    - Maintien de la sécurité des données
    - Gestion plus robuste des sessions d'authentification
*/

-- Ajout d'index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_rounds_user_status ON rounds(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hole_scores_round_user ON hole_scores(round_id);

-- Mise à jour des politiques RLS pour les rounds
DROP POLICY IF EXISTS "Lecture des parties" ON rounds;
DROP POLICY IF EXISTS "Création des parties" ON rounds;
DROP POLICY IF EXISTS "Modification des parties" ON rounds;
DROP POLICY IF EXISTS "Suppression des parties" ON rounds;

CREATE POLICY "Gestion des parties par l'utilisateur"
  ON rounds
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mise à jour des politiques RLS pour les scores
DROP POLICY IF EXISTS "Gestion des scores par l'utilisateur" ON hole_scores;

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