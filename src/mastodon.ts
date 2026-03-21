import axios from 'axios';
import FormData from 'form-data';

export interface MastodonConfig {
    instanceUrl: string;
    accessToken: string;
    visibility?: 'public' | 'unlisted' | 'private' | 'direct';
}

export async function postToMastodon(config: MastodonConfig, status: string, mediaUrl?: string): Promise<void> {
    const baseUrl = config.instanceUrl.replace(/\/$/, '');
    let mediaIds: string[] = [];

    try {
        if (mediaUrl) {
            console.log(`Downloading media from ${mediaUrl}...`);
            const imageResponse: any = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
            
            const form = new FormData();
            form.append('file', Buffer.from(imageResponse.data), {
                filename: 'poster.jpg',
                contentType: 'image/jpeg'
            });

            console.log('Uploading media to Mastodon...');
            const uploadResponse: any = await axios.post(`${baseUrl}/api/v1/media`, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${config.accessToken}`
                }
            });
            mediaIds.push(uploadResponse.data.id);
        }

        await axios.post(`${baseUrl}/api/v1/statuses`, {
            status,
            media_ids: mediaIds,
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
