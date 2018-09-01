const menubar = require('menubar')
const path = require('path')
const qiniu = require('qiniu')
const notifier = require('node-notifier')
const Store = require('electron-store')
const store = new Store()
const { ipcMain, clipboard } = require('electron')

const mb = menubar({
	index: path.join('file://', __dirname, 'index.html'),
	width: 350,
	height: 260
})

mb.on('ready', function ready () {
  mb.tray.on('drop-files', function (event, files) {
    if (!files || files.length === 0) return
    uploadFile(files[0])
  })
})

ipcMain.on('async', (event, arg) => {
  event.sender.send('async-reply', JSON.stringify({
      ak: store.get('ak'),
      sk: store.get('sk'),
      bucket: store.get('bucket')
  }))
})


exports.onClick = (ak, sk, bucket) => {
  store.set('ak', ak)
  store.set('sk', sk)
  store.set('bucket', bucket)
}

function uploadFile(path) {
  const accessKey = store.get('ak')
  const secretKey = store.get('sk')
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
  const options = {
    scope: store.get('bucket'),
  }
  const putPolicy = new qiniu.rs.PutPolicy(options)
  const uploadToken=putPolicy.uploadToken(mac)
  const localFile = path
  const config = new qiniu.conf.Config()
  config.zone = qiniu.zone.Zone_z0
  const formUploader = new qiniu.form_up.FormUploader(config)
  const putExtra = new qiniu.form_up.PutExtra()
  const fileType = path.split('.')[path.split('.').length - 1]
  const key= Date.now() + '.' + fileType

  formUploader.putFile(uploadToken, key, localFile, putExtra, function(respErr, respBody, respInfo) {
    if (respErr) {
      throw respErr
    }

    if (respInfo.statusCode == 200) {
      const url = `http://${options.scope}.qiniudn.com/${key}`
      clipboard.writeText(url)
      notifier.notify({
        title: 'QiniuBar',
        message: 'Congrats, file url already in clipboard!'
      })
    } else {
      console.log(respInfo.statusCode)
      console.log(respBody)
    }
  })
}