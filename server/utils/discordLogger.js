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
    
    // Determine the color based on visit type and score
    let color = 0x3498db; // Default blue
    if (isFormSubmission) {
        color = 0x2ecc71; // Green for submissions
    } else if (visit.score !== undefined && visit.score > 0.7) {
        color = 0xe74c3c; // Red for high risk score
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

    fields.push({ name: '🌐 IP Address', value: visit.ip || 'Unknown', inline: true });

    // Device Info
    const deviceInfo = [
        `💻 ${visit.deviceType || 'Unknown Device'}`,
        `🖥️ ${visit.screenResolution || 'Unknown Resolution'}`,
        `🌍 ${visit.timezone || 'Unknown Timezone'}`
    ].join('\n');
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

    return {
        title: isFormSubmission ? '🎯 New Form Submission' : '👀 New Site Visit',
        color: color,
        fields: fields,
        footer: {
            text: `Visit ID: ${visit.id || visit.timestamp}`
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
