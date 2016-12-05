
var { app, dialog, BrowserWindow } = require('electron');
var { autoUpdater } = require('electron-auto-updater');

require('electron-debug')();

var mainWindow = null;

function openWindow() {

	mainWindow = new BrowserWindow({
        width: 640,
        height: 480,
    });

	mainWindow.webContents.on('will-navigate', function(event, url) {

		event.preventDefault();

	});

	mainWindow.loadURL(`file://${ __dirname }/app/app.html`);

	mainWindow.on('closed', function() {

		mainWindow = null;

	});

}

function checkUpdate() {

	if(process.platform != 'win32') {
		return;
	}

	autoUpdater.on('error', (err) => {
		console.error(err);
	});

	autoUpdater.on('checking-for-update', () => {
		console.log('checking-for-update');
	});

	autoUpdater.on('update-available', () => {
		console.log('update-available');
	});

	autoUpdater.on('update-not-available', () => {
		console.log('update-not-available');
	});

	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {

		console.log('update-downloaded');

		dialog.showMessageBox(mainWindow, {
			message: `New version of ${ releaseName } is available, install now?`,
			buttons: [ 'Yes', 'No' ],
			cancelId: 1,
		}, (response) => {

			if(response != 0) {
				return;
			}

			autoUpdater.quitAndInstall();

		});

	});

	autoUpdater.checkForUpdates();

}

app.on('window-all-closed', function() {

	app.quit();

});

app.on('ready', function() {

	openWindow();

	checkUpdate();

});
