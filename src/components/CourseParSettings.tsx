import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { GolfCourse } from '../types';

interface CourseParSettingsProps {
  course: GolfCourse;
  onClose: () => void;
  onSave: () => void;
}

export default function CourseParSettings({ course, onClose, onSave }: CourseParSettingsProps) {
  const [pars, setPars] = useState<number[]>(Array(18).fill(4));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPars();
  }, [course.id]);

  async function loadPars() {
    try {
      const { data, error } = await supabase
        .from('course_pars')
        .select('*')
        .eq('course_id', course.id)
        .order('hole_number');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const loadedPars = Array(18).fill(4);
        data.forEach(par => {
          loadedPars[par.hole_number - 1] = par.par;
        });
        setPars(loadedPars);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des pars:', err);
    } finally {
      setLoading(false);
    }
  }

  async function savePars() {
    try {
      setSaving(true);

      // Préparer les données pour l'insertion/mise à jour
      const parsToSave = pars.map((par, index) => ({
        course_id: course.id,
        hole_number: index + 1,
        par: par
      }));

      // Supprimer les anciens pars
      const { error: deleteError } = await supabase
        .from('course_pars')
        .delete()
        .eq('course_id', course.id);

      if (deleteError) throw deleteError;

      // Insérer les nouveaux pars
      const { error: insertError } = await supabase
        .from('course_pars')
        .insert(parsToSave);

      if (insertError) throw insertError;

      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Configuration des pars sauvegardée';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);

      onSave();
      onClose();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des pars:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      message.textContent = 'Erreur lors de la sauvegarde';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setSaving(false);
    }
  }

  const handleParChange = (index: number, value: number) => {
    const newPars = [...pars];
    newPars[index] = value;
    setPars(newPars);
  };

  const totalPar = pars.reduce((sum, par) => sum + par, 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Configuration des pars - {course.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          {pars.map((par, index) => (
            <div key={index} className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trou {index + 1}
              </label>
              <select
                value={par}
                onChange={(e) => handleParChange(index, parseInt(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              >
                {[3, 4, 5].map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>Par total: {totalPar}</p>
            <p>Moyenne: {(totalPar / 18).toFixed(1)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={savePars}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}