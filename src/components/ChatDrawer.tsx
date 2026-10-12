import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  AlertTriangle,
  Flame,
  Radio,
  Clock,
  Trash2,
  Filter,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, CollaboratorUser, DockConfig } from '../types';
import { sendChatMessage, clearChatMessages } from '../services/api';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CollaboratorUser | null;
  docks: DockConfig[];
  messages: ChatMessage[];
  onNewMessageSent?: (msg: ChatMessage) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  docks,
  messages,
  onNewMessageSent,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedDockFilter, setSelectedDockFilter] = useState<string>('all');
  const [targetDock, setTargetDock] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdminOrMaster = Boolean(currentUser?.isAdmin || currentUser?.isMaster);
  const userDock = currentUser?.assignedDock || null;

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Filter messages based on selected view
  const filteredMessages = messages.filter(m => {
    if (selectedDockFilter === 'all') return true;
    return m.targetDock === selectedDockFilter || m.senderDock === selectedDockFilter;
  });

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const senderRole = currentUser?.isMaster
      ? 'master'
      : currentUser?.isAdmin
      ? 'admin'
      : 'colaborador';

    const senderName = currentUser?.name || 'Operador da Doca';
    const senderId = currentUser?.id || 'collab-dock';
    const senderDock = userDock;

    setSending(true);
    try {
      const response = await sendChatMessage({
        senderId,
        senderName,
        senderRole,
        senderDock,
        targetDock: targetDock ? targetDock : null,
        content: inputText.trim(),
        isUrgent,
      });

      setInputText('');
      setIsUrgent(false);
      if (onNewMessageSent && response.message) {
        onNewMessageSent(response.message);
      }
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleQuickTemplate = (text: string, urgent: boolean = false) => {
    setInputText(text);
    setIsUrgent(urgent);
  };

  const handleClearHistory = async () => {
    if (!confirm('Deseja realmente limpar o histórico de mensagens do chat?')) return;
    try {
      await clearChatMessages();
    } catch (err: any) {
      alert('Erro ao limpar mensagens: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-lg h-full flex flex-col shadow-2xl text-zinc-100">
        {/* HEADER */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Chat Docas &amp; ADM</h3>
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tempo Real
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {userDock ? (
                  <span>
                    Conectado como <strong className="text-zinc-200">{currentUser?.name}</strong> na{' '}
                    <strong className="text-amber-300">{userDock}</strong>
                  </span>
                ) : isAdminOrMaster ? (
                  <span>
                    Administração Central &bull; Comunicação direta com os operadores
                  </span>
                ) : (
                  <span>Canal aberto para avisos operacionais entre portaria e docas</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdminOrMaster && messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                title="Limpar histórico de mensagens"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DOCK CHANNEL FILTER BAR */}
        <div className="px-4 py-2 bg-zinc-900/40 border-b border-zinc-850 flex items-center justify-between text-xs gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 text-[11px]">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span>Filtrar canal:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => setSelectedDockFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedDockFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Todas as Docas ({messages.length})
            </button>

            {docks.map(d => {
              const count = messages.filter(
                m => m.targetDock === d.name || m.senderDock === d.name
              ).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDockFilter(d.name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-colors ${
                    selectedDockFilter === d.name
                      ? 'bg-amber-500 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {d.name} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-zinc-700" />
              <p className="text-xs font-semibold text-zinc-400">Nenhuma mensagem neste canal</p>
              <p className="text-[11px] max-w-xs">
                Utilize este chat para trocar avisos rápidos de conferência de pacotes, chamadas de
                motoristas ou intercorrências nas docas.
              </p>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isMe = currentUser?.id === msg.senderId;
              const isCollab = msg.senderRole === 'colaborador';
              const isMaster = msg.senderRole === 'master';
              const isAdmin = msg.senderRole === 'admin';

              return (
                <div
                  key={msg.id}
                  className={`rounded-2xl p-3.5 space-y-1.5 transition-all ${
                    msg.isUrgent
                      ? 'bg-rose-950/40 border border-rose-500/50 shadow-md shadow-rose-950/20'
                      : isMe
                      ? 'bg-zinc-900/90 border border-blue-500/40 ml-4'
                      : 'bg-zinc-900/60 border border-zinc-800 mr-4'
                  }`}
                >
                  {/* SENDER BADGE & TIME */}
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-white truncate">{msg.senderName}</span>

                      {/* ROLE / DOCK PILL */}
                      {msg.senderDock ? (
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                          {msg.senderDock}
                        </span>
                      ) : isMaster ? (
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                          Master
                        </span>
                      ) : isAdmin ? (
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                          ADM
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-zinc-400 text-[10px]">
                          Operador
                        </span>
                      )}

                      {/* TARGET DOCK BADGE */}
                      {msg.targetDock && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          &rarr; {msg.targetDock}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0 font-mono">
                      {msg.isUrgent && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5" />
                          URGENTE
                        </span>
                      )}
                      <span>{msg.createdAtFormatted}</span>
                    </div>
                  </div>

                  {/* MESSAGE CONTENT */}
                  <p className="text-xs text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK LOGISTICS REPLIES */}
        <div className="p-2.5 bg-zinc-900/50 border-t border-zinc-850 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Respostas rápidas da operação:
            </span>
            <span>Clique para preencher</span>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() =>
                handleQuickTemplate(
                  userDock
                    ? `🚚 ${userDock}: Motorista encostou na vaga e apresentação iniciada.`
                    : '🚚 Motorista encostou na doca designada.'
                )
              }
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition-colors"
            >
              🚚 Encoste confirmado
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickTemplate(
                  userDock
                    ? `📦 ${userDock}: Conferência de pacotes iniciada com o motorista.`
                    : '📦 Conferência de pacotes iniciada.'
                )
              }
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition-colors"
            >
              📦 Conferência iniciada
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickTemplate(
                  userDock
                    ? `⚠️ ${userDock}: Divergência na contagem de pacotes! Favor verificar com a expedição.`
                    : '⚠️ Divergência na contagem de pacotes.',
                  true
                )
              }
              className="px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 text-[10px] text-rose-300 hover:text-rose-200 transition-colors"
            >
              ⚠️ Alerta de divergência
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickTemplate(
                  userDock
                    ? `✅ ${userDock}: Carga concluída e liberada. Doca disponível para próxima chamada!`
                    : '✅ Doca liberada para o próximo motorista.'
                )
              }
              className="px-2 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 text-[10px] text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              ✅ Doca liberada
            </button>

            {isAdminOrMaster && (
              <button
                type="button"
                onClick={() =>
                  handleQuickTemplate(
                    '📢 Atenção operadores: priorizar liberação das rotas do Entorno (14A/15A/18A).',
                    false
                  )
                }
                className="px-2 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/30 text-[10px] text-blue-300 hover:text-blue-200 transition-colors"
              >
                📢 Priorizar Entorno
              </button>
            )}
          </div>
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSend} className="p-3 bg-zinc-900 border-t border-zinc-800 space-y-2">
          {/* SENDER & TARGET OPTIONS */}
          <div className="flex items-center justify-between text-[11px] gap-2">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span>Destino:</span>
              <select
                value={targetDock}
                onChange={e => setTargetDock(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0.5 text-[11px] text-zinc-200 font-mono focus:outline-none"
              >
                <option value="">Todas as Docas (Geral)</option>
                {docks.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name} {d.activeOperatorName ? `(${d.activeOperatorName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                isUrgent
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
            >
              <Flame className={`w-3 h-3 ${isUrgent ? 'text-amber-300' : 'text-zinc-500'}`} />
              <span>{isUrgent ? 'Alerta Urgente!' : 'Normal'}</span>
            </button>
          </div>

          {/* TEXT INPUT & SEND BUTTON */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                userDock
                  ? `Mensagem como ${userDock}... (Pressione Enter)`
                  : 'Digite um aviso ou mensagem para as docas...'
              }
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
