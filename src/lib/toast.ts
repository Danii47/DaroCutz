export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: 'top' | 'bottom';
}

let toastContainer: HTMLElement | null = null;
let toastCount = 0;

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function initToastContainer() {
  if (toastContainer?.isConnected) return;

  toastContainer =
    document.getElementById('toast-container') ?? document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');

  if (!toastContainer.isConnected) {
    document.body.appendChild(toastContainer);
  }
}

export function showToast(message: string, options: ToastOptions = {}) {
  const { type = 'info', duration = 4000, position = 'top' } = options;

  initToastContainer();

  const toast = document.createElement('div');
  toast.id = `toast-${++toastCount}`;
  toast.className = `toast toast-${type} toast-${position}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = ICONS[type];

  // textContent, nunca innerHTML: el mensaje puede venir del servidor.
  const text = document.createElement('div');
  text.className = 'toast-message';
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Cerrar notificación');
  closeBtn.textContent = '✕';

  toast.append(icon, text, closeBtn);
  toastContainer!.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-show'));

  let timer: ReturnType<typeof setTimeout> | undefined;

  const closeToast = () => {
    if (timer) clearTimeout(timer);
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn.addEventListener('click', closeToast);

  if (duration > 0) {
    timer = setTimeout(closeToast, duration);
  }

  return { close: closeToast, element: toast };
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
