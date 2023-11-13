var { WebUSB } = require('usb');
var fs = require('fs');
const Store = require('electron-store');
const {
    app,
    Tray,
    Menu,
    nativeImage,
} = require('electron');
if (require('electron-squirrel-startup')) app.quit();

const path = require('path');
const app_path = app.getAppPath();
const store = new Store();
const AutoLaunch = require('auto-launch');
const execSync = require('child_process').execSync

const models_ = {
    None: 0,
    HyperPollingDongle: 1,
    ViperSE: 2,
    DockPro: 3,
}

const dongles = {
    0x009F: {
        model: models_.ViperSE,
        is_8k_compatible: true,
    },
    0x00B3: {
        model: models_.HyperPollingDongle,
        is_8k_compatible: true,
    },
    0x00A4: {
        model: models_.DockPro,
        is_8k_compatible: true,
    },
}

let tray;
let check_interval;
let autostart_enabled;
let autolaunch;
let context_menu;
let current_model;

function is_8k_compatible() {
    return current_model.is_8k_compatible;
}

let assets_folder = 'src/assets/';

let lower_rate = 500;
let higher_rate = 4000;

function handle_context_menu() {
    context_menu.items[0].submenu.items.forEach(function(item){
        item.enabled = parseInt(item.label) < higher_rate;
    });

    context_menu.items[1].submenu.items.forEach(function(item){
        item.enabled = parseInt(item.label) > lower_rate;
    });
};

app.whenReady().then(() => {
    if(!store.has('autostart'))
        store.set('autostart', true)

    autostart_enabled = store.get('autostart');

    autolaunch = new AutoLaunch({
        name: 'Razer Auto Polling Rate',
    });

    update_autostart();

    if (store.has('lower_rate'))
        lower_rate = store.get('lower_rate');

    if (store.has('higher_rate'))
        higher_rate = store.get('higher_rate');

    if (!fs.existsSync(path.join(app.getPath('userData'), 'cfg')))
        fs.mkdirSync(path.join(app.getPath('userData'), 'cfg'));

    fs.closeSync(fs.openSync(path.join(app.getPath('userData'), 'cfg/processlist.cfg'), 'a'));

    const icon = nativeImage.createFromPath(path.join(app_path, assets_folder + 'loading.png'));
    tray = new Tray(icon);

    context_menu = Menu.buildFromTemplate([
        { label: 'Inactive polling rate', type: 'submenu',
        submenu: [
            { label: '125hz', type: 'radio', click: handle_inactive, checked: lower_rate == 125 },
            { label: '250hz', type: 'radio', click: handle_inactive, checked: lower_rate == 250 },
            { label: '500hz', type: 'radio', click: handle_inactive, checked: lower_rate == 500 },
            { label: '1000hz', type: 'radio', click: handle_inactive, checked: lower_rate == 1000 },
            { label: '2000hz', type: 'radio', click: handle_inactive, checked: lower_rate == 2000 },
            { label: '4000hz', type: 'radio', click: handle_inactive, checked: lower_rate == 4000 },
            { label: '8000hz', type: 'radio', click: handle_inactive, checked: lower_rate == 8000, visible: lower_rate == 8000 },
        ]
        },
        { label: 'Active polling rate', type: 'submenu',
        submenu: [
            { label: '125hz', type: 'radio', click: handle_active, checked: higher_rate == 125 },
            { label: '250hz', type: 'radio', click: handle_active, checked: higher_rate == 250 },
            { label: '500hz', type: 'radio', click: handle_active, checked: higher_rate == 500 },
            { label: '1000hz', type: 'radio', click: handle_active, checked: higher_rate == 1000 },
            { label: '2000hz', type: 'radio', click: handle_active, checked: higher_rate == 2000 },
            { label: '4000hz', type: 'radio', click: handle_active, checked: higher_rate == 4000 },
            { label: '8000hz', type: 'radio', click: handle_active, checked: higher_rate == 8000, visible: higher_rate == 8000 },
        ]
        },
        { label: 'Open process list', type: 'normal', click: open_process_list },
        { label: 'Autostart', type: 'checkbox', click: handle_autostart, checked: autostart_enabled },
        { label: 'Quit', type: 'normal', click: quit }
    ]);

    tray.setToolTip('Searching for dongle');
    tray.setTitle('Razer auto polling rate');
    tray.setContextMenu(context_menu);

    handle_context_menu();

    check_interval = setInterval(() => {
        check_polling_rate();
    }, 3000);

    check_polling_rate(true);
})

function quit() {
    clearInterval(check_interval);
    if (process.platform !== 'darwin') app.quit();
};

function open_process_list() {
    require('child_process').exec('start "" "' + path.join(app.getPath('userData'), 'cfg') + '"');
};

function update_autostart() {
    store.set('autostart', autostart_enabled)
    autolaunch.isEnabled().then((enabled) => {
        if (!enabled && autostart_enabled) autolaunch.enable();
        else if (enabled && !autostart_enabled) autolaunch.disable();
    });
};

function handle_autostart(menuItem) {
    autostart_enabled = menuItem.checked;
    update_autostart();
};

function handle_inactive(menuItem) {
    lower_rate = parseInt(menuItem.label);
    store.set('lower_rate', lower_rate)
    handle_context_menu();
};

function handle_active(menuItem) {
    higher_rate = parseInt(menuItem.label);
    store.set('higher_rate', higher_rate)
    handle_context_menu();
};

function get_razer_report(transaction_id, command_class, command_id, data_size, argument0, argument1) {
    let msg = Buffer.from([0x00, transaction_id, 0x00, 0x00, 0x00, data_size, command_class, command_id, argument0, argument1]);
    msg = Buffer.concat([msg, Buffer.alloc(78)])

    let crc = 0;
    for (let i = 2; i < 88; i++) {
        crc = crc ^ msg[i];
    }

    msg = Buffer.concat([msg, Buffer.from([crc, 0])]);

    return msg;
};

async function get_dongle() {
    const dev = new WebUSB({
        devicesFound: devices => {
            devices.forEach(function(dev){
                if (dev.vendorId == 0x1532)
                    console.log(dev.productId + ' name: ' + dev.productName + " vendor: ", dev.vendorId);
            });
            return devices.find(device => device.vendorId == 0x1532 && (dongles[device.productId] !== undefined));
        }
    });

    const device = await dev.requestDevice({
        filters: [{}]
    })

    if (device) {
        return device;
    } else {
        throw new Error('No compatible Razer Dongle found');
    }
};

async function get_polling_rate(dongle) {
    try {
        await dongle.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x09,
            value: 0x300,
            index: 0x00
        }, get_razer_report(0x1F, 0x00, 0xC0, 0x01, 0x00, 0x00))

        await new Promise(res => setTimeout(res, 100));

        reply = await dongle.controlTransferIn({
            requestType: 'class',
            recipient: 'interface',
            request: 0x01,
            value: 0x300,
            index: 0x00
        }, 90)

        switch(reply.data.getInt8(9)) {
            case 0x01:
                polling_rate = 8000;
                break;
            case 0x02:
                polling_rate = 4000;
                break;
            case 0x04:
                polling_rate = 2000;
                break;
            case 0x08:
                polling_rate = 1000;
                break;
            case 0x10:
                polling_rate = 500;
                break;
            case 0x20:
                polling_rate = 250;
                break;
            case 0x40:
                polling_rate = 125;
                break;
            };

        return polling_rate;

    } catch (error) {
        console.error(error);
    }
};

async function set_polling_rate(dongle, polling_rate) {
    try {
        rate = 0x10;

        switch(polling_rate) {
            case 8000:
                rate = is_8k_compatible() ? 0x01 : 0x02;
                break;
            case 4000:
                rate = 0x02;
                break;
            case 2000:
                rate = 0x04;
                break;
            case 1000:
                rate = 0x08;
                break;
            case 500:
                rate = 0x10;
                break;
            case 250:
                rate = 0x20;
                break;
            case 125:
                rate = 0x40;
                break;
            default:
                break;
        }

        await dongle.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x09,
            value: 0x300,
            index: 0x00
        }, get_razer_report(0x1F, 0x00, 0x40, 0x02, 0x00, rate))

        await new Promise(res => setTimeout(res, 100));

        reply = await dongle.controlTransferIn({
            requestType: 'class',
            recipient: 'interface',
            request: 0x01,
            value: 0x300,
            index: 0x00
        }, 90)

        await new Promise(res => setTimeout(res, 100));

        await dongle.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x09,
            value: 0x300,
            index: 0x00
        }, get_razer_report(is_8k_compatible() ? 0x1F : 0xFF, 0x00, 0x40, 0x02, 0x01, rate))

        await new Promise(res => setTimeout(res, 100));

        reply = await dongle.controlTransferIn({
            requestType: 'class',
            recipient: 'interface',
            request: 0x01,
            value: 0x300,
            index: 0x00
        }, 90)

        new_polling_rate = await get_polling_rate(dongle);
        if (new_polling_rate != polling_rate) {
            tray.setToolTip(polling_rate == 8000 ? '8k is not supported on your device, please update drivers in synapse' : 'failed to set polling rate');
            nativeImage.createFromPath(path.join(app_path, assets_folder + 'loading.png'))
        }
        else{
            tray.setImage(nativeImage.createFromPath(path.join(app_path, assets_folder + polling_rate + (polling_rate == higher_rate ? 'a.png' : '.png'))));
            tray.setToolTip(polling_rate + 'hz');
        }
    } catch (error) {
        console.error(error);
    }
};

function is_running(names) {
    stdout = execSync('tasklist /fo csv /nh').toString();
    ret = names.some(term => stdout.toLowerCase().includes('"' + term.toLowerCase() + '"'));
    return ret;
};

async function check_polling_rate(first_run) {
    try {
        if (!fs.existsSync(path.join(app.getPath('userData'), 'cfg')))
            fs.mkdirSync(path.join(app.getPath('userData'), 'cfg'));

        fs.closeSync(fs.openSync(path.join(app.getPath('userData'), 'cfg/processlist.cfg'), 'a'));

        var array = fs.readFileSync(path.join(app.getPath('userData'), 'cfg/processlist.cfg')).toString().split('\r\n');

        const running = is_running(array);

        const dongle = await get_dongle();
        current_model = dongles[dongle.productId];
        if (current_model === undefined)
            throw new Error('No compatible Razer Dongle found');

        context_menu.items[0].submenu.items[context_menu.items[0].submenu.items.length - 1].visible = is_8k_compatible();
        context_menu.items[1].submenu.items[context_menu.items[1].submenu.items.length - 1].visible = is_8k_compatible();

        await dongle.open();
        if (dongle.configuration === null) {
            await dongle.selectConfiguration(1)
        }

        await dongle.claimInterface(dongle.configuration.interfaces[0].interfaceNumber);

        const polling_rate = await get_polling_rate(dongle);

        if(first_run) {
            tray.setImage(nativeImage.createFromPath(path.join(app_path, assets_folder + polling_rate + (polling_rate == higher_rate ? 'a.png' : '.png'))));
            tray.setToolTip(polling_rate + 'hz');
        }

        if(!running && polling_rate != lower_rate)
            await set_polling_rate(dongle, lower_rate);
        else if (running && polling_rate != higher_rate)
            await set_polling_rate(dongle, higher_rate);

    } catch (error) {
        console.error(error);
    }
};
