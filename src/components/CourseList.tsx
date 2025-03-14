import React, { useState, useEffect } from 'react';
import { Star, Plus, History, ChevronDown, ChevronRight, Edit2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { GolfCourse, FavoriteCourse, Round } from '../types';

interface GroupedCourses {
  [department: string]: GolfCourse[];
}

export default function CourseList() {
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', location: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [editingCourse, setEditingCourse] = useState<GolfCourse | null>(null);
  const [ongoingRound, setOngoingRound] = useState<Round | null>(null);
  const [loadingRound, setLoadingRound] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
      if (session?.user) {
        loadOngoingRound();
      } else {
        setOngoingRound(null);
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadCourses();
      if (user) {
        loadFavorites();
        loadOngoingRound();
      }
    }
  }, [user, authLoading]);

  // Ajouter un gestionnaire d'événements pour détecter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setNetworkError(false);
      // Recharger les données lorsque la connexion est rétablie
      if (!authLoading) {
        loadCourses();
        if (user) {
          loadFavorites();
          loadOngoingRound();
        }
      }
    };

    const handleOffline = () => {
      setNetworkError(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [authLoading, user]);

  async function checkUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur lors de la vérification de l\'utilisateur:', errorMessage);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadCourses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('golf_courses')
        .select('*')
        .order('name');
      
      if (error) {
        if (error.message === 'Failed to fetch') {
          setNetworkError(true);
          throw new Error('Problème de connexion réseau');
        } else {
          throw error;
        }
      }
      
      setCourses(data || []);
      setNetworkError(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur lors du chargement des parcours:', err);
      setError(errorMessage === 'Problème de connexion réseau' 
        ? 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.' 
        : 'Impossible de charger les parcours. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFavorites() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_courses')
        .select('*');
      
      if (error) {
        if (error.message === 'Failed to fetch') {
          setNetworkError(true);
          return; // Ne pas mettre à jour les favoris en cas d'erreur réseau
        } else {
          throw error;
        }
      }
      
      setFavorites(data || []);
      setNetworkError(false);
    } catch (err) {
      console.error('Erreur lors du chargement des favoris:', err);
      // Don't set error state here to avoid blocking the UI
      // Just keep the previous favorites if any
    }
  }

  async function loadOngoingRound() {
    if (!user) return;

    try {
      setLoadingRound(true);
      const { data, error } = await supabase
        .from('rounds')
        .select(`
          *,
          course:golf_courses(*),
          holes:hole_scores(*)
        `)
        .eq('status', 'in_progress')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .maybeSingle();
      
      if (error) {
        if (error.message === 'Failed to fetch') {
          setNetworkError(true);
          throw new Error('Problème de connexion réseau');
        } else {
          throw error;
        }
      }
      
      setOngoingRound(data);
      setNetworkError(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur lors du chargement de la partie en cours:', errorMessage);
      setOngoingRound(null);
    } finally {
      setLoadingRound(false);
    }
  }

  const handleContinueRound = () => {
    if (ongoingRound) {
      const event = new CustomEvent('switchTab', { 
        detail: { 
          tab: 'scorecard',
          roundId: ongoingRound.id
        }
      });
      window.dispatchEvent(event);
    }
  };

  const getSortedCourses = () => {
    return [...courses].sort((a, b) => {
      const aIsFavorite = favorites.some(f => f.course_id === a.id);
      const bIsFavorite = favorites.some(f => f.course_id === b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      return a.name.localeCompare(b.name);
    });
  };

  const getGroupedCourses = () => {
    const grouped: GroupedCourses = {};
    const sortedCourses = getSortedCourses();

    sortedCourses.forEach(course => {
      const match = course.location.match(/\((\d{2})/);
      const department = match ? match[1] : course.department || 'Autre';
      
      if (!grouped[department]) {
        grouped[department] = [];
      }
      grouped[department].push(course);
    });

    return Object.entries(grouped)
      .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
      .reduce((acc, [dept, courses]) => {
        acc[dept] = courses;
        return acc;
      }, {} as GroupedCourses);
  };

  const toggleDepartment = (department: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  async function toggleFavorite(courseId: string) {
    if (!user) {
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Veuillez vous connecter pour ajouter des favoris';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
      return;
    }

    try {
      const isFavorite = favorites.some(f => f.course_id === courseId);
      
      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_courses')
          .delete()
          .eq('course_id', courseId)
          .eq('user_id', user.id);
        
        if (error) {
          if (error.message === 'Failed to fetch') {
            setNetworkError(true);
            throw new Error('Problème de connexion réseau');
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase
          .from('favorite_courses')
          .insert([{ course_id: courseId, user_id: user.id }]);
        
        if (error) {
          if (error.message === 'Failed to fetch') {
            setNetworkError(true);
            throw new Error('Problème de connexion réseau');
          } else {
            throw error;
          }
        }
      }
      
      await loadFavorites();
    } catch (err) {
      console.error('Erreur lors de la gestion des favoris:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de la mise à jour des favoris';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Veuillez vous connecter pour ajouter un parcours';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
      return;
    }

    if (!newCourse.name || !newCourse.location) return;

    if (editingCourse) {
      const hasChanges = 
        newCourse.name !== editingCourse.name || 
        newCourse.location !== editingCourse.location;

      if (!hasChanges) {
        setIsModalOpen(false);
        setNewCourse({ name: '', location: '', department: '' });
        setEditingCourse(null);
        return;
      }
    }

    try {
      setSaving(true);

      const match = newCourse.location.match(/\((\d{2})/);
      const department = match ? match[1] : '33';

      const courseData = {
        ...newCourse,
        department
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('golf_courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) {
          if (error.message === 'Failed to fetch') {
            setNetworkError(true);
            throw new Error('Problème de connexion réseau');
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase
          .from('golf_courses')
          .insert([courseData]);

        if (error) {
          if (error.message === 'Failed to fetch') {
            setNetworkError(true);
            throw new Error('Problème de connexion réseau');
          } else {
            throw error;
          }
        }
      }

      setIsModalOpen(false);
      setNewCourse({ name: '', location: '', department: '' });
      setEditingCourse(null);
      await loadCourses();

      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      message.textContent = editingCourse ? 'Parcours modifié avec succès' : 'Parcours ajouté avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'ajout/modification du parcours:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de l\'enregistrement du parcours';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setSaving(false);
    }
  }

  const handleEdit = (course: GolfCourse) => {
    setEditingCourse(course);
    setNewCourse({
      name: course.name,
      location: course.location,
      department: course.department
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (editingCourse) {
      const hasChanges = 
        newCourse.name !== editingCourse.name || 
        newCourse.location !== editingCourse.location;

      if (hasChanges) {
        if (window.confirm('Voulez-vous vraiment annuler les modifications ?')) {
          setIsModalOpen(false);
          setEditingCourse(null);
          setNewCourse({ name: '', location: '', department: '' });
        }
      } else {
        setIsModalOpen(false);
        setEditingCourse(null);
        setNewCourse({ name: '', location: '', department: '' });
      }
    } else {
      if (newCourse.name || newCourse.location) {
        if (window.confirm('Voulez-vous vraiment annuler la création ?')) {
          setIsModalOpen(false);
          setEditingCourse(null);
          setNewCourse({ name: '', location: '', department: '' });
        }
      } else {
        setIsModalOpen(false);
        setEditingCourse(null);
        setNewCourse({ name: '', location: '', department: '' });
      }
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Chargement des parcours...</span>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Problème de connexion</p>
          <p className="text-sm">Impossible de se connecter au serveur. Vérifiez votre connexion Internet.</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setNetworkError(false);
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

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm">{error}</p>
        </div>
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

  const groupedCourses = getGroupedCourses();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 px-4 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Parcours de golf</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {!user ? (
            <div></div> // Removed the redundant login button
          ) : (
            <div className="flex flex-wrap gap-2">
              {loadingRound ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                  <span className="text-sm">Chargement...</span>
                </div>
              ) : ongoingRound && (
                <button
                  onClick={handleContinueRound}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                >
                  <History className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Continuer la partie
                </button>
              )}
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setNewCourse({ name: '', location: '', department: '' });
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Ajouter un parcours
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 sm:px-0">
        {Object.entries(groupedCourses).map(([department, departmentCourses]) => (
          <div key={department} className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => toggleDepartment(department)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-green-50 hover:bg-green-100 transition-colors"
            >
              <h3 className="text-lg sm:text-xl font-semibold text-green-800">
                Département {department}
                <span className="ml-2 text-xs sm:text-sm text-green-600">
                  ({departmentCourses.length} parcours)
                </span>
              </h3>
              {expandedDepartments.has(department) ? (
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              ) : (
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              )}
            </button>
            
            {expandedDepartments.has(department) && (
              <div className="grid grid-cols-1 gap-4 p-4">
                {departmentCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-semibold break-words">{course.name}</h3>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">{course.location}</p>
                      </div>
                      <div className="flex items-start space-x-1 sm:space-x-2 ml-2">
                        {user && (
                          <button
                            onClick={() => handleEdit(course)}
                            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            title="Modifier le parcours"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleFavorite(course.id)}
                          className={`p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors ${
                            favorites.some(f => f.course_id === course.id)
                              ? 'text-yellow-500'
                              : 'text-gray-400'
                          }`}
                        >
                          <Star className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold">
                {editingCourse ? 'Modifier le parcours' : 'Ajouter un nouveau parcours'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du parcours
                </label>
                <input
                  type="text"
                  id="name"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Localisation (avec code postal)
                </label>
                <input
                  type="text"
                  id="location"
                  value={newCourse.location}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                  placeholder="Ville (XXXXX)"
                  required
                />
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Exemple: Bordeaux (33000)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 text-sm sm:text-base"
                  disabled={saving || (editingCourse && !newCourse.name && !newCourse.location)}
                >
                  {saving ? 'Enregistrement...' : (editingCourse ? 'Modifier' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {courses.length === 0 && (
        <div className="text-center p-4 sm:p-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            <p className="font-medium text-sm sm:text-base">Aucun parcours trouvé</p>
            <p className="text-xs sm:text-sm">Cliquez sur le bouton "Ajouter un parcours" pour commencer.</p>
          </div>
        </div>
      )}
    </div>
  );
}