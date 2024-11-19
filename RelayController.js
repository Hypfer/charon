const USBRelay = require("@josephdadams/usbrelay");
const Semaphore = require("semaphore");

const Logger = require("./Logger");
const {sleep} = require("./util");


class RelayController {
    constructor() {
        this.relay = new USBRelay();
        
        this.semaphores = {
            global: new Semaphore(1),
            
            1: new Semaphore(1),
            2: new Semaphore(1)
        };
    }
    
    async pulse(id, duration) {
        Logger.info(`Pulsing relay ${id} for ${duration}ms`);
        
        await new Promise((resolve) => {
            this.semaphores[id].take(() => {
                resolve();
            });
        });
        
        Logger.info(`Relay ${id} on`);
        this.relay.setState(id, true);

        await sleep(duration);

        Logger.info(`Relay ${id} off`);
        this.relay.setState(id, false);

        this.semaphores[id].leave();
    }
}

module.exports = RelayController;