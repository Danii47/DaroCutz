export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: 'top' | 'bottom';
}

let toastContainer: HTMLElement | null = null;
let toastCount = 0;

export function initToastContainer() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);
}

export function showToast(message: string, options: ToastOptions = {}) {
  const {
    type = 'info',
    duration = 4000,
    position = 'top'
  } = options;

  if (!toastContainer) {
    initToastContainer();
  }

  const toast = document.createElement('div');
  const toastId = `toast-${++toastCount}`;
  toast.id = toastId;
  toast.className = `toast toast-${type} toast-${position}`;
  toast.setAttribute('role', 'alert');

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" aria-label="Cerrar notificación">✕</button>
  `;

  toastContainer!.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  const closeToast = () => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn?.addEventListener('click', closeToast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }

  return {
    close: closeToast,
    element: toast
  };
}

export const toast = {
  success: (message: string, duration?: number) =>
    showToast(message, { type: 'success', duration }),

  error: (message: string, duration?: number) =>
    showToast(message, { type: 'error', duration }),

  warning: (message: string, duration?: number) =>
    showToast(message, { type: 'warning', duration }),

  info: (message: string, duration?: number) =>
    showToast(message, { type: 'info', duration }),
};