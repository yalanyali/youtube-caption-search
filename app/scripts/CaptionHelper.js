const striptags = require('./striptags')
const he = require('./he')

const checkUrl = (url) => {
  console.log('URL checking:', url)
  return true
}

const getIdFromUrl = (str) => {
  const stripParameters = (str) => {
    // Split parameters or split folder separator
    if (str.indexOf('?') > -1) {
      return str.split('?')[0]
    } else if (str.indexOf('/') > -1) {
      return str.split('/')[0]
    }
    return str
  }

  // shortcode
  const shortcode = /youtube:\/\/|https?:\/\/youtu\.be\/|http:\/\/y2u\.be\//g

  if (shortcode.test(str)) {
    const shortcodeid = str.split(shortcode)[1]
    return stripParameters(shortcodeid)
  }

  // /v/ or /vi/
  const inlinev = /\/v\/|\/vi\//g

  if (inlinev.test(str)) {
    const inlineid = str.split(inlinev)[1]
    return stripParameters(inlineid)
  }

  // v= or vi=
  const parameterv = /v=|vi=/g

  if (parameterv.test(str)) {
    const arr = str.split(parameterv)
    return arr[1].split('&')[0]
  }

  // v= or vi=
  const parameterwebp = /\/an_webp\//g

  if (parameterwebp.test(str)) {
    const webp = str.split(parameterwebp)[1]
    return stripParameters(webp)
  }

  // embed
  const embedreg = /\/embed\//g

  if (embedreg.test(str)) {
    const embedid = str.split(embedreg)[1]
    return stripParameters(embedid)
  }

  // ignore /user/username pattern
  const usernamereg = /\/user\/([a-zA-Z0-9]*)$/g

  if (usernamereg.test(str)) {
    return undefined
  }

  // user
  const userreg = /\/user\/(?!.*videos)/g

  if (userreg.test(str)) {
    const elements = str.split('/')
    return stripParameters(elements.pop())
  }

  // attribution_link
  const attrreg = /\/attribution_link\?.*v%3D([^%&]*)(%26|&|$)/

  if (attrreg.test(str)) {
    return str.match(attrreg)[1]
  }
}

const getVideoInfo = (url) => {
  const infoUrl = 'https://youtube.com/get_video_info?video_id=' + getIdFromUrl(url)
  console.log('Fetching url:', infoUrl)
  return new Promise((resolve, reject) => {
    fetch(infoUrl)
      .then(res => res.text())
      .then(resData => {
        return resolve(decodeURIComponent(resData))
      })
      .catch(err => {
        reject(err)
      })
  })
}

const parseCaptionTrack = (trackText) => {
  return trackText
    .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
    .replace('</transcript>', '')
    .split('</text>')
    .filter(line => line && line.trim())
    .map(line => {
      const startRegex = /start="([\d.]+)"/
      const durRegex = /dur="([\d.]+)"/

      const [, start] = startRegex.exec(line)
      const [, dur] = durRegex.exec(line)

      const htmlText = line
        .replace(/<text.+>/, '')
        .replace(/&amp;/gi, '&')
        .replace(/<\/?[^>]+(>|$)/g, '')

      const decodedText = he.decode(htmlText)
      const text = striptags(decodedText).toLowerCase()

      return {
        start,
        dur,
        text
      }
    })
}

const downloadCaptionTrack = (url) => {
  console.log(url)
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(res => res.text())
      .then(track => {
        const parsed = parseCaptionTrack(track)
        resolve(parsed)
      })
      .catch(err => { reject(err) })
  })
}

const getCaptionTracks = async (videoInfo) => {
  const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/
  const [match] = regex.exec(videoInfo)
  const { captionTracks } = JSON.parse(`${match}}`)
  const _downloadedCaptionTracks = captionTracks.map(
    async (track) => {
      const downloadedTrack = await downloadCaptionTrack(track.baseUrl)
      return { ...track, captions: downloadedTrack }
    }
  )
  const downloadedCaptionTracks = await Promise.all(_downloadedCaptionTracks)
  return downloadedCaptionTracks
}

const getCaptions = async (url) => {
  if (!checkUrl(url)) { return }
  const videoInfo = await getVideoInfo(url)
  if (!videoInfo.includes('captionTracks')) { return }
  const captionTracks = await getCaptionTracks(videoInfo)
  return captionTracks
}

module.exports = {
  getCaptions
}
