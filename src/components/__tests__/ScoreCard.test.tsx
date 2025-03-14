import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoreCard from '../ScoreCard';
import { supabase } from '../../supabaseClient';

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: '123' },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('ScoreCard', () => {
  it('affiche 18 trous', () => {
    render(<ScoreCard />);
    
    // Vérifie qu'il y a 18 lignes pour les trous (en excluant l'en-tête)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(19); // 18 trous + 1 en-tête
  });

  it('permet de modifier le score', async () => {
    render(<ScoreCard />);
    
    // Trouve le champ de score du premier trou
    const scoreInputs = screen.getAllByRole('spinbutton');
    const firstHoleScoreInput = scoreInputs[scoreInputs.length - 1]; // Le dernier input de la première ligne
    
    // Change le score à 4
    fireEvent.change(firstHoleScoreInput, { target: { value: '4' } });
    
    // Vérifie que la valeur a été mise à jour
    expect(firstHoleScoreInput).toHaveValue(4);
  });

  it('permet de cocher fairway et green', () => {
    render(<ScoreCard />);
    
    // Trouve les checkboxes du premier trou
    const checkboxes = screen.getAllByRole('checkbox');
    const [fairwayCheckbox, greenCheckbox] = [checkboxes[0], checkboxes[1]];
    
    // Coche les cases
    fireEvent.click(fairwayCheckbox);
    fireEvent.click(greenCheckbox);
    
    // Vérifie qu'elles sont cochées
    expect(fairwayCheckbox).toBeChecked();
    expect(greenCheckbox).toBeChecked();
  });

  it('désactive le bouton de sauvegarde quand aucun parcours n\'est sélectionné', () => {
    render(<ScoreCard />);
    
    const saveButton = screen.getByText('Sauvegarder la partie');
    expect(saveButton).toBeDisabled();
  });
});