/*
  # Mise à jour complète des politiques RLS pour les parcours de golf

  1. Sécurité
    - Suppression des anciennes politiques
    - Création de nouvelles politiques plus permissives
    - Permet la lecture et l'écriture pour les utilisateurs authentifiés
*/

-- Suppression des politiques existantes pour repartir sur une base propre
DROP POLICY IF EXISTS "Tout le monde peut voir les parcours" ON golf_courses;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent ajouter des parcours" ON golf_courses;

-- Création des nouvelles politiques
CREATE POLICY "Lecture des parcours"
  ON golf_courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Création des parcours"
  ON golf_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Modification des parcours"
  ON golf_courses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Suppression des parcours"
  ON golf_courses
  FOR DELETE
  TO authenticated
  USING (true);