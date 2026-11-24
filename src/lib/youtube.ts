import generated from '../data/youtube.generated.json';
import config from '../data/youtube.config.json';
import { isFreshFeed } from './youtube-utils.mjs';

export interface Video {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnail: string;
  platform: string;
  duration: string;
  embeddable: boolean;
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: string;
  thumbnail: string;
  audience: string;
  prerequisites: string;
  videos: Video[];
}

// This hand-picked resume link is editorial content, independent of API caching.
const curatedVideos: Video[] = [{
  id: 'KB6vLQGixjA',
  title: 'SageMaker Serverless Inference',
  description: 'A talk on deploying machine learning models with Amazon SageMaker Serverless Inference, linked from my resume.',
  publishedAt: null,
  thumbnail: 'https://i.ytimg.com/vi/KB6vLQGixjA/hqdefault.jpg',
  platform: 'AWS',
  duration: '',
  embeddable: true,
}];

export const channelUrl = config.channelUrl;
export const hasFreshYouTubeData = isFreshFeed(generated);
export const videos: Video[] = hasFreshYouTubeData ? generated.videos : curatedVideos;
export const learningPaths: LearningPath[] = hasFreshYouTubeData ? generated.learningPaths : [];
export const youtubeUpdatedAt = hasFreshYouTubeData ? generated.fetchedAt : null;
