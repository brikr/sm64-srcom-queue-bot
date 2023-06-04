import axios from 'axios';
import {environment} from './environment/environment';
import {Logger} from './logger';
import {URLSearchParams} from 'url';

export type VideoType = 'upload' | 'archive' | 'highlight';

interface ApiTwitchVideoResponse {
  data: Array<{
    // only field we care about for now
    type: VideoType;
  }>;
}

interface ApiTwitchBearerTokenResponse {
  access_token: string;
}

const API_BASE = 'https://api.twitch.tv/helix';

let cachedBearerToken = '';

export async function getBearerToken(): Promise<string> {
  if (cachedBearerToken !== '') {
    Logger.debug('Using cached Twitch bearer token');
    return cachedBearerToken;
  }

  try {
    Logger.debug('Obtaining bearer token from Twitch');

    const params = new URLSearchParams({
      client_id: environment.twitchClientId,
      client_secret: environment.twitchClientSecret,
      grant_type: 'client_credentials',
    });
    const bearerTokenResponse = await axios.post<ApiTwitchBearerTokenResponse>(
      'https://id.twitch.tv/oauth2/token',
      params
    );

    cachedBearerToken = bearerTokenResponse.data.access_token;
    return cachedBearerToken;
  } catch (e) {
    const errorData = e.response ? e.response : e.message;
    Logger.error({
      message: 'Error while obtaining Twitch access token',
      error: errorData,
    });

    return '';
  }
}

export async function getVideoType(id: string): Promise<VideoType> {
  try {
    const bearerToken = await getBearerToken();

    const videoResponse = await axios.get<ApiTwitchVideoResponse>(`${API_BASE}/videos`, {
      params: {
        id,
      },
      headers: {
        'Client-Id': environment.twitchClientId,
        Authorization: `Bearer ${bearerToken}`,
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
