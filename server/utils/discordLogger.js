import axios from 'axios';
import logger from './logger.js';

/**
 * Formats a timestamp into a human-readable format
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

/**
 * Creates a Discord embed for the visit
 */
function createVisitEmbed(visit) {
    const isFormSubmission = visit.type === 'form_submission';
    const isHighRisk = visit.score !== undefined && visit.score > 0.7;
    
    // Determine the color and priority based on visit type and score
    let color = 0x3498db; // Default blue
    let priority = 'Low';
    
    if (isFormSubmission) {
        color = 0x2ecc71; // Green for submissions
        priority = 'High';
    } else if (isHighRisk) {
        color = 0xe74c3c; // Red for high risk score
        priority = 'High';
    } else if (visit.type === 'security_alert') {
        color = 0xff0000; // Red for security alerts
        priority = 'Critical';
    }

    // Create fields array for Discord embed
    const fields = [];
    
    // Basic Info
    if (visit.personalInfo) {
        const name = [visit.personalInfo.firstName, visit.personalInfo.lastName]
            .filter(Boolean)
            .join(' ');
        if (name) fields.push({ name: '👤 Visitor', value: name, inline: true });
        if (visit.personalInfo.email) {
            fields.push({ name: '📧 Email', value: visit.personalInfo.email, inline: true });
        }
    }

    // Contact Info
    if (visit.contactInfo?.phone) {
        fields.push({ name: '📱 Phone', value: visit.contactInfo.phone, inline: true });
    }

    // Location & Technical Details
    if (visit.location) {
        fields.push({
            name: '📍 Location',
            value: `${visit.location.city || 'Unknown City'}, ${visit.location.country || 'Unknown Country'}`,
            inline: true
        });
    }

    // Only include IP for high priority or if specifically allowed
    if (priority !== 'Low') {
        fields.push({ name: '🌐 IP Address', value: visit.ip || 'Unknown', inline: true });
    }

    // Priority level
    fields.push({ name: '🚨 Priority', value: priority, inline: true });

    // Page Info
    fields.push({ name: '📄 Page', value: visit.url || 'Unknown', inline: true });
    if (visit.referrer) {
        fields.push({ name: '↩️ Referrer', value: visit.referrer, inline: true });
    }

    // Device Info
    const deviceInfo = [
        `💻 ${visit.deviceType || 'Unknown Device'}`,
        `🖥️ ${visit.screenResolution || 'Unknown Resolution'}`,
        `🌍 ${visit.timezone || 'Unknown Timezone'}`,
        `🔍 ${visit.userAgent ? 'UA: ' + visit.userAgent.substring(0, 100) + '...' : 'No User Agent'}`
    ].filter(Boolean).join('\n');
    fields.push({ name: 'Device Details', value: deviceInfo, inline: false });

    // Score if available
    if (visit.score !== undefined) {
        fields.push({
            name: '🎯 Risk Score',
            value: `${(visit.score * 100).toFixed(1)}%`,
            inline: true
        });
    }

    // Form submission data if available
    if (isFormSubmission && visit.formData) {
        fields.push({
            name: '📝 Form Data',
            value: '```json\n' + JSON.stringify(visit.formData, null, 2).substring(0, 1000) + '```',
            inline: false
        });
    }

    // Determine title based on type and priority
    let title = '👀 Site Visit';
    if (isFormSubmission) title = '🎯 New Form Submission';
    if (isHighRisk) title = '⚠️ High Risk Visit';
    if (visit.type === 'security_alert') title = '� Security Alert';

    const description = [
        `**Priority:** ${priority}`,
        visit.score !== undefined ? `**Risk Score:** ${(visit.score * 100).toFixed(1)}%` : null,
        visit.notes ? `\n${visit.notes}` : null
    ].filter(Boolean).join('\n');

    return {
        title: title,
        description: description,
        color: color,
        fields: fields,
        footer: {
            text: `Visit ID: ${visit.id || visit.timestamp} | Environment: ${process.env.NODE_ENV || 'development'}`
        },
        timestamp: new Date(visit.timestamp).toISOString()
    };
}

/**
 * Sends visit data to Discord webhook with rich formatting
 */
export async function logVisitToDiscord(visit) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.warn('Discord webhook URL not configured. Skipping Discord logging.');
        return;
    }

    // Import configuration dynamically to avoid circular dependencies
    const { shouldNotify } = await import('./discordConfig.js');
    
    // Check if we should send a notification for this visit
    if (!shouldNotify(visit)) {
        logger.debug('Skipping Discord notification due to filters', {
            visitId: visit.id || visit.timestamp,
            type: visit.type,
            ip: visit.ip
        });
        return;
    }

    try {
        const embed = createVisitEmbed(visit);
        
        // Log the payload we're about to send for debugging
        logger.debug('Attempting to send Discord webhook', {
            webhook: webhookUrl.substring(0, 20) + '...', // Only log part of the URL for security
            payload: JSON.stringify(embed, null, 2)
        });

        const response = await axios.post(webhookUrl, {
            username: 'Somatic Visit Logger',
            embeds: [embed]
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
        });

        logger.info('Successfully logged visit to Discord', {
            visitId: visit.id || visit.timestamp,
            type: visit.type,
            statusCode: response.status
        });
    } catch (error) {
        logger.error('Failed to log visit to Discord', {
            error: error.message,
            visitId: visit.id || visit.timestamp,
            type: visit.type,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data
            } : 'No response',
            config: {
                url: webhookUrl.substring(0, 20) + '...',
                method: error.config?.method,
                headers: error.config?.headers
            }
        });
        // Rethrow if we want to handle the error at a higher level
        throw error;
    }
}
