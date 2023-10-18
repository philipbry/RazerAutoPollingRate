# Razer HyperPolling Dongle auto polling rate changer
## An electron tray application to automatically lower polling rate to save battery

Credits to these repos, used for orientation and for the razer driver documentation:
* RazerBatteryTaskbar https://github.com/Tekk-Know/RazerBatteryTaskbar
* OpenRazer https://github.com/openrazer/openrazer

## Behavior
Polling rate will be limited to 500hz when not running the processes in the process list to conserve battery. 
It will automatically switch to 4000hz as soon as an added process is running.

## Instructions
- Install the application from the latest release
- Right click the tray icon to open the process list (processlist.cfg):
    - add any process name including the .exe ending (case insensitive)
    - you can add multiple processes by simply adding their name to a new line
