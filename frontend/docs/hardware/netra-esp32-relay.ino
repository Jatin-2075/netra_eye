#include <WiFi.h>
#include <WebServer.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
const char* SECRET    = "change-me";

const int LAMP_PIN = 26;
const int FAN_PIN  = 27;
const bool ACTIVE_LOW = true;

WebServer server(80);

void setRelay(int pin, bool on) { digitalWrite(pin, (on != ACTIVE_LOW) ? HIGH : LOW); }

void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

bool authorised() { return server.arg("key") == SECRET; }

void handle(int pin, bool on, const char* name) {
  cors();
  if (!authorised()) { server.send(401, "text/plain", "bad key"); return; }
  setRelay(pin, on);
  server.send(200, "text/plain", String(name) + (on ? " on" : " off"));
}

void setup() {
  pinMode(LAMP_PIN, OUTPUT); pinMode(FAN_PIN, OUTPUT);
  setRelay(LAMP_PIN, false); setRelay(FAN_PIN, false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);

  server.on("/lamp/on",  [] { handle(LAMP_PIN, true,  "lamp"); });
  server.on("/lamp/off", [] { handle(LAMP_PIN, false, "lamp"); });
  server.on("/fan/on",   [] { handle(FAN_PIN,  true,  "fan"); });
  server.on("/fan/off",  [] { handle(FAN_PIN,  false, "fan"); });
  server.on("/status", [] { cors(); server.send(200, "text/plain", "ok " + WiFi.localIP().toString()); });
  server.onNotFound([] { cors(); server.send(server.method() == HTTP_OPTIONS ? 204 : 404, "text/plain", ""); });
  server.begin();
}

void loop() { server.handleClient(); }
