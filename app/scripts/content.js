/* global browser */

// const has = Object.prototype.hasOwnProperty

browser.runtime.onMessage.addListener(req => {
  if (req.req === 'seek-video') {
    const videoEl = document.getElementsByTagName('VIDEO')[0]
    if (videoEl) {
      videoEl.currentTime = req.data
      return Promise.resolve({ content: 'DONE' })
    }
  }
  return Promise.reject(new Error('ERROR'))
})
