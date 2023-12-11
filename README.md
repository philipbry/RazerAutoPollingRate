# Automatic Razer HyperPolling Dongle polling rate changer
## An electron tray application to automatically lower polling rate to save battery

Credits to these repos, used for orientation and for the razer driver documentation:
* RazerBatteryTaskbar https://github.com/Tekk-Know/RazerBatteryTaskbar
* OpenRazer https://github.com/openrazer/openrazer

## Behavior
Polling rate will be limited to the inactive one when not running the processes in the process list to conserve battery.

It will automatically switch to the active one as soon as an added process is running.

Any polling rate changes in Razer Synapse will be overwritten but will **not** display in it's menu.

## Instructions
- Install the application from the latest release
- Right click the tray icon to select the inactive and active polling rates (default is 500hz and 4000hz)
- Right click the tray icon to open the process list (processlist.cfg):
    - add any process name including the .exe ending (case insensitive)
    - you can add multiple processes by simply adding their name to a new line

## Additional Information
- Razer Synapse does not have to be running
- Available polling rates are 125hz, 250hz, 500hz, 1000hz, 2000hz, 4000hz and 8000hz (only for the Viper Mini SE). (250hz will work even though it is not an option in Razer Synapse)
- The lower the inactive polling rate is set to the more battery you will save. (Halving polling rate roughly halves power consuption)

## Screenshots
![9VZQkkOE8q](https://github.com/philipbry/RazerAutoPollingRate/assets/81459908/da9eec4f-9205-4761-9185-be9f68537653) ![VVv9TGXESs](https://github.com/philipbry/RazerAutoPollingRate/assets/81459908/2e34527f-5170-4c02-89ac-3763e0c3fd37) ![Code_3NmjqcuxB8](https://github.com/philipbry/RazerAutoPollingRate/assets/81459908/061c22c5-1b1e-40bf-b5b1-394bed1d51c5) ![q495QO1RAA](https://github.com/philipbry/RazerAutoPollingRate/assets/81459908/5abd2860-e874-4cd6-a574-206bfb22be34)


## Updates
- v1.2.3:
    - added error logging
    - fixed issues with app randomly quitting
    
- v1.2.2:
    - fixed some minor issues
    - improved task tray icon and tooltip feedback

- v1.2.1:
    - added Dock Pro support

- v1.2.0:
    - added recent 8k support on all hyperpolling mice

- v1.1.2:
    - process list will now be persistent across updates

- v1.1.1:
    - added Viper SE 8k HyperPolling support
    - minor bugfix

- v1.1.0:
    - Added inactive and active polling rate selectors
