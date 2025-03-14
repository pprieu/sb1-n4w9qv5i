/*
  # Correction des politiques RLS

  1. Modifications
    - Simplification des politiques RLS pour hole_scores
    - Ajout d'index pour optimiser les performances
    - Amélioration de la fonction complete_round
    - Correction des politiques pour les rounds

  2. Sécurité
    - Vérification stricte des propriétaires des parties
    - Meilleure gestion des états des parties
*/

-- Suppression des politiques existantes
DROP POLICY IF EXISTS "Gestion des scores par l'utilisateur" ON hole_scores;
DROP POLICY IF EXISTS "Gestion des parties par l'utilisateur" ON rounds;

-- Désactiver puis réactiver RLS
ALTER TABLE hole_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- Optimisation des index
DROP INDEX IF EXISTS idx_rounds_user_status;
DROP INDEX IF EXISTS idx_hole_scores_round_user;
CREATE INDEX idx_rounds_user_status ON rounds(user_id, status);
CREATE INDEX idx_hole_scores_round_user ON hole_scores(round_id, round_id);

-- Nouvelle politique pour les scores
CREATE POLICY "Gestion des scores"
  ON hole_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = hole_scores.round_id 
      AND rounds.user_id = auth.uid()
      AND (
        rounds.status = 'in_progress' 
        OR 
        current_setting('app.bypass_rls', true) = 'on'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM rounds 
      WHERE rounds.id = round_id 
      AND rounds.user_id = auth.uid()
      AND rounds.status = 'in_progress'
    )
  );

-- Nouvelle politique pour les parties
CREATE POLICY "Gestion des parties"
  ON rounds
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction améliorée pour compléter une partie
CREATE OR REPLACE FUNCTION complete_round(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_round_status round_status;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  v_user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est authentifié
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Vérifier l'existence et le statut de la partie
  SELECT status INTO v_round_status
  FROM rounds
  WHERE id = p_round_id AND user_id = v_user_id;

  IF v_round_status IS NULL THEN
    RAISE EXCEPTION 'Round not found or unauthorized';
  END IF;

  IF v_round_status = 'completed' THEN
    RAISE EXCEPTION 'Round is already completed';
  END IF;

  -- Activer le bypass RLS pour la mise à jour
  SET LOCAL app.bypass_rls = 'on';

  -- Mettre à jour le statut de la partie
  UPDATE rounds
  SET status = 'completed'
  WHERE id = p_round_id
  AND user_id = v_user_id
  AND status = 'in_progress';

  -- Désactiver le bypass RLS
  SET LOCAL app.bypass_rls = 'off';
END;
$$;