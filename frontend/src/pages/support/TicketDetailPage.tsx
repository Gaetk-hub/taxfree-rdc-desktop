import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  XMarkIcon,
  PaperClipIcon,
  UserPlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface MessageAttachment {
  id: string;
  file: string;
  filename: string;
  file_type: string;
  file_size: number;
}

interface Message {
  id: string;
  author_name: string;
  content: string;
  is_internal: boolean;
  attachments?: MessageAttachment[];
  created_at: string;
}

interface Attachment {
  id: string;
  file: string;
  filename: string;
  file_type: string;
  file_size: number;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  type: string;
  type_display: string;
  subject: string;
  description: string;
  priority: string;
  priority_display: string;
  status: string;
  status_display: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string | null;
  is_escalated: boolean;
  is_overdue: boolean;
  escalation_reason: string;
  resolution: string;
  sla_due_at: string | null;
  messages: Message[];
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  NEED_INFO: 'bg-purple-100 text-purple-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  ESCALATED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Observers
  const [showObserversModal, setShowObserversModal] = useState(false);
  const [observerSearchQuery, setObserverSearchQuery] = useState('');
  const [observerSearchResults, setObserverSearchResults] = useState<Array<{id: string; full_name: string; email: string; role_display: string}>>([]);
  
  // Image modal
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  const isSupport = user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'AUDITOR';

  // Fetch ticket detail
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await disputesApi.get(id!);
      return response.data as TicketDetail;
    },
    enabled: !!id,
  });

  // Add message mutation
  const addMessage = useMutation({
    mutationFn: async (data: { content: string; is_internal?: boolean; files?: File[] }) => {
      if (data.files && data.files.length > 0) {
        const formData = new FormData();
        formData.append('content', data.content);
        formData.append('is_internal', String(data.is_internal || false));
        data.files.forEach((file) => {
          formData.append('attachments', file);
        });
        return disputesApi.addMessageWithAttachments(id!, formData);
      }
      return disputesApi.addMessage(id!, { content: data.content, is_internal: data.is_internal });
    },
    onSuccess: () => {
      setNewMessage('');
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  // Take ticket mutation
  const takeTicket = useMutation({
    mutationFn: () => disputesApi.take(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  // Resolve ticket mutation
  const resolveTicket = useMutation({
    mutationFn: (data: { status: string; resolution: string }) => 
      disputesApi.resolve(id!, data),
    onSuccess: () => {
      setShowResolveModal(false);
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  // Fetch observers
  const { data: observers = [] } = useQuery({
    queryKey: ['ticket-observers', id],
    queryFn: async () => {
      const response = await disputesApi.getObservers(id!);
      return response.data;
    },
    enabled: !!id && isSupport,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    addMessage.mutate({ 
      content: newMessage || '📎 Pièce(s) jointe(s)', 
      is_internal: isInternal,
      files: selectedFiles.length > 0 ? selectedFiles : undefined
    });
  };

  const handleResolve = () => {
    if (!resolution.trim()) return;
    resolveTicket.mutate({ status: 'RESOLVED', resolution });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket non trouvé</p>
      </div>
    );
  }

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-500">{ticket.ticket_number}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
              {ticket.priority_display}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[ticket.status]}`}>
              {ticket.status_display}
            </span>
            {ticket.is_escalated && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                <ArrowUpIcon className="w-3 h-3" />
                Escaladé
              </span>
            )}
            {ticket.is_overdue && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                En retard
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{ticket.subject}</h1>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {isSupport && !ticket.assigned_to && (
            <button
              onClick={() => takeTicket.mutate()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Prendre en charge
            </button>
          )}
          {isSupport && ticket.assigned_to === user?.id && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Résoudre
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-8 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Resolution (if resolved) */}
          {ticket.resolution && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
              <h2 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                Résolution
              </h2>
              <p className="text-emerald-700 whitespace-pre-wrap">{ticket.resolution}</p>
            </div>
          )}

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <PaperClipIcon className="w-5 h-5" />
                Pièces jointes ({ticket.attachments.length})
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {ticket.attachments.map((att) => {
                  const isImage = att.file_type?.startsWith('image/');
                  return (
                    <a
                      key={att.id}
                      href={att.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
                    >
                      {isImage ? (
                        <img src={att.file} alt={att.filename} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <PaperClipIcon className="w-5 h-5 text-gray-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{att.filename}</p>
                        <p className="text-xs text-gray-500">{Math.round(att.file_size / 1024)} Ko</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Messages ({ticket.messages?.length || 0})</h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {ticket.messages?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun message</p>
              ) : (
                ticket.messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.is_internal 
                        ? 'bg-amber-50 border border-amber-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{message.author_name}</span>
                        {message.is_internal && (
                          <span className="px-2 py-0.5 text-xs bg-amber-200 text-amber-800 rounded">
                            Note interne
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                    {/* Message Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((att) => {
                          const isImage = att.file_type?.startsWith('image/');
                          if (isImage) {
                            return (
                              <div key={att.id}>
                                <img
                                  src={att.file}
                                  alt={att.filename}
                                  className="max-w-[200px] max-h-[150px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity border"
                                  onClick={() => setImageModalUrl(att.file)}
                                />
                              </div>
                            );
                          }
                          return (
                            <a
                              key={att.id}
                              href={att.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:bg-gray-50 text-sm w-fit"
                            >
                              <PaperClipIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{att.filename}</span>
                              <span className="text-xs text-gray-400">
                                ({Math.round(att.file_size / 1024)} Ko)
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message when ticket is closed/resolved */}
            {(ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-gray-500 text-sm">
                  🔒 Ce ticket est {ticket.status === 'RESOLVED' ? 'résolu' : 'clôturé'}. Aucun nouveau message ne peut être ajouté.
                </p>
              </div>
            )}

            {/* Message Input - blocked when ticket is resolved or closed */}
            {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
              <div className="p-4 border-t border-gray-200">
                {isSupport && (
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">Note interne (invisible pour le client)</span>
                  </label>
                )}
                {/* Selected files preview */}
                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg text-sm">
                        <PaperClipIcon className="w-4 h-4 text-gray-500" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer self-end">
                    <PaperClipIcon className="w-5 h-5" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const files = Array.from(e.target.files);
                          console.log('Files selected:', files);
                          setSelectedFiles(prev => [...prev, ...files]);
                        }
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    rows={3}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (items) {
                        const files: File[] = [];
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i];
                          if (item.kind === 'file') {
                            const file = item.getAsFile();
                            if (file) files.push(file);
                          }
                        }
                        if (files.length > 0) {
                          e.preventDefault();
                          setSelectedFiles(prev => [...prev, ...files]);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || addMessage.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-4">
          {/* Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Informations</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{ticket.type_display}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Créé par</span>
                <span className="font-medium flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  {ticket.created_by_name || 'Anonyme'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Créé le</span>
                <span className="font-medium flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {formatDate(ticket.created_at)}
                </span>
              </div>
              {ticket.assigned_to_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigné à</span>
                  <span className="font-medium text-primary-600">{ticket.assigned_to_name}</span>
                </div>
              )}
              {ticket.sla_due_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Échéance SLA</span>
                  <span className={`font-medium ${ticket.is_overdue ? 'text-red-600' : ''}`}>
                    {formatDate(ticket.sla_due_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Observers Card - Admin only */}
          {isSupport && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  Observateurs ({observers.length})
                </h3>
                <button
                  onClick={() => setShowObserversModal(true)}
                  disabled={ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'}
                  className={`p-1 rounded ${
                    ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100'
                  }`}
                  title={ticket.status === 'CLOSED' || ticket.status === 'RESOLVED' 
                    ? 'Ticket clôturé' 
                    : 'Gérer les observateurs'}
                >
                  <UserPlusIcon className="w-5 h-5" />
                </button>
              </div>
              {observers.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun observateur</p>
              ) : (
                <div className="space-y-2">
                  {observers.map((obs: { user_id: string; user_name: string; user_email: string }) => (
                    <div key={obs.user_id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{obs.user_name}</p>
                        <p className="text-xs text-gray-500">{obs.user_email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Escalation Info */}
          {ticket.is_escalated && ticket.escalation_reason && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <ArrowUpIcon className="w-4 h-4" />
                Escalade
              </h3>
              <p className="text-sm text-red-700">{ticket.escalation_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Résoudre le ticket</h2>
              <button onClick={() => setShowResolveModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Résolution *
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Décrivez comment le problème a été résolu..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolution.trim() || resolveTicket.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Résoudre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observers Modal */}
      {showObserversModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <EyeIcon className="w-5 h-5" />
                Observateurs
              </h2>
              <button onClick={() => setShowObserversModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Add observer search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter un observateur</label>
              <input
                type="text"
                value={observerSearchQuery}
                onChange={(e) => {
                  setObserverSearchQuery(e.target.value);
                  if (e.target.value.length >= 2) {
                    disputesApi.searchUsers(e.target.value).then(res => setObserverSearchResults(res.data));
                  } else {
                    setObserverSearchResults([]);
                  }
                }}
                placeholder="Rechercher un utilisateur..."
                className="w-full border border-gray-200 rounded-lg py-2 px-3"
              />
              {observerSearchResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {observerSearchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={async () => {
                        try {
                          await disputesApi.addObserver(id!, u.id);
                          queryClient.invalidateQueries({ queryKey: ['ticket-observers', id] });
                          setObserverSearchQuery('');
                          setObserverSearchResults([]);
                          toast.success(`${u.full_name} ajouté comme observateur`);
                        } catch (err: unknown) {
                          const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error 
                            || 'Erreur lors de l\'ajout';
                          toast.error(errorMessage);
                        }
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
                    >
                      <span>{u.full_name}</span>
                      <span className="text-xs text-gray-500">{u.role_display}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current observers list */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-gray-500 mb-2">Observateurs actuels ({observers.length})</p>
              {observers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun observateur</p>
              ) : (
                <div className="space-y-2">
                  {observers.map((obs: { user_id: string; user_name: string; user_email: string; user_role: string }) => (
                    <div key={obs.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{obs.user_name}</p>
                        <p className="text-xs text-gray-500">{obs.user_email}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await disputesApi.removeObserver(id!, obs.user_id);
                            queryClient.invalidateQueries({ queryKey: ['ticket-observers', id] });
                            toast.success('Observateur retiré');
                          } catch {
                            toast.error('Erreur lors de la suppression');
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Retirer"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={imageModalUrl}
              alt="Pièce jointe"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
