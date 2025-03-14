import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CourseList from '../CourseList';
import { supabase } from '../../supabaseClient';

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [
            {
              id: '1',
              name: 'Golf du Médoc Resort',
              location: 'Le Pian-Médoc',
              created_at: '2024-02-02T10:30:54Z'
            },
            {
              id: '2',
              name: 'Golf Bordelais',
              location: 'Bordeaux',
              created_at: '2024-02-02T10:30:54Z'
            }
          ],
          error: null
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

describe('CourseList', () => {
  it('affiche la liste des parcours de golf', async () => {
    render(<CourseList />);
    
    // Vérifie que le message de chargement est affiché
    expect(screen.getByText('Chargement des parcours...')).toBeInTheDocument();
    
    // Vérifie que les parcours sont affichés
    const medocGolf = await screen.findByText('Golf du Médoc Resort');
    const bordelaisGolf = await screen.findByText('Golf Bordelais');
    
    expect(medocGolf).toBeInTheDocument();
    expect(bordelaisGolf).toBeInTheDocument();
  });

  it('permet de basculer les favoris', async () => {
    render(<CourseList />);
    
    // Attend que les parcours soient chargés
    await screen.findByText('Golf du Médoc Resort');
    
    // Trouve tous les boutons favoris
    const favoriteButtons = screen.getAllByRole('button');
    
    // Clique sur le premier bouton favori
    fireEvent.click(favoriteButtons[0]);
    
    // Vérifie que la fonction de Supabase a été appelée
    expect(supabase.from).toHaveBeenCalledWith('favorite_courses');
  });
});