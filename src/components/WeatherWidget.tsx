import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Wind } from 'lucide-react';
import type { WeatherData } from '../types';

interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
  onWeatherData?: (data: WeatherData) => void;
}

export default function WeatherWidget({ latitude, longitude, onWeatherData }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude && longitude) {
      fetchWeather(latitude, longitude);
    } else {
      getUserLocation();
    }
  }, [latitude, longitude]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.error('Erreur de géolocalisation:', err);
          setError('Impossible d\'obtenir votre position. Veuillez l\'autoriser dans votre navigateur.');
          setLoading(false);
        }
      );
    } else {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      
      // Utilisation de l'API OpenWeatherMap (version gratuite)
      // Note: Dans une application réelle, cette clé devrait être stockée côté serveur
      const apiKey = '9de243494c0b295cca9337e1e96b00e2'; // Clé gratuite pour démo
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données météo');
      }
      
      const data = await response.json();
      
      const weatherData: WeatherData = {
        temperature: Math.round(data.main.temp),
        wind_speed: Math.round(data.wind.speed * 3.6), // Conversion de m/s en km/h
        conditions: data.weather[0].description,
        icon_url: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
      };
      
      setWeather(weatherData);
      
      if (onWeatherData) {
        onWeatherData(weatherData);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des données météo:', err);
      setError('Impossible de récupérer les données météo');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg animate-pulse">
        <Cloud className="w-5 h-5 text-blue-400 mr-2" />
        <span className="text-blue-500">Chargement de la météo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-700">{error}</p>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  // Déterminer l'icône en fonction des conditions
  const getWeatherIcon = () => {
    const condition = weather.conditions.toLowerCase();
    if (condition.includes('pluie')) {
      return <CloudRain className="w-6 h-6 text-blue-500" />;
    } else if (condition.includes('nuage')) {
      return <Cloud className="w-6 h-6 text-gray-500" />;
    } else if (condition.includes('soleil') || condition.includes('clair')) {
      return <Sun className="w-6 h-6 text-yellow-500" />;
    } else {
      return <Cloud className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
      {weather.icon_url ? (
        <img src={weather.icon_url} alt="Conditions météo" className="w-10 h-10" />
      ) : (
        getWeatherIcon()
      )}
      <div>
        <p className="font-medium">Conditions météo</p>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{weather.temperature}°C</span>
          <span className="text-gray-400">|</span>
          <span>{weather.conditions}</span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center">
            <Wind className="w-3 h-3 mr-1" />
            {weather.wind_speed} km/h
          </span>
        </div>
      </div>
    </div>
  );
}