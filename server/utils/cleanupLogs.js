// Cleanup old logs on startup
try {
    const cleanupOldLogs = () => {
        const now = Date.now();
        const retentionMs = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
        fs.readdir(logsDir, (err, files) => {
            if (err) return;
            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    if (now - stats.mtime.getTime() > retentionMs) {
                        fs.unlink(filePath, () => {});
                    }
                });
            });
        });
    };
    cleanupOldLogs();
    // Run cleanup daily
    setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
} catch {}

// Enhanced console logging in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const systemInfo = getSystemInfoCached();
                return `${timestamp} [${level}]: ${message} ${
                    Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : ''
                }`;
            })
        )
    }));
}

export default logger;