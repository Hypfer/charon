const Logger = require("./Logger");
const mqtt = require("mqtt");

class MqttClient {
    static TOPIC_PREFIX = "charon";

    constructor(relayController) {
        this.relayController = relayController;
        this.identifier = process.env.IDENTIFIER || "asdf";
        this.client = null;
        this.chimeEnabled = true;

        this.initialize();
    }

    initialize() {
        const options = this.buildMqttOptions();

        this.client = mqtt.connect(process.env.MQTT_BROKER_URL, options);

        this.client.on("connect", this.handleConnect.bind(this));
        this.client.on("error", (e) => Logger.error("MQTT error:", e.toString()));
        this.client.on("reconnect", () => Logger.info("Attempting to reconnect to MQTT broker"));
        this.client.on("message", this.handleMessage.bind(this));
    }

    buildMqttOptions() {
        const options = {
            clientId: `charon_${this.identifier}_${Math.random().toString(16).slice(2, 9)}`,
        };

        if (process.env.MQTT_USERNAME) {
            options.username = process.env.MQTT_USERNAME;
            
            if (process.env.MQTT_PASSWORD) {
                options.password = process.env.MQTT_PASSWORD;
            }
        } else if (process.env.MQTT_PASSWORD) {
            Logger.error("MQTT_PASSWORD is set but MQTT_USERNAME is not. MQTT_USERNAME must be set if MQTT_PASSWORD is set.");
            
            process.exit(1);
        }

        return options;
    }

    handleConnect() {
        Logger.info("Connected to MQTT broker");

        // Subscribe to chime, opener and chime switch topics
        const topics = [
            `${MqttClient.TOPIC_PREFIX}/${this.identifier}/chime/set`,
            `${MqttClient.TOPIC_PREFIX}/${this.identifier}/opener/set`,
            `${MqttClient.TOPIC_PREFIX}/${this.identifier}/chime/enabled/set`,
        ];

        topics.forEach((topic) => {
            this.client.subscribe(topic, (err) => {
                if (err) {
                    Logger.error(`Failed to subscribe to topic ${topic}:`, err.message);
                } else {
                    Logger.info(`Subscribed to topic ${topic}`);
                }
            });
        });

        this.publishAutoconf();
        this.publishChimeSwitchState(); // Publish the initial state of the switch
    }

    async handleMessage(topic, message) {
        if (topic === `${MqttClient.TOPIC_PREFIX}/${this.identifier}/chime/enabled/set`) {
            // Handle chime switch state
            const state = message.toString().toLowerCase();
            
            if (state === "on") {
                this.chimeEnabled = true;
                Logger.info("Chime enabled via MQTT switch");
            } else if (state === "off") {
                this.chimeEnabled = false;
                Logger.info("Chime disabled via MQTT switch");
            }
            
            this.publishChimeSwitchState();
            return;
        }

        let duration;

        try {
            const parsedValue = parseInt(message.toString(), 10);
            
            duration = !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
        } catch (err) {
            Logger.warn(`Received invalid payload for topic '${topic}'. Discarding`);
            
            return;
        }

        try {
            if (topic === `${MqttClient.TOPIC_PREFIX}/${this.identifier}/chime/set`) {
                await this.triggerChime(duration); 
            } else if (topic === `${MqttClient.TOPIC_PREFIX}/${this.identifier}/opener/set`) {
                await this.triggerOpener(duration);
            }
        } catch (error) {
            Logger.error("Failed to process MQTT message:", error.message);
        }
    }


    async triggerChime(duration) {
        try {
            await this.relayController.pulse(1, duration);
            Logger.info(`Chime triggered for ${duration}ms`);
        } catch (error) {
            Logger.error(`Failed to trigger chime: ${error.message}`);
        }
    }

    async triggerOpener(duration) {
        try {
            await this.relayController.pulse(2, duration);
            Logger.info(`Opener triggered for ${duration}ms`);
        } catch (error) {
            Logger.error(`Failed to trigger opener: ${error.message}`);
        }
    }

    publishAutoconf() {
        const baseTopic = `${MqttClient.TOPIC_PREFIX}/${this.identifier}`;
        const device = {
            manufacturer: "Generic",
            model: "Charon",
            name: "Charon " + this.identifier,
            identifiers: [this.identifier],
        };

        const configurations = [
            {
                topic: `homeassistant/button/charon_${this.identifier}_chime/config`,
                payload: {
                    name: "Door Chime",
                    command_topic: `${baseTopic}/chime/set`,
                    payload_press: "200",
                    unique_id: `charon_${this.identifier}_chime`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/button/charon_${this.identifier}_opener/config`,
                payload: {
                    name: "Door Opener",
                    command_topic: `${baseTopic}/opener/set`,
                    payload_press: "3000",
                    unique_id: `charon_${this.identifier}_opener`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/button/charon_${this.identifier}_notify_1/config`,
                payload: {
                    name: "Notify 1",
                    payload_press: "200",
                    command_topic: `${baseTopic}/chime/set`,
                    unique_id: `charon_${this.identifier}_notify_1`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/button/charon_${this.identifier}_notify_2/config`,
                payload: {
                    name: "Notify 2",
                    payload_press: "400",
                    command_topic: `${baseTopic}/chime/set`,
                    unique_id: `charon_${this.identifier}_notify_2`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/button/charon_${this.identifier}_notify_3/config`,
                payload: {
                    name: "Notify 3",
                    payload_press: "600",
                    command_topic: `${baseTopic}/chime/set`,
                    unique_id: `charon_${this.identifier}_notify_3`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/button/charon_${this.identifier}_notify_4/config`,
                payload: {
                    name: "Notify 4",
                    command_topic: `${baseTopic}/chime/set`,
                    payload_press: "800",
                    unique_id: `charon_${this.identifier}_notify_4`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/button/charon_${this.identifier}_notify_5/config`,
                payload: {
                    name: "Notify 5",
                    command_topic: `${baseTopic}/chime/set`,
                    payload_press: "1000",
                    unique_id: `charon_${this.identifier}_notify_5`,
                    device: device,
                },
            },
            {
                topic: `homeassistant/event/charon_${this.identifier}_doorbell/config`,
                payload: {
                    name: "Doorbell",
                    unique_id: `charon_${this.identifier}_doorbell`,
                    state_topic: `${baseTopic}/doorbell/event`,
                    event_types: [
                        "doorbell_pressed"
                    ],
                    device: device,
                },
            },
            {
                topic: `homeassistant/switch/charon_${this.identifier}_chime_enabled/config`,
                payload: {
                    name: "Chime Enabled",
                    command_topic: `${baseTopic}/chime/enabled/set`,
                    state_topic: `${baseTopic}/chime/enabled/state`,
                    unique_id: `charon_${this.identifier}_chime_enabled`,
                    device: device,
                },
            },
        ];

        configurations.forEach(({ topic, payload }) => {
            this.client.publish(topic, JSON.stringify(payload), { retain: true });
        });

        Logger.info("Published MQTT auto-discovery configuration");
    }

    publishChimeSwitchState() {
        const topic = `${MqttClient.TOPIC_PREFIX}/${this.identifier}/chime/enabled/state`;
        const payload = this.chimeEnabled ? "ON" : "OFF";
        this.client.publish(topic, payload, { retain: true });
        Logger.info(`Published chime switch state: ${payload}`);
    }

    publishDoorbellEvent() {
        const topic = `${MqttClient.TOPIC_PREFIX}/${this.identifier}/doorbell/event`;
        const payload = JSON.stringify({
            event_type: "doorbell_pressed"
        });

        this.client.publish(topic, payload, { retain: false });
        Logger.info("Published doorbell event");
    }
}

module.exports = MqttClient;
