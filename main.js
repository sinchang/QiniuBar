const menubar = require('menubar')
const path = require('path')
const qiniu = require('qiniu')
const Store = require('electron-store')
const store = new Store()
const { ipcMain, clipboard, Menu } = require('electron')
let notifier
const mb = menubar({
  index: path.join('file://', __dirname, 'index.html'),
  width: 350,
  height: 260
})

mb.on('ready', function ready() {
  notifier = require('electron-notify')
  notifier.setConfig({
    displayTime: 2000
  })

  mb.tray.on('drop-files', function(event, files) {
    if (
      !files ||
      files.length === 0 ||
      !store.get('ak') ||
      !store.get('sk') ||
      !store.get('bucket')
    )
      return
    uploadFile(files[0])
  })
  createMenu()
})

ipcMain.on('async', (event, arg) => {
  event.sender.send(
    'async-reply',
    JSON.stringify({
      ak: store.get('ak'),
      sk: store.get('sk'),
      bucket: store.get('bucket')
    })
  )
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
    scope: store.get('bucket')
  }
  const putPolicy = new qiniu.rs.PutPolicy(options)
  const uploadToken = putPolicy.uploadToken(mac)
  const localFile = path
  const config = new qiniu.conf.Config()
  config.zone = qiniu.zone.Zone_z0
  const formUploader = new qiniu.form_up.FormUploader(config)
  const putExtra = new qiniu.form_up.PutExtra()
  const fileType = path.split('.')[path.split('.').length - 1]
  const key = Date.now() + '.' + fileType

  formUploader.putFile(uploadToken, key, localFile, putExtra, function(
    respErr,
    respBody,
    respInfo
  ) {
    if (respErr) {
      throw respErr
    }

    if (respInfo.statusCode == 200) {
      const url = `http://${options.scope}.qiniudn.com/${key}`
      clipboard.writeText(url)
      notifier.notify({
        title: 'QiniuBar',
        text: 'Congrats, file url already in clipboard!'
      })
    } else {
      console.log(respInfo.statusCode)
      console.log(respBody)
    }
  })
}

function createMenu() {
  const application = {
    label: 'Application',
    submenu: [
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          mb.app.quit()
        }
      }
    ]
  }

  const edit = {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        selector: 'undo:'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        selector: 'redo:'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        selector: 'cut:'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        selector: 'copy:'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        selector: 'paste:'
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:'
      }
    ]
  }

  const template = [application, edit]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
