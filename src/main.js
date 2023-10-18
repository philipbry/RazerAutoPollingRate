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

let tray;
let check_interval;
let autostart_enabled;
let autolaunch;
let context_menu;

app.whenReady().then(() => {
    if(!store.has('autostart'))
        store.set('autostart', true)
        
    autostart_enabled = store.get('autostart');

    autolaunch = new AutoLaunch({
        name: 'Razer Auto Polling Rate',
        path: app.getPath('exe'),
    });

    update_autostart();

    if (!fs.existsSync('cfg'))
        fs.mkdirSync('cfg');

    fs.closeSync(fs.openSync('cfg/processlist.cfg', 'a'));

    const icon = nativeImage.createFromPath(path.join(app_path, 'src/assets/500.png'));
    tray = new Tray(icon);

    context_menu = Menu.buildFromTemplate([
        { label: 'Open process list', type: 'normal', click: open_process_list },
        { label: 'Autostart', type: 'checkbox', click: handle_autostart, checked: autostart_enabled },
        { label: 'Quit', type: 'normal', click: quit }
    ]);

    tray.setToolTip('Initializing');
    tray.setTitle('Razer auto polling rate');
    tray.setContextMenu(context_menu);

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
    require('child_process').exec('start "" "' + path.join(process.cwd(), '/cfg') + '"');
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
            return devices.find(device => 0x1532 && device.productId == 0x00B3)
        }
    });

    const device = await dev.requestDevice({
        filters: [{}]
    })

    if (device) {
        return device;
    } else {
        throw new Error('Razer HyperPolling Dongle not found');
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
            case 4000:
                rate = 0x02;
                break;
            case 500:
                rate = 0x10;
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
        }, get_razer_report(0xFF, 0x00, 0x40, 0x02, 0x01, rate))

        await new Promise(res => setTimeout(res, 100));

        reply = await dongle.controlTransferIn({
            requestType: 'class',
            recipient: 'interface',
            request: 0x01,
            value: 0x300,
            index: 0x00
        }, 90)

        await new Promise(res => setTimeout(res, 100));

        tray.setImage(nativeImage.createFromPath(path.join(app_path, 'src/assets/' + polling_rate + '.png')));
        tray.setToolTip(polling_rate + 'hz');
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
        if (!fs.existsSync('cfg'))
            fs.mkdirSync('cfg');
        fs.closeSync(fs.openSync('cfg/processlist.cfg'));

        var array = fs.readFileSync('cfg/processlist.cfg').toString().split('\r\n');

        const running = is_running(array);

        const dongle = await get_dongle();
        await dongle.open();

        if (dongle.configuration === null) {
            await dongle.selectConfiguration(1)
        }

        await dongle.claimInterface(dongle.configuration.interfaces[0].interfaceNumber);

        const polling_rate = await get_polling_rate(dongle);

        if(first_run) {
            tray.setImage(nativeImage.createFromPath(path.join(app_path, 'src/assets/' + polling_rate + '.png')));
            tray.setToolTip(polling_rate + 'hz');
        }
        
        if(!running && polling_rate != 500)
            await set_polling_rate(dongle, 500);
        else if (running && polling_rate != 4000)
            await set_polling_rate(dongle, 4000);

    } catch (error) {
        console.error(error);
    }
};
