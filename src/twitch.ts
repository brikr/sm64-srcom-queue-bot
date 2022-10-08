import axios from 'axios';
import {environment} from './environment/environment';
import {Logger} from './logger';

export type VideoType = 'upload' | 'archive' | 'highlight';

interface ApiTwitchVideoResponse {
  data: Array<{
    // only field we care about for now
    type: VideoType;
  }>;
}

const API_BASE = 'https://api.twitch.tv/helix';

export async function getVideoType(id: string): Promise<VideoType> {
  try {
    const videoResponse = await axios.get<ApiTwitchVideoResponse>(`${API_BASE}/videos`, {
      params: {
        id,
      },
      headers: {
        'Client-Id': environment.twitchClientId,
        Authorization: `Bearer ${environment.twitchClientSecret}`,
      },
    });

    Logger.debug({
      message: 'Fetched Twitch video',
      video: videoResponse.data.data[0],
    });

    return videoResponse.data.data[0].type;
  } catch (e) {
    const errorData = e.response ? e.response : e.message;
    Logger.error({
      message: 'Error while fetching Twitch video',
      id,
      error: errorData,
    });

    // default to a safe value so we don't reject a run we shouldn't
    return 'highlight';
  }
}
