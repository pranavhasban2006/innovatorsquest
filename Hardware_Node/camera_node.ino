#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"

// =====================================================
// WIFI
// =====================================================

const char *ssid = "Drone1";
const char *password = "12345678";


// =====================================================
// T-SIMCAM V1.3 CAMERA PINS
// =====================================================

#define CAM_XCLK_PIN    14
#define CAM_SIOD_PIN     4
#define CAM_SIOC_PIN     5

#define CAM_Y9_PIN      15
#define CAM_Y8_PIN      16
#define CAM_Y7_PIN      17
#define CAM_Y6_PIN      12
#define CAM_Y5_PIN      10
#define CAM_Y4_PIN       8
#define CAM_Y3_PIN       9
#define CAM_Y2_PIN      11

#define CAM_VSYNC_PIN    6
#define CAM_HREF_PIN     7
#define CAM_PCLK_PIN    13

#define PWR_ON_PIN       1


// =====================================================
// HTTP
// =====================================================

httpd_handle_t camera_httpd = NULL;

static const char *STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=frame";

static const char *STREAM_BOUNDARY =
    "\r\n--frame\r\n";

static const char *STREAM_PART =
    "Content-Type: image/jpeg\r\n"
    "Content-Length: %u\r\n\r\n";


// =====================================================
// CAMERA STREAM
// =====================================================

static esp_err_t stream_handler(
    httpd_req_t *req
) {

    camera_fb_t *fb = NULL;

    esp_err_t res = ESP_OK;

    char part_buf[64];

    res = httpd_resp_set_type(
        req,
        STREAM_CONTENT_TYPE
    );

    if (res != ESP_OK) {
        return res;
    }

    httpd_resp_set_hdr(
        req,
        "Access-Control-Allow-Origin",
        "*"
    );

    Serial.println("STREAM CLIENT CONNECTED");

    while (true) {

        fb = esp_camera_fb_get();

        if (!fb) {

            Serial.println(
                "Camera capture failed"
            );

            res = ESP_FAIL;
            break;
        }

        size_t hlen = snprintf(
            part_buf,
            sizeof(part_buf),
            STREAM_PART,
            fb->len
        );

        res = httpd_resp_send_chunk(
            req,
            STREAM_BOUNDARY,
            strlen(STREAM_BOUNDARY)
        );

        if (res == ESP_OK) {

            res = httpd_resp_send_chunk(
                req,
                part_buf,
                hlen
            );
        }

        if (res == ESP_OK) {

            res = httpd_resp_send_chunk(
                req,
                (const char *)fb->buf,
                fb->len
            );
        }

        esp_camera_fb_return(fb);

        if (res != ESP_OK) {

            Serial.println(
                "STREAM CLIENT DISCONNECTED"
            );

            break;
        }

        delay(10);
    }

    return res;
}


// =====================================================
// ROOT PAGE
// =====================================================

static esp_err_t index_handler(
    httpd_req_t *req
) {

    const char *html =
        "<html>"
        "<head>"
        "<title>SPECTR Camera</title>"
        "</head>"
        "<body>"
        "<h1>SPECTR ESP32-S3 Camera</h1>"
        "<img src='/stream' width='960'>"
        "</body>"
        "</html>";

    httpd_resp_set_type(
        req,
        "text/html"
    );

    return httpd_resp_send(
        req,
        html,
        strlen(html)
    );
}


// =====================================================
// START SERVER
// =====================================================

void startCameraServer() {

    httpd_config_t config =
        HTTPD_DEFAULT_CONFIG();

    config.server_port = 80;

    config.max_uri_handlers = 4;

    config.max_open_sockets = 2;

    config.stack_size = 8192;


    httpd_uri_t index_uri = {
        .uri = "/",
        .method = HTTP_GET,
        .handler = index_handler,
        .user_ctx = NULL
    };


    httpd_uri_t stream_uri = {
        .uri = "/stream",
        .method = HTTP_GET,
        .handler = stream_handler,
        .user_ctx = NULL
    };


    Serial.println(
        "Starting HTTP server..."
    );


    esp_err_t result = httpd_start(
        &camera_httpd,
        &config
    );


    if (result == ESP_OK) {

        httpd_register_uri_handler(
            camera_httpd,
            &index_uri
        );

        httpd_register_uri_handler(
            camera_httpd,
            &stream_uri
        );

        Serial.println(
            "HTTP server started!"
        );

    } else {

        Serial.print(
            "HTTP server FAILED: "
        );

        Serial.println(
            (int)result
        );
    }
}


// =====================================================
// SETUP
// =====================================================

void setup() {

    Serial.begin(115200);

    delay(2000);

    Serial.println();
    Serial.println(
        "=============================="
    );

    Serial.println(
        "SPECTR ESP32-S3 CAMERA"
    );

    Serial.println(
        "=============================="
    );


    // -------------------------------------------------
    // CAMERA POWER
    // -------------------------------------------------

    pinMode(
        PWR_ON_PIN,
        OUTPUT
    );

    digitalWrite(
        PWR_ON_PIN,
        HIGH
    );

    delay(500);


    // -------------------------------------------------
    // CAMERA CONFIG
    // -------------------------------------------------

    camera_config_t config;

    config.ledc_channel =
        LEDC_CHANNEL_0;

    config.ledc_timer =
        LEDC_TIMER_0;

    config.pin_d0 =
        CAM_Y2_PIN;

    config.pin_d1 =
        CAM_Y3_PIN;

    config.pin_d2 =
        CAM_Y4_PIN;

    config.pin_d3 =
        CAM_Y5_PIN;

    config.pin_d4 =
        CAM_Y6_PIN;

    config.pin_d5 =
        CAM_Y7_PIN;

    config.pin_d6 =
        CAM_Y8_PIN;

    config.pin_d7 =
        CAM_Y9_PIN;

    config.pin_xclk =
        CAM_XCLK_PIN;

    config.pin_pclk =
        CAM_PCLK_PIN;

    config.pin_vsync =
        CAM_VSYNC_PIN;

    config.pin_href =
        CAM_HREF_PIN;

    config.pin_sccb_sda =
        CAM_SIOD_PIN;

    config.pin_sccb_scl =
        CAM_SIOC_PIN;

    config.pin_pwdn =
        -1;

    config.pin_reset =
        -1;

    config.xclk_freq_hz =
        20000000;

    config.pixel_format =
        PIXFORMAT_JPEG;


    // 1080p

    config.frame_size =
        FRAMESIZE_FHD;

    config.jpeg_quality =
        12;

    config.fb_count =
        2;

    config.grab_mode =
        CAMERA_GRAB_LATEST;

    config.fb_location =
        CAMERA_FB_IN_PSRAM;


    Serial.print(
        "Free heap before camera: "
    );

    Serial.println(
        ESP.getFreeHeap()
    );


    Serial.print(
        "Free PSRAM before camera: "
    );

    Serial.println(
        ESP.getFreePsram()
    );


    Serial.println(
        "Initializing camera..."
    );


    esp_err_t camera_result =
        esp_camera_init(&config);


    if (camera_result != ESP_OK) {

        Serial.print(
            "Camera FAILED: 0x"
        );

        Serial.println(
            camera_result,
            HEX
        );

        while (true) {
            delay(1000);
        }
    }


    Serial.println(
        "Camera initialized successfully!"
    );


    Serial.print(
        "Free heap after camera: "
    );

    Serial.println(
        ESP.getFreeHeap()
    );


    Serial.print(
        "Free PSRAM after camera: "
    );

    Serial.println(
        ESP.getFreePsram()
    );


    // =================================================
    // WIFI
    // =================================================

    Serial.println();
    Serial.println(
        "Connecting WiFi..."
    );

    Serial.print(
        "SSID: "
    );

    Serial.println(
        ssid
    );


    WiFi.mode(
        WIFI_STA
    );

    WiFi.setSleep(
        false
    );

    WiFi.begin(
        ssid,
        password
    );


    int attempts = 0;


    while (
        WiFi.status() != WL_CONNECTED
        &&
        attempts < 30
    ) {

        delay(500);

        Serial.print(".");

        attempts++;
    }


    Serial.println();


    if (WiFi.status() != WL_CONNECTED) {

        Serial.println(
            "WIFI CONNECTION FAILED!"
        );

        Serial.print(
            "WiFi status: "
        );

        Serial.println(
            WiFi.status()
        );

        return;
    }


    // =================================================
    // WIFI SUCCESS
    // =================================================

    Serial.println(
        "WiFi connected!"
    );

    Serial.print(
        "Camera IP: "
    );

    Serial.println(
        WiFi.localIP()
    );

    Serial.print(
        "RSSI: "
    );

    Serial.println(
        WiFi.RSSI()
    );


    // =================================================
    // SERVER
    // =================================================

    startCameraServer();

    Serial.println();
    Serial.println(
        "================================"
    );

    Serial.println(
        "CAMERA READY"
    );

    Serial.print(
        "Open: http://"
    );

    Serial.print(
        WiFi.localIP()
    );

    Serial.println(
        "/stream"
    );

    Serial.println(
        "================================"
    );
}


// =====================================================
// LOOP
// =====================================================

void loop() {

    delay(1000);
}
