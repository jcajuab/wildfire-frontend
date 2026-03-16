export const PLAYLIST_INDEX_PATH = "/admin/playlists";

export const getPlaylistEditPath = (playlistId: string): string =>
  `${PLAYLIST_INDEX_PATH}/edit/${playlistId}`;
