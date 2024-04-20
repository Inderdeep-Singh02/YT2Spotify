const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = 3000; 

const yt_playlistId = "PLvJrnzE2cY9tFa32LFmyOrrU2XjLgZHgK";
const playlistId = "PLvJrnzE2cY9uulrXC3D1m9hXzBU1faweA";


const api_key = process.env.API_KEY;

const youtube = google.youtube({
  version: 'v3',
  auth: api_key,
});

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri,
});


async function search_add(song_name, playlistTracks){   
  
  const searchResult = await spotifyApi.searchTracks(song_name);

  if (searchResult.body.tracks.items.length > 0) {
    const trackId = searchResult.body.tracks.items[0].id;
    const isSongInPlaylist = playlistTracks.body.items.some(item => item.track.id === trackId);
    if (isSongInPlaylist) {
      console.log('Song is already in the playlist. Skipping.');
      return; 
    }
    else{
      const addTrackResult = await spotifyApi.addTracksToPlaylist(playlistId, [`spotify:track:${trackId}`]);
      console.log('Song added to playlist:', addTrackResult);
    }
  } else {
    console.log('Song not found on Spotify. Skipping.');
  }
}


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
    var playlistTracks = await spotifyApi.getPlaylistTracks(playlistId);

    for (const item of items) {
    if (item.status.privacyStatus === 'public') {
        const videoTitle = item.snippet.title;
        await search_add(videoTitle, playlistTracks);
      }
    }

    if (nextPageToken) {
      await fetchAllVideoTitles(nextPageToken);
    }
  } catch (error) {
    console.error('Error fetching video titles:', error.message);
  }
}

const authorizeURL = spotifyApi.createAuthorizeURL(['playlist-modify-public', 'playlist-modify-private'], 'state', true);

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (state !== 'state') {
    return res.status(401).send('Invalid state parameter');
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);

    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    res.redirect('/success');
  } catch (error) {
    console.error('Error exchanging authorization code:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/success', (req, res) => {
  res.send('Authentication successful! You can close this window and go back to your application.');
  res.redirect('/addSong');

});

app.get('/addSong', async (req, res) => {
  try {
    await fetchAllVideoTitles();
    // res.send('Songs added to the playlist!');
  } catch (error) {
    console.error('Error adding songs to playlist:', error);
    res.status(500).send('Error adding songs to playlist');
  }
});

console.log('Open the following URL to authorize the app:', authorizeURL);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


