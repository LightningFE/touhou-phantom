
const { dialog } = require('electron').remote;

export function confirmEx(msg) {
    return new Promise((resolve, reject) => {

        dialog.showMessageBox(null, {
            message: msg,
            buttons: [ 'Yes', 'No' ],
            cancelId: 1,
        }, (response) => resolve(response == 0));

    });
}
