import React, { useState } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  X,
  Plus,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText,
  Truck,
  User,
} from 'lucide-react';
import { CollaboratorUser, DriverCheckIn, PackageMovement } from '../types';
import { recordPackageMovement } from '../services/api';
import { playCallingChime, speakPackageAdded } from '../services/sound';

interface PackageMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CollaboratorUser | null;
  activeCheckIns: DriverCheckIn[];
  onMovementRecorded?: (movement: PackageMovement) => void;
  defaultSourceRoute?: string;
}

const QUICK_OBSERVATIONS = [
  '📦 Pacote sobressalente remanejado da expedição',
  '⚡ Carga com prioridade de entrega adicionada à rota',
  '🔄 Pacote remanejado por divergência na conferência da doca',
  '🚚 Complemento de carga solicitado pela expedição',
  '⚠️ Pacote reembalado e pronto para entrega',
];

export const PackageMovementModal: React.FC<PackageMovementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeCheckIns,
  onMovementRecorded,
  defaultSourceRoute,
}) => {
  const [sourceRoute, setSourceRoute] = useState(
    defaultSourceRoute || currentUser?.assignedDock || 'Expedição / Pátio'
  );
  const [targetRoute, setTargetRoute] = useState('');
  const [packageCount, setPackageCount] = useState<number>(1);
  const [trackingCode, setTrackingCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{
    route: string;
    count: number;
    notes: string;
  } | null>(null);

  const isAuthorized = Boolean(
    currentUser?.isMaster || currentUser?.isAdmin || currentUser?.permissions?.canMovePackages
  );

  if (!isOpen) return null;

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Autorização Prévia Necessária</h3>
          <p className="text-xs text-zinc-400">
            A movimentação e transferência de pacotes entre rotas só é permitida para colaboradores com autorização prévia do Usuário Master (<strong>Giliano Costa</strong>) ou dos administradores.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetRoute.trim()) {
      alert('Por favor, informe a rota de destino para onde o pacote está sendo movimentado.');
      return;
    }

    if (!notes.trim()) {
      alert('Por favor, informe uma observação sobre esta rota para o registro da movimentação.');
      return;
    }

    setSubmitting(true);
    try {
      const collaboratorName = currentUser?.name || 'Operador da Doca';
      const collaboratorDock = currentUser?.assignedDock || undefined;

      const res = await recordPackageMovement({
        sourceRoute: sourceRoute.trim(),
        targetRoute: targetRoute.trim().toUpperCase(),
        packageCount: packageCount > 0 ? packageCount : 1,
        trackingCode: trackingCode.trim() || undefined,
        notes: notes.trim(),
        collaboratorName,
        collaboratorDock,
      });

      // 1. Play chime audio alert
      playCallingChime();

      // 2. Speak voice alert in Portuguese ("falar que o pacote foi adicionado!")
      speakPackageAdded(targetRoute.trim().toUpperCase(), notes.trim());

      // 3. Show local success alert banner
      setSuccessAlert({
        route: targetRoute.trim().toUpperCase(),
        count: packageCount,
        notes: notes.trim(),
      });

      if (onMovementRecorded && res.movement) {
        onMovementRecorded(res.movement);
      }

      // Auto-close after brief confirmation or let user close
      setTimeout(() => {
        setSuccessAlert(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      alert('Erro ao registrar movimentação de pacotes: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-zinc-100 overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md">
              <Boxes className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Movimentação &amp; Alerta de Pacotes
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                  Voz &amp; Alerta
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Movimente pacotes para outra rota, adicione observações e emita o alerta por voz
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* SUCCESS BANNER ALERT */}
          {successAlert && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-white">
                    📢 Pacote Adicionado com Sucesso!
                  </p>
                  <span className="flex items-center gap-1 text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300">
                    <Volume2 className="w-3 h-3 animate-ping" />
                    Voz disparada
                  </span>
                </div>
                <p>
                  {successAlert.count} pacote(s) adicionado(s) para a rota{' '}
                  <strong className="text-white font-mono">{successAlert.route}</strong>.
                </p>
                <p className="text-[11px] text-emerald-300/90 italic">
                  &ldquo;{successAlert.notes}&rdquo;
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ORIGIN & DESTINATION GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-zinc-400" />
                  Origem do Pacote:
                </label>
                <input
                  type="text"
                  value={sourceRoute}
                  onChange={e => setSourceRoute(e.target.value)}
                  placeholder="Ex: Doca 02, Pátio, Rota Anterior..."
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  Rota de Destino *:
                </label>
                <input
                  type="text"
                  required
                  value={targetRoute}
                  onChange={e => setTargetRoute(e.target.value)}
                  placeholder="Digite a rota destino (Ex: Ceilândia, Gama, 16A...)"
                  className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                  autoFocus
                />
              </div>
            </div>

            {/* QUICK ACTIVE DESTINATIONS (AUTOCOMPLETE FROM ACTIVE TRUCKS IN DOCKS/QUEUE) */}
            {activeCheckIns.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-semibold">
                  Sugestões de rotas ativas no pátio agora:
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(activeCheckIns.map(c => c.route).filter(Boolean))).map(
                    routeOption => (
                      <button
                        key={routeOption}
                        type="button"
                        onClick={() => setTargetRoute(routeOption)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors ${
                          targetRoute.toUpperCase() === routeOption.toUpperCase()
                            ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {routeOption}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* COUNT & TRACKING CODE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-blue-400" />
                  Quantidade de Pacotes *:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPackageCount(prev => Math.max(1, prev - 1))}
                    className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-white font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={packageCount}
                    onChange={e => setPackageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 bg-zinc-900 border border-zinc-750 rounded-lg py-2 text-center text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPackageCount(prev => prev + 1)}
                    className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Código do Pacote / NF (Opcional):
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={e => setTrackingCode(e.target.value)}
                  placeholder="Ex: BR84920491 ou NF 1492"
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            {/* MANDATORY ROUTE OBSERVATION */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Observação nesta Rota (Obrigatória) *:
                </span>
                <span className="text-[10px] text-zinc-400">
                  Ficará registrada na rota do motorista
                </span>
              </label>

              <textarea
                required
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Pacote adicionado para entrega prioritária remanejado da doca 2 pelo conferente Fernando..."
                className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed resize-none"
              />

              {/* QUICK OBSERVATIONS TEMPLATES */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Observações rápidas sugeridas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {QUICK_OBSERVATIONS.map(obs => (
                    <button
                      key={obs}
                      type="button"
                      onClick={() => setNotes(obs)}
                      className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition-colors text-left"
                    >
                      {obs}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SENDER INFO */}
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  Registrado por: <strong className="text-zinc-200">{currentUser?.name || 'Operador'}</strong>
                  {currentUser?.assignedDock ? ` (${currentUser.assignedDock})` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                <Volume2 className="w-3 h-3" />
                <span>Alerta por voz ativado</span>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !targetRoute.trim() || !notes.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-zinc-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-98"
              >
                <Boxes className="w-4 h-4 text-zinc-950" />
                <span>
                  {submitting ? 'Registrando Movimentação...' : 'Confirmar & Disparar Alerta por Voz'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <span>Ao confirmar, o sistema anunciará em voz alta que o pacote foi adicionado</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
