/* global browser */
const CaptionHelper = require('./CaptionHelper')

const getCurrentUrl = async () => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true })
  const currentTab = tabs[0]
  return currentTab.url
}

const hideUI = () => {
  document.getElementById('inputContainer').style.display = 'none'
  document.getElementById('listContainer').style.display = 'none'
  document.getElementById('title').textContent = 'Not available for this video :('
}

const showUI = () => {
  document.getElementById('inputContainer').style.display = 'block'
  document.getElementById('listContainer').style.display = 'block'
  document.getElementById('title').textContent = 'Search'
  document.getElementById('searchButton').addEventListener('click', onSearch)

  const languageList = document.getElementById('languageSelect')
  captionTracks.forEach((track, key) => {
    const el = document.createElement('OPTION')
    el.value = key
    el.textContent = track.name.simpleText
    languageList.appendChild(el)
  })
  languageList.style.display = 'block'
}

const seekVideo = async (sec) => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true })
  const currentTab = tabs[0]
  browser.tabs.sendMessage(currentTab.id, { req: 'seek-video', data: parseFloat(sec) })
    .then(res => {
      console.log('Answer came in:', res)
    })
    .catch(err => { console.log(err) })
}

const populateList = (lines) => {
  const listEl = document.getElementById('list')
  listEl.innerHTML = ''
  if (lines.length === 0) {
    const el = document.createElement('LI')
    el.textContent = 'No results found'
    listEl.appendChild(el)
  } else {
    lines.forEach(line => {
      const el = document.createElement('LI')
      el.textContent = line.text
      el.addEventListener('click', () => { seekVideo(line.start) })
      listEl.appendChild(el)
    })
  }
}

const onSearch = () => {
  console.log('Searching...')
  const val = document.getElementById('input').value.toLowerCase()
  if (val.length <= 2) { return }
  const languageList = document.getElementById('languageSelect')
  const selectedTrack = captionTracks[languageList.value]
  const found = selectedTrack.captions.filter(line => {
    return line.text.indexOf(val) > -1
  })
  if (found.length > 0 && found.length <= 10) {
    console.log('Found:', found)
    populateList(found)
  } else if (found.length === 0) {
    populateList([])
  }
}

let captionTracks = []

const init = async () => {
  try {
    const url = await getCurrentUrl()
    captionTracks = await CaptionHelper.getCaptions(url)
    if (captionTracks.length > 0) {
      console.log(captionTracks)
      showUI()
    } else {
      hideUI()
    }
  } catch (err) {
    hideUI()
  }
}

document.addEventListener('DOMContentLoaded', init)
