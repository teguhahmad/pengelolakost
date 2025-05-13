import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { ArrowLeft, Send, Menu, X, ChevronLeft, Loader2 } from 'lucide-react';
import { chatService } from '../services/supabase';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showUserList, setShowUserList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    initializeChat();

    return () => {
      if (currentUser) {
        const channel = chatService.subscribeToMessages(() => {});
        channel.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    // Handle responsive layout
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowUserList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      setCurrentUser(session.user);
      await loadChatUsers();

      const subscription = chatService.subscribeToMessages(async (payload) => {
        if (payload.new) {
          if (selectedUser) {
            const messages = await chatService.getMessages(selectedUser.id);
            setMessages(messages || []);
          }
          await loadChatUsers();
        }
      });

      const state = location.state as any;
      if (state?.receiverId) {
        const conversations = await chatService.getConversations();
        const user = conversations.find(u => u.userId === state.receiverId);
        if (user) {
          setSelectedUser(user);
          const messages = await chatService.getMessages(user.userId);
          setMessages(messages || []);
          if (window.innerWidth < 768) {
            setShowUserList(false);
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError('Failed to initialize chat');
      setIsLoading(false);
    }
  };

  const loadChatUsers = async () => {
    try {
      const conversations = await chatService.getConversations();
      setUsers(conversations.map(conv => ({
        id: conv.userId,
        name: conv.name,
        last_message: conv.lastMessage,
        last_message_time: conv.lastMessageTime,
        unread_count: conv.unreadCount
      })));
    } catch (err) {
      console.error('Error loading chat users:', err);
      setError('Failed to load conversations');
    }
  };

  const handleUserSelect = async (user: ChatUser) => {
    setSelectedUser(user);
    try {
      const messages = await chatService.getMessages(user.id);
      setMessages(messages || []);
      scrollToBottom();
      if (window.innerWidth < 768) {
        setShowUserList(false);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    try {
      await chatService.sendMessage(selectedUser.id, newMessage.trim());
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: id
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm z-10">
        <div className="h-16 px-4 flex items-center justify-between">
          {showUserList ? (
            <>
              <button onClick={() => navigate(-1)} className="text-gray-600">
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-lg font-semibold">Chat</h1>
              <div className="w-8" /> {/* Spacer for alignment */}
            </>
          ) : (
            <>
              <button 
                onClick={() => setShowUserList(true)} 
                className="flex items-center text-gray-600"
              >
                <ChevronLeft size={24} />
                <span className="ml-2">Back</span>
              </button>
              <span className="font-medium">{selectedUser?.name}</span>
              <div className="w-8" /> {/* Spacer for alignment */}
            </>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-gray-600">
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-semibold">Chat</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Users List */}
        <div 
          className={`${
            showUserList ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-80 bg-white border-r border-gray-200`}
        >
          <div className="p-4">
            <input
              type="text"
              placeholder="Cari chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 ${
                  selectedUser?.id === user.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{user.name}</span>
                  </div>
                  {user.last_message && (
                    <p className="text-sm text-gray-500 truncate">{user.last_message}</p>
                  )}
                  {user.last_message_time && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      {formatMessageTime(user.last_message_time)}
                    </span>
                  )}
                </div>
                {user.unread_count > 0 && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                    {user.unread_count}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${
          !showUserList ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col bg-gray-100`}>
          {selectedUser ? (
            <>
              {/* Chat Header - Desktop */}
              <div className="hidden md:flex bg-white border-b border-gray-200 px-6 py-3 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-medium">{selectedUser.name}</h2>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              >
                {messages.map((message, index) => {
                  const isSender = message.sender_id === currentUser.id;
                  const showAvatar = index === 0 || 
                    messages[index - 1].sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isSender && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          isSender 
                            ? 'bg-blue-500 text-white rounded-br-none' 
                            : 'bg-white text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          isSender ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ketik pesan..."
                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 text-blue-500 hover:text-blue-700 disabled:text-gray-400"
                  >
                    <Send size={24} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Pilih pengguna untuk memulai chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
