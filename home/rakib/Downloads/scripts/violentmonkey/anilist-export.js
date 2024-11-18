// ==UserScript==
// @name         AniList Export
// @description  Download AniList anime and manga lists as JSON
// @version      1.0
// @author       https://github.com/rakibdev
// @match        https://anilist.co/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

const download = (json, filename) => {
  const content = JSON.stringify(json, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  link.click()

  URL.revokeObjectURL(url)
}

const fetchAniList = async (username, type) => {
  const listQuery = `
  query ($username: String, $type: MediaType) {
    MediaListCollection(userName: $username, type: $type) {
        lists {
            entries {
                media {
                    title {
                        romaji
                        english
                    }
                    episodes
                    chapters
                }
                status
                progress
            }
        }
    }
  }`

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      query: listQuery,
      variables: { username, type }
    })
  })

  const { data } = await response.json()
  return data.MediaListCollection.lists.flatMap(list =>
    list.entries.map(entry => ({
      title: entry.media.title,
      status: entry.status,
      progress: entry.progress,
      episodes: entry.media.episodes,
      chapters: entry.media.chapters
    }))
  )
}

const exportLists = async () => {
  const profileLink = Array.from(document.querySelectorAll('a')).find(link => link.textContent.trim() == 'profile')
  if (!profileLink) window.alert('Profile link not found')

  let url = profileLink.href
  if (url.endsWith('/')) url = url.slice(0, -1)
  const username = url.split('/').pop()

  const [animes, mangas] = await Promise.all([fetchAniList(username, 'ANIME'), fetchAniList(username, 'MANGA')])
  download({ animes, mangas }, `${username}-anilist`)
}

GM_registerMenuCommand('Export lists as JSON', exportLists)
