/**
 * Discord notification configuration and filters
 */

// Minimum time between notifications for the same IP (in milliseconds)
export const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Visit types that should always trigger notifications
export const PRIORITY_EVENTS = ['form_submission', 'error', 'security_alert'];

// Risk score threshold for triggering notifications
export const RISK_SCORE_THRESHOLD = 0.7;

// Cache for tracking recent notifications (used to prevent spam)
export const recentNotifications = new Map();

/**
 * Determines if a visit should trigger a Discord notification
 */
export function shouldNotify(visit) {
    // Always notify for priority events
    if (PRIORITY_EVENTS.includes(visit.type)) {
        return true;
    }

    // Check risk score
    if (visit.score && visit.score >= RISK_SCORE_THRESHOLD) {
        return true;
    }

    // Check notification cooldown for the IP
    const lastNotification = recentNotifications.get(visit.ip);
    if (lastNotification && (Date.now() - lastNotification) < NOTIFICATION_COOLDOWN) {
        return false;
    }

    // Update last notification time
    recentNotifications.set(visit.ip, Date.now());

    // Clean up old entries from the cache
    const OLD_ENTRY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
    for (const [ip, timestamp] of recentNotifications.entries()) {
        if (Date.now() - timestamp > OLD_ENTRY_THRESHOLD) {
            recentNotifications.delete(ip);
        }
    }

    // For regular visits, only notify if they haven't triggered a notification recently
    return true;
}