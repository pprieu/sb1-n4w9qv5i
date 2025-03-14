/*
  # Schéma initial pour l'application de golf

  1. Nouvelles Tables
    - `golf_courses`
      - `id` (uuid, clé primaire)
      - `name` (text, nom du golf)
      - `location` (text, emplacement)
      - `created_at` (timestamp)
    - `favorite_courses`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence à auth.users)
      - `course_id` (uuid, référence à golf_courses)
      - `created_at` (timestamp)
    - `rounds`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence à auth.users)
      - `course_id` (uuid, référence à golf_courses)
      - `date` (date)
      - `created_at` (timestamp)
    - `hole_scores`
      - `id` (uuid, clé primaire)
      - `round_id` (uuid, référence à rounds)
      - `hole_number` (integer)
      - `par` (integer)
      - `fairway_hit` (boolean)
      - `green_in_regulation` (boolean)
      - `putts` (integer)
      - `score` (integer)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour lecture/écriture authentifiée
*/

-- Création de la table des parcours de golf
CREATE TABLE golf_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Création de la table des parcours favoris
CREATE TABLE favorite_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  course_id uuid REFERENCES golf_courses NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Création de la table des parties
CREATE TABLE rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  course_id uuid REFERENCES golf_courses NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Création de la table des scores par trou
CREATE TABLE hole_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES rounds NOT NULL,
  hole_number integer NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par integer NOT NULL CHECK (par BETWEEN 3 AND 5),
  fairway_hit boolean DEFAULT false,
  green_in_regulation boolean DEFAULT false,
  putts integer NOT NULL CHECK (putts >= 0),
  score integer NOT NULL CHECK (score > 0),
  UNIQUE(round_id, hole_number)
);

-- Activation de la RLS
ALTER TABLE golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Tout le monde peut voir les parcours"
  ON golf_courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs peuvent gérer leurs favoris"
  ON favorite_courses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leurs parties"
  ON rounds
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leurs scores"
  ON hole_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = hole_scores.round_id
      AND rounds.user_id = auth.uid()
    )
  );

-- Insertion de quelques parcours de golf près de Bordeaux
INSERT INTO golf_courses (name, location) VALUES
  ('Golf du Médoc Resort', 'Le Pian-Médoc'),
  ('Golf Bordelais', 'Bordeaux'),
  ('Golf de Pessac', 'Pessac'),
  ('Golf des Graves et du Sauternais', 'Saint-Pardon-de-Conques'),
  ('Golf de Bordeaux-Lac', 'Bordeaux');