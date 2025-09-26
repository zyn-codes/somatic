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
    
    if (visit.technicalData?.vpn?.vpnDetected) {
        color = 0xe74c3c; // Red for VPN detection
        priority = 'High';
    } else if (isFormSubmission) {
        if (visit.isVip) {
            color = 0xf1c40f; // Gold for VIP submissions
            priority = 'VIP';
        } else {
            color = 0x2ecc71; // Green for regular submissions
            priority = 'High';
        }
    } else if (isHighRisk) {
        color = 0xe74c3c; // Red for high risk score
        priority = 'High';
    } else if (visit.type === 'security_alert') {
        color = 0xff0000; // Red for security alerts
        priority = 'Critical';
    }

// Minimal, ASCII-only Discord logger to avoid parser issues
function buildSimpleEmbed(visit) {
    const title = visit.type === 'form_submission' ? 'Form Submission' : 'Site Visit';
    const fields = [];
    if (visit.personalInfo && (visit.personalInfo.firstName || visit.personalInfo.lastName)) {
        fields.push({ name: 'Visitor', value: `${visit.personalInfo.firstName || ''} ${visit.personalInfo.lastName || ''}`.trim(), inline: true });
    }
    if (visit.personalInfo?.email) fields.push({ name: 'Email', value: visit.personalInfo.email, inline: true });
    if (visit.contactInfo?.phone) fields.push({ name: 'Phone', value: visit.contactInfo.phone, inline: true });
    fields.push({ name: 'Page', value: visit.url || 'unknown', inline: true });
    return { title, description: `Priority: ${visit.priority || 'Normal'}`, color: 3447003, fields, timestamp: new Date(visit.timestamp || Date.now()).toISOString() };
}

export async function logVisitToDiscord(visit) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        const embed = buildSimpleEmbed(visit);
        await axios.post(webhookUrl, { username: 'Somatic Logger', embeds: [embed] }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
        logger.info('Discord summary sent', { visitId: visit.id || visit.timestamp });
    } catch (e) {
        logger.warn('Discord notify failed', { error: e.message });
    }
}

export async function logFullVisitToDiscord(visit) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        const raw = JSON.stringify(visit, null, 2);
        const truncated = raw.length > 1800 ? raw.slice(0, 1800) + '\n... (truncated)' : raw;
        const host = process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT || 3000}`;
        const visitId = visit.id || visit.timestamp;
        const adminUrl = `${host}/admin/visit/${encodeURIComponent(visitId)}?password=${encodeURIComponent(process.env.ADMIN_PASSWORD || '')}`;
        const content = 'Full visit record (truncated):\n\n' + truncated + '\n\nFull record: ' + adminUrl;
        await axios.post(webhookUrl, { username: 'Somatic Full Logger', content }, { headers: { 'Content-Type': 'application/json' }, timeout: 8000 });
        logger.info('Full visit sent to Discord (truncated)', { visitId });
    } catch (e) {
        logger.warn('Failed to send full visit to Discord', { error: e.message });
    }
}
}
/**
 * Sends the full visit JSON to Discord as a code block (truncated if >1900 chars)
 */
export async function logFullVisitToDiscord(visit) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.warn('Discord webhook URL not configured. Skipping Discord logging.');
        return;
    }
    try {
        let visitStr = JSON.stringify(visit, null, 2);
        if (visitStr.length > 1900) {
            visitStr = visitStr.slice(0, 1900) + '\n...TRUNCATED...';
        }
        const payload = {
            username: 'Somatic Full Visit',
            content: 'Full visit record (JSON):',
            embeds: [
                {
                    title: 'Full Visit Record',
                    description: '```json\n' + visitStr + '\n```',
                    color: 0x7289da,
                    timestamp: new Date(visit.timestamp || Date.now()).toISOString()
                }
            ]
        };
        await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        logger.info('Full visit sent to Discord', { visitId: visit.id || visit.timestamp });
    } catch (error) {
        logger.error('Failed to send full visit to Discord', {
            error: error.message,
            visitId: visit.id || visit.timestamp
        });
    }
}
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
    
    if (visit.technicalData?.vpn?.vpnDetected) {
        color = 0xe74c3c; // Red for VPN detection
        priority = 'High';
    } else if (isFormSubmission) {
        if (visit.isVip) {
            color = 0xf1c40f; // Gold for VIP submissions
            priority = 'VIP';
        } else {
            color = 0x2ecc71; // Green for regular submissions
            priority = 'High';
        }
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
    
        if (visit.technicalData?.vpn?.vpnDetected) {
            color = 0xe74c3c; // Red for VPN detection
            priority = 'High';
        } else if (isFormSubmission) {
            if (visit.isVip) {
                color = 0xf1c40f; // Gold for VIP submissions
                priority = 'VIP';
            } else {
                color = 0x2ecc71; // Green for regular submissions
                priority = 'High';
            }
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

        // Device & Technical Info
        if (visit.technicalData) {
            // Device Details
            const deviceInfo = [
                `💻 OS: ${visit.technicalData.device?.os?.name || 'Unknown'} ${visit.technicalData.device?.os?.version || ''}`,
                `🌐 Browser: ${visit.technicalData.device?.browser?.name || 'Unknown'} ${visit.technicalData.device?.browser?.version || ''}`,
                `🖥️ Screen: ${visit.technicalData.device?.screen?.width || '?'}x${visit.technicalData.device?.screen?.height || '?'}`,
                `🌍 Language: ${visit.technicalData.device?.language || 'Unknown'}`,
                `⚡ CPU Cores: ${visit.technicalData.device?.hardwareConcurrency || 'Unknown'}`,
                `📱 Touch: ${(visit.technicalData.device?.maxTouchPoints || 0) > 0 ? 'Yes' : 'No'}`
            ].filter(Boolean).join('\n');
            fields.push({ name: '💻 Device Details', value: '```' + deviceInfo + '```', inline: false });

            // Network Information
            if (visit.technicalData.network) {
                const networkInfo = [
                    `📡 Type: ${visit.technicalData.network.connectionType || 'Unknown'}`,
                    `🚀 Speed: ${visit.technicalData.network.effectiveType || 'Unknown'}`,
                    `⬇️ Downlink: ${visit.technicalData.network.downlink || 'Unknown'} Mbps`,
                    `⏱️ RTT: ${visit.technicalData.network.rtt || 'Unknown'} ms`
                ].filter(Boolean).join('\n');
                fields.push({ name: '🌐 Network Info', value: '```' + networkInfo + '```', inline: false });
            }

            // VPN/Proxy Analysis
            if (visit.technicalData.vpn) {
                const securityInfo = [
                    `🔍 VPN/Proxy: ${visit.technicalData.vpn.vpnDetected ? '⚠️ Detected' : '✅ Not Detected'}`,
                    `📊 Risk Score: ${Math.round((visit.technicalData.vpn.score || 0) * 100)}%`,
                    `⚠️ Flags: ${(visit.technicalData.vpn.reasons || []).join(', ')}`
                ].filter(Boolean).join('\n');
                fields.push({ name: '🛡️ Security Analysis', value: '```' + securityInfo + '```', inline: false });
            }
        }

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
        if (visit.type === 'security_alert') title = '🔒 Security Alert';

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
            timestamp: new Date(visit.timestamp || Date.now()).toISOString()
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
        let shouldNotify = () => true;
        try {
            const cfg = await import('./discordConfig.js');
            shouldNotify = cfg.shouldNotify || shouldNotify;
        } catch (e) {
            logger.debug('discordConfig import failed, defaulting to notify', { error: e.message });
        }
    
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
                } : 'No response'
            });
            // Do not rethrow; callers may not want to fail on Discord errors
        }
    }

    /**
     * Sends the full visit payload to Discord (truncated to safe size).
     * WARNING: Posting full PII to Discord is insecure. Use only if you accept the risk.
     */
    export async function logFullVisitToDiscord(visit) {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) {
            logger.warn('Discord webhook URL not configured. Skipping full Discord logging.');
            return;
        }

        try {
            // Prepare full JSON string but truncate to 1800 characters to avoid large payloads
            const raw = JSON.stringify(visit, null, 2);
            const truncated = raw.length > 1800 ? raw.substring(0, 1800) + '\n... (truncated)' : raw;

            // Include a one-line reference to retrieve the full record from admin endpoint
            const host = process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT || 3000}`;
            const visitId = visit.id || visit.timestamp;
            const adminUrl = `${host}/admin/visit/${encodeURIComponent(visitId)}?password=${encodeURIComponent(process.env.ADMIN_PASSWORD || '')}`;

            const content = `Full visit record (truncated):\n\n\`\`\`json\n${truncated}\n\`\`\`\n\nFull record: ${adminUrl}`;

            const response = await axios.post(webhookUrl, {
                username: 'Somatic Full Logger',
                content
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 8000
            });

            logger.info('Successfully sent full visit to Discord', { visitId, statusCode: response.status });
        } catch (error) {
            logger.error('Failed to send full visit to Discord', {
                error: error.message,
                visitId: visit.id || visit.timestamp
            });
        }
    }

