/*
  # Ajout de la politique d'insertion pour les parcours de golf

  1. Sécurité
    - Ajout d'une politique permettant aux utilisateurs authentifiés d'insérer de nouveaux parcours
    - La politique s'applique uniquement à l'opération INSERT
*/

CREATE POLICY "Les utilisateurs authentifiés peuvent ajouter des parcours"
  ON golf_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);