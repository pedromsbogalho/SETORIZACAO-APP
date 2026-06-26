/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { Maximize2, Minimize2, MapPin, AlertCircle, Loader2, Compass } from 'lucide-react';

interface FamilyGoogleMapProps {
  address: string;
  familyName: string;
  isDark: boolean;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Default center of Caraguatatuba, SP
const DEFAULT_CENTER = { lat: -23.6226, lng: -45.4125 };

// Map themes matching light/dark modes
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

// Inner map component that executes the geocoding logic
function MapContent({ address, familyName }: { address: string; familyName: string }) {
  const map = useMap();
  const [coordinates, setCoordinates] = useState<google.maps.LatLngLiteral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;

    setLoading(true);
    setError(null);

    const geocoder = new google.maps.Geocoder();
    // Search within Caraguatatuba bounds by default to keep it localized
    geocoder.geocode(
      { 
        address: `${address}, Caraguatatuba, SP, Brasil`,
      },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const coords = { lat: loc.lat(), lng: loc.lng() };
          setCoordinates(coords);
          map.setCenter(coords);
          map.setZoom(16);
        } else {
          // If detailed search failed, try without the suffix constraints
          geocoder.geocode({ address }, (retryResults, retryStatus) => {
            if (retryStatus === 'OK' && retryResults && retryResults[0]) {
              const loc = retryResults[0].geometry.location;
              const coords = { lat: loc.lat(), lng: loc.lng() };
              setCoordinates(coords);
              map.setCenter(coords);
              map.setZoom(16);
            } else {
              console.warn(`Geocoding failed for "${address}": ${status}`);
              setError('Não foi possível localizar o endereço exato. Mostrando região central.');
              setCoordinates(DEFAULT_CENTER);
              map.setCenter(DEFAULT_CENTER);
              map.setZoom(13);
            }
          });
        }
        setLoading(false);
      }
    );
  }, [address, map]);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center gap-2 text-white bg-slate-950/85 px-4 py-3 rounded-xl border border-white/10 shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
            <span className="text-[10px] font-mono tracking-wider uppercase font-bold">Buscando coordenadas...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-2 left-2 right-2 bg-amber-500/90 dark:bg-amber-600/90 text-white text-[10px] px-3 py-1.5 rounded-lg font-sans font-semibold flex items-center gap-1.5 z-10 shadow-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {coordinates && (
        <AdvancedMarker position={coordinates} title={familyName}>
          <Pin background="#0d9488" glyphColor="#fff" borderColor="#0f766e" scale={1.2} />
        </AdvancedMarker>
      )}
    </>
  );
}

export default function FamilyGoogleMap({ address, familyName, isDark }: FamilyGoogleMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSimulatedFallback, setShowSimulatedFallback] = useState(!hasValidKey);

  // Expose fallback design if API KEY is absent or user explicitly clicks simulated mode
  if (showSimulatedFallback) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-xs block text-slate-700 dark:text-zinc-300">
            Localização Espiritual (Mapa Esquemático Simulado)
          </span>
          {hasValidKey && (
            <button
              onClick={() => setShowSimulatedFallback(false)}
              className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Ativar Mapa do Google
            </button>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4 shadow-xs">
          {/* Instructions card on how to configure Google Maps */}
          <div className="text-xs space-y-2 text-slate-600 dark:text-zinc-400">
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <div>
                <span className="font-bold block text-slate-900 dark:text-zinc-100 mb-1">
                  Chave do Google Maps não configurada!
                </span>
                <span>Para usar o Google Maps real em tempo real, você precisa adicionar a sua API Key do Google Maps Platform.</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-slate-200/50 dark:border-zinc-850 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-zinc-200 block text-xxs tracking-wider uppercase">Como configurar:</span>
              <ol className="list-decimal pl-4 space-y-1 text-xxs">
                <li>
                  Obtenha uma chave de API do Google Maps:{' '}
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline font-semibold"
                  >
                    Google Cloud Console
                  </a>
                </li>
                <li>No canto superior direito, clique em <strong>Configurações (ícone de engrenagem ⚙️)</strong>.</li>
                <li>Selecione <strong>Secrets</strong>.</li>
                <li>Clique em "Add Secret", digite o nome <code>GOOGLE_MAPS_PLATFORM_KEY</code> e cole a sua chave no campo de valor.</li>
              </ol>
            </div>
          </div>

          {/* Grid/Simulated fallback map preview */}
          <div className={`h-40 rounded-lg border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-100/40 border-slate-200/40'} relative overflow-hidden flex items-center justify-center`}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]" />
            <div className="absolute top-10 left-0 right-0 h-1 bg-teal-500/10" />
            <div className="absolute top-0 bottom-0 left-24 w-1 bg-teal-500/10" />
            <div className="absolute top-28 left-0 right-0 h-1 bg-orange-500/10" />
            <div className="absolute top-0 bottom-0 left-64 w-1 bg-orange-500/10" />
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="animate-bounce bg-teal-600 text-white p-1.5 rounded-full shadow-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="bg-zinc-900/90 text-white text-[10px] px-2 py-0.5 rounded font-bold mt-1 shadow-sm whitespace-nowrap">
                {familyName} (Simulado)
              </div>
            </div>

            <div className="absolute bottom-2 left-2 bg-zinc-900/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
              GPS Ref: -23.6226, -45.4125 ({familyName})
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-xs block text-slate-700 dark:text-zinc-300">
          Localização Espiritual (Google Maps Integrado)
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulatedFallback(true)}
            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Voltar ao Esquemático
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Fechar Tela Cheia
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Tela Cheia
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map flow view or simple placeholder if in fullscreen */}
      {isFullscreen ? (
        <div className={`h-48 border rounded-xl flex flex-col items-center justify-center bg-slate-100/30 dark:bg-zinc-900/30 border-dashed ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
          <MapPin className="w-5 h-5 text-teal-600/60 dark:text-teal-400/60 animate-pulse mb-1" />
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Mapa expandido em tela cheia</span>
          <button 
            onClick={() => setIsFullscreen(false)}
            className="mt-2 px-2.5 py-1 text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer uppercase"
          >
            Minimizar / Restaurar
          </button>
        </div>
      ) : (
        /* Actual Live Google Map Container in regular page flow */
        <div 
          className={`h-48 relative border overflow-hidden rounded-xl bg-slate-150 dark:bg-zinc-900 shadow-xs ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}
        >
          <div className="w-full h-full relative">
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={15}
                mapId={isDark ? "4f6ef1e4695015b6" : "DEMO_MAP_ID"} // Demo dark/light ids
                gestureHandling={'cooperative'}
                disableDefaultUI={false}
                zoomControl={true}
                mapTypeControl={false}
                streetViewControl={true}
                fullscreenControl={false}
                styles={isDark ? DARK_MAP_STYLE : undefined}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <MapContent address={address} familyName={familyName} />
              </Map>
            </APIProvider>
          </div>
        </div>
      )}

      {/* Render the Fullscreen version directly to document.body via Portal */}
      {isFullscreen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
          <div className={`w-full h-full max-w-6xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border flex flex-col p-4 md:p-6 space-y-4 ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}>
            {/* Header inside Fullscreen Portal */}
            <div className="flex justify-between items-start border-b border-slate-200/50 dark:border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
                  Mapa de Localização — {familyName}
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 select-all">Endereço: {address}</p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3.5 py-1.5 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-slate-300/30 dark:border-white/5 shadow-xs"
              >
                Fechar / Restaurar
              </button>
            </div>

            {/* Actual Map Area inside Fullscreen Portal */}
            <div className="flex-1 min-h-0 w-full relative h-full rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800/80">
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  defaultCenter={DEFAULT_CENTER}
                  defaultZoom={15}
                  mapId={isDark ? "4f6ef1e4695015b6" : "DEMO_MAP_ID"}
                  gestureHandling={'cooperative'}
                  disableDefaultUI={false}
                  zoomControl={true}
                  mapTypeControl={true}
                  streetViewControl={true}
                  fullscreenControl={false}
                  styles={isDark ? DARK_MAP_STYLE : undefined}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  <MapContent address={address} familyName={familyName} />
                </Map>
              </APIProvider>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
