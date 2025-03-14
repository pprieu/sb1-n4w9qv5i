import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { GolfCourse, Round, HoleScore, WeatherData } from '../types';
import { ChevronLeft, ChevronRight, Settings, Save, Trash2, Calendar, CheckCircle2, AlertTriangle, CloudSun } from 'lucide-react';
import CourseParSettings from './CourseParSettings';
import OngoingRounds from './OngoingRounds';
import WeatherWidget from './WeatherWidget';

interface ScoreCardProps {
  roundToLoad?: string | null;
  onRoundLoaded?: () => void;
}

export default function ScoreCard({ roundToLoad, onRoundLoaded }: ScoreCardProps) {
  const [selectedCourse, setSelectedCourse] = useState<GolfCourse | null>(null);
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [scores, setScores] = useState(Array(18).fill({
    hole: 0,
    par: 4,
    fairwayHit: false,
    greenInRegulation: false,
    putts: 0,
    score: 0
  }));
  const [user, setUser] = useState(null);
  const [savingHole, setSavingHole] = useState<number | null>(null);
  const [showParSettings, setShowParSettings] = useState(false);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [roundDate, setRoundDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOngoingRounds, setShowOngoingRounds] = useState(false);
  const [ongoingRounds, setOngoingRounds] = useState<Round[]>([]);
  const [loadingOngoingRounds, setLoadingOngoingRounds] = useState(false);
  const [weather, setWeather] = useState<{
    temperature?: number;
    windSpeed?: number;
    conditions?: string;
    icon?: string;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    checkUser();
    loadCourses();
  }, []);

  useEffect(() => {
    if (roundToLoad) {
      loadRound(roundToLoad);
    }
  }, [roundToLoad]);

  useEffect(() => {
    if (scores) {
      const nextHoleIndex = scores.findIndex((score) => score.score === 0);
      if (nextHoleIndex !== -1) {
        setCurrentHoleIndex(nextHoleIndex);
      }
    }
  }, [scores]);

  useEffect(() => {
    // Obtenir la position de l'utilisateur pour la météo
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
        }
      );
    }
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadOngoingRounds();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    }
  }

  async function loadOngoingRounds() {
    if (!user) return;
    
    try {
      setLoadingOngoingRounds(true);
      const { data, error } = await supabase
        .from('rounds')
        .select(`
          *,
          course:golf_courses(*),
          holes:hole_scores(*)
        `)
        .eq('status', 'in_progress')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setOngoingRounds(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des parties en cours:', err);
    } finally {
      setLoadingOngoingRounds(false);
    }
  }

  async function loadCourses() {
    try {
      const { data, error } = await supabase
        .from('golf_courses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setCourses(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des parcours:', err);
      setError('Impossible de charger les parcours. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCoursePars(courseId: string) {
    try {
      const { data, error } = await supabase
        .from('course_pars')
        .select('*')
        .eq('course_id', courseId)
        .order('hole_number');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const newScores = [...scores];
        data.forEach(par => {
          newScores[par.hole_number - 1] = {
            ...newScores[par.hole_number - 1],
            par: par.par
          };
        });
        setScores(newScores);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des pars:', err);
    }
  }

  async function loadRound(roundId: string) {
    try {
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .select(`
          *,
          course:golf_courses(*),
          holes:hole_scores(*)
        `)
        .eq('id', roundId)
        .single();

      if (roundError) throw roundError;

      if (round) {
        setCurrentRound(round);
        setSelectedCourse(round.course);
        setRoundDate(round.date);
        setNotes(round.notes || '');

        const { data: coursePars, error: parsError } = await supabase
          .from('course_pars')
          .select('*')
          .eq('course_id', round.course.id)
          .order('hole_number');

        if (parsError) throw parsError;

        const newScores = Array(18).fill(null).map((_, index) => {
          const coursePar = coursePars?.find(p => p.hole_number === index + 1);
          return {
            hole: index + 1,
            par: coursePar?.par || 4,
            fairwayHit: false,
            greenInRegulation: false,
            putts: 0,
            score: 0
          };
        });

        round.holes?.forEach((hole: HoleScore) => {
          newScores[hole.hole_number - 1] = {
            hole: hole.hole_number,
            par: newScores[hole.hole_number - 1].par,
            fairwayHit: hole.fairway_hit,
            greenInRegulation: hole.green_in_regulation,
            putts: hole.putts,
            score: hole.score
          };
        });

        setScores(newScores);
        
        // Charger les données météo si disponibles
        if (round.weather_data) {
          setWeatherData(round.weather_data as WeatherData);
          setWeather({
            temperature: round.weather_data.temperature,
            windSpeed: round.weather_data.wind_speed,
            conditions: round.weather_data.conditions,
            icon: round.weather_data.icon_url
          });
        }
      }

      if (onRoundLoaded) {
        onRoundLoaded();
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la partie:', err);
      setError('Impossible de charger la partie. Veuillez réessayer plus tard.');
    }
  }

  async function saveHoleScore(holeIndex: number) {
    if (!selectedCourse || !user) return;

    try {
      setSavingHole(holeIndex);

      if (!currentRound) {
        const { data: round, error: roundError } = await supabase
          .from('rounds')
          .insert([{
            course_id: selectedCourse.id,
            user_id: user.id,
            date: roundDate,
            status: 'in_progress',
            notes: notes,
            weather_data: weatherData
          }])
          .select()
          .single();

        if (roundError) throw roundError;
        setCurrentRound(round);
      } else if (notes !== currentRound.notes) {
        // Mettre à jour les notes si elles ont changé
        const { error: updateError } = await supabase
          .from('rounds')
          .update({ notes: notes })
          .eq('id', currentRound.id);
          
        if (updateError) throw updateError;
      }

      const holeScore = scores[holeIndex];
      const { error: scoreError } = await supabase
        .from('hole_scores')
        .upsert([{
          round_id: currentRound?.id,
          hole_number: holeIndex + 1,
          par: holeScore.par,
          fairway_hit: holeScore.fairwayHit,
          green_in_regulation: holeScore.greenInRegulation,
          putts: holeScore.putts,
          score: holeScore.score
        }], {
          onConflict: 'round_id,hole_number'
        });

      if (scoreError) throw scoreError;

      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      message.textContent = `Score du trou ${holeIndex + 1} sauvegardé`;
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);

      if (holeIndex < 17) {
        setCurrentHoleIndex(holeIndex + 1);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du score:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de la sauvegarde';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setSavingHole(null);
    }
  }

  async function saveNotes() {
    if (!currentRound) return;

    try {
      setSavingNotes(true);
      const { error } = await supabase
        .from('rounds')
        .update({ notes: notes })
        .eq('id', currentRound.id);
        
      if (error) throw error;

      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Notes sauvegardées';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
      
      setShowNotes(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des notes:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de la sauvegarde des notes';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setSavingNotes(false);
    }
  }

  async function completeRound() {
    if (!currentRound || !confirm('Êtes-vous sûr de vouloir clôturer cette partie ? Vous ne pourrez plus modifier les scores après la clôture.')) {
      return;
    }

    try {
      setCompleting(true);

      const { error } = await supabase
        .rpc('complete_round', {
          p_round_id: currentRound.id
        });

      if (error) throw error;

      setCurrentRound(null);
      setSelectedCourse(null);
      setScores(Array(18).fill({
        hole: 0,
        par: 4,
        fairwayHit: false,
        greenInRegulation: false,
        putts: 0,
        score: 0
      }));
      setNotes('');

      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Partie clôturée avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);

      const event = new CustomEvent('switchTab', { 
        detail: { 
          tab: 'stats'
        }
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Erreur lors de la clôture de la partie:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de la clôture de la partie';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setCompleting(false);
    }
  }

  async function deleteRound() {
    if (!currentRound || !confirm('Êtes-vous sûr de vouloir supprimer cette partie ? Cette action est irréversible.')) {
      return;
    }

    try {
      setDeleting(true);

      const { error: scoresError } = await supabase
        .from('hole_scores')
        .delete()
        .eq('round_id', currentRound.id);

      if (scoresError) throw scoresError;

      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('id', currentRound.id);

      if (roundError) throw roundError;

      setCurrentRound(null);
      setSelectedCourse(null);
      setScores(Array(18).fill({
        hole: 0,
        par: 4,
        fairwayHit: false,
        greenInRegulation: false,
        putts: 0,
        score: 0
      }));
      setNotes('');

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
      setDeleting(false);
    }
  }

  const handleScoreChange = (index: number, field: string, value: any) => {
    const newScores = [...scores];
    newScores[index] = { ...newScores[index], [field]: value };

    // Calculer le GIR uniquement lorsque le par change, pas pour le score ou les putts
    if (field === 'par') {
      const score = newScores[index].score;
      const putts = newScores[index].putts;
      const par = value;
      
      if (score > 0 && putts > 0) {
        const strokesToGreen = score - putts;
        const girTarget = par - 2;
        newScores[index].greenInRegulation = strokesToGreen <= girTarget;
      }
    }

    setScores(newScores);
  };

  const calculateTotals = () => {
    return scores.reduce((acc, score) => ({
      totalScore: acc.totalScore + (score.score || 0),
      totalPar: acc.totalPar + score.par,
      totalPutts: acc.totalPutts + (score.putts || 0),
      fairwaysHit: acc.fairwaysHit + (score.fairwayHit ? 1 : 0),
      greensInRegulation: acc.greensInRegulation + (score.greenInRegulation ? 1 : 0)
    }), {
      totalScore: 0,
      totalPar: 0,
      totalPutts: 0,
      fairwaysHit: 0,
      greensInRegulation: 0
    });
  };

  const handleSelectOngoingRound = (round: Round) => {
    loadRound(round.id);
    setShowOngoingRounds(false);
  };

  const handleDeleteOngoingRound = async (round: Round) => {
    try {
      const { error: scoresError } = await supabase
        .from('hole_scores')
        .delete()
        .eq('round_id', round.id);

      if (scoresError) throw scoresError;

      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('id', round.id);

      if (roundError) throw roundError;

      // Mettre à jour la liste des parties en cours
      setOngoingRounds(ongoingRounds.filter(r => r.id !== round.id));

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
    }
  };

  const handleWeatherData = (data: WeatherData) => {
    setWeatherData(data);
    setWeather({
      temperature: data.temperature,
      windSpeed: data.wind_speed,
      conditions: data.conditions,
      icon: data.icon_url
    });
    setShowWeather(false);
  };

  const totals = calculateTotals();

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
            loadCourses();
          }}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Connexion requise</p>
          <p className="text-sm">Veuillez vous connecter pour enregistrer une partie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                Sélectionner un parcours
              </label>
              {ongoingRounds.length > 0 && (
                <button
                  onClick={() => setShowOngoingRounds(true)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Parties en cours ({ongoingRounds.length})
                </button>
              )}
            </div>
            <select
              id="course"
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = courses.find(c => c.id === e.target.value);
                setSelectedCourse(course || null);
                if (course) {
                  loadCoursePars(course.id);
                }
              }}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              disabled={!!currentRound}
            >
              <option value="">Sélectionner un parcours</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date de la partie
              </label>
            </div>
            <div className="relative">
              <input
                type="date"
                id="date"
                value={roundDate}
                onChange={(e) => setRoundDate(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 pl-10"
                disabled={!!currentRound}
              />
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2">
          <div>
            <button
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              {notes ? 'Voir/Modifier les notes' : 'Ajouter des notes'}
            </button>
          </div>
          <div className="flex gap-2">
            {!weatherData && !currentRound && (
              <button
                onClick={() => setShowWeather(true)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <CloudSun className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Ajouter météo</span>
              </button>
            )}
            {currentRound && (
              <>
                <button
                  onClick={completeRound}
                  disabled={completing}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                  title="Clôturer la partie"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clôturer la partie</span>
                </button>
                <button
                  onClick={deleteRound}
                  disabled={deleting}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  title="Supprimer la partie"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Supprimer la partie</span>
                </button>
              </>
            )}
            {selectedCourse && (
              <button
                onClick={() => setShowParSettings(true)}
                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Configurer les pars</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Affichage des informations météo si disponibles */}
      {weather && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
          {weather.icon && (
            <img src={weather.icon} alt="Conditions météo" className="w-10 h-10" />
          )}
          <div>
            <p className="font-medium">Conditions météo</p>
            <p className="text-sm text-gray-600">
              {weather.temperature && `${weather.temperature}°C, `}
              {weather.conditions}
              {weather.windSpeed && `, Vent: ${weather.windSpeed} km/h`}
            </p>
          </div>
        </div>
      )}

      {/* Alerte pour les trous incomplets */}
      {currentRound && scores.some(score => score.score === 0) && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-yellow-700">
            Certains trous n'ont pas encore de score. N'oubliez pas de compléter tous les trous avant de clôturer la partie.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-green-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Trou</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Par</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Fairway</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">GIR</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Putts</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Score</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scores.map((score, index) => (
              <tr key={index} className={`hover:bg-gray-50 ${index === currentHoleIndex ? 'bg-green-50' : ''}`}>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                <td className="px-3 py-2">
                  <div className="text-sm text-gray-900">{score.par}</div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={score.fairwayHit}
                    onChange={(e) => handleScoreChange(index, 'fairwayHit', e.target.checked)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={score.greenInRegulation}
                    onChange={(e) => handleScoreChange(index, 'greenInRegulation', e.target.checked)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={score.putts || ''}
                    onChange={(e) => handleScoreChange(index, 'putts', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-16 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={score.score || ''}
                    onChange={(e) => handleScoreChange(index, 'score', parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-16 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => saveHoleScore(index)}
                    disabled={!selectedCourse || savingHole === index || !score.score}
                    className="p-1 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-green-50 font-medium">
            <tr>
              <td className="px-3 py-2 text-sm text-green-800">Total</td>
              <td className="px-3 py-2 text-sm text-green-800">{totals.totalPar}</td>
              <td className="px-3 py-2 text-sm text-green-800">{totals.fairwaysHit}/18</td>
              <td className="px-3 py-2 text-sm text-green-800">{totals.greensInRegulation}/18</td>
              <td className="px-3 py-2 text-sm text-green-800">{totals.totalPutts}</td>
              <td className="px-3 py-2 text-sm text-green-800">{totals.totalScore}</td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <p>Score total: {totals.totalScore} ({totals.totalScore - totals.totalPar > 0 ? '+' : ''}{totals.totalScore - totals.totalPar})</p>
          <p>Fairways touchés: {((totals.fairwaysHit / 18) * 100).toFixed(1)}%</p>
          <p>Greens en régulation: {((totals.greensInRegulation / 18) * 100).toFixed(1)}%</p>
          <p>Moyenne de putts: {(totals.totalPutts / 18).toFixed(1)}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentHoleIndex(Math.max(0, currentHoleIndex - 1))}
            disabled={currentHoleIndex === 0}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentHoleIndex(Math.min(17, currentHoleIndex + 1))}
            disabled={currentHoleIndex === 17}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showParSettings && selectedCourse && (
        <CourseParSettings
          course={selectedCourse}
          onClose={() => setShowParSettings(false)}
          onSave={() => {
            loadCoursePars(selectedCourse.id);
          }}
        />
      )}

      {showOngoingRounds && (
        <OngoingRounds
          rounds={ongoingRounds}
          onSelect={handleSelectOngoingRound}
          onClose={() => setShowOngoingRounds(false)}
          onDelete={handleDeleteOngoingRound}
        />
      )}

      {showNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Notes de la partie</h3>
              <button
                onClick={() => setShowNotes(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-40 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              placeholder="Ajoutez vos notes ici (conditions météo, état du parcours, observations...)"
            ></textarea>
            <div className="flex justify-end mt-4">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
              >
                {savingNotes ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWeather && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Conditions météo</h3>
              <button
                onClick={() => setShowWeather(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Ajoutez les conditions météo actuelles à votre partie pour un meilleur suivi de vos performances.
            </p>
            <WeatherWidget 
              latitude={userLocation?.lat} 
              longitude={userLocation?.lon}
              onWeatherData={handleWeatherData}
            />
          </div>
        </div>
      )}
    </div>
  );
}