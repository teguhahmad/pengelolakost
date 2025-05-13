import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { ArrowLeft, Send, Image, Paperclip, ChevronDown, Loader2 } from 'lucide-react';

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

const POLLING_INTERVAL = 3000; // Poll every 3 seconds

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
  const pollingIntervalRef = useRef<number>();

  useEffect(() => {
    initializeChat();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      setCurrentUser(session.user);
      setIsLoading(false);

      // Start polling for messages
      startPolling();

      // If we have a receiver from navigation state, select them
      const state = location.state as any;
      if (state?.receiverId) {
        const userDetails = await fetchUserDetails([state.receiverId]);
        if (userDetails.length > 0) {
          setSelectedUser({
            id: userDetails[0].id,
            name: userDetails[0].name,
            unread_count: 0
          });
        }
      }
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError('Failed to initialize chat');
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    // Initial load
    loadChatUsers();
    if (selectedUser) {
      loadMessages(selectedUser.id);
    }

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      loadChatUsers();
      if (selectedUser) {
        loadMessages(selectedUser.id);
      }
    }, POLLING_INTERVAL);
  };

  const fetchUserDetails = async (userIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No access token');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-details`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch user details');
      const data = await response.json();
      return data.users || [];
    } catch (err) {
      console.error('Error fetching user details:', err);
      return [];
    }
  };

  const loadChatUsers = async () => {
    if (!currentUser) return;

    try {
      // Get all messages to/from current user
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique user IDs
      const userIds = new Set<string>();
      messages?.forEach(msg => {
        if (msg.sender_id !== currentUser.id) userIds.add(msg.sender_id);
        if (msg.receiver_id !== currentUser.id) userIds.add(msg.receiver_id);
      });

      // Fetch user details
      const userDetails = await fetchUserDetails(Array.from(userIds));

      // Create chat users with last message and unread count
      const chatUsers = userDetails.map(userData => {
        const lastMessage = messages?.find(msg => 
          msg.sender_id === userData.id || msg.receiver_id === userData.id
        );
        const unreadCount = messages?.filter(msg => 
          msg.sender_id === userData.id && 
          msg.receiver_id === currentUser.id && 
          !msg.read
        ).length || 0;

        return {
          id: userData.id,
          name: userData.name,
          last_message: lastMessage?.content,
          last_message_time: lastMessage?.created_at,
          unread_count: unreadCount
        };
      });

      setUsers(chatUsers);
    } catch (err) {
      console.error('Error loading chat users:', err);
      setError('Failed to load chat users');
    }
  };

  const loadMessages = async (userId: string) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),` +
          `and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Only update messages if there are changes
      if (JSON.stringify(data) !== JSON.stringify(messages)) {
        setMessages(data || []);
        scrollToBottom();
      }

      // Mark messages as read
      const unreadMessages = data?.filter(msg => 
        msg.sender_id === userId && 
        msg.receiver_id === currentUser.id && 
        !msg.read
      ) || [];

      if (unreadMessages.length > 0) {
        await Promise.all(unreadMessages.map(msg =>
          supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('id', msg.id)
        ));
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          sender_id: currentUser.id,
          receiver_id: selectedUser.id,
          content: newMessage.trim(),
          read: false
        }]);

      if (error) throw error;
      setNewMessage('');
      loadMessages(selectedUser.id);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: id
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
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
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4">
            <input
              type="text"
              placeholder="Cari chat..."
              className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
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
                    {user.last_message_time && (
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(user.last_message_time)}
                      </span>
                    )}
                  </div>
                  {user.last_message && (
                    <p className="text-sm text-gray-500 truncate">{user.last_message}</p>
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
        <div className="flex-1 flex flex-col bg-gray-100">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-medium">{selectedUser.name}</h2>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
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
                        <p className="text-sm">{message.content}</p>
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

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <button
                  onClick={handleScrollToBottom}
                  className="absolute bottom-24 right-8 bg-white rounded-full p-2 shadow-lg"
                >
                  <ChevronDown size={24} className="text-gray-600" />
                </button>
              )}

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <Image size={24} />
                  </button>
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <Paperclip size={24} />
                  </button>
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
