import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Smartphone,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Bell,
  Volume2,
  Navigation,
  Search,
  User,
  Truck,
  Flame,
  Radio,
  Vibrate,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  QrCode,
  Target,
  Boxes,
  Crown,
} from 'lucide-react';
import QRCode from 'qrcode';
import { QRCodeTotemModal } from './QRCodeTotemModal';
import { DF_ENTORNO_ROUTES, findRouteByQuery } from '../constants/routesDF';
import {
  BaseSettings,
  CallAnnouncement,
  CollaboratorUser,
  DriverCheckIn,
  RegisteredDriver,
} from '../types';
import {
  createCheckIn,
  fetchRegisteredDrivers,
  registerNewDriver,
  acknowledgeDriverCall,
  updateSettings,
} from '../services/api';
import {
  playCallingChime,
  playMobileAlertSignal,
  requestNotificationPermission,
  sendPushNotification,
  speakAnnouncement,
  triggerVibration,
} from '../services/sound';

interface DriverPortalProps {
  checkIns: DriverCheckIn[];
  baseSettings: BaseSettings;
  activeAnnouncement: CallAnnouncement | null;
  onRefresh: () => void;
  registeredDrivers: RegisteredDriver[];
  currentUser?: CollaboratorUser | null;
  onOpenLogin?: () => void;
  onOpenPackageMovement?: (defaultSourceRoute?: string) => void;
  onOpenCep?: () => void;
  onLoginAsMaster?: () => void;
  onSwitchTab?: (tab: 'dashboard' | 'driver' | 'sheet' | 'collaborators' | 'settings') => void;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({
  checkIns,
  baseSettings,
  activeAnnouncement,
  onRefresh,
  registeredDrivers,
  currentUser,
  onOpenLogin,
  onOpenPackageMovement,
  onOpenCep,
  onLoginAsMaster,
  onSwitchTab,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'my_ticket' | 'live_queue'>('form');

  const isMasterUser = Boolean(
    currentUser?.isMaster ||
    currentUser?.role === 'master' ||
    currentUser?.email === 'gilianocosta804@gmail.com'
  );

  // Form State
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [route, setRoute] = useState('');
  const [city, setCity] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [notes, setNotes] = useState('');

  // Autocomplete state
  const [nameSuggestions, setNameSuggestions] = useState<RegisteredDriver[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<RegisteredDriver | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinBase, setIsWithinBase] = useState<boolean | null>(null);
  const [presentialConfirmed, setPresentialConfirmed] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Submission & My Ticket state
  const [submitting, setSubmitting] = useState(false);
  const [myTicket, setMyTicket] = useState<DriverCheckIn | null>(null);
  const [myTicketNumberInput, setMyTicketNumberInput] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [hasAcknowledgedCall, setHasAcknowledgedCall] = useState(false);
  const [showFullScreenAlarm, setShowFullScreenAlarm] = useState(false);
  const stopAudioAlarmRef = useRef<(() => void) | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showTotemModal, setShowTotemModal] = useState(false);

  // Clean up audio buzzer on unmount
  useEffect(() => {
    return () => {
      if (stopAudioAlarmRef.current) stopAudioAlarmRef.current();
    };
  }, []);

  // Live Time
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR'));
      setCurrentDate(now.toLocaleDateString('pt-BR'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code for mobile sharing with standard quiet zone (margin 4) so corners are never clipped
  useEffect(() => {
    QRCode.toDataURL(window.location.href, {
      margin: 4,
      width: 320,
      color: { dark: '#090a0f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(() => {});
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Distance calculator helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Capture GPS Location with automatic multi-stage fallback (High accuracy -> Standard Wi-Fi/Cell/Network)
  const captureGps = () => {
    if (isMasterUser) {
      setIsWithinBase(true);
      setPresentialConfirmed(true);
      setDistanceMeters(0);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada. Presença confirmada presencialmente.');
      setPresentialConfirmed(true);
      setIsWithinBase(true);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    const applyPosition = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy || 0);

      setLatitude(lat);
      setLongitude(lon);
      setAccuracy(acc);

      // Pontos centrais do Condomínio SYS Gama e Ponte Alta (Gama, DF):
      // Ponto 1: SYS Gama Business Park (DF-001 x DF-475)
      const distSysGama = calculateDistance(lat, lon, -15.9897, -48.0536);
      // Ponto 2: Ponte Alta Norte (DF-001)
      const distPonteAlta = calculateDistance(lat, lon, -15.94877, -48.03793);
      // Ponto 3: Base Settings atual
      const distToBase = calculateDistance(
        lat,
        lon,
        baseSettings.baseLatitude || -15.9897,
        baseSettings.baseLongitude || -48.0536
      );

      const bestDist = Math.min(distSysGama, distPonteAlta, distToBase);
      setDistanceMeters(bestDist);

      // Raio expandido de 5000m (5km) para abranger o condomínio inteiro, pátio e arredores
      const effectiveRadius = Math.max(baseSettings.allowedRadiusMeters || 5000, 5000);
      const tolerance = Math.max(300, acc * 1.5);
      const within = isMasterUser || (bestDist - tolerance) <= effectiveRadius;

      setIsWithinBase(within);
      if (within) {
        setPresentialConfirmed(true);
      }
      setGpsLoading(false);
    };

    // Tentativa 1: Alta precisão (GPS por satélite)
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (err) => {
        console.warn('GPS por satélite oscilou, tentando modo padrão (Wi-Fi/Torres):', err);
        // Tentativa 2: Fallback padrão (Wi-Fi / Redes móveis / IP)
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          (fallbackErr) => {
            setGpsLoading(false);
            console.warn('GPS fallback também falhou:', fallbackErr);
            setGpsError(
              fallbackErr.code === 1
                ? 'Permissão de localização não concedida. Clique em "Confirmar Presença no Galpão" abaixo.'
                : 'Sinal oscilando dentro do galpão. Clique em "Confirmar Presença no Galpão" para liberar.'
            );
            // Libera presença para evitar bloqueio indevido no galpão
            setPresentialConfirmed(true);
            setIsWithinBase(true);
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  // Calibrar base para a posição atual exata onde o usuário está agora
  const handleCalibrateHereAsBase = async () => {
    if (latitude === null || longitude === null) {
      alert('Capture primeiro sua posição GPS clicando em "Ativar Localização".');
      return;
    }
    setCalibrating(true);
    try {
      await updateSettings({
        baseName: 'Condomínio SYS Gama - Ponte Alta (Gama - DF)',
        baseLatitude: latitude,
        baseLongitude: longitude,
        allowedRadiusMeters: 5000,
      });
      onRefresh();
      setDistanceMeters(0);
      setIsWithinBase(true);
      setPresentialConfirmed(true);
      alert('🎯 Sucesso! As coordenadas centrais do Condomínio SYS Gama - Ponte Alta foram calibradas exatamente onde você está agora!');
    } catch (err: any) {
      alert('Erro ao calibrar coordenadas: ' + err.message);
    } finally {
      setCalibrating(false);
    }
  };

  // Automatically request GPS on mount for check-in form
  useEffect(() => {
    if (activeTab === 'form' && latitude === null && !gpsLoading) {
      captureGps();
    }
  }, [activeTab]);

  // Autocomplete filtering based on registered drivers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDriverName(value);

    if (value.trim().length >= 2) {
      const query = value.toLowerCase().trim();
      const matches = registeredDrivers.filter(
        d =>
          d.name.toLowerCase().includes(query) ||
          d.licensePlate.toLowerCase().includes(query)
      );
      setNameSuggestions(matches);
      setShowSuggestions(true);

      // Check if current value exactly matches any registered driver
      const exactMatch = registeredDrivers.find(
        d => d.name.toLowerCase() === query
      );
      if (exactMatch) {
        setSelectedDriver(exactMatch);
        setIsManualEntry(false);
      } else {
        setSelectedDriver(null);
        setIsManualEntry(true);
      }
    } else {
      setNameSuggestions([]);
      setShowSuggestions(false);
      setSelectedDriver(null);
      setIsManualEntry(false);
    }
  };

  // Select driver from autocomplete suggestion list
  const handleSelectDriver = (driver: RegisteredDriver) => {
    setDriverName(driver.name);
    setLicensePlate(driver.licensePlate);
    setPhoneNumber(driver.phone);
    if (driver.preferredRoute) setRoute(driver.preferredRoute);
    if (driver.preferredCity) setCity(driver.preferredCity);

    setSelectedDriver(driver);
    setIsManualEntry(false);
    setShowSuggestions(false);
  };

  const handleRouteChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setRoute(upper);
    const matched = findRouteByQuery(upper);
    if (matched) {
      setCity(matched.city);
    }
  };

  // Handle Form Submit
  const handleSubmitCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverName.trim()) {
      alert('Por favor, informe o nome do motorista.');
      return;
    }
    if (!route.trim()) {
      alert('Por favor, informe a rota a ser realizada.');
      return;
    }
    if (!city.trim()) {
      alert('Por favor, informe a cidade da rota.');
      return;
    }

    if (baseSettings.enforceBaseGeofence && !presentialConfirmed && !isWithinBase && !isMasterUser) {
      if (latitude === null || longitude === null) {
        // Auto-confirma presença no pátio para não travar o colaborador/motorista na base
        setPresentialConfirmed(true);
      } else if (!isWithinBase) {
        // Se estiver no raio expandido de 5km ou arredores da Ponte Alta/SYS Gama, confirma presença
        setPresentialConfirmed(true);
        setIsWithinBase(true);
      }
    }

    setSubmitting(true);
    try {
      const response = await createCheckIn({
        driverName: driverName.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        phoneNumber: phoneNumber.trim(),
        route: route.trim(),
        city: city.trim(),
        isPriority,
        latitude,
        longitude,
        locationAccuracy: accuracy,
        isManualRegistration: isManualEntry || !selectedDriver,
        presentialConfirmed: Boolean(presentialConfirmed || isWithinBase === true),
        notes: notes.trim(),
      });

      setMyTicket(response.checkIn);
      setActiveTab('my_ticket');
      setHasAcknowledgedCall(false);
      onRefresh();

      // Proactively request browser notifications for the driver
      requestNotificationPermission().then(perm => {
        if (perm === 'granted') setNotificationsEnabled(true);
      });
    } catch (err: any) {
      alert('Erro ao realizar check-in: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Keep myTicket updated if state in checkIns changes
  useEffect(() => {
    if (myTicket) {
      const updated = checkIns.find(c => c.id === myTicket.id);
      if (updated) {
        // If driver was just called or recalled
        if (
          (updated.status === 'called' && myTicket.status !== 'called') ||
          (updated.status === 'called' && (updated.callCount || 0) > (myTicket.callCount || 0))
        ) {
          if (stopAudioAlarmRef.current) stopAudioAlarmRef.current();
          stopAudioAlarmRef.current = playMobileAlertSignal();
          speakAnnouncement(updated.driverName, updated.assignedDock || 'sua Doca');
          triggerVibration();
          sendPushNotification(
            `🚨 SINAL DE CHAMADA: ${updated.assignedDock || 'DOCA'}!`,
            `Motorista ${updated.driverName}, compareça à ${updated.assignedDock || 'doca'} imediatamente.`
          );
          setShowFullScreenAlarm(true);
          setHasAcknowledgedCall(false);
        }
        setMyTicket(updated);
      }
    }
  }, [checkIns]);

  const handleAcknowledgeCall = async () => {
    if (stopAudioAlarmRef.current) {
      stopAudioAlarmRef.current();
      stopAudioAlarmRef.current = null;
    }
    setShowFullScreenAlarm(false);
    setHasAcknowledgedCall(true);

    if (myTicket) {
      try {
        await acknowledgeDriverCall(myTicket.id);
        onRefresh();
      } catch (err) {
        console.warn('Acknowledge call error:', err);
      }
    }
  };

  // Also check if activeAnnouncement matches myTicket
  const isMyCallActive = useMemo(() => {
    if (!myTicket || !activeAnnouncement) return false;
    return (
      myTicket.id === activeAnnouncement.id ||
      myTicket.ticketNumber === activeAnnouncement.ticketNumber ||
      myTicket.driverName.toLowerCase() === activeAnnouncement.driverName.toLowerCase()
    );
  }, [myTicket, activeAnnouncement]);

  // Position in waiting queue
  const queuePosition = useMemo(() => {
    if (!myTicket || myTicket.status !== 'waiting') return null;
    const waitingList = checkIns.filter(c => c.status === 'waiting');
    const index = waitingList.findIndex(c => c.id === myTicket.id);
    return index !== -1 ? index + 1 : null;
  }, [myTicket, checkIns]);

  // Filter waiting list in arrival order
  const waitingList = useMemo(() => {
    return checkIns
      .filter(c => c.status === 'waiting' || c.status === 'called')
      .sort((a, b) => a.ticketNumber - b.ticketNumber);
  }, [checkIns]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Mobile Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 rounded-2xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">E2E - DOCAS</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mobile &amp; Pátio
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Check-in com geolocalização e alerta de chamada nas docas direto no celular
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const perm = await requestNotificationPermission();
                if (perm === 'granted') {
                  setNotificationsEnabled(true);
                  playCallingChime();
                  triggerVibration();
                  sendPushNotification(
                    'E2E - DOCAS Notificações Ativadas',
                    'Você receberá um alerta sonoro e na tela assim que sua doca for liberada!'
                  );
                } else {
                  alert('Permissão de notificações não concedida no navegador.');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                notificationsEnabled
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40 animate-pulse'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{notificationsEnabled ? 'Notificações Ativas' : 'Ativar Notificações no Celular'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'form'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>E2E - DOCAS</span>
          </button>
          <button
            onClick={() => setActiveTab('my_ticket')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 relative ${
              activeTab === 'my_ticket'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Minha Chamada</span>
            {myTicket && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping absolute -top-1 right-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('live_queue')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'live_queue'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Fila Geral</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {waitingList.length}
            </span>
          </button>
        </div>
      </div>

      {/* FULL SCREEN MOBILE CALL SIGNAL OVERLAY (DISPARADO QUANDO É CHAMADO NA DASHBOARD) */}
      {(showFullScreenAlarm || (isMyCallActive && myTicket && !hasAcknowledgedCall)) && myTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-6 text-white text-center animate-in fade-in zoom-in-95">
          {/* Top pulse header */}
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-widest animate-pulse shadow-lg shadow-rose-600/50">
              <Radio className="w-4 h-4 animate-ping" />
              <span>SINAL DE CHAMADA ATIVO NO CELULAR!</span>
            </div>
            <p className="text-xs text-rose-300 font-semibold mt-2">
              Seu veículo foi convocado pela expedição. Favor se dirigir à doca indicada!
            </p>
          </div>

          {/* Giant Center Dock Number */}
          <div className="my-auto space-y-4">
            <div className="bg-gradient-to-b from-amber-500/20 to-rose-500/20 border-2 border-amber-400 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-w-sm mx-auto">
              <div className="text-xs uppercase font-bold tracking-widest text-amber-300">
                DIRIJA-SE IMEDIATAMENTE À:
              </div>
              <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white my-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-md">
                {myTicket.assignedDock || activeAnnouncement?.dockName || 'DOCA'}
              </div>
              <div className="inline-block px-4 py-1 rounded-full bg-black/40 text-amber-200 font-mono text-sm font-bold border border-amber-400/30">
                SENHA #{String(myTicket.ticketNumber).padStart(3, '0')}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 uppercase font-bold">Motorista:</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">{myTicket.driverName}</h2>
              <p className="text-sm text-slate-300">
                Rota: {myTicket.route} ({myTicket.city})
              </p>
            </div>
          </div>

          {/* Bottom Confirmation Button */}
          <div className="pb-6 max-w-md mx-auto w-full space-y-3">
            <button
              onClick={handleAcknowledgeCall}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base uppercase tracking-wider shadow-2xl shadow-emerald-500/40 transition-transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
            >
              <CheckCircle2 className="w-6 h-6 text-slate-950" />
              <span>ESTOU A CAMINHO! (CONFIRMAR SINAL)</span>
            </button>

            <button
              onClick={() => {
                if (stopAudioAlarmRef.current) {
                  stopAudioAlarmRef.current();
                  stopAudioAlarmRef.current = null;
                }
              }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Silenciar som do alarme
            </button>
          </div>
        </div>
      )}

      {/* INLINE BANNER IF ALREADY ACKNOWLEDGED */}
      {hasAcknowledgedCall && myTicket && myTicket.status === 'called' && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-300">
                Sinal Confirmado! A equipe da doca foi notificada de que você está a caminho.
              </p>
              <p className="text-[11px] text-emerald-400/80">
                Destino: <strong>{myTicket.assignedDock}</strong> &bull; Encoste seu veículo de ré
                para início da operação.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: FORM DE CHECK-IN */}
      {activeTab === 'form' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xl text-slate-100">
          {/* MASTER USER ACTION & GMAIL LOGIN BANNER */}
          {isMasterUser ? (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-950/20 border border-amber-500/50 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-md shrink-0">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      👑 Logado como Usuário Master: {currentUser?.name || 'Giliano Costa'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-zinc-950">
                      TODOS OS ACESSOS
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 font-mono">
                    {currentUser?.email || 'gilianocosta804@gmail.com'} &bull; Status Master ativo com permissão para todas as movimentações
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onOpenPackageMovement && (
                  <button
                    type="button"
                    onClick={() => onOpenPackageMovement()}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Movimentar Pacote</span>
                  </button>
                )}
                {onSwitchTab && (
                  <button
                    type="button"
                    onClick={() => onSwitchTab('dashboard')}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                  >
                    Painel Geral Docas
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Acesso Master / Giliano Costa</span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Gmail Vinculado
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Logue com seu Gmail para ter status Master com todos os acessos e realizar todas as movimentações
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLoginAsMaster || onOpenLogin}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Logar com meu Gmail (Master)</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                Formulário de Entrada &amp; Check-in
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Preencha os dados de chegada ao Centro de Distribuição (SYS Gama - Ponte Alta)
              </p>
            </div>

            {/* Auto date & time badge */}
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                {currentTime}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                <Calendar className="w-3 h-3" />
                {currentDate}
              </div>
            </div>
          </div>

          {/* GEOLOCATION VALIDATION BOX */}
          <div className="mb-6 rounded-xl border p-4 transition-all bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={`p-2.5 rounded-xl ${
                    gpsLoading
                      ? 'bg-blue-500/20 text-blue-400 animate-spin'
                      : (isWithinBase === true || presentialConfirmed || isMasterUser)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isWithinBase === false
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Geolocalização (Condomínio SYS Gama - Ponte Alta)
                    </span>
                    {(isWithinBase === true || presentialConfirmed || isMasterUser) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {isMasterUser ? '👑 Master (Presença Liberada)' : presentialConfirmed ? 'Presença Confirmada' : 'Na Base (Validado)'}
                      </span>
                    )}
                    {isWithinBase === false && !presentialConfirmed && !isMasterUser && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Ajuste Necessário ({distanceMeters}m)
                      </span>
                    )}
                  </div>

                  {gpsLoading ? (
                    <p className="text-xs text-blue-300 mt-1 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Capturando localização da base no Condomínio SYS Gama...
                    </p>
                  ) : latitude !== null && longitude !== null ? (
                    <div className="text-xs mt-1.5 space-y-1.5">
                      <p
                        className={`font-semibold ${
                          isWithinBase || presentialConfirmed || isMasterUser ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {isWithinBase || presentialConfirmed || isMasterUser
                          ? `✅ Presença confirmada no Condomínio SYS Gama - Ponte Alta! (Distância: ${distanceMeters ?? 0}m • Raio: ${baseSettings.allowedRadiusMeters}m).`
                          : `📍 GPS detectado: você está a ${distanceMeters} metros do ponto central cadastrado.`}
                      </p>

                      <p className="text-[11px] font-mono text-slate-400">
                        Suas Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)} | Precisão: ±{accuracy}m
                      </p>

                      {/* QUICK CALIBRATION AND PRESENCE BUTTONS */}
                      <div className="pt-1.5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCalibrateHereAsBase}
                          disabled={calibrating}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                          title="Salva as coordenadas onde você está agora como o local oficial da base SYS Gama Ponte Alta"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>{calibrating ? 'Calibrando...' : '🎯 Estou na Base! Calibrar Minha Posição Atual'}</span>
                        </button>

                        {(!isWithinBase && !presentialConfirmed) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPresentialConfirmed(true);
                              setIsWithinBase(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Confirmar Presença no Galpão</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1.5 text-xs text-amber-300">
                      <p>
                        {gpsError ||
                          'Aguardando captura da localização do dispositivo no Condomínio SYS Gama.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPresentialConfirmed(true);
                            setIsWithinBase(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Estou na Base SYS Gama / Liberar Presença</span>
                        </button>

                        <button
                          type="button"
                          onClick={captureGps}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Tentar GPS Novamente</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={captureGps}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>{latitude ? 'Recapturar GPS' : 'Ativar Localização'}</span>
                </button>
                {latitude !== null && (
                  <button
                    type="button"
                    onClick={handleCalibrateHereAsBase}
                    disabled={calibrating}
                    title="Definir esta posição atual como o ponto central do SYS Gama"
                    className="px-2.5 py-1 rounded-lg text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1"
                  >
                    <Target className="w-3 h-3" />
                    <span>Calibrar Base</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitCheckIn} className="space-y-5">
            {/* DRIVER NAME WITH AUTOCOMPLETE / SUGGESTION */}
            <div className="relative" ref={searchContainerRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Nome Completo do Motorista *
                </label>
                <span className="text-[11px] text-slate-400">
                  {selectedDriver ? (
                    <span className="text-emerald-400 font-medium">✓ Motorista Cadastrado</span>
                  ) : isManualEntry ? (
                    <span className="text-amber-400 font-medium">⚠️ Cadastro Manual</span>
                  ) : (
                    'Digite para sugestões'
                  )}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={handleNameChange}
                  onFocus={() => {
                    if (driverName.trim().length >= 2) setShowSuggestions(true);
                  }}
                  placeholder="Ex: Carlos Eduardo Silva (comece a digitar para autocompletar)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>

              {/* Autocomplete Dropdown List */}
              {showSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800">
                  <div className="p-2 text-[11px] font-semibold text-slate-400 bg-slate-950/60 uppercase tracking-wider">
                    Motoristas Encontrados na Planilha ({nameSuggestions.length}):
                  </div>
                  {nameSuggestions.map(driver => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => handleSelectDriver(driver)}
                      className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-sm text-white group-hover:text-blue-400 flex items-center gap-2">
                          {driver.name}
                          <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {driver.licensePlate}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {driver.carrier} &bull; Rota: {driver.preferredRoute} ({driver.preferredCity})
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* MANUAL REGISTRATION WARNING NOTICE AS REQUESTED */}
              {isManualEntry && (
                <div className="mt-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">
                      Nome não localizado na planilha cadastral de motoristas!
                    </p>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      O cadastro manual é permitido. Sua entrada será marcada com aviso para revisão e
                      validação posterior pela equipe da portaria / expedição.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* LICENSE PLATE & PHONE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC1D23 ou BSS2545"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Telefone / WhatsApp (Para Notificação)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="Ex: (61) 98765-4321"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ROTA DE ENTREGA (DIGITAÇÃO DIRETA DO MOTORISTA) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rota de Entrega *</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Ex: 16A, 01A, etc.
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={route}
                  onChange={e => handleRouteChange(e.target.value)}
                  placeholder="Digite a rota (Ex: 16A)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 uppercase font-mono font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Cidade / Região da Rota *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Digite a cidade (Ex: Ceilândia - DF)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* PRIORITY TOGGLE */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame
                    className={`w-4 h-4 ${isPriority ? 'text-amber-400' : 'text-slate-500'}`}
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">
                      Carga com Prioridade / Atendimento Preferencial?
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Marque caso transporte itens urgentes, perecíveis ou tenha preferência legal
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPriority}
                    onChange={e => setIsPriority(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            {/* NOTES */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Observações / Informações Adicionais (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Carreta baú, precisa de conferência rápida"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SUBMIT BUTTON */}
            {baseSettings.enforceBaseGeofence && !isWithinBase && !presentialConfirmed && latitude !== null && (
              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-xs text-amber-300 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    Atenção: O sistema calculou <strong>{distanceMeters} metros</strong> do ponto cadastrado da base (Raio permitido: <strong>{baseSettings.allowedRadiusMeters} metros</strong>).
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCalibrateHereAsBase}
                    disabled={calibrating}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{calibrating ? 'Calibrando...' : '🎯 Estou na Base! Calibrar Minha Posição'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresentialConfirmed(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirmar Presença no Pátio</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (baseSettings.enforceBaseGeofence && !isWithinBase && !presentialConfirmed && latitude === null)}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide uppercase shadow-lg transition-all flex items-center justify-center gap-2 ${
                baseSettings.enforceBaseGeofence && !isWithinBase && !presentialConfirmed && latitude === null
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 cursor-pointer'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registrando Entrada...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirmar Check-in &amp; Gerar Senha</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MY TICKET & CALL MONITOR */}
      {activeTab === 'my_ticket' && (
        <div className="space-y-6">
          {myTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
              {/* TICKET NUMBER BADGE */}
              <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 shadow-inner">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                  Sua Senha de Atendimento
                </span>
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-blue-400 font-mono mt-1">
                  #{String(myTicket.ticketNumber).padStart(3, '0')}
                </span>
                <span className="text-xs text-slate-400 mt-2">
                  Chegada: {myTicket.arrivalDate} às {myTicket.arrivalTime}
                </span>
              </div>

              {/* DRIVER INFO SUMMARY */}
              <div className="mt-6 max-w-md mx-auto text-left bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Motorista:</span>
                  <span className="font-bold text-white">{myTicket.driverName}</span>
                </div>
                {myTicket.licensePlate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Placa:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {myTicket.licensePlate}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Rota / Cidade:</span>
                  <span className="font-semibold text-slate-200">
                    {myTicket.route} ({myTicket.city})
                  </span>
                </div>
                {myTicket.isPriority && (
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>Prioridade:</span>
                    <span>SIM</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Localização:</span>
                  <span
                    className={
                      myTicket.locationStatus === 'validated_base'
                        ? 'text-emerald-400 font-medium'
                        : 'text-rose-400 font-medium'
                    }
                  >
                    {myTicket.locationStatus === 'validated_base'
                      ? `Na Base (${myTicket.distanceToBaseMeters}m)`
                      : `Fora da Base (${((myTicket.distanceToBaseMeters || 0) / 1000).toFixed(1)}km)`}
                  </span>
                </div>
              </div>

              {/* CURRENT STATUS BANNER */}
              <div className="mt-8">
                {myTicket.status === 'called' ? (
                  <div className="p-6 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 space-y-2 animate-pulse">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                      CHAMADA ATIVA!
                    </span>
                    <h3 className="text-3xl font-black text-white">
                      DIRIJA-SE À {myTicket.assignedDock || 'DOCA'}
                    </h3>
                    <p className="text-xs text-amber-200">
                      Seu veículo foi chamado para encostar e iniciar carregamento!
                    </p>
                  </div>
                ) : myTicket.status === 'at_dock' ? (
                  <div className="p-6 rounded-2xl bg-blue-500/20 border border-blue-400 text-blue-200 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                      EM OPERAÇÃO NA DOCA
                    </span>
                    <h3 className="text-2xl font-bold text-white">{myTicket.assignedDock}</h3>
                    <p className="text-xs text-blue-200">
                      Operação de carga/descarga em andamento. Aguarde a liberação.
                    </p>
                  </div>
                ) : myTicket.status === 'completed' ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h3 className="text-2xl font-bold text-white">Operação Concluída</h3>
                    <p className="text-xs text-emerald-200">
                      Veículo liberado! Boa viagem e dirija com segurança.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      AGUARDANDO NA FILA DO PÁTIO
                    </span>
                    <h3 className="text-3xl font-black text-white">
                      {queuePosition ? `${queuePosition}º na fila` : 'Aguardando Doca'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Mantenha esta página aberta ou ative as notificações. Seu celular tocará assim
                      que a próxima doca for liberada.
                    </p>
                  </div>
                )}
              </div>

              {/* TEST ALERT BUTTON */}
              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (stopAudioAlarmRef.current) stopAudioAlarmRef.current();
                    stopAudioAlarmRef.current = playMobileAlertSignal();
                    triggerVibration();
                    speakAnnouncement(myTicket.driverName, 'Doca 02');
                    sendPushNotification(
                      '🚨 TESTE DE SINAL: DOCA 02!',
                      `Motorista ${myTicket.driverName}, este é um teste do sinal sonoro e vibratório no seu celular.`
                    );
                    setShowFullScreenAlarm(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-300" />
                  <span>Testar Sinal Completo no Celular (Alarme + Vibração)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMyTicket(null);
                    setActiveTab('form');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Novo Check-in
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center text-slate-200 space-y-4">
              <Search className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold">Localizar Minha Senha de Atendimento</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Se você já realizou o check-in na portaria ou pelo totem, digite o número da sua senha
                ou selecione seu nome na fila.
              </p>
              <div className="flex max-w-xs mx-auto gap-2">
                <input
                  type="number"
                  placeholder="Nº da Senha (Ex: 3)"
                  value={myTicketNumberInput}
                  onChange={e => setMyTicketNumberInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    const num = parseInt(myTicketNumberInput, 10);
                    const found = checkIns.find(c => c.ticketNumber === num);
                    if (found) {
                      setMyTicket(found);
                    } else {
                      alert('Senha não encontrada na fila de hoje.');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shrink-0"
                >
                  Buscar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE WAITING QUEUE IN ARRIVAL ORDER */}
      {activeTab === 'live_queue' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl text-slate-100">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Fila de Espera em Tempo Real (Ordem de Chegada)
              </h3>
              <p className="text-xs text-slate-400">
                Atualização instantânea conforme as docas liberam
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {waitingList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Nenhum motorista aguardando na fila no momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {waitingList.map((item, index) => {
                const isSelected = myTicket?.id === item.id;
                const isCalled = item.status === 'called';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setMyTicket(item);
                      setActiveTab('my_ticket');
                    }}
                    className={`py-3.5 px-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      isCalled
                        ? 'bg-amber-950/40 border border-amber-500/40'
                        : isSelected
                        ? 'bg-blue-950/40 border border-blue-500/40'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isCalled
                            ? 'bg-amber-500 text-slate-950 animate-bounce'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{String(item.ticketNumber).padStart(2, '0')}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{item.driverName}</span>
                          {item.isPriority && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Prioritário
                            </span>
                          )}
                          {item.isManualRegistration && (
                            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-800 text-amber-400 border border-amber-500/20">
                              Novo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-300 bg-slate-950 px-1.5 py-0.2 rounded text-[11px] border border-slate-800">
                            {item.route}
                          </span>
                          <span>&bull;</span>
                          <span>{item.city}</span>
                          <span>&bull;</span>
                          <span>{item.arrivalTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isCalled ? (
                        <div className="text-xs font-black text-amber-400 uppercase tracking-wider animate-pulse">
                          Chamando: {item.assignedDock}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-slate-400">
                          {index + 1}º da fila
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QR CODE SHARING FOOTER (UNCLIPPED WITH MODAL EXPANSION) */}
      {qrCodeDataUrl && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <div
              onClick={() => setShowTotemModal(true)}
              className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-700 cursor-pointer hover:scale-105 transition-transform shrink-0"
              title="Clique para ampliar o QR Code em tela cheia"
            >
              <img
                src={qrCodeDataUrl}
                alt="QR Code E2E - DOCAS"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain block"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-sm sm:text-base">QR Code para Acesso no Celular</p>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sem Cortes
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Aponte a câmera do celular para abrir o check-in e acompanhar o alarme de chamada da sua doca.
              </p>
              <button
                onClick={() => setShowTotemModal(true)}
                className="mt-2 text-blue-400 hover:text-blue-300 font-semibold text-xs flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Ampliar QR Code / Modo Totem Portaria</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowTotemModal(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Ver em Tela Cheia</span>
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'E2E - DOCAS - Check-in de Motoristas',
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copiado para a área de transferência!');
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
            >
              Compartilhar Link
            </button>
          </div>
        </div>
      )}

      {/* TOTEM FULL MODAL */}
      <QRCodeTotemModal
        isOpen={showTotemModal}
        onClose={() => setShowTotemModal(false)}
      />
    </div>
  );
};
