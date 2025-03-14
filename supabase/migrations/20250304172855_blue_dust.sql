-- Create a function to get user performance statistics
CREATE OR REPLACE FUNCTION get_user_performance_stats(user_ids uuid[])
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_rounds AS (
    -- Get completed rounds for the specified users
    SELECT 
      r.user_id,
      r.id AS round_id,
      r.course_id,
      r.date
    FROM 
      rounds r
    WHERE 
      r.user_id = ANY(user_ids)
      AND r.status = 'completed'
  ),
  user_scores AS (
    -- Calculate scores for each round
    SELECT
      ur.user_id,
      ur.round_id,
      SUM(hs.score) AS total_score,
      SUM(hs.par) AS total_par,
      SUM(CASE WHEN hs.fairway_hit THEN 1 ELSE 0 END) AS fairways_hit,
      COUNT(CASE WHEN hs.fairway_hit IS NOT NULL THEN 1 END) AS fairways_total,
      SUM(CASE WHEN hs.green_in_regulation THEN 1 ELSE 0 END) AS gir_hit,
      COUNT(CASE WHEN hs.green_in_regulation IS NOT NULL THEN 1 END) AS gir_total,
      SUM(hs.putts) AS total_putts,
      COUNT(hs.hole_number) AS holes_played
    FROM
      user_rounds ur
      JOIN hole_scores hs ON ur.round_id = hs.round_id
    GROUP BY
      ur.user_id, ur.round_id
  ),
  user_stats AS (
    -- Calculate aggregate statistics for each user
    SELECT
      us.user_id,
      COUNT(DISTINCT us.round_id) AS rounds_count,
      AVG(us.total_score) AS avg_score,
      AVG(us.total_score - us.total_par) AS avg_over_par,
      (SUM(us.fairways_hit)::float / NULLIF(SUM(us.fairways_total), 0)) * 100 AS fairway_percentage,
      (SUM(us.gir_hit)::float / NULLIF(SUM(us.gir_total), 0)) * 100 AS gir_percentage,
      SUM(us.total_putts)::float / NULLIF(SUM(us.holes_played), 0) AS avg_putts
    FROM
      user_scores us
    GROUP BY
      us.user_id
  )
  -- Join with user information and return as JSON
  SELECT 
    json_build_object(
      'user_id', u.id,
      'user_email', au.email,
      'user_profile', json_build_object(
        'handicap', up.handicap,
        'preferred_tee', up.preferred_tee,
        'club_membership', up.club_membership
      ),
      'avg_score', us.avg_score,
      'avg_over_par', us.avg_over_par,
      'fairway_percentage', us.fairway_percentage,
      'gir_percentage', us.gir_percentage,
      'avg_putts', us.avg_putts,
      'rounds_count', us.rounds_count
    )
  FROM 
    user_stats us
    JOIN auth.users au ON us.user_id = au.id
    LEFT JOIN user_profiles up ON us.user_id = up.user_id
    JOIN unnest(user_ids) u(id) ON us.user_id = u.id
  UNION ALL
  -- Include users with no completed rounds
  SELECT 
    json_build_object(
      'user_id', u.id,
      'user_email', au.email,
      'user_profile', json_build_object(
        'handicap', up.handicap,
        'preferred_tee', up.preferred_tee,
        'club_membership', up.club_membership
      ),
      'rounds_count', 0
    )
  FROM 
    unnest(user_ids) u(id)
    JOIN auth.users au ON u.id = au.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_stats us ON u.id = us.user_id
  WHERE 
    us.user_id IS NULL;
END;
$$;

-- Create a policy to allow authenticated users to execute this function
GRANT EXECUTE ON FUNCTION get_user_performance_stats(uuid[]) TO authenticated;

-- Add an index to improve performance of the function
CREATE INDEX IF NOT EXISTS idx_rounds_user_id_status ON rounds(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hole_scores_round_id_hole ON hole_scores(round_id, hole_number);