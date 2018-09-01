'use strict'

const { remote, ipcRenderer, shell } = require('electron')
const mainProcess = remote.require('./main.js')

document
  .querySelector('#btn')
  .addEventListener('click', () => {
  	const ak = document.getElementById('ak').value
  	const sk = document.getElementById('sk').value
  	const bucket = document.getElementById('bucket').value
  	if (!ak || !sk || !bucket) {
  		return
  	}
    mainProcess.onClick(ak, sk, bucket)
  })

document.addEventListener('click', function (event) {
  if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
    event.preventDefault()
    shell.openExternal(event.target.href)
  }
})

ipcRenderer.send('async', 'ready')

ipcRenderer.on('async-reply', function (event,store) {
  const data = JSON.parse(store)
  document.getElementById('ak').value = data.ak || ''
  document.getElementById('sk').value = data.sk || ''
  document.getElementById('bucket').value = data.bucket || ''
})

