const USBRelay = require("@josephdadams/usbrelay");
const Semaphore = require("semaphore");

const Logger = require("./Logger");
const {sleep} = require("./util");


class RelayController {
    constructor() {
        this.relay = undefined;        
        this.semaphores = {
            global: new Semaphore(1),
            
            1: new Semaphore(1),
            2: new Semaphore(1)
        };
        
        try {
            this.ensureRelay();
        } catch(e) {
            // This will be retried on each new command
            Logger.error(`Error while ensuring relay`, e);
        }
    }
    
    async pulse(id, duration) {
        Logger.info(`Pulsing relay ${id} for ${duration}ms`);
        
        try {
            this.ensureRelay();
        } catch(e) {
            Logger.error(`Error while ensuring relay`, e);
            
            return;
        }
        
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
    
    ensureRelay() {
        if (!this.relay) {
            try {
                this.relay = new USBRelay();
            } catch(e) {
                this.relay = undefined;
                
                Logger.warn("Error while setting up USBRelay", e);
                throw new Error("No relay");
            }
        } else {
            try {
                this.relay.getState();
            } catch (e) {
                this.relay = undefined;

                Logger.warn("Error while testing USBRelay", e);
                throw new Error("No relay");
            }
        }
    }
}

module.exports = RelayController;