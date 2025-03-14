import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { GroupPerformance } from '../types';

interface GroupPerformanceComparisonProps {
  performances: GroupPerformance[];
}

export default function GroupPerformanceComparison({ performances }: GroupPerformanceComparisonProps) {
  const [chartType, setChartType] = useState<'score' | 'fairway' | 'gir' | 'putts'>('score');
  
  // Filtrer les performances sans données
  const validPerformances = performances.filter(p => p.rounds_count && p.rounds_count > 0);
  
  // Préparer les données pour les graphiques
  const prepareChartData = () => {
    switch (chartType) {
      case 'score':
        return validPerformances.map(p => ({
          name: p.user_email?.split('@')[0] || 'Anonyme',
          'Score moyen': p.avg_score?.toFixed(1),
          'Par rapport au par': p.avg_over_par?.toFixed(1),
          handicap: p.user_profile?.handicap,
          parties: p.rounds_count
        }));
      case 'fairway':
        return validPerformances.map(p => ({
          name: p.user_email?.split('@')[0] || 'Anonyme',
          'Fairways touchés (%)': p.fairway_percentage?.toFixed(1),
          handicap: p.user_profile?.handicap,
          parties: p.rounds_count
        }));
      case 'gir':
        return validPerformances.map(p => ({
          name: p.user_email?.split('@')[0] || 'Anonyme',
          'Greens en régulation (%)': p.gir_percentage?.toFixed(1),
          handicap: p.user_profile?.handicap,
          parties: p.rounds_count
        }));
      case 'putts':
        return validPerformances.map(p => ({
          name: p.user_email?.split('@')[0] || 'Anonyme',
          'Putts par trou': p.avg_putts?.toFixed(1),
          handicap: p.user_profile?.handicap,
          parties: p.rounds_count
        }));
      default:
        return [];
    }
  };
  
  const chartData = prepareChartData();
  
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
        {payload[0]?.payload?.handicap !== undefined && (
          <p className="text-sm text-gray-600 mt-1">
            Handicap: {payload[0].payload.handicap}
          </p>
        )}
        <p className="text-sm text-gray-600">
          Parties jouées: {payload[0]?.payload?.parties || 0}
        </p>
      </div>
    );
  };
  
  if (validPerformances.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-2">Aucune donnée de performance disponible</p>
        <p className="text-gray-500 text-sm">Les membres du groupe n'ont pas encore enregistré de parties terminées.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setChartType('score')}
          className={`px-4 py-2 rounded-lg ${
            chartType === 'score' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Score
        </button>
        <button
          onClick={() => setChartType('fairway')}
          className={`px-4 py-2 rounded-lg ${
            chartType === 'fairway' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Fairways
        </button>
        <button
          onClick={() => setChartType('gir')}
          className={`px-4 py-2 rounded-lg ${
            chartType === 'gir' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Greens (GIR)
        </button>
        <button
          onClick={() => setChartType('putts')}
          className={`px-4 py-2 rounded-lg ${
            chartType === 'putts' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Putts
        </button>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={70} 
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartType === 'score' && (
              <>
                <Bar dataKey="Score moyen" fill="#8884d8" />
                <Bar dataKey="Par rapport au par" fill="#82ca9d" />
              </>
            )}
            {chartType === 'fairway' && (
              <Bar dataKey="Fairways touchés (%)" fill="#F59E0B" />
            )}
            {chartType === 'gir' && (
              <Bar dataKey="Greens en régulation (%)" fill="#EF4444" />
            )}
            {chartType === 'putts' && (
              <Bar dataKey="Putts par trou" fill="#10B981" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-3">Tableau comparatif</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joueur</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handicap</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score moyen</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Par</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fairways</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GIR</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Putts/trou</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validPerformances.map((performance, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {performance.user_email?.split('@')[0] || 'Anonyme'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.user_profile?.handicap || '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.avg_score?.toFixed(1) || '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.avg_over_par !== undefined ? (
                      performance.avg_over_par > 0 
                        ? `+${performance.avg_over_par.toFixed(1)}` 
                        : performance.avg_over_par.toFixed(1)
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.fairway_percentage?.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.gir_percentage?.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.avg_putts?.toFixed(1) || '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {performance.rounds_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}