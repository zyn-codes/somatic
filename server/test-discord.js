import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testDiscordWebhook() {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
        console.error('Discord webhook URL not configured!');
        process.exit(1);
    }

    try {
        console.log('Sending test message to Discord...');
        
        const response = await axios.post(webhookUrl, {
            content: '🧪 Test message from Somatic Form server',
            embeds: [{
                title: '📡 Server Test',
                description: 'If you can see this message, Discord integration is working!',
                color: 0x00ff00
            }]
        });

        console.log('Success! Discord responded with status:', response.status);
        process.exit(0);
    } catch (error) {
        console.error('Failed to send message to Discord:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        process.exit(1);
    }
}

testDiscordWebhook();