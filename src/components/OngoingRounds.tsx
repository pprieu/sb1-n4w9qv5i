import React from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Round } from '../types';

interface OngoingRoundsProps {
  rounds: Round[];
  onSelect: (round: Round) => void;
  onClose: () => void;
  onDelete: (round: Round) => void;
}

export default function OngoingRounds({ rounds, onSelect, onClose, onDelete }: OngoingRoundsProps) {
  const handleDelete = async (round: Round, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection de la partie lors du clic sur le bouton supprimer
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette partie ? Cette action est irréversible.')) {
      onDelete(round);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Parties en cours</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {rounds.length === 0 ? (
          <p className="text-center text-gray-600">Aucune partie en cours</p>
        ) : (
          <div className="space-y-4">
            {rounds.map((round) => (
              <div
                key={round.id}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:bg-green-50 hover:border-green-200 transition-colors cursor-pointer"
                onClick={() => onSelect(round)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{round.course?.name}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(round.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {round.holes?.length || 0} trous joués
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(round, e)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Supprimer la partie"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}