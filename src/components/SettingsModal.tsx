import React, { useState } from 'react';
import {
  Settings,
  MapPin,
  Building,
  Volume2,
  CheckCircle,
  X,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { BaseSettings } from '../types';
import { updateSettings } from '../services/api';

interface SettingsModalProps {
  settings: BaseSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newSettings: BaseSettings) => void;
  isAdmin: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaved,
  isAdmin,
}) => {
  const [baseName, setBaseName] = useState(settings.baseName);
  const [baseLatitude, setBaseLatitude] = useState(settings.baseLatitude);
  const [baseLongitude, setBaseLongitude] = useState(settings.baseLongitude);
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState(settings.allowedRadiusMeters);
  const [enforceBaseGeofence, setEnforceBaseGeofence] = useState(settings.enforceBaseGeofence);
  const [autoVoiceCall, setAutoVoiceCall] = useState(settings.autoVoiceCall);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no seu navegador.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBaseLatitude(Number(pos.coords.latitude.toFixed(6)));
        setBaseLongitude(Number(pos.coords.longitude.toFixed(6)));
        setGettingLocation(false);
        alert(
          `Localização atual capturada (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})! Salve para que seus testes no celular validem "Na Base".`
        );
      },
      err => {
        setGettingLocation(false);
        alert('Erro ao obter localização: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Apenas Administradores Gerais podem alterar as configurações da base.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings({
        baseName: baseName.trim(),
        baseLatitude: Number(baseLatitude),
        baseLongitude: Number(baseLongitude),
        allowedRadiusMeters: Number(allowedRadiusMeters),
        enforceBaseGeofence,
        autoVoiceCall,
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Configurações da Base &amp; GPS</h3>
              <p className="text-xs text-slate-400">Parâmetros de geocerca e alertas sonoros</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs">
            ⚠️ Modo somente leitura: Faça login como um dos 4 Administradores Gerais para salvar
            alterações.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nome do Centro Logístico / Base
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={baseName}
              onChange={e => setBaseName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* GPS COORDINATES */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Coordenadas Centrais da Base (GPS)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBaseName('Condomínio SYS Gama - Ponte Alta (Gama - DF)');
                    setBaseLatitude(-15.9897);
                    setBaseLongitude(-48.0536);
                    setAllowedRadiusMeters(500);
                    setEnforceBaseGeofence(true);
                  }}
                  disabled={!isAdmin}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Padrão SYS Gama - Ponte Alta (-15.9897, -48.0536)</span>
                </button>

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Navigation className={`w-3 h-3 ${gettingLocation ? 'animate-spin' : ''}`} />
                  <span>Usar Meu GPS</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  disabled={!isAdmin}
                  value={baseLatitude}
                  onChange={e => setBaseLatitude(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  disabled={!isAdmin}
                  value={baseLongitude}
                  onChange={e => setBaseLongitude(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* RADIUS SLIDER */}
            <div className="pt-2">
              <div className="flex justify-between text-slate-300 font-semibold mb-1">
                <span>Raio Máximo Permitido (Geocerca da Base):</span>
                <span className="font-mono text-emerald-400 font-bold">{allowedRadiusMeters} metros</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="25"
                disabled={!isAdmin}
                value={allowedRadiusMeters}
                onChange={e => setAllowedRadiusMeters(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400">Atalhos rápidos:</span>
                {[100, 300, 500, 1000, 2000].map(r => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setAllowedRadiusMeters(r)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                      allowedRadiusMeters === r
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {r === 500 ? '500m (SYS Gama Pátio)' : r === 1000 ? '1km (Complexo)' : `${r}m`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Motoristas a mais de {allowedRadiusMeters}m de distância terão o check-in bloqueado.
              </p>
            </div>

            {/* ENFORCE GEOFENCE TOGGLE */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">
                  Bloquear Check-in Fora do Raio da Base
                </span>
                <p className="text-[11px] text-slate-400">
                  Impede que motoristas realizem check-in a mais de {allowedRadiusMeters}m de distância
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={enforceBaseGeofence}
                  onChange={e => setEnforceBaseGeofence(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* VOICE & CALL ALERTS */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-blue-400" />
              Alertas Sonoros &amp; Voz do Telão
            </span>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">
                  Chamada por Voz Automática (TTS)
                </span>
                <p className="text-[11px] text-slate-400">
                  Sintetiza em português: &quot;Atenção motorista [Nome], dirija-se à [Doca X]&quot;
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={autoVoiceCall}
                  onChange={e => setAutoVoiceCall(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={!isAdmin || saving}
              className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold"
            >
              {saving ? 'Salvando...' : 'Salvar Parâmetros'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
