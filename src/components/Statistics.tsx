import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../supabaseClient';
import { Trash2, Filter, Download } from 'lucide-react';
import type { Round } from '../types';

export default function Statistics() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState<string | null>(null);
  const [courses, setCourses] = useState<{id: string, name: string}[]>([]);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRounds();
    loadCourses();
  }, [filterCourse, dateRange]);

  async function loadCourses() {
    try {
      const { data, error } = await supabase
        .from('golf_courses')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setCourses(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des parcours:', err);
    }
  }

  async function loadRounds() {
    try {
      setLoading(true);
      let query = supabase
        .from('rounds')
        .select(`
          *,
          course:golf_courses(*),
          holes:hole_scores(*)
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true });
      
      if (filterCourse) {
        query = query.eq('course_id', filterCourse);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setRounds(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des parties:', err);
      setError('Impossible de charger les statistiques. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRound(roundId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette partie ? Cette action est irréversible.')) {
      return;
    }

    try {
      setDeleting(roundId);

      // Supprimer d'abord les scores des trous
      const { error: scoresError } = await supabase
        .from('hole_scores')
        .delete()
        .eq('round_id', roundId);

      if (scoresError) throw scoresError;

      // Puis supprimer la partie
      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);

      if (roundError) throw roundError;

      // Mettre à jour la liste des parties
      setRounds(rounds.filter(round => round.id !== roundId));

      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Partie supprimée avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression de la partie:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de la suppression de la partie';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setDeleting(null);
    }
  }

  const calculateStats = () => {
    return rounds.map(round => {
      const totalScore = round.holes?.reduce((sum, hole) => sum + hole.score, 0) || 0;
      const totalPar = round.holes?.reduce((sum, hole) => sum + hole.par, 0) || 0;
      const fairwaysHit = round.holes?.filter(hole => hole.fairway_hit).length || 0;
      const greensInRegulation = round.holes?.filter(hole => hole.green_in_regulation).length || 0;
      const totalPutts = round.holes?.reduce((sum, hole) => sum + hole.putts, 0) || 0;
      const holesPlayed = round.holes?.length || 0;

      const date = new Date(round.date);
      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);

      return {
        id: round.id,
        date: formattedDate,
        rawDate: round.date,
        courseName: round.course?.name,
        courseId: round.course_id,
        score: totalScore,
        overPar: totalScore - totalPar,
        fairwayPercentage: holesPlayed > 0 ? (fairwaysHit / holesPlayed) * 100 : 0,
        girPercentage: holesPlayed > 0 ? (greensInRegulation / holesPlayed) * 100 : 0,
        totalPutts: totalPutts,
        puttsPerHole: holesPlayed > 0 ? totalPutts / holesPlayed : 0,
        holesPlayed: holesPlayed
      };
    });
  };

  const exportToCSV = () => {
    const stats = calculateStats();
    if (stats.length === 0) return;
    
    // Préparer les en-têtes
    const headers = [
      'Date', 
      'Parcours', 
      'Score', 
      'Par', 
      'Fairways (%)', 
      'GIR (%)', 
      'Putts', 
      'Putts/Trou'
    ];
    
    // Préparer les lignes de données
    const rows = stats.map(round => [
      round.date,
      round.courseName,
      round.score,
      round.overPar > 0 ? `+${round.overPar}` : round.overPar,
      round.fairwayPercentage.toFixed(1),
      round.girPercentage.toFixed(1),
      round.totalPutts,
      round.puttsPerHole.toFixed(1)
    ]);
    
    // Combiner les en-têtes et les données
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Créer un blob et un lien de téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `golf-stats-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {' '}
            <span className="font-medium">
              {entry.dataKey.includes('Percentage') ? 
                `${entry.value.toFixed(1)}%` : 
                entry.value.toFixed(1)}
            </span>
          </p>
        ))}
      </div>
    );
  };

  const formatYAxis = (value: number) => {
    return value.toFixed(0);
  };

  // Calculer les statistiques globales
  const calculateGlobalStats = () => {
    if (rounds.length === 0) return null;
    
    const stats = calculateStats();
    const totalRounds = stats.length;
    
    // Calculer les moyennes
    const avgScore = stats.reduce((sum, round) => sum + round.score, 0) / totalRounds;
    const avgOverPar = stats.reduce((sum, round) => sum + round.overPar, 0) / totalRounds;
    const avgFairways = stats.reduce((sum, round) => sum + round.fairwayPercentage, 0) / totalRounds;
    const avgGIR = stats.reduce((sum, round) => sum + round.girPercentage, 0) / totalRounds;
    const avgPutts = stats.reduce((sum, round) => sum + round.puttsPerHole, 0) / totalRounds;
    
    // Trouver les meilleurs et pires scores
    const bestRound = stats.reduce((best, round) => round.overPar < best.overPar ? round : best, stats[0]);
    const worstRound = stats.reduce((worst, round) => round.overPar > worst.overPar ? round : worst, stats[0]);
    
    // Calculer la répartition des scores par parcours
    const scoresByCourse: {[key: string]: {count: number, totalOverPar: number, name: string}} = {};
    stats.forEach(round => {
      if (!scoresByCourse[round.courseId]) {
        scoresByCourse[round.courseId] = {
          count: 0,
          totalOverPar: 0,
          name: round.courseName || ''
        };
      }
      scoresByCourse[round.courseId].count++;
      scoresByCourse[round.courseId].totalOverPar += round.overPar;
    });
    
    const coursePerformance = Object.entries(scoresByCourse).map(([id, data]) => ({
      id,
      name: data.name,
      avgOverPar: data.totalOverPar / data.count,
      count: data.count
    })).sort((a, b) => a.avgOverPar - b.avgOverPar);
    
    return {
      totalRounds,
      avgScore,
      avgOverPar,
      avgFairways,
      avgGIR,
      avgPutts,
      bestRound,
      worstRound,
      coursePerformance
    };
  };

  const globalStats = calculateGlobalStats();
  const stats = calculateStats();

  // Données pour le graphique en camembert des parcours
  const coursePieData = globalStats?.coursePerformance.map(course => ({
    name: course.name,
    value: course.count
  })) || [];

  // Couleurs pour le graphique en camembert
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            loadRounds();
          }}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">Aucune partie enregistrée pour le moment.</p>
        <p className="text-gray-500">Commencez par enregistrer une partie pour voir vos statistiques.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6">
      {/* Filtres */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Filtres et options</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Masquer' : 'Filtres'}</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
              title="Exporter les données en CSV"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="course-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Parcours
              </label>
              <select
                id="course-filter"
                value={filterCourse || ''}
                onChange={(e) => setFilterCourse(e.target.value || null)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Tous les parcours</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date-start" className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                id="date-start"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="date-end" className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                id="date-end"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Statistiques globales */}
      {globalStats && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Résumé des performances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700 font-medium">Parties jouées</p>
              <p className="text-2xl font-bold text-green-800">{globalStats.totalRounds}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Score moyen</p>
              <p className="text-2xl font-bold text-blue-800">
                {globalStats.avgScore.toFixed(1)} ({globalStats.avgOverPar > 0 ? '+' : ''}{globalStats.avgOverPar.toFixed(1)})
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-700 font-medium">Fairways touchés</p>
              <p className="text-2xl font-bold text-yellow-800">{globalStats.avgFairways.toFixed(1)}%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-700 font-medium">Putts par trou</p>
              <p className="text-2xl font-bold text-purple-800">{globalStats.avgPutts.toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium mb-3">Meilleure performance</h4>
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <p className="font-medium text-green-800">{globalStats.bestRound.courseName}</p>
                <p className="text-sm text-green-600">{globalStats.bestRound.date}</p>
                <p className="mt-2">
                  Score: <span className="font-bold">{globalStats.bestRound.score}</span> 
                  {' '}({globalStats.bestRound.overPar > 0 ? '+' : ''}{globalStats.bestRound.overPar})
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-medium mb-3">Performance par parcours</h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coursePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {coursePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des parties */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Historique des parties</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Parcours</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Score</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Par</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Fairways</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">GIR</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Putts</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((round) => (
                <tr key={round.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.date}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.courseName}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.score}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.overPar > 0 ? `+${round.overPar}` : round.overPar}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.fairwayPercentage.toFixed(1)}%</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.girPercentage.toFixed(1)}%</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round.totalPutts}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    <button
                      onClick={() => deleteRound(round.id)}
                      disabled={deleting === round.id}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                      title="Supprimer la partie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphiques */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Évolution du score</h3>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 12, fill: '#4B5563' }}
                stroke="#9CA3AF"
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12, fill: '#4B5563' }}
                stroke="#9CA3AF"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="overPar" 
                stroke="#8B5CF6" 
                name="Coups au-dessus du par"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: '#8B5CF6' }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="puttsPerHole" 
                stroke="#10B981" 
                name="Putts par trou"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: '#10B981' }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Précision</h3>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 12, fill: '#4B5563' }}
                stroke="#9CA3AF"
              />
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#4B5563' }}
                stroke="#9CA3AF"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="fairwayPercentage" 
                stroke="#F59E0B" 
                name="% Fairways touchés"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: '#F59E0B' }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="girPercentage" 
                stroke="#EF4444" 
                name="% Greens en régulation"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: '#EF4444' }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphique de comparaison des parcours */}
      {globalStats && globalStats.coursePerformance.length > 1 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Performance par parcours</h3>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={globalStats.coursePerformance}
                margin={{ top: 5, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12, fill: '#4B5563' }}
                  stroke="#9CA3AF"
                />
                <YAxis
                  label={{ value: 'Coups au-dessus du par', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  tick={{ fontSize: 12, fill: '#4B5563' }}
                  stroke="#9CA3AF"
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgOverPar" name="Score moyen (par rapport au par)" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}