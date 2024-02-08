const dir = '/home/rakib/Downloads/youtube-playlists'
const playlists = {
  music: 'PLAsIFGKl2toaOfVqFWVOURNmQlIDX0aNl',
  anime: 'PLAsIFGKl2toYzt-cN5KMzqV9-C56hldWv',
  general: 'PLAsIFGKl2toZU6o_wNIP8SAbA4z7yMn16',
  later: 'PLAsIFGKl2toZc3xeHkHuv71JBk8oQW5Nt'
}

const getVideos = async playlistId => {
  const params = new URLSearchParams({
    playlistId,
    maxResults: 50,
    part: 'snippet',
    key: 'AIzaSyCPbFD7_-Dfb6694tKO4Q7nymekTRmLubQ' // from https://dcragusa.github.io/ShowUnavailableVideos/
  })
  const videos = []
  let next_page_token = true
  while (next_page_token) {
    if (typeof next_page_token == 'string') params.set('pageToken', next_page_token)
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`, {
      headers: { referer: 'https://dcragusa.github.io' }
    })
    const data = await response.json()
    next_page_token = data.nextPageToken
    videos.push(
      ...data.items.map(video => ({
        id: video.snippet.resourceId.videoId,
        title: video.snippet.title,
        channel: video.snippet.videoOwnerChannelTitle
      }))
    )
  }
  return videos
}

const backup = async () => {
  for (const name in playlists) {
    const videos = await getVideos(playlists[name])
    const unavailable = videos.filter(video => video.title.startsWith('Deleted') || video.title.startsWith('Private'))
    if (unavailable.length)
      console.log(`"${name}" failed to save. Unavailable ${unavailable.length} videos.`, unavailable)
    else {
      await Bun.write(`${dir}/${name}.json`, JSON.stringify(videos, null, 2))
      console.log(`"${name}", ${videos.length} videos saved.`)
    }
  }
}

backup()
