
var { app, BrowserWindow } = require('electron');

var mainWindow = null;

require('electron-debug')();

app.on('window-all-closed', function() {

	app.quit();

});

app.on('ready', function() {

	mainWindow = new BrowserWindow({
        width: 320,
        height: 480,
    });

	mainWindow.webContents.on('will-navigate', function(event, url) {

		event.preventDefault();

	});

	mainWindow.loadURL(`file://${ __dirname }/app/app.html`);

	mainWindow.on('closed', function() {

		mainWindow = null;

	});

});
