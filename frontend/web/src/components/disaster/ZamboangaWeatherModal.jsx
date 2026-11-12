import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  CloudDrizzle,
  CloudSun,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  ShieldAlert,
  History,
  Clock,
  Calendar,
  Radar,
  Compass,
  Gauge,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';

const ZAMBOANGA_COORDS = { lat: 6.9126, lon: 122.0729 };

function mapWmoCodeClient(code) {
  const c = Number(code ?? 1);
  if (c === 0) return { condition: 'Clear', description: 'Clear sky' };
  if (c === 1) return { condition: 'Clear', description: 'Mainly clear' };
  if (c === 2) return { condition: 'Partly Cloudy', description: 'Partly cloudy' };
  if (c === 3) return { condition: 'Cloudy', description: 'Overcast clouds' };
  if (c === 45 || c === 48) return { condition: 'Fog', description: 'Haze / Fog' };
  if ([51, 53, 55, 56, 57].includes(c)) return { condition: 'Drizzle', description: 'Light to moderate drizzle' };
  if ([61, 80].includes(c)) return { condition: 'Rain', description: 'Slight rain showers' };
  if ([63, 81].includes(c)) return { condition: 'Rain', description: 'Moderate rain showers' };
  if ([65, 66, 67, 82].includes(c)) return { condition: 'Heavy Rain', description: 'Heavy rain downpour' };
  if ([95, 96, 99].includes(c)) return { condition: 'Thunderstorm', description: 'Thunderstorm' };
  return { condition: 'Partly Cloudy', description: 'Scattered clouds' };
}

function getWeatherIcon(condition, size = 20, className = '') {
  const cond = (condition || '').toLowerCase();
  if (cond.includes('thunder')) {
    return <CloudLightning size={size} className={`text-amber-500 dark:text-amber-400 ${className}`} />;
  }
  if (cond.includes('heavy rain')) {
    return <CloudRain size={size} className={`text-sky-600 dark:text-sky-400 ${className}`} />;
  }
  if (cond.includes('rain')) {
    return <CloudRain size={size} className={`text-sky-600 dark:text-sky-400 ${className}`} />;
  }
  if (cond.includes('drizzle')) {
    return <CloudDrizzle size={size} className={`text-cyan-600 dark:text-cyan-400 ${className}`} />;
  }
  if (cond.includes('partly')) {
    return <CloudSun size={size} className={`text-amber-500 dark:text-amber-300 ${className}`} />;
  }
  if (cond.includes('cloud') || cond.includes('fog')) {
    return <Cloud size={size} className={`text-slate-500 dark:text-slate-300 ${className}`} />;
  }
  return <Sun size={size} className={`text-amber-500 dark:text-amber-400 ${className}`} />;
}

async function fetchDirectOpenMeteoFallback() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(ZAMBOANGA_COORDS.lat));
  url.searchParams.set('longitude', String(ZAMBOANGA_COORDS.lon));
  url.searchParams.set('timezone', 'Asia/Manila');
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index'
  );
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m,uv_index'
  );
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset'
  );

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Open-Meteo request failed');
  const payload = await res.json();

  const currentRaw = payload.current || {};
  const currentCode = Number(currentRaw.weather_code ?? 1);
  const currentMapped = mapWmoCodeClient(currentCode);
  const currentRain = Math.max(
    Number(currentRaw.rain ?? 0),
    Number(currentRaw.precipitation ?? 0),
    Number(currentRaw.showers ?? 0)
  );
  const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const isRaining = currentRain > 0 || rainCodes.includes(currentCode);

  const hourly = payload.hourly || {};
  const times = hourly.time || [];
  const nowMs = Date.now();
  let currentIdx = 24;
  let minDiff = Infinity;
  times.forEach((tStr, idx) => {
    const diff = Math.abs(new Date(tStr).getTime() - nowMs);
    if (diff < minDiff) {
      minDiff = diff;
      currentIdx = idx;
    }
  });

  const buildPoint = (idx, isNow) => {
    const dt = new Date(times[idx]);
    const code = Number(hourly.weather_code?.[idx] ?? 1);
    const mapped = mapWmoCodeClient(code);
    const rainVal = Math.max(Number(hourly.rain?.[idx] ?? 0), Number(hourly.precipitation?.[idx] ?? 0));
    const popVal = Number(hourly.precipitation_probability?.[idx] ?? (rainVal > 0 ? 75 : 15));
    const hourNum = dt.getHours();
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;

    return {
      time: times[idx],
      hour_label: isNow ? 'Now' : `${hour12} ${ampm}`,
      day_label: idx < currentIdx ? 'Past 24h' : 'Forecast',
      temp_c: Math.round(Number(hourly.temperature_2m?.[idx] ?? 28) * 10) / 10,
      feels_like_c: Math.round(Number(hourly.apparent_temperature?.[idx] ?? 31) * 10) / 10,
      humidity: Number(hourly.relative_humidity_2m?.[idx] ?? 75),
      rain_mm: Math.round(rainVal * 100) / 100,
      pop: Math.min(100, Math.max(0, popVal)),
      wind_kph: Math.round(Number(hourly.wind_speed_10m?.[idx] ?? 10) * 10) / 10,
      uv_index: Math.round(Number(hourly.uv_index?.[idx] ?? 0) * 10) / 10,
      weather_code: code,
      condition: mapped.condition,
      description: mapped.description,
      is_raining: rainVal > 0.05 || rainCodes.includes(code),
      is_now: isNow,
    };
  };

  const hourly_history = [];
  for (let i = Math.max(0, currentIdx - 23); i <= currentIdx && i < times.length; i++) {
    hourly_history.push(buildPoint(i, i === currentIdx));
  }

  const hourly_forecast = [];
  for (let i = currentIdx; i <= Math.min(times.length - 1, currentIdx + 23); i++) {
    hourly_forecast.push(buildPoint(i, i === currentIdx));
  }

  const daily = payload.daily || {};
  const dailyDates = daily.time || [];
  const daily_forecast = dailyDates.slice(1, 8).map((dStr, idx) => {
    const dt = new Date(dStr);
    const code = Number(daily.weather_code?.[idx + 1] ?? 1);
    const mapped = mapWmoCodeClient(code);
    const rainSum = Math.max(Number(daily.precipitation_sum?.[idx + 1] ?? 0), Number(daily.rain_sum?.[idx + 1] ?? 0));
    return {
      date: dStr,
      day_name: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      short_day: idx === 0 ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short' }),
      weather_code: code,
      condition: mapped.condition,
      description: mapped.description,
      temp_max_c: Math.round(Number(daily.temperature_2m_max?.[idx + 1] ?? 32) * 10) / 10,
      temp_min_c: Math.round(Number(daily.temperature_2m_min?.[idx + 1] ?? 25) * 10) / 10,
      pop_max: Number(daily.precipitation_probability_max?.[idx + 1] ?? 20),
      rain_sum_mm: Math.round(rainSum * 10) / 10,
      wind_max_kph: Math.round(Number(daily.wind_speed_10m_max?.[idx + 1] ?? 15) * 10) / 10,
      uv_max: Math.round(Number(daily.uv_index_max?.[idx + 1] ?? 7) * 10) / 10,
    };
  });

  const pastRainTotal = hourly_history.reduce((acc, h) => acc + (h.rain_mm || 0), 0);
  const pastPeakRain = hourly_history.reduce((max, h) => Math.max(max, h.rain_mm || 0), 0);
  const pastRainyHours = hourly_history.filter((h) => h.rain_mm >= 0.1 || h.is_raining).length;
  const nextRainTotal = hourly_forecast.reduce((acc, h) => acc + (h.rain_mm || 0), 0);
  const nextMaxPop = hourly_forecast.reduce((max, h) => Math.max(max, h.pop || 0), 0);
  const nextRainSlot = hourly_forecast.slice(1).find((h) => h.pop >= 50 || h.rain_mm >= 0.3 || h.is_raining) || null;

  return {
    source: 'open-meteo-direct',
    city: 'Zamboanga City',
    current: {
      temp_c: Math.round(Number(currentRaw.temperature_2m ?? 29) * 10) / 10,
      feels_like_c: Math.round(Number(currentRaw.apparent_temperature ?? 32) * 10) / 10,
      humidity: Number(currentRaw.relative_humidity_2m ?? 75),
      rain_mm: Math.round(currentRain * 10) / 10,
      wind_kph: Math.round(Number(currentRaw.wind_speed_10m ?? 12) * 10) / 10,
      wind_dir: 'NE',
      pressure_hpa: Math.round(Number(currentRaw.pressure_msl ?? 1010)),
      cloud_cover: Number(currentRaw.cloud_cover ?? 40),
      uv_index: Math.round(Number(currentRaw.uv_index ?? 5) * 10) / 10,
      condition: isRaining && currentMapped.condition === 'Clear' ? 'Rain' : currentMapped.condition,
      description: currentMapped.description,
      is_raining: isRaining,
    },
    hourly_history,
    hourly_forecast,
    daily_forecast,
    summary: {
      past_24h_rain_total_mm: Math.round(pastRainTotal * 10) / 10,
      past_24h_peak_rain_mm: Math.round(pastPeakRain * 10) / 10,
      past_24h_rainy_hours: pastRainyHours,
      next_24h_rain_total_mm: Math.round(nextRainTotal * 10) / 10,
      next_24h_max_pop: nextMaxPop,
      next_rain_expected: nextRainSlot,
      headline: isRaining
        ? `Active precipitation in Zamboanga City (${currentMapped.description}). ${pastRainTotal.toFixed(1)} mm recorded in the past 24h; ${nextRainTotal.toFixed(1)} mm projected over the next 24h.`
        : nextRainSlot
          ? `${nextRainSlot.description} expected around ${nextRainSlot.hour_label} (${nextRainSlot.pop}% chance). Projected 24h rainfall: ${nextRainTotal.toFixed(1)} mm.`
          : `Stable weather outlook across Zamboanga City. Low precipitation probability (${nextMaxPop}% max) over the next 24 hours.`,
    },
  };
}

export default function ZamboangaWeatherModal({
  isOpen,
  onClose,
  liveTelemetry,
  showRadarOverlay,
  onToggleRadarOverlay,
  onOpenProactiveEoc,
}) {
  const [timelineMode, setTimelineMode] = useState('forecast'); // 'forecast' | 'history'
  const [metricTab, setMetricTab] = useState('temperature'); // 'temperature' | 'precipitation' | 'wind'

  const {
    data: forecastData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['weather/forecast'],
    queryFn: async () => {
      try {
        const res = await api.get('/weather/forecast');
        if (res.data?.data?.hourly_forecast?.length) {
          return res.data.data;
        }
      } catch {
        // Fallback to direct Open-Meteo browser fetch if backend route is unavailable
      }
      return fetchDirectOpenMeteoFallback();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const current = useMemo(() => {
    const base = forecastData?.current || {};
    return {
      temp_c: base.temp_c ?? liveTelemetry?.temp_c ?? 29,
      feels_like_c: base.feels_like_c ?? (liveTelemetry?.temp_c ? liveTelemetry.temp_c + 3 : 32),
      humidity: base.humidity ?? liveTelemetry?.humidity ?? 75,
      rain_mm: base.rain_mm ?? liveTelemetry?.rain_mm ?? 0,
      wind_kph: base.wind_kph ?? 12,
      wind_dir: base.wind_dir ?? 'NE',
      pressure_hpa: base.pressure_hpa ?? 1010,
      uv_index: base.uv_index ?? 5,
      condition: base.condition ?? liveTelemetry?.condition ?? (liveTelemetry?.is_raining ? 'Rain' : 'Partly Cloudy'),
      description: base.description ?? liveTelemetry?.description ?? 'Scattered clouds',
      is_raining: base.is_raining ?? liveTelemetry?.is_raining ?? false,
    };
  }, [forecastData, liveTelemetry]);

  const eoc = useMemo(() => {
    const base = forecastData?.eoc_telemetry || {};
    return {
      continuous_rain_duration_minutes:
        base.continuous_rain_duration_minutes ?? liveTelemetry?.continuous_rain_duration_minutes ?? 0,
      flood_trigger_threshold_minutes:
        base.flood_trigger_threshold_minutes ?? liveTelemetry?.flood_trigger_threshold_minutes ?? 45,
      fixed_flood_spots_triggered:
        base.fixed_flood_spots_triggered ?? liveTelemetry?.fixed_flood_spots_triggered ?? false,
      active_fixed_flood_spots_count:
        base.active_fixed_flood_spots_count ?? liveTelemetry?.active_fixed_flood_spots_count ?? 0,
    };
  }, [forecastData, liveTelemetry]);

  const activeSeries = useMemo(() => {
    if (timelineMode === 'history') {
      return forecastData?.hourly_history || [];
    }
    return forecastData?.hourly_forecast || [];
  }, [forecastData, timelineMode]);

  const dailySeries = useMemo(() => forecastData?.daily_forecast || [], [forecastData]);
  const summary = forecastData?.summary || {};

  // Compute SVG chart coordinates for the active 24h series
  const chartData = useMemo(() => {
    if (!activeSeries.length) return null;
    const width = Math.max(760, activeSeries.length * 56);
    const height = 110;
    const padTop = 26;
    const padBottom = 18;
    const usableH = height - padTop - padBottom;

    const values = activeSeries.map((pt) => {
      if (metricTab === 'precipitation') return Number(pt.pop ?? 0);
      if (metricTab === 'wind') return Number(pt.wind_kph ?? 0);
      return Number(pt.temp_c ?? 28);
    });

    const minVal = metricTab === 'precipitation' ? 0 : Math.min(...values) - 1;
    const maxVal = metricTab === 'precipitation' ? 100 : Math.max(...values) + 1;
    const range = Math.max(1, maxVal - minVal);

    const points = activeSeries.map((pt, idx) => {
      const x = idx * 56 + 28;
      const val = values[idx];
      const y = padTop + usableH - ((val - minVal) / range) * usableH;
      return { x, y, val, pt };
    });

    const linePath = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

    return { width, height, points, linePath, areaPath };
  }, [activeSeries, metricTab]);

  // Global min/max for 7-day temperature bars
  const weeklyTempBounds = useMemo(() => {
    if (!dailySeries.length) return { min: 24, max: 33 };
    const mins = dailySeries.map((d) => Number(d.temp_min_c ?? 24));
    const maxs = dailySeries.map((d) => Number(d.temp_max_c ?? 33));
    return {
      min: Math.min(...mins),
      max: Math.max(...maxs),
    };
  }, [dailySeries]);

  if (!isOpen) return null;

  const isFloodThresholdReached =
    current.is_raining && eoc.continuous_rain_duration_minutes >= eoc.flood_trigger_threshold_minutes;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zamboanga-weather-modal-title"
    >
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-600 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30">
              <CloudRain size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="zamboanga-weather-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Zamboanga City Weather &amp; Flood Telemetry
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30">
                  {forecastData?.source === 'openweathermap' ? 'OpenWeather + Open-Meteo' : 'Open-Meteo Live'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                24-Hour Recorded History • Hourly Prediction • 7-Day Tactical Outlook (6.9126°N, 122.0729°E)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Map Doppler Radar Layer */}
            {typeof onToggleRadarOverlay === 'function' && (
              <button
                type="button"
                onClick={onToggleRadarOverlay}
                aria-label="Toggle live Doppler weather radar on map"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  showRadarOverlay
                    ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 shadow-xs'
                }`}
              >
                <Radar size={14} className={showRadarOverlay ? 'animate-spin' : ''} />
                <span>{showRadarOverlay ? 'Map Radar: ON' : 'Map Radar: OFF'}</span>
              </button>
            )}

            {/* Switch to Proactive EOC Modal */}
            {typeof onOpenProactiveEoc === 'function' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProactiveEoc();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-600/20 dark:hover:bg-rose-600/30 dark:text-rose-300 dark:border-rose-500/40 transition cursor-pointer"
              >
                <ShieldAlert size={14} />
                <span>Proactive EOC</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh weather data"
              title="Refresh Forecast"
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={isFetching ? 'animate-spin text-sky-600 dark:text-sky-400' : ''} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close weather modal"
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-transparent">
          {/* 1. Google Weather-Style Hero Card + DRRM Rain Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Current Weather Overview */}
            <div className="lg:col-span-7 bg-gradient-to-br from-white via-sky-50/40 to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-xs dark:shadow-inner">
                    {getWeatherIcon(current.condition, 44)}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                        {Math.round(current.temp_c)}°C
                      </span>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        Feels like {Math.round(current.feels_like_c)}°C
                      </span>
                    </div>
                    <p className="text-base font-extrabold text-sky-600 dark:text-sky-300 mt-0.5 capitalize">
                      {current.description || current.condition}
                    </p>
                  </div>
                </div>

                {/* Quick Current Telemetry Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs min-w-[210px]">
                  <div className="bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs">
                    <Droplets size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Precipitation</div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{current.rain_mm} mm/h</div>
                    </div>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs">
                    <Thermometer size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Humidity</div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{current.humidity}%</div>
                    </div>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs">
                    <Wind size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Wind</div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {current.wind_kph} km/h {current.wind_dir}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs">
                    <Gauge size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">UV / Pressure</div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        UV {current.uv_index} • {current.pressure_hpa} hPa
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Natural-Language Forecast Summary Banner */}
              <div className="bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-start gap-2.5 shadow-xs">
                <Compass size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {summary.headline ||
                    'Monitoring real-time atmospheric conditions and hourly rainfall projections across Zamboanga City.'}
                </p>
              </div>
            </div>

            {/* Right: 24h Past vs Next Summary & CDRRMO Flood Trigger Telemetry */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  24-Hour Rainfall Comparison
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isFloodThresholdReached
                      ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/90 dark:border-rose-500 dark:text-rose-200'
                      : current.is_raining
                        ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/90 dark:border-amber-500 dark:text-amber-200'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/80 dark:border-emerald-500/40 dark:text-emerald-300'
                  }`}
                >
                  {isFloodThresholdReached ? (
                    <>
                      <AlertTriangle size={12} /> Flood Trigger Reached
                    </>
                  ) : current.is_raining ? (
                    <>
                      <CloudRain size={12} /> Active Rain ({eoc.continuous_rain_duration_minutes}m)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} /> Drainage Normal
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Past 24 Hours Box */}
                <button
                  type="button"
                  onClick={() => setTimelineMode('history')}
                  className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                    timelineMode === 'history'
                      ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-400/30 dark:bg-sky-950/50 dark:border-sky-500/60 dark:ring-sky-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300 dark:bg-slate-950/70 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <History size={12} className="text-sky-600 dark:text-sky-400" /> Past 24 Hours
                    </span>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400">History</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {summary.past_24h_rain_total_mm ?? 0} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">mm</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {summary.past_24h_rainy_hours ?? 0} hrs w/ rain • Peak {summary.past_24h_peak_rain_mm ?? 0} mm/h
                  </div>
                </button>

                {/* Next 24 Hours Box */}
                <button
                  type="button"
                  onClick={() => setTimelineMode('forecast')}
                  className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                    timelineMode === 'forecast'
                      ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-400/30 dark:bg-sky-950/50 dark:border-sky-500/60 dark:ring-sky-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300 dark:bg-slate-950/70 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-amber-500 dark:text-amber-400" /> Next 24 Hours
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">Prediction</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {summary.next_24h_rain_total_mm ?? 0} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">mm</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Max Chance: <strong className="text-slate-700 dark:text-slate-200">{summary.next_24h_max_pop ?? 0}%</strong>
                    {summary.next_rain_expected ? ` • @ ${summary.next_rain_expected.hour_label}` : ' • Clear'}
                  </div>
                </button>
              </div>

              {/* Continuous Rain Auto-EOC Progress Bar */}
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300">CDRRMO Continuous Rain Threshold</span>
                  <span className="font-mono font-extrabold text-sky-600 dark:text-sky-300">
                    {eoc.continuous_rain_duration_minutes}m / {eoc.flood_trigger_threshold_minutes}m
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFloodThresholdReached
                        ? 'bg-rose-500'
                        : current.is_raining
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (eoc.continuous_rain_duration_minutes /
                            Math.max(1, eoc.flood_trigger_threshold_minutes)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Google Weather Interactive Hourly Timeline (Forecast vs History) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Mode Switcher: Next 24 Hours (Prediction) vs Past 24 Hours (History) */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTimelineMode('forecast')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    timelineMode === 'forecast'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Clock size={14} />
                  <span>Next 24 Hours (Prediction)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineMode('history')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    timelineMode === 'history'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <History size={14} />
                  <span>Past 24 Hours (History)</span>
                </button>
              </div>

              {/* Metric Tabs: Temperature | Precipitation | Wind */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMetricTab('temperature')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    metricTab === 'temperature'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Thermometer size={13} />
                  <span>Temperature</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetricTab('precipitation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    metricTab === 'precipitation'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Droplets size={13} />
                  <span>Precipitation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetricTab('wind')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    metricTab === 'wind'
                      ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Wind size={13} />
                  <span>Wind</span>
                </button>
              </div>
            </div>

            {/* Hourly Curve + Cards Strip */}
            {isLoading ? (
              <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 gap-2">
                <RefreshCw size={16} className="animate-spin text-sky-600 dark:text-sky-400" />
                <span>Loading Zamboanga City hourly weather timeline...</span>
              </div>
            ) : chartData ? (
              <div className="overflow-x-auto pb-2">
                <div style={{ width: `${chartData.width}px` }} className="space-y-2">
                  {/* SVG Trend Graph */}
                  <svg width={chartData.width} height={chartData.height} className="overflow-visible">
                    <defs>
                      <linearGradient id="weatherMetricGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={
                            metricTab === 'precipitation'
                              ? '#0284c7'
                              : metricTab === 'wind'
                                ? '#0891b2'
                                : '#d97706'
                          }
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            metricTab === 'precipitation'
                              ? '#0284c7'
                              : metricTab === 'wind'
                                ? '#0891b2'
                                : '#d97706'
                          }
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    <path d={chartData.areaPath} fill="url(#weatherMetricGrad)" />
                    <path
                      d={chartData.linePath}
                      fill="none"
                      stroke={
                        metricTab === 'precipitation'
                          ? '#0284c7'
                          : metricTab === 'wind'
                            ? '#0891b2'
                            : '#d97706'
                      }
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {chartData.points.map((p, idx) => {
                      const label =
                        metricTab === 'precipitation'
                          ? `${Math.round(p.val)}%`
                          : metricTab === 'wind'
                            ? `${Math.round(p.val)}`
                            : `${Math.round(p.val)}°`;
                      return (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={p.pt.is_now ? 4.5 : 3}
                            className={
                              p.pt.is_now
                                ? 'fill-sky-600 dark:fill-white stroke-2 stroke-white dark:stroke-slate-900'
                                : metricTab === 'precipitation'
                                  ? 'fill-sky-600 dark:fill-sky-400'
                                  : metricTab === 'wind'
                                    ? 'fill-cyan-600 dark:fill-cyan-400'
                                    : 'fill-amber-600 dark:fill-amber-400'
                            }
                          />
                          <text
                            x={p.x}
                            y={p.y - 8}
                            textAnchor="middle"
                            className="fill-slate-700 dark:fill-slate-200 text-[11px] font-bold"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Hourly Icon & Detail Columns */}
                  <div className="flex items-stretch">
                    {activeSeries.map((pt, idx) => (
                      <div
                        key={idx}
                        style={{ width: '56px' }}
                        className={`shrink-0 flex flex-col items-center py-2 px-1 rounded-xl border transition ${
                          pt.is_now
                            ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/40 shadow-xs'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className={`text-[11px] font-bold ${
                            pt.is_now ? 'text-sky-700 dark:text-sky-300 font-extrabold' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {pt.hour_label}
                        </span>
                        <div className="my-2">{getWeatherIcon(pt.condition, 18)}</div>
                        <span className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400">
                          {pt.pop > 0 ? `${pt.pop}%` : '—'}
                        </span>
                        {pt.rain_mm > 0 && (
                          <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 mt-0.5">
                            {pt.rain_mm}mm
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. 7-Day Daily Forecast Outlook */}
          {dailySeries.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  7-Day Zamboanga City Outlook
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {dailySeries.map((day, idx) => {
                  const totalSpan = Math.max(1, weeklyTempBounds.max - weeklyTempBounds.min);
                  const leftPct = Math.max(
                    0,
                    ((day.temp_min_c - weeklyTempBounds.min) / totalSpan) * 100
                  );
                  const widthPct = Math.max(
                    12,
                    ((day.temp_max_c - day.temp_min_c) / totalSpan) * 100
                  );

                  return (
                    <div
                      key={day.date || idx}
                      className="py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs"
                    >
                      {/* Day Name */}
                      <div className="w-28 font-extrabold text-slate-900 dark:text-white shrink-0">
                        {day.day_name}
                      </div>

                      {/* Condition & Icon */}
                      <div className="flex items-center gap-2.5 w-44 shrink-0">
                        {getWeatherIcon(day.condition, 20)}
                        <span className="text-slate-700 dark:text-slate-200 font-semibold truncate">
                          {day.description}
                        </span>
                      </div>

                      {/* Rain Probability & Volume */}
                      <div className="w-28 flex items-center gap-1.5 shrink-0">
                        <Droplets size={13} className="text-sky-600 dark:text-sky-400" />
                        <span className="font-bold text-sky-600 dark:text-sky-300">{day.pop_max}%</span>
                        {day.rain_sum_mm > 0 && (
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            ({day.rain_sum_mm} mm)
                          </span>
                        )}
                      </div>

                      {/* Min / Max Temperature Range Bar */}
                      <div className="flex-1 min-w-[160px] flex items-center gap-2.5">
                        <span className="w-9 text-right font-bold text-slate-500 dark:text-slate-400">
                          {Math.round(day.temp_min_c)}°
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                          <div
                            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-orange-500"
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.min(100 - leftPct, widthPct)}%`,
                            }}
                          />
                        </div>
                        <span className="w-9 font-extrabold text-slate-900 dark:text-white">
                          {Math.round(day.temp_max_c)}°
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
