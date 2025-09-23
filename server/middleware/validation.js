import { URL } from 'url';

/**
 * Validate and sanitize visit data
 */
export function validateVisitData(req, res, next) {
    try {
        const { url, referrer } = req.body;

        // Validate URL
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Validate referrer if present
        if (referrer) {
            try {
                new URL(referrer);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid referrer format' });
            }
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(400).json({ error: 'Invalid request data' });
    }
}

/**
 * Sanitize data before storage
 */
export function sanitizeVisitData(data) {
    return {
        ...data,
        url: data.url ? String(data.url).slice(0, 2000) : null,
        referrer: data.referrer ? String(data.referrer).slice(0, 2000) : null,
        userAgent: data.userAgent ? String(data.userAgent).slice(0, 1000) : null,
        ip: data.ip ? String(data.ip).slice(0, 45) : null // IPv6 can be long
    };
}

/**
 * Clean old backup files
 */
export async function cleanOldBackups(directory, maxAge = 7 * 24 * 60 * 60 * 1000) {
    try {
        const files = await fs.readdir(directory);
        const now = Date.now();

        for (const file of files) {
            if (file.startsWith('clicks.json.')) {
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Deleted old backup: ${file}`);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning old backups:', error);
    }
}