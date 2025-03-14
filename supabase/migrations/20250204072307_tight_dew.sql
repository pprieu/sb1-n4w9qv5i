-- Création de la table pour stocker les pars par parcours
CREATE TABLE course_pars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES golf_courses NOT NULL,
  hole_number integer NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par integer NOT NULL CHECK (par BETWEEN 3 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, hole_number)
);

-- Activation de RLS
ALTER TABLE course_pars ENABLE ROW LEVEL SECURITY;

-- Création des politiques RLS
CREATE POLICY "Lecture des pars"
  ON course_pars
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Création et modification des pars"
  ON course_pars
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);