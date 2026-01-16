import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { chatApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import { useAuthStore } from '../../store/authStore';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

interface Attachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file: string;
}

interface Message {
  id: string;
  sender: string;
  sender_name: string;
  sender_role: string;
  is_from_support: boolean;
  is_system_message: boolean;
  content: string;
  is_read: boolean;
  created_at: string;
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  reference: string;
  user_name: string;
  user_role: string;
  category: string;
  category_display: string;
  subject: string;
  status: string;
  status_display: string;
  assigned_to_name: string | null;
  last_message_at: string;
  last_message: {
    content: string;
    sender_name: string;
    is_from_support: boolean;
    created_at: string;
  } | null;
  unread_by_user: number;
  unread_by_support: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'GENERAL', label: 'Question générale' },
  { value: 'TECHNICAL', label: 'Problème technique' },
  { value: 'FORM', label: 'Bordereau Tax Free' },
  { value: 'REFUND', label: 'Remboursement' },
  { value: 'ACCOUNT', label: 'Compte utilisateur' },
  { value: 'MERCHANT', label: 'Commerçant' },
  { value: 'CUSTOMS', label: 'Douane' },
  { value: 'OTHER', label: 'Autre' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_USER: 'bg-purple-100 text-purple-700',
  WAITING_SUPPORT: 'bg-orange-100 text-orange-700',
};

export default function SupportChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatData, setNewChatData] = useState({ category: 'GENERAL', subject: '', message: '', recipientId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // User search for admin
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{id: string; full_name: string; email: string; role: string; role_display: string}>>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{id: string; full_name: string; email: string; role_display: string} | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  
  // File attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image modal
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  
  // Participants modal
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [participantSearchResults, setParticipantSearchResults] = useState<Array<{id: string; full_name: string; email: string; role: string; role_display: string}>>([]);

  const isSupport = user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'AUDITOR';

  // Fetch conversations
  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      const response = await chatApi.listConversations(params);
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch selected conversation details
  const { data: conversationDetail } = useQuery({
    queryKey: ['conversation', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const response = await chatApi.getConversation(selectedConversation);
      return response.data;
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000, // Refresh messages every 5 seconds
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: (data: { category: string; subject: string; initial_message: string }) =>
      chatApi.createConversation(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(response.data.id);
      setShowNewChat(false);
      setNewChatData({ category: 'GENERAL', subject: '', message: '', recipientId: '' });
      setSelectedRecipient(null);
    },
  });

  // Create conversation for specific user (admin)
  const createConversationForUser = useMutation({
    mutationFn: (data: { recipient_id: string; category: string; subject: string; initial_message: string }) =>
      chatApi.createForUser(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(response.data.id);
      setShowNewChat(false);
      setNewChatData({ category: 'GENERAL', subject: '', message: '', recipientId: '' });
      setSelectedRecipient(null);
    },
  });

  // Search users for autocomplete
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      const response = await chatApi.searchUsers(query, roleFilter);
      setUserSearchResults(response.data);
      setShowUserDropdown(true);
    } catch {
      setUserSearchResults([]);
    }
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: { conversation: string; content: string; files?: File[] }) => {
      if (data.files && data.files.length > 0) {
        const formData = new FormData();
        formData.append('conversation', data.conversation);
        formData.append('content', data.content);
        data.files.forEach((file) => {
          formData.append('attachments', file);
        });
        return chatApi.sendMessageWithAttachment(formData);
      }
      return chatApi.sendMessage({ conversation: data.conversation, content: data.content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage('');
      setSelectedFiles([]);
    },
  });

  // Take conversation mutation (for support)
  const takeConversation = useMutation({
    mutationFn: (id: string) => chatApi.takeConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Mark as read
  const markRead = useMutation({
    mutationFn: (id: string) => chatApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationDetail?.messages]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversation) {
      markRead.mutate(selectedConversation);
    }
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversation) return;
    sendMessage.mutate({ 
      conversation: selectedConversation, 
      content: newMessage || '📎 Pièce(s) jointe(s)',
      files: selectedFiles.length > 0 ? selectedFiles : undefined
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateChat = () => {
    if (!newChatData.subject.trim() || !newChatData.message.trim()) return;
    
    // If admin and recipient selected, use createForUser
    if (isSupport && selectedRecipient) {
      createConversationForUser.mutate({
        recipient_id: selectedRecipient.id,
        category: newChatData.category,
        subject: newChatData.subject,
        initial_message: newChatData.message,
      });
    } else {
      createConversation.mutate({
        category: newChatData.category,
        subject: newChatData.subject,
        initial_message: newChatData.message,
      });
    }
  };

  const handleSelectRecipient = (user: {id: string; full_name: string; email: string; role_display: string}) => {
    setSelectedRecipient(user);
    setUserSearchQuery(user.full_name);
    setShowUserDropdown(false);
  };

  const conversations = conversationsData?.results || conversationsData || [];
  const filteredConversations = Array.isArray(conversations) 
    ? conversations.filter((conv: Conversation) =>
        conv.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <FadeIn duration={400}>
      <div className="h-[calc(100vh-120px)] flex bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 mt-3">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg py-1 px-2"
            >
              <option value="">Tous les statuts</option>
              <option value="OPEN">Ouvert</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="WAITING_SUPPORT">En attente support</option>
              <option value="RESOLVED">Résolu</option>
            </select>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv: Conversation) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedConversation === conv.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-900 truncate flex-1">
                    {conv.subject}
                  </span>
                  {(isSupport ? conv.unread_by_support : conv.unread_by_user) > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                      {isSupport ? conv.unread_by_support : conv.unread_by_user}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[conv.status] || 'bg-gray-100'}`}>
                    {conv.status_display}
                  </span>
                  <span className="text-xs text-gray-400">{conv.reference}</span>
                </div>
                {conv.last_message && (
                  <p className="text-sm text-gray-500 truncate">
                    {conv.last_message.is_from_support ? '🛡️ ' : ''}
                    {conv.last_message.content}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {isSupport && conv.user_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {conv.last_message_at && formatTime(conv.last_message_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {showNewChat ? (
          /* New Chat Form */
          <div className="flex-1 p-6">
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Nouvelle conversation</h3>
                <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Recipient selection for admins */}
                {isSupport && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <UserPlusIcon className="w-4 h-4 inline mr-1" />
                      Destinataire
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg py-2 px-3 text-sm"
                      >
                        <option value="">Tous les rôles</option>
                        <option value="MERCHANT">Commerçant</option>
                        <option value="MERCHANT_EMPLOYEE">Employé commerçant</option>
                        <option value="CUSTOMS_AGENT">Agent douane</option>
                        <option value="OPERATOR">Opérateur</option>
                        <option value="AUDITOR">Auditeur</option>
                      </select>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value);
                            searchUsers(e.target.value);
                            if (!e.target.value) setSelectedRecipient(null);
                          }}
                          onFocus={() => userSearchResults.length > 0 && setShowUserDropdown(true)}
                          placeholder="Rechercher un utilisateur..."
                          className="w-full border border-gray-200 rounded-lg py-2 px-3"
                        />
                        {showUserDropdown && userSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {userSearchResults.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectRecipient(u)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-medium text-sm">{u.full_name}</p>
                                  <p className="text-xs text-gray-500">{u.email}</p>
                                </div>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{u.role_display}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedRecipient && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-primary-50 rounded-lg">
                        <span className="text-sm text-primary-700">
                          Destinataire: <strong>{selectedRecipient.full_name}</strong> ({selectedRecipient.role_display})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecipient(null);
                            setUserSearchQuery('');
                          }}
                          className="ml-auto text-primary-600 hover:text-primary-800"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    value={newChatData.category}
                    onChange={(e) => setNewChatData({ ...newChatData, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg py-2 px-3"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                  <input
                    type="text"
                    value={newChatData.subject}
                    onChange={(e) => setNewChatData({ ...newChatData, subject: e.target.value })}
                    placeholder="Décrivez brièvement votre demande"
                    className="w-full border border-gray-200 rounded-lg py-2 px-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={newChatData.message}
                    onChange={(e) => setNewChatData({ ...newChatData, message: e.target.value })}
                    placeholder="Expliquez votre demande en détail..."
                    rows={5}
                    className="w-full border border-gray-200 rounded-lg py-2 px-3 resize-none"
                  />
                </div>

                <button
                  onClick={handleCreateChat}
                  disabled={!newChatData.subject.trim() || !newChatData.message.trim() || createConversation.isPending}
                  className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createConversation.isPending ? 'Envoi...' : 'Démarrer la conversation'}
                </button>
              </div>
            </div>
          </div>
        ) : selectedConversation && conversationDetail ? (
          /* Chat View */
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{conversationDetail.subject}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[conversationDetail.status] || 'bg-gray-100'}`}>
                      {conversationDetail.status_display}
                    </span>
                    <span className="text-xs text-gray-500">{conversationDetail.reference}</span>
                    <span className="text-xs text-gray-500">• {conversationDetail.category_display}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSupport && !conversationDetail.assigned_to && (
                    <button
                      onClick={() => takeConversation.mutate(selectedConversation)}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                    >
                      Prendre en charge
                    </button>
                  )}
                  {conversationDetail.assigned_to && (
                    <span className="text-xs text-gray-500">
                      Assigné à: {conversationDetail.assigned_to?.first_name} {conversationDetail.assigned_to?.last_name}
                    </span>
                  )}
                  {isSupport && (
                    <button
                      onClick={() => setShowParticipantsModal(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="Gérer les participants"
                    >
                      <UserPlusIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationDetail.messages?.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_from_support ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] ${message.is_from_support ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.is_system_message
                          ? 'bg-gray-100 text-gray-600 text-center text-sm italic'
                          : message.is_from_support
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-primary-600 text-white'
                      }`}
                    >
                      {message.content}
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((att) => {
                            const isImage = att.file_type?.startsWith('image/');
                            if (isImage) {
                              return (
                                <div key={att.id}>
                                  <img
                                    src={att.file}
                                    alt={att.filename}
                                    className="max-w-[200px] max-h-[150px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                                className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                                  message.is_from_support 
                                    ? 'bg-white hover:bg-gray-50 text-gray-700' 
                                    : 'bg-primary-500 hover:bg-primary-400 text-white'
                                }`}
                              >
                                <PaperClipIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{att.filename}</span>
                                <span className="text-xs opacity-70">
                                  ({Math.round(att.file_size / 1024)} Ko)
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${message.is_from_support ? '' : 'justify-end'}`}>
                      <span>{message.sender_name}</span>
                      <span>•</span>
                      <span>{formatTime(message.created_at)}</span>
                      {!message.is_from_support && message.is_read && (
                        <CheckCircleIcon className="w-3 h-3 text-primary-500" />
                      )}
                    </div>
                  </div>
                  {message.is_from_support && (
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2 order-1">
                      <UserCircleIcon className="w-5 h-5 text-primary-600" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
                {/* Selected files preview */}
                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg text-sm">
                        <PaperClipIcon className="w-4 h-4 text-gray-500" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer">
                    <PaperClipIcon className="w-5 h-5" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                  </label>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
                    placeholder="Écrivez votre message..."
                    className="flex-1 border border-gray-200 rounded-lg py-2 px-4 focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || sendMessage.isPending}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Support en ligne</h3>
              <p className="text-gray-500 mb-4">
                Sélectionnez une conversation ou démarrez-en une nouvelle
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Nouvelle conversation
              </button>
            </div>
          </div>
        )}
      </div>

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
              alt="Image agrandie"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Participants</h2>
              <button onClick={() => setShowParticipantsModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Add participant search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter un participant</label>
              <input
                type="text"
                value={participantSearchQuery}
                onChange={(e) => {
                  setParticipantSearchQuery(e.target.value);
                  if (e.target.value.length >= 2) {
                    chatApi.searchUsers(e.target.value).then(res => setParticipantSearchResults(res.data));
                  } else {
                    setParticipantSearchResults([]);
                  }
                }}
                placeholder="Rechercher un utilisateur..."
                className="w-full border border-gray-200 rounded-lg py-2 px-3"
              />
              {participantSearchResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {participantSearchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={async () => {
                        try {
                          await chatApi.addParticipant(selectedConversation, u.id);
                          queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversation] });
                          setParticipantSearchQuery('');
                          setParticipantSearchResults([]);
                          toast.success(`${u.full_name} a été ajouté à la conversation`, {
                            style: {
                              borderRadius: '12px',
                              background: '#fff',
                              color: '#333',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            },
                            iconTheme: {
                              primary: '#10b981',
                              secondary: '#fff',
                            },
                          });
                        } catch (err: unknown) {
                          const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error 
                            || 'Erreur lors de l\'ajout du participant';
                          toast.error(errorMessage, {
                            style: {
                              borderRadius: '12px',
                              background: '#fff',
                              color: '#333',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            },
                            iconTheme: {
                              primary: '#ef4444',
                              secondary: '#fff',
                            },
                          });
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

            {/* Current participants list */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-gray-500 mb-2">Participants actuels</p>
              <div className="space-y-2">
                {conversationDetail?.user && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{conversationDetail.user.first_name} {conversationDetail.user.last_name}</p>
                      <p className="text-xs text-gray-500">{conversationDetail.user.email}</p>
                    </div>
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">Initiateur</span>
                  </div>
                )}
                {conversationDetail?.assigned_to && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{conversationDetail.assigned_to.first_name} {conversationDetail.assigned_to.last_name}</p>
                      <p className="text-xs text-gray-500">{conversationDetail.assigned_to.email}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Support</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
