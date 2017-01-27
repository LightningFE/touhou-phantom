
const { app, dialog, BrowserWindow } = require('electron');
const NsisAutoUpdater = require('./updater');

require('electron-debug')();

var mainWindow = null;

function openWindow() {

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

}

function checkUpdate() {

	const autoUpdater = new NsisAutoUpdater({
		baseUrl: 'http://tldr.run:1337/',
		channel: 'latest',
	});

	autoUpdater.on('error', (err) => {
		console.error(err);
	});

	autoUpdater.checkForUpdates()
	.then(({
		version, upgradable, file,
	}) => {
		return new Promise((resolve, reject) => {

			if(upgradable) {

				dialog.showMessageBox(mainWindow, {
					message: `New version of ${ version } is available, download now?`,
					buttons: [ 'Yes', 'No' ],
					cancelId: 1,
				}, (response) => {
					resolve({
						response, file,
					});
				});

			}

		});
	})
	.then(({
		response, file,
	}) => {
		return new Promise((resolve, reject) => {

			if(response == 0) {

				autoUpdater.downloadUpdate(file)
				.then(resolve)
				.catch(reject);

			}

		});
	})
	.then(({
		path, version,
	}) => {
		return new Promise((resolve, reject) => {

			dialog.showMessageBox(mainWindow, {
				message: `Update for ${ version } is downloaded, install now?`,
				buttons: [ 'Yes', 'No' ],
				cancelId: 1,
			}, (response) => {
				resolve({
					response, path,
				})
			});

		});
	})
	.then(({
		response, path,
	}) => {

		if(response == 0) {
			autoUpdater.quitAndInstall(path);
		}
		else {
			autoUpdater.installWhenQuit(path);
		}

	})
	.catch(console.error);

}

app.on('window-all-closed', function() {

	app.quit();

});

app.on('ready', function() {

	openWindow();

	checkUpdate();

});
