import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadChatUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
      markMessagesAsRead(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
    } else {
      navigate('/login');
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          if (selectedUser) {
            loadMessages(selectedUser.id);
          }
          loadChatUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadChatUsers = async () => {
    try {
      setIsLoading(true);
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = new Set<string>();
      messages?.forEach(msg => {
        if (msg.sender_id !== currentUser.id) userIds.add(msg.sender_id);
        if (msg.receiver_id !== currentUser.id) userIds.add(msg.receiver_id);
      });

      const users: ChatUser[] = [];
      for (const userId of userIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData?.user) {
          const lastMessage = messages?.find(msg => 
            msg.sender_id === userId || msg.receiver_id === userId
          );
          const unreadCount = messages?.filter(msg => 
            msg.sender_id === userId && msg.receiver_id === currentUser.id && !msg.read
          ).length || 0;

          users.push({
            id: userId,
            name: userData.user.user_metadata?.name || userData.user.email,
            last_message: lastMessage?.content,
            last_message_time: lastMessage?.created_at,
            unread_count: unreadCount
          });
        }
      }

      setUsers(users);
    } catch (err) {
      console.error('Error loading chat users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const markMessagesAsRead = async (userId: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', currentUser.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

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
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-8rem)]">
            {/* Users List */}
            <div className="border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate(-1)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-lg font-semibold">Chat</h2>
                </div>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : users.length > 0 ? (
                  users.map(user => (
                    <div
                      key={user.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedUser?.id === user.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-gray-900">{user.name}</h3>
                            {user.unread_count > 0 && (
                              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                {user.unread_count}
                              </span>
                            )}
                          </div>
                          {user.last_message && (
                            <>
                              <p className="text-sm text-gray-600 line-clamp-1">{user.last_message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(user.last_message_time!), {
                                  addSuffix: true,
                                  locale: id
                                })}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada percakapan
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col">
              {selectedUser ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-medium text-gray-900">{selectedUser.name}</h3>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.sender_id === currentUser.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                              locale: id
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ketik pesan..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Pilih pengguna untuk memulai chat
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;