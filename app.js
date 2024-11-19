const RelayController = require("./RelayController");
const Webserver = require("./Webserver");
const MqttClient = require("./MqttClient");

const relayController = new RelayController();
const mqttClient = new MqttClient(relayController);
const webServer = new Webserver(relayController, mqttClient);
