import axios from 'axios';

export interface MastodonConfig {
    instanceUrl: string;
    accessToken: string;
    visibility?: 'public' | 'unlisted' | 'private' | 'direct';
}

export async function postToMastodon(config: MastodonConfig, status: string): Promise<void> {
    const url = `${config.instanceUrl.replace(/\/$/, '')}/api/v1/statuses`;
    
    try {
        await axios.post(url, {
            status,
            visibility: config.visibility || 'unlisted'
        }, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Successfully posted to Mastodon.');
    } catch (error: any) {
        console.error('Failed to post to Mastodon:', error.response?.data || error.message);
        throw error;
    }
}
