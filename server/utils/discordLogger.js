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
 * Determines priority level and color based on visit characteristics
 */
function getVisitPriority(visit) {
    const isFormSubmission = visit.type === 'form_submission' || visit.formSubmission;
    const isHighRisk = visit.score !== undefined && visit.score > 0.7
        || visit.technicalData?.client?.vpn?.score > 0.7;
    
    let color = 0x3498db; // Default blue
    let priority = 'Low';
    
    if (visit.technicalData?.vpn?.vpnDetected || visit.technicalData?.client?.vpn?.vpnDetected) {
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

    return { color, priority };
}

/**
 * Creates a simplified Discord embed for basic notifications
 */
function buildSimpleEmbed(visit) {
    const { priority } = getVisitPriority(visit);
    const title = visit.type === 'form_submission' ? 'Form Submission' : 'Site Visit';
    const fields = [];
    
    // Basic visitor information
    // Support both top-level personalInfo and nested formData.personalInfo
    const personal = visit.personalInfo || visit.formData?.personalInfo || null;
    if (personal && (personal.firstName || personal.lastName)) {
        const name = `${visit.personalInfo.firstName || ''} ${visit.personalInfo.lastName || ''}`.trim();
        fields.push({ name: 'Visitor', value: name, inline: true });
    }
    if (personal?.email) {
        fields.push({ name: 'Email', value: personal.email, inline: true });
    }
    // Support contactInfo at top-level or under formData
    const contact = visit.contactInfo || visit.formData?.contactInfo || null;
    if (contact?.phone) {
        fields.push({ name: 'Phone', value: contact.phone, inline: true });
    }
    fields.push({ name: 'Page', value: visit.url || visit.page || 'unknown', inline: true });
    // add UA and IP
    const ua = visit.userAgent || visit.ua || visit.technicalData?.client?.device?.userAgent || visit.ua_parsed?.ua || 'Unknown';
    fields.push({ name: 'User Agent', value: ua.toString().substring(0, 200), inline: false });
    fields.push({ name: 'IP', value: visit.ip || visit.ipAddress || 'Unknown', inline: true });
    
    return {
        title,
        description: `Priority: ${priority}`,
        color: 3447003, // Blue color
        fields,
        timestamp: new Date(visit.timestamp || visit.submittedAt || Date.now()).toISOString()
    };
}

/**
 * Creates a comprehensive Discord embed with detailed visit information
 */
function createVisitEmbed(visit) {
    const { color, priority } = getVisitPriority(visit);
    const isFormSubmission = visit.type === 'form_submission';
    const isHighRisk = visit.score !== undefined && visit.score > 0.7;
    
    // Create fields array for Discord embed
    const fields = [];
    
    // Basic visitor information
    // Personal info can be present at top-level or inside formData
    const personalInfo = visit.personalInfo || visit.formData?.personalInfo || null;
    if (personalInfo) {
        const name = [personalInfo.firstName, personalInfo.lastName].filter(Boolean).join(' ');
        if (name) fields.push({ name: '👤 Visitor', value: name, inline: true });
        if (personalInfo.email) fields.push({ name: '📧 Email', value: personalInfo.email, inline: true });
    }

    // Contact information
    if (visit.contactInfo?.phone) {
        fields.push({ name: '📱 Phone', value: visit.contactInfo.phone, inline: true });
    }

    // Location & IP information
    // location may be under visit.location or visit.geo
    const location = visit.location || visit.geo || visit.geoip || null;
    if (location) {
        fields.push({
            name: '📍 Location',
            value: `${location.city || location.city_name || 'Unknown City'}, ${location.country || location.country_name || 'Unknown Country'}`,
            inline: true
        });
    }

   
    fields.push({ name: '🌐 IP Address', value: visit.ip || visit.ipAddress || visit.remoteAddr || 'Unknown', inline: true });

    // Priority level
    fields.push({ name: '🚨 Priority', value: priority, inline: true });

    // Page and referrer information
    fields.push({ name: '📄 Page', value: visit.url || visit.page || 'Unknown', inline: true });
    const ref = visit.referrer || visit.referer || visit.headers?.referer || visit.headers?.referrer;
    if (ref) fields.push({ name: '↩️ Referrer', value: ref, inline: true });

    // Technical details
    if (visit.technicalData) {
        // Device information
        // device info may be nested under technicalData.client.device or technicalData.device
        const deviceRoot = visit.technicalData.client?.device || visit.technicalData.device || {};
        const deviceInfo = [
            `💻 OS: ${deviceRoot?.os?.name || deviceRoot?.os || 'Unknown'} ${deviceRoot?.os?.version || ''}`,
            `🌐 Browser: ${deviceRoot?.browser?.name || deviceRoot?.browser || 'Unknown'} ${deviceRoot?.browser?.version || ''}`,
            `🖥️ Screen: ${deviceRoot?.screen?.width || deviceRoot?.screenWidth || '?'}x${deviceRoot?.screen?.height || deviceRoot?.screenHeight || '?'}`,
            `🌍 Language: ${deviceRoot?.language || deviceRoot?.lang || 'Unknown'}`,
            `⚡ CPU Cores: ${deviceRoot?.hardwareConcurrency || deviceRoot?.cores || 'Unknown'}`,
            `📱 Touch: ${(deviceRoot?.maxTouchPoints || deviceRoot?.touchPoints || 0) > 0 ? 'Yes' : 'No'}`
        ].filter(info => !info.includes('Unknown Unknown')).join('\n');
        
        if (deviceInfo) fields.push({ name: '💻 Device Details', value: '```' + deviceInfo + '```', inline: false });

        // Network information
        const networkRoot = visit.technicalData.client?.network || visit.technicalData.network;
        if (networkRoot) {
            const networkInfo = [
                `📡 Type: ${networkRoot.connectionType || networkRoot.type || 'Unknown'}`,
                `🚀 Speed: ${networkRoot.effectiveType || 'Unknown'}`,
                `⬇️ Downlink: ${networkRoot.downlink || 'Unknown'} Mbps`,
                `⏱️ RTT: ${networkRoot.rtt || 'Unknown'} ms`
            ].filter(info => !info.includes('Unknown')).join('\n');
            if (networkInfo) fields.push({ name: '🌐 Network Info', value: '```' + networkInfo + '```', inline: false });
        }

        // VPN/Proxy security analysis
        const vpnRoot = visit.technicalData.vpn || visit.technicalData.client?.vpn || null;
        if (vpnRoot) {
            const securityInfo = [
                `🔍 VPN/Proxy: ${vpnRoot.vpnDetected ? '⚠️ Detected' : '✅ Not Detected'}`,
                `📊 Risk Score: ${Math.round((vpnRoot.score || 0) * 100)}%`,
                vpnRoot.reasons?.length ? `⚠️ Flags: ${vpnRoot.reasons.join(', ')}` : null
            ].filter(Boolean).join('\n');
            fields.push({ name: '🛡️ Security Analysis', value: '```' + securityInfo + '```', inline: false });
        }
    }

    // Overall risk score
    // include different possible risk score locations
    const riskScore = visit.score ?? visit.technicalData?.vpn?.score ?? visit.technicalData?.client?.vpn?.score ?? null;
    if (riskScore !== null && riskScore !== undefined) {
        fields.push({ name: '🎯 Risk Score', value: `${(riskScore * 100).toFixed(1)}%`, inline: true });
    }

    // Form submission data
    if (isFormSubmission) {
        const formData = visit.formData || visit.formSubmissionData || null;
        if (formData) {
            const formDataStr = JSON.stringify(formData, null, 2);
            const truncatedFormData = formDataStr.length > 1200 ? formDataStr.substring(0, 1200) + '...' : formDataStr;
            fields.push({ name: '📝 Form Data', value: '```json\n' + truncatedFormData + '```', inline: false });
        }
    }

    // Determine title based on visit type and characteristics
    let title = '👀 Site Visit';
    if (isFormSubmission) title = '🎯 New Form Submission';
    if (isHighRisk) title = '⚠️ High Risk Visit';
    if (visit.type === 'security_alert') title = '🔒 Security Alert';

    // Create description with key information
    const description = [
        `**Priority:** ${priority}`,
        visit.score !== undefined ? `**Risk Score:** ${(visit.score * 100).toFixed(1)}%` : null,
        visit.notes ? `\n${visit.notes}` : null
    ].filter(Boolean).join('\n');

    // include some top-level meta for debugging
    const meta = visit.meta || visit.metadata || visit._meta || {};

    return {
        title,
        description,
        color,
        fields,
        footer: {
            text: `Visit ID: ${visit.id || visit.timestamp} | Env: ${process.env.NODE_ENV || 'development'} | Host: ${meta.serverHostname || process.env.HOSTNAME || ''}`
        },
        timestamp: new Date(visit.timestamp || visit.submittedAt || Date.now()).toISOString()
    };
}

/**
 * Sends visit notification to Discord with error handling
 */
async function sendDiscordNotification(payload, timeout = 5000) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.warn('Discord webhook URL not configured. Skipping Discord logging.');
        return false;
    }

    try {
        const bodySize = typeof payload === 'string' ? payload.length : JSON.stringify(payload).length;
        logger.debug('Sending Discord payload', { payloadSize: bodySize, payloadType: payload.username || 'Unknown' });

        const response = await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout
        });

        // Discord often returns 204 No Content on success
        const status = response?.status || 0;
        logger.info('Successfully sent Discord notification', {
            statusCode: status,
            payloadSize: bodySize,
            payloadType: payload.username || 'Unknown'
        });

        return status >= 200 && status < 300;
    } catch (error) {
        const resp = error.response || {};
        logger.error('Failed to send Discord notification', {
            error: error.message,
            payloadType: payload.username || 'Unknown',
            status: resp.status || 'no-status',
            data: resp.data || null
        });
        return false;
    }
}

/**
 * Checks if a visit should trigger a Discord notification
 */
async function shouldNotifyDiscord(visit) {
    // Try to import configuration for notification filtering
    try {
        const cfg = await import('./discordConfig.js');
        return cfg.shouldNotify ? cfg.shouldNotify(visit) : true;
    } catch (e) {
        logger.debug('discordConfig import failed, defaulting to notify all', { 
            error: e.message 
        });
        return true;
    }
}

/**
 * Sends a formatted visit summary to Discord
 */
export async function logVisitToDiscord(visit) {
    // Check if we should send a notification
    if (!(await shouldNotifyDiscord(visit))) {
        logger.debug('Skipping Discord notification due to filters', {
            visitId: visit.id || visit.timestamp,
            type: visit.type,
            ip: visit.ip
        });
        return;
    }

    try {
        const embed = createVisitEmbed(visit);
        const payload = {
            username: 'Somatic Visit Logger',
            embeds: [embed]
        };

        const success = await sendDiscordNotification(payload);
        
        if (success) {
            logger.info('Visit logged to Discord successfully', {
                visitId: visit.id || visit.timestamp,
                type: visit.type
            });
        }
    } catch (error) {
        logger.error('Error in logVisitToDiscord', {
            error: error.message,
            visitId: visit.id || visit.timestamp
        });
    }
}

/**
 * Sends the complete visit data to Discord as JSON
 * WARNING: This may include PII - use only in secure environments
 */
export async function logFullVisitToDiscord(visit) {
    try {
        // Prepare truncated JSON for Discord
        const raw = JSON.stringify(visit, null, 2);
        const truncated = raw.length > 1800 
            ? raw.substring(0, 1800) + '\n... (truncated)' 
            : raw;

        // Generate admin URL for full record access
        const host = process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT || 3000}`;
        const visitId = visit.id || visit.timestamp;
        const adminUrl = `${host}/admin/visit/${encodeURIComponent(visitId)}?password=${encodeURIComponent(process.env.ADMIN_PASSWORD || '')}`;

        const payload = {
            username: 'Somatic Full Logger',
            content: `Full visit record (truncated):\n\n\`\`\`json\n${truncated}\n\`\`\`\n\nFull record: ${adminUrl}`
        };

        const success = await sendDiscordNotification(payload, 8000);
        
        if (success) {
            logger.info('Full visit data sent to Discord', { 
                visitId,
                dataLength: raw.length,
                truncated: raw.length > 1800
            });
        }
    } catch (error) {
        logger.error('Error in logFullVisitToDiscord', {
            error: error.message,
            visitId: visit.id || visit.timestamp
        });
    }
}