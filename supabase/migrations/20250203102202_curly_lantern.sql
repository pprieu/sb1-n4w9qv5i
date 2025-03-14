/*
  # Fix RLS policies for favorite courses

  1. Changes
    - Drop existing RLS policy for favorite_courses
    - Create new, more specific policies for CRUD operations
    - Ensure user_id is properly checked in all policies
  
  2. Security
    - Enable RLS on favorite_courses table
    - Add policies for authenticated users to manage their own favorites
    - Prevent access to other users' favorites
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leurs favoris" ON favorite_courses;

-- Create new specific policies
CREATE POLICY "Lecture des favoris"
  ON favorite_courses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Création des favoris"
  ON favorite_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modification des favoris"
  ON favorite_courses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppression des favoris"
  ON favorite_courses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);