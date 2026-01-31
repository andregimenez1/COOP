import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

export type NotificationType = 
  | 'substance_suggestion' 
  | 'supplier_request'
  | 'followed_item_new_offer' 
  | 'followed_item_expiring' 
  | 'followed_user_new_offer' 
  | 'proposal_received'
  | 'voting_opened'
  | 'voting_closed'
  | 'other';

export interface Notification {
  id: string;
  userId: string; // ID do usuário que deve receber a notificação
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // Link para redirecionar ao clicar
  read: boolean;
  createdAt: Date;
  relatedId?: string; // ID relacionado (ex: ID da sugestão, oferta, proposta)
}

interface NotificationContextType {
  allNotifications: Notification[];
  getNotificationsForUser: (userId: string | null) => Notification[];
  getUnreadCountForUser: (userId: string | null) => number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string, userId: string | null) => void;
  markAllAsRead: (userId: string | null) => void;
  removeNotification: (id: string, userId: string | null) => void;
  getNotificationsByType: (type: NotificationType, userId: string | null) => Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = 'magistral_notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [allNotifications, setAllNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined') return [];
    const loaded = safeGetItem<Notification[]>(NOTIFICATIONS_STORAGE_KEY, []);
    return loaded.map((n: any) => ({
      ...n,
      userId: n.userId || 'all', // Compatibilidade com notificações antigas
      createdAt: n.createdAt ? (n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt)) : new Date(),
    }));
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeSetItem(NOTIFICATIONS_STORAGE_KEY, allNotifications);
    }
  }, [allNotifications]);

  // Filtrar notificações do usuário atual (será usado pelo hook useNotifications)
  const getNotificationsForUser = (userId: string | null): Notification[] => {
    if (!userId) return [];
    return allNotifications.filter((n) => n.userId === userId);
  };

  // Contar não lidas do usuário atual (será usado pelo hook useNotifications)
  const getUnreadCountForUser = (userId: string | null): number => {
    if (!userId) return 0;
    return allNotifications.filter((n) => n.userId === userId && !n.read).length;
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    if (!notification.userId) {
      console.error('Notificação deve ter um userId');
      return;
    }
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date(),
    };
    setAllNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string, userId: string | null) => {
    if (!userId) return;
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id && n.userId === userId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = (userId: string | null) => {
    if (!userId) return;
    setAllNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );
  };

  const removeNotification = (id: string, userId: string | null) => {
    if (!userId) return;
    setAllNotifications((prev) => prev.filter((n) => !(n.id === id && n.userId === userId)));
  };

  const getNotificationsByType = (type: NotificationType, userId: string | null) => {
    if (!userId) return [];
    return allNotifications.filter((n) => n.userId === userId && n.type === type);
  };

  return (
    <NotificationContext.Provider
      value={{
        allNotifications,
        getNotificationsForUser,
        getUnreadCountForUser,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        getNotificationsByType,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Hook auxiliar que retorna notificações filtradas pelo usuário atual
export function useUserNotifications(userId: string | null) {
  const { getNotificationsForUser, getUnreadCountForUser, markAsRead, markAllAsRead, removeNotification, getNotificationsByType } = useNotifications();
  
  return {
    notifications: getNotificationsForUser(userId),
    unreadCount: getUnreadCountForUser(userId),
    markAsRead: (id: string) => markAsRead(id, userId),
    markAllAsRead: () => markAllAsRead(userId),
    removeNotification: (id: string) => removeNotification(id, userId),
    getNotificationsByType: (type: NotificationType) => getNotificationsByType(type, userId),
  };
}
