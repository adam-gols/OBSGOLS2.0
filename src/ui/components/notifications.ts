import { EventManager } from '../../core/event-manager';
import { Logger } from '../../utils/logger';

interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  id?: string;
}

export class NotificationsManager {
  private eventManager: EventManager;
  private logger: Logger;
  private notifications: Map<string, HTMLElement> = new Map();
  private notificationCounter = 0;

  constructor(eventManager: EventManager, logger: Logger) {
    this.eventManager = eventManager;
    this.logger = logger;
    
    this.initialize();
  }

  private initialize(): void {
    this.logger.debug('Initializing Notifications Manager', {
      module: 'UI',
      action: 'INIT',
      data: { component: 'NotificationsManager' }
    });
    
    // Listen for notification events
    this.eventManager.on('notification:show', this.handleShowNotification.bind(this));
    this.eventManager.on('notification:hide', this.handleHideNotification.bind(this));
    this.eventManager.on('notification:clear', this.handleClearAll.bind(this));
  }

  private handleShowNotification(data: NotificationData): void {
    const id = data.id || `notification-${++this.notificationCounter}`;
    const duration = data.duration || this.getDefaultDuration(data.type);
    
    this.logger.debug('Showing notification', {
      module: 'UI',
      action: 'SHOW_NOTIFICATION',
      data: { 
        component: 'NotificationsManager',
        type: data.type,
        id,
        duration
      }
    });
    
    this.createNotification(id, data.type, data.message, duration);
  }

  private handleHideNotification(data: { id: string }): void {
    this.hideNotification(data.id);
  }

  private handleClearAll(): void {
    this.logger.debug('Clearing all notifications', {
      module: 'UI',
      action: 'CLEAR_ALL',
      data: { component: 'NotificationsManager' }
    });
    
    this.notifications.forEach((_, id) => {
      this.hideNotification(id);
    });
  }

  private createNotification(id: string, type: string, message: string, duration: number): void {
    const container = document.getElementById('notifications-area');
    if (!container) {
      this.logger.error('Notifications container not found', {
        module: 'UI',
        action: 'CREATE_NOTIFICATION_ERROR',
        data: { component: 'NotificationsManager' }
      });
      return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `gols-notification gols-notification-${type}`;
    
    // Create notification content
    notification.innerHTML = `
      <div class="gols-notification-content">
        <div class="gols-notification-icon">
          <i class="${this.getNotificationIcon(type)}"></i>
        </div>
        <div class="gols-notification-message">
          ${this.escapeHtml(message)}
        </div>
        <button class="gols-notification-close" aria-label="Close notification">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="gols-notification-progress"></div>
    `;

    // Add close button handler
    const closeButton = notification.querySelector('.gols-notification-close') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideNotification(id);
      });
    }

    // Add to container
    container.appendChild(notification);
    this.notifications.set(id, notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('gols-notification-show');
    });

    // Auto-hide after duration
    if (duration > 0) {
      this.startProgressBar(notification, duration);
      setTimeout(() => {
        this.hideNotification(id);
      }, duration);
    }
  }

  private hideNotification(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    this.logger.debug('Hiding notification', {
      module: 'UI',
      action: 'HIDE_NOTIFICATION',
      data: { component: 'NotificationsManager', id }
    });

    // Trigger hide animation
    notification.classList.add('gols-notification-hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300); // Animation duration
  }

  private startProgressBar(notification: HTMLElement, duration: number): void {
    const progressBar = notification.querySelector('.gols-notification-progress') as HTMLElement;
    if (!progressBar) return;

    progressBar.style.animationDuration = `${duration}ms`;
    progressBar.classList.add('gols-notification-progress-active');
  }

  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-bell';
    }
  }

  private getDefaultDuration(type: string): number {
    switch (type) {
      case 'success': return 3000;
      case 'error': return 5000;
      case 'warning': return 4000;
      case 'info': return 3000;
      default: return 3000;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public methods for programmatic use
  public showSuccess(message: string, duration?: number): string {
    const id = `success-${++this.notificationCounter}`;
    const data: NotificationData = { id, type: 'success', message };
    if (duration !== undefined) {
      data.duration = duration;
    }
    this.handleShowNotification(data);
    return id;
  }

  public showError(message: string, duration?: number): string {
    const id = `error-${++this.notificationCounter}`;
    const data: NotificationData = { id, type: 'error', message };
    if (duration !== undefined) {
      data.duration = duration;
    }
    this.handleShowNotification(data);
    return id;
  }

  public showWarning(message: string, duration?: number): string {
    const id = `warning-${++this.notificationCounter}`;
    const data: NotificationData = { id, type: 'warning', message };
    if (duration !== undefined) {
      data.duration = duration;
    }
    this.handleShowNotification(data);
    return id;
  }

  public showInfo(message: string, duration?: number): string {
    const id = `info-${++this.notificationCounter}`;
    const data: NotificationData = { id, type: 'info', message };
    if (duration !== undefined) {
      data.duration = duration;
    }
    this.handleShowNotification(data);
    return id;
  }

  public hide(id: string): void {
    this.hideNotification(id);
  }

  public clearAll(): void {
    this.handleClearAll();
  }

  public destroy(): void {
    this.logger.debug('Destroying Notifications Manager', {
      module: 'UI',
      action: 'DESTROY',
      data: { component: 'NotificationsManager' }
    });
    
    this.clearAll();
    this.notifications.clear();
  }
}
