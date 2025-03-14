/*
  # Correction des politiques RLS pour les parties

  1. Changements
    - Mise à jour des politiques RLS pour la table rounds
    - Ajout de politiques explicites pour chaque opération CRUD
    - Vérification que l'utilisateur authentifié est le propriétaire de la partie

  2. Sécurité
    - Les utilisateurs peuvent uniquement voir et gérer leurs propres parties
    - Authentification requise pour toutes les opérations
*/

-- Suppression des politiques existantes pour la table rounds
DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leurs parties" ON rounds;

-- Création des nouvelles politiques
CREATE POLICY "Lecture des parties"
  ON rounds
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Création des parties"
  ON rounds
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modification des parties"
  ON rounds
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppression des parties"
  ON rounds
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);