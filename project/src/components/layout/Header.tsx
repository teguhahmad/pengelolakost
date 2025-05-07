import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, MessageCircle } from 'lucide-react';
import Button from '../ui/Button';
import PropertySelector from './PropertySelector';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onNavigate?: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, onNavigate }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [userName, setUserName] = useState('Admin');
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const initializeHeader = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      await loadUserProfile();
      await subscribeToUnreadChats();
    };

    initializeHeader();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile();
        await subscribeToUnreadChats();
      } else if (event === 'SIGNED_OUT') {
        setUserName('Admin');
        setUnreadChats(0);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    setUserName(session.user.user_metadata?.name || 'Admin');
  };

  const subscribeToUnreadChats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${session.user.id}`
        },
        () => {
          loadUnreadChats();
        }
      )
      .subscribe();

    await loadUnreadChats();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadUnreadChats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('receiver_id', session.user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadChats(data?.length || 0);
    } catch (err) {
      console.error('Error loading unread chats:', err);
    }
  };

  const handleViewAllNotifications = () => {
    setShowNotifications(false);
    if (onNavigate) {
      onNavigate('notifications');
    }
  };

  const handleChatClick = () => {
    navigate('/chat');
  };

  const unreadNotifications = notifications.filter(n => n.status === 'unread').slice(0, 5);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm h-16 flex items-center z-20">
      <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-4">
          <button onClick={onMenuClick} className="lg:hidden text-gray-500 focus:outline-none">
            <Menu size={24} />
          </button>
          
          <div className="hidden sm:block">
            <PropertySelector />
          </div>
          
          <div className="hidden sm:block mx-4 h-6 w-px bg-gray-200" />
          
          <h1 className="text-lg lg:text-xl font-semibold text-gray-800 truncate">{title}</h1>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <button 
            className="relative text-gray-500 hover:text-gray-700 focus:outline-none p-2"
            onClick={handleChatClick}
          >
            <MessageCircle size={20} />
            {unreadChats > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unreadChats}
              </span>
            )}
          </button>

          <div className="relative" ref={notificationsRef}>
            <button 
              className="relative text-gray-500 hover:text-gray-700 focus:outline-none p-2"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-800">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-medium text-red-500">{unreadCount} belum dibaca</span>
                    )}
                  </div>
                </div>
                {unreadNotifications.length > 0 ? (
                  unreadNotifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer bg-blue-50"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true,
                              locale: id 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Tidak ada notifikasi baru
                  </div>
                )}
                <div className="px-4 py-2 border-t border-gray-100">
                  <button 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={handleViewAllNotifications}
                  >
                    Lihat semua notifikasi
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden lg:inline-block text-sm font-medium text-gray-700">{userName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
