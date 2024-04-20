const { google } = require('googleapis');
require('dotenv').config();

const api_key = process.env.API_KEY;

const youtube = google.youtube({
  version: 'v3',
  auth: api_key,
});


const yt_playlistId = process.env.YT_PLAYLIST;
console.log(yt_playlistId);


async function fetchAllVideoTitles(pageToken = null) {
  try {
    const response = await youtube.playlistItems.list({
      part: 'snippet, status',
      playlistId: yt_playlistId,
      pageToken: pageToken,
      maxResults: 50,
    });

    const items = response.data.items || [];
    const nextPageToken = response.data.nextPageToken;

    items.forEach((item) => {
      if (item.status.privacyStatus === 'public') {
        const videoTitle = item.snippet.title;
        console.log(videoTitle);
      
      }
    });

    if (nextPageToken) {
      await fetchAllVideoTitles(nextPageToken);
    }
  } catch (error) {
    console.error('Error fetching video titles:', error.message);
  }
}

// Immediately-invoked asynchronous function expression (IIFE)
(async () => {
  await fetchAllVideoTitles();
})();
