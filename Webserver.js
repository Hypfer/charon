const express = require("express");
const Logger = require("./Logger");

const PORT = process.env.PORT || 3000;

class Webserver {
    constructor(relayController, mqttClient) {
        this.relayController = relayController;
        this.mqttClient = mqttClient;
        this.app = express();

        this.app.use(express.json());
        this.setupRoutes();
        this.listen();
    }

    setupRoutes() {
        this.app.get("/", (req, res) => {
            res.send("Welcome to the Relay Controller Web API");
        });

        this.app.get("/relay/:id/pulse", async (req, res) => {
            const relayId = parseInt(req.params.id, 10);
            const duration = parseInt(req.query.duration, 10);

            if (isNaN(relayId) || isNaN(duration) || duration <= 0) {
                return res.status(400).json({ error: "Invalid relay ID or duration" });
            }

            try {
                await this.relayController.pulse(relayId, duration);
                res.status(200).json({ message: `Relay ${relayId} pulsed for ${duration}ms` });
            } catch (error) {
                Logger.error(`Error pulsing relay ${relayId}: ${error.message}`);
                res.status(500).json({ error: "Failed to pulse the relay" });
            }
        });

        this.app.post("/relay/:id/pulse", async (req, res) => {
            const relayId = parseInt(req.params.id, 10);
            const { duration } = req.body;

            if (isNaN(relayId) || !Number.isInteger(duration) || duration <= 0) {
                return res.status(400).json({ error: "Invalid relay ID or duration" });
            }

            try {
                await this.relayController.pulse(relayId, duration);
                res.status(200).json({ message: `Relay ${relayId} pulsed for ${duration}ms` });
            } catch (error) {
                Logger.error(`Error pulsing relay ${relayId}: ${error.message}`);
                res.status(500).json({ error: "Failed to pulse the relay" });
            }
        });

        this.app.post("/doorbell", async (req, res) => {
            try {
                if (this.mqttClient.chimeEnabled) {
                    await this.relayController.pulse(1, 100); // Pulse relay 1 for 100ms
                } else {
                    Logger.info("Skipping chime as it is disabled");
                }                

                this.mqttClient.publishDoorbellEvent(); // Publish doorbell event via MQTT
                res.status(200).json({ message: "Doorbell event triggered" });
            } catch (error) {
                Logger.error(`Error triggering doorbell event: ${error.message}`);
                res.status(500).json({ error: "Failed to trigger doorbell event" });
            }
        });
    }

    listen() {
        this.app.listen(PORT, () => Logger.info(`Webserver listening on port ${PORT}`));
    }
}

module.exports = Webserver;
