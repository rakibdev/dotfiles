// ==UserScript==
// @name         Rule34 UX
// @description  Enhanced search controls
// @version      1.0
// @author       https://github.com/rakibdev
// @match        https://rule34.xxx/*
// @grant        none
// ==/UserScript==

const tagSelector = 'a[href^="index.php?page=post&s=list&tags="]'
const artistSelector = '.tag-type-artist'
const characterSelector = '.tag-type-character'
const copyrightSelector = '.tag-type-copyright'

const addScoreFilter = container => {
  const div = document.createElement('div')
  const label = document.createElement('span')
  label.textContent = 'Score Filter: '
  div.appendChild(label)

  const dropdown = document.createElement('select')
  dropdown.id = 'scoreFilterDropdown'

  const options = [
    { value: 'none', text: 'None' },
    { value: 'sort:score', text: 'Sort by Score' },
    { value: 'score:>10', text: 'Score > 10' },
    { value: 'score:>50', text: 'Score > 50' },
    { value: 'score:>100', text: 'Score > 100' }
  ]

  options.forEach(option => {
    const optElement = document.createElement('option')
    optElement.value = option.value
    optElement.textContent = option.text
    dropdown.appendChild(optElement)
  })

  const urlParams = new URLSearchParams(window.location.search)
  const tags = urlParams.get('tags') || ''
  const selectedOption = options.find(opt => tags.includes(opt.value)) || options[0]
  dropdown.value = selectedOption.value

  const serializeParamsUnencoded = params =>
    '?' +
    Array.from(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')

  dropdown.addEventListener('change', () => {
    const selected = dropdown.value
    const urlParams = new URLSearchParams(window.location.search)
    let tags = urlParams.get('tags') || ''

    tags = tags
      .replace(/\+?sort:score\+?/g, '')
      .replace(/\+?score:>[0-9]+\+?/g, '')
      .trim()

    if (selected != 'none') tags = tags + (tags ? '+' : '') + selected

    urlParams.set('tags', tags)
    window.location.search = serializeParamsUnencoded(urlParams)
  })

  div.appendChild(dropdown)
  container.appendChild(div)
}

const addCopyTagsButton = container => {
  const div = document.createElement('div')
  const button = document.createElement('button')
  button.textContent = 'Copy Tags'
  button.style.cursor = 'pointer'
  button.style.padding = '2px 5px'

  button.addEventListener('click', async () => {
    const extractTags = selector =>
      Array.from(document.querySelectorAll(selector))
        .map(element => (element.querySelector(tagSelector)?.textContent || '').trim())
        .filter(Boolean)

    const combinedTags = [
      ...extractTags(artistSelector),
      ...extractTags(characterSelector),
      ...extractTags(copyrightSelector)
    ].join(', ')

    try {
      await navigator.clipboard.writeText(combinedTags)
      const originalText = button.textContent
      button.textContent = 'Copied!'
      setTimeout(() => (button.textContent = originalText), 1500)
    } catch (error) {
      alert(error.message)
    }
  })

  div.appendChild(button)
  container.appendChild(div)
}

const addPlusButtonsToTags = () => {
  const tags = document.querySelectorAll(`${artistSelector}, ${characterSelector}, ${copyrightSelector}`)

  tags.forEach(tag => {
    const count = tag.querySelector('.tag-count')
    if (!count) return

    const link = tag.querySelector(tagSelector)
    if (!link) return
    const tagName = link.textContent.trim()

    const button = document.createElement('a')
    button.textContent = ' + '
    button.href = '#'
    button.style.cursor = 'pointer'
    button.style.marginLeft = '4px'
    button.style.fontWeight = 'bold'
    button.style.color = '#0F0'

    button.addEventListener('click', event => {
      event.preventDefault()
      const input = document.querySelector('input[name=tags]')
      if (!input) return

      const formatted = tagName.replace(/ /g, '_')
      input.value = input.value ? `${input.value} ${formatted}` : formatted
      input.focus()
    })

    count.insertAdjacentElement('afterend', button)
  })
}

const style = document.createElement('style')
style.textContent = `
  .tag-search {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`
document.head.appendChild(style)

const init = () => {
  const container = document.querySelector('.tag-search')
  addCopyTagsButton(container)
  addScoreFilter(container)
  addPlusButtonsToTags()
}

init()
