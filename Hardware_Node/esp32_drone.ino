#define MQTT_MAX_PACKET_SIZE 512 

#include "mbedtls/aes.h"
#include "mbedtls/base64.h"
#include <DHT.h>
#include <HardwareSerial.h>
#include <PubSubClient.h>
#include <TinyGPS++.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <math.h>

// WIFI
const char *ssid = "Drone1";
const char *password = "12345678";

// MQTT
const char *mqtt_server = "afc6727442064c98b65753a9cae78163.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char *mqtt_user = "Drone123";
const char *mqtt_pass = "Spectr@123";
const char *topic = "drone/DRONE_01";

WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

// AES
const char *aes_key = "DRONE_SECURE_KEY";
const char *aes_iv = "INITVECTOR123456";

// DHT
#define DHTPIN 4
DHT dht(DHTPIN, DHT11);

// ADXL
#define Xpin 34
#define Ypin 35
#define Zpin 32
float refX, refY, refZ;

// ULTRASONIC
#define TRIG1 12
#define ECHO1 13
#define TRIG2 14
#define ECHO2 27

// MAGNETIC
#define MAG_PIN 26

// GPS
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

unsigned long lastSend = 0;

// ---------- ADXL ----------
float avg(int pin) {
  long s = 0;
  for (int i = 0; i < 10; i++)
    s += analogRead(pin);
  return s / 10.0;
}

float getTilt() {
  float x = avg(Xpin), y = avg(Ypin), z = avg(Zpin);

  float dot = x * refX + y * refY + z * refZ;
  float m1 = sqrt(x * x + y * y + z * z);
  float m2 = sqrt(refX * refX + refY * refY + refZ * refZ);

  if (m1 == 0 || m2 == 0)
    return 0;

  return acos(dot / (m1 * m2)) * 57.2958;
}

// ---------- ULTRASONIC ----------
float getDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0)
    return 150;

  return duration * 0.034 / 2;
}

// ---------- AES ----------
String encryptAES(String msg) {
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  mbedtls_aes_setkey_enc(&aes, (const unsigned char *)aes_key, 128);

  int len = msg.length();
  int pad = 16 - (len % 16);
  int total = len + pad;

  unsigned char input[256];
  unsigned char output[256];
  unsigned char iv[16];

  memcpy(input, msg.c_str(), len);
  for (int i = len; i < total; i++)
    input[i] = pad;

  memcpy(iv, aes_iv, 16);

  for (int i = 0; i < total; i += 16)
    mbedtls_aes_crypt_cbc(&aes, MBEDTLS_AES_ENCRYPT, 16, iv, input + i,
                          output + i);

  size_t outLen;
  unsigned char base64[512];

  mbedtls_base64_encode(base64, sizeof(base64), &outLen, output, total);

  mbedtls_aes_free(&aes);

  return String((char *)base64).substring(0, outLen);
}

// MQTT
void connectMQTT() {
  while (!mqtt.connected()) {
    if (mqtt.connect("ESP32_DRONE", mqtt_user, mqtt_pass)) {
      Serial.println("MQTT Connected");
    } else {
      Serial.println("Retrying MQTT...");
      delay(2000);
    }
  }
}

// SETUP
void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
    delay(500);

  espClient.setInsecure();
  mqtt.setServer(mqtt_server, mqtt_port);

  dht.begin();

  pinMode(TRIG1, OUTPUT);
  pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT);
  pinMode(ECHO2, INPUT);
  pinMode(MAG_PIN, INPUT);

  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  delay(3000);
  refX = avg(Xpin);
  refY = avg(Ypin);
  refZ = avg(Zpin);
}

// LOOP
void loop() {

  if (!mqtt.connected())
    connectMQTT();
  mqtt.loop();
  delay(10);

  while (gpsSerial.available())
    gps.encode(gpsSerial.read());

  if (millis() - lastSend > 2000) {
    lastSend = millis();

    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temp))
      temp = 30;
    if (isnan(humidity))
      humidity = 50;

    float tilt = getTilt();
    float frontDist = getDistance(TRIG1, ECHO1);
    float sideDist = getDistance(TRIG2, ECHO2);
    int magnetic = digitalRead(MAG_PIN);

    String gpsData = "0,0";
    if (gps.location.isValid())
      gpsData =
          String(gps.location.lat(), 6) + "," + String(gps.location.lng(), 6);

    String json =
        "{\"temp\":" + String(temp) + ",\"humidity\":" + String(humidity) +
        ",\"tilt\":" + String(tilt) + ",\"magnetic\":" + String(magnetic) +
        ",\"frontDist\":" + String(frontDist) +
        ",\"sideDist\":" + String(sideDist) + ",\"gps\":\"" + gpsData + "\"}";

    String enc = encryptAES(json);
    enc.trim();

    Serial.println("\nSending JSON:");
    Serial.println(json);

    Serial.println("Encrypted:");
    Serial.println(enc);

    if (mqtt.publish(topic, enc.c_str())) {
      Serial.println("✅ Publish Success");
    } else {
      Serial.println("❌ Publish Failed");
    }
  }
}
