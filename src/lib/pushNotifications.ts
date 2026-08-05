/**
 * Web Push Notifications Manager — VS-FRONTEND-004
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.error("Failed to register Service Worker:", err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return "denied";
  }
}

export async function sendLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.ico",
      ...options,
    });
  }
}
