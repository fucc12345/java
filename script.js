/**
 * Comprehensive Browser & Device Information Collector
 * This script attempts to gather almost every piece of information
 * accessible via JavaScript in a web browser, including standard APIs,
 * permission-requiring APIs, and advanced/fingerprinting techniques.
 *
 * NOTE: Many features require HTTPS, user permissions, or are experimental.
 * Results will vary significantly based on browser, OS, and user settings.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const reportElement = document.getElementById('report');
    const browserInfo = {};

    /**
     * Helper function to safely get a synchronous property.
     * @param {function} getter - A function that returns the desired value.
     * @returns {*} The value or a descriptive error message.
     */
    const safeGet = (getter) => {
        try {
            const value = getter();
            return (value === undefined || value === null || value === '') ? 'N/A' : value;
        } catch (error) {
            return `Error: ${error.message}`;
        }
    };

    /**
     * Helper function to safely get an asynchronous property (Promise-based).
     * @param {Promise} promise - The promise to resolve.
     * @returns {Promise<*>} The resolved value or a descriptive error message.
     */
    const safeGetAsync = async (promise) => {
        try {
            const value = await promise;
            return (value === undefined || value === null || value === '') ? 'N/A' : value;
        } catch (error) {
            // Check if it's a DOMException for permission errors
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                return `Permission Denied or Blocked: ${error.message}`;
            }
            return `Error: ${error.message}`;
        }
    };

    // --- 1. Directly Accessible via JavaScript (No Special Permissions) ---

    browserInfo.directAccess = {
        // Browser & Device Info
        userAgent: safeGet(() => navigator.userAgent),
        appVersion: safeGet(() => navigator.appVersion),
        appName: safeGet(() => navigator.appName),
        product: safeGet(() => navigator.product),
        platform: safeGet(() => navigator.platform),
        vendor: safeGet(() => navigator.vendor),
        language: safeGet(() => navigator.language),
        languages: safeGet(() => navigator.languages),
        hardwareConcurrency: safeGet(() => navigator.hardwareConcurrency),
        deviceMemoryGB: safeGet(() => navigator.deviceMemory),
        maxTouchPoints: safeGet(() => navigator.maxTouchPoints),
        isWebDriver: safeGet(() => navigator.webdriver), // Indicates if automation tools like Selenium are in use
        doNotTrack: safeGet(() => navigator.doNotTrack), // User's tracking preference

        // Display and Rendering
        screenWidth: safeGet(() => screen.width),
        screenHeight: safeGet(() => screen.height),
        screenAvailWidth: safeGet(() => screen.availWidth),
        screenAvailHeight: safeGet(() => screen.availHeight),
        windowInnerWidth: safeGet(() => window.innerWidth),
        windowInnerHeight: safeGet(() => window.innerHeight),
        colorDepth: safeGet(() => screen.colorDepth),
        pixelRatio: safeGet(() => window.devicePixelRatio),
        screenOrientation: safeGet(() => screen.orientation?.type || 'N/A'),

        // Time and Locale
        timezone: safeGet(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
        timezoneOffsetMinutes: safeGet(() => new Date().getTimezoneOffset()),
        localDateTime: safeGet(() => new Date().toString()),

        // Browsing Environment
        cookiesEnabled: safeGet(() => navigator.cookieEnabled),
        referrer: safeGet(() => document.referrer || 'None'),
        currentURL: safeGet(() => window.location.href),
        historyLength: safeGet(() => history.length),
        onLine: safeGet(() => navigator.onLine),
    };

    // --- 2. Performance ---
    browserInfo.performance = {
        navigationTiming: safeGet(() => {
            if (window.performance && window.performance.timing) {
                const timing = window.performance.timing;
                return {
                    loadTime: timing.loadEventEnd - timing.navigationStart,
                    domInteractive: timing.domInteractive - timing.navigationStart,
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
                };
            }
            return 'N/A';
        }),
        highResTimeNow: safeGet(() => performance.now()),
        resourceLoadingDetailsCount: safeGet(() => performance.getEntriesByType("resource").length),
        paintTiming: safeGet(() => {
            if (window.performance && window.performance.getEntriesByType) {
                const paints = performance.getEntriesByType("paint");
                return paints.map(entry => ({
                    name: entry.name,
                    startTime: entry.startTime
                }));
            }
            return 'N/A';
        })
    };

    // --- 3. Web APIs Access (Some Need Permission) ---
    browserInfo.webAPIAccess = {
        geolocation: await safeGetAsync(new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve('Geolocation API not supported.');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date(position.timestamp).toISOString()
                }),
                (error) => resolve(`Permission denied or error: ${error.message}`),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        })),
        clipboardReadPermission: await safeGetAsync(navigator.permissions?.query({ name: "clipboard-read" }).then(res => res.state)),
        clipboardWritePermission: await safeGetAsync(navigator.permissions?.query({ name: "clipboard-write" }).then(res => res.state)),
        cameraAccess: await safeGetAsync(navigator.permissions?.query({ name: "camera" }).then(res => res.state)),
        microphoneAccess: await safeGetAsync(navigator.permissions?.query({ name: "microphone" }).then(res => res.state)),
        batteryStatus: await safeGetAsync(navigator.getBattery?.().then(battery => ({
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
        }))),
        networkConnection: safeGet(() => {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                return {
                    type: connection.type, // wifi, cellular, etc.
                    effectiveType: connection.effectiveType, // 2g, 3g, 4g
                    rtt: connection.rtt, // Round-trip time
                    downlink: connection.downlink, // Bandwidth in Mbps
                    saveData: connection.saveData // User preference for reduced data usage
                };
            }
            return 'N/A';
        }),
        vibrationAPI: safeGet(() => typeof navigator.vibrate === 'function' ? 'Supported' : 'Not Supported'),
        // WebRTC will be handled in IP section
    };

    // --- 4. IP Address Access (External Help / WebRTC) ---
    browserInfo.ipAddress = {
        publicIP: await safeGetAsync(fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => data.ip)),
        // WebRTC Local IP (experimental, may not always work, especially with VPNs/firewalls)
        localIPviaWebRTC: await safeGetAsync(new Promise((resolve, reject) => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel(''); // Dummy data channel to trigger ICE negotiation
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                pc.onicecandidate = (event) => {
                    if (event.candidate && event.candidate.candidate) {
                        const match = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(event.candidate.candidate);
                        if (match && match[1]) {
                            pc.onicecandidate = null; // Stop listening
                            resolve(match[1]);
                        }
                    }
                };
                setTimeout(() => resolve('WebRTC timeout or no local IP found'), 1500); // Timeout
            } catch (error) {
                resolve(`WebRTC Error: ${error.message}`);
            }
        }))
    };

    // --- 5. Inferred or Derived Data (Fingerprinting Vectors) ---
    browserInfo.fingerprinting = {};

    // Canvas Fingerprinting
    browserInfo.fingerprinting.canvasHash = safeGet(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 20;
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText("Hello World! 123 abc", 2, 15);
        return canvas.toDataURL();
    });

    // WebGL Fingerprinting
    browserInfo.fingerprinting.webGLInfo = safeGet(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'WebGL not supported';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                version: gl.getParameter(gl.VERSION),
                glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                supportedExtensions: gl.getSupportedExtensions(),
            };
        }
        return 'WebGL debug info not available';
    });

    // AudioContext Fingerprinting
    browserInfo.fingerprinting.audioContextHash = await safeGetAsync(new Promise(resolve => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                resolve('AudioContext not supported');
                return;
            }
            const context = new AudioContext();
            const analyser = context.createAnalyser();
            const oscillator = context.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = 10000; // High frequency
            oscillator.connect(analyser);
            analyser.connect(context.destination);
            oscillator.start(0);
            const data = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(data);
            oscillator.stop(0);
            context.close();
            resolve(Array.from(data).reduce((acc, val) => acc + val, 0)); // Simple sum hash
        } catch (e) {
            resolve(`AudioContext Error: ${e.message}`);
        }
    }));

    // Font Detection (Basic, more advanced would compare pixel dimensions)
    browserInfo.fingerprinting.detectedFonts = safeGet(() => {
        const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Comic Sans MS', 'Courier New', 'Georgia', 'Lucida Console', 'Impact'];
        const body = document.body;
        const testDiv = document.createElement('div');
        testDiv.style.position = 'absolute';
        testDiv.style.left = '-9999px';
        testDiv.style.top = '-9999px';
        testDiv.style.fontSize = '72px';
        testDiv.style.lineHeight = 'normal';
        testDiv.innerText = 'mmmmmmmmmmlli'; // Characters that help with font height/width variations
        body.appendChild(testDiv);

        const available = [];
        const getWidth = (fontFamily) => {
            testDiv.style.fontFamily = `'${fontFamily}', monospace`; // Compare against a base font
            return testDiv.offsetWidth;
        };

        const monospaceWidth = getWidth('monospace');

        for (const font of fonts) {
            if (getWidth(font) !== monospaceWidth) {
                available.push(font);
            }
        }
        body.removeChild(testDiv);
        return available.length > 0 ? available : 'None of common fonts detected differently';
    });

    // Browser Feature Detection
    browserInfo.fingerprinting.browserFeatures = {
        supportsCSSGrid: safeGet(() => CSS.supports('display', 'grid')),
        supportsIndexedDB: safeGet(() => !!window.indexedDB),
        supportsServiceWorker: safeGet(() => !!navigator.serviceWorker),
        supportsWebGL2: safeGet(() => !!document.createElement('canvas').getContext('webgl2')),
        supportsWebAssembly: safeGet(() => typeof WebAssembly === 'object' && WebAssembly.compile),
        plugins: safeGet(() => { // Legacy, often empty in modern browsers
            const plugins = [];
            if (navigator.plugins) {
                for (let i = 0; i < navigator.plugins.length; i++) {
                    plugins.push(navigator.plugins[i].name);
                }
            }
            return plugins.length ? plugins : 'None (legacy)';
        }),
        mimeTypes: safeGet(() => {
            const types = [];
            if (navigator.mimeTypes) {
                for (let i = 0; i < navigator.mimeTypes.length; i++) {
                    types.push(navigator.mimeTypes[i].type);
                }
            }
            return types.length ? types : 'None';
        })
    };

    // Heuristics & Behavior Detection (Simple Indicators)
    browserInfo.fingerprinting.behaviorHeuristics = {
        hasTouchscreen: safeGet(() => window.ontouchstart !== undefined),
        pointerType: safeGet(() => window.matchMedia('(pointer: fine)').matches ? 'fine' : (window.matchMedia('(pointer: coarse)').matches ? 'coarse' : 'N/A')),
        // Idle Detection (experimental API, requires permission if not in secure context)
        idleDetectionAPIStatus: await safeGetAsync(async () => {
            if ('IdleDetector' in window) {
                try {
                    const state = await IdleDetector.requestPermission();
                    if (state === 'granted') {
                        return 'IdleDetector API Supported and Granted';
                    }
                    return `IdleDetector API Supported, Status: ${state}`;
                } catch (e) {
                    return `IdleDetector API Error: ${e.message}`;
                }
            }
            return 'IdleDetector API Not Supported';
        }),
        pageVisibility: safeGet(() => document.visibilityState),
        zoomLevel: safeGet(() => window.outerWidth / window.innerWidth), // May vary depending on OS zoom settings
    };

    // --- 6. Lesser-Known or Experimental Navigator Properties ---
    browserInfo.navigatorExtended = {
        // Credential Management API support
        credentialsAPI: safeGet(() => navigator.credentials ? 'Supported' : 'Not Supported'),
        // Storage Quota and Usage Estimation
        storageEstimate: await safeGetAsync(async () => {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: `${(estimate.usage / (1024 * 1024)).toFixed(2)} MB`,
                    quota: `${(estimate.quota / (1024 * 1024)).toFixed(2)} MB`
                };
            }
            return 'Storage API Not Supported';
        }),
        storagePersisted: await safeGetAsync(navigator.storage?.persisted?.()),
        // User Activation API
        userActivationActive: safeGet(() => navigator.userActivation?.isActive || 'N/A'),
        userActivationHadRecentInput: safeGet(() => navigator.userActivation?.hasBeenActive || 'N/A'),
        // MediaDevices Enumeration (shows available cameras/mics even without permission)
        enumeratedMediaDevices: await safeGetAsync(async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                return devices.map(d => ({ kind: d.kind, label: d.label || 'Permission required for label' }));
            }
            return 'navigator.mediaDevices.enumerateDevices not supported';
        }),
        // Gamepad API
        gamepads: safeGet(() => {
            if (navigator.getGamepads) {
                const pads = navigator.getGamepads();
                return Array.from(pads || []).filter(p => p !== null).map(p => ({
                    id: p.id,
                    buttons: p.buttons.length,
                    axes: p.axes.length
                }));
            }
            return 'Gamepad API not supported';
        }),
        // Speech Recognition API (check support)
        speechRecognition: safeGet(() => window.SpeechRecognition || window.webkitSpeechRecognition ? 'Supported' : 'Not Supported'),
        // Speech Synthesis API (get available voices)
        speechSynthesisVoices: safeGet(() => {
            if ('speechSynthesis' in window) {
                return speechSynthesis.getVoices().map(v => v.name);
            }
            return 'SpeechSynthesis API not supported';
        }),
        // High Entropy User-Agent Client Hints (Chromium-based browsers)
        userAgentClientHints: await safeGetAsync(async () => {
            if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
                try {
                    const hints = await navigator.userAgentData.getHighEntropyValues([
                        "architecture", "bitness", "model", "platform", "platformVersion", "uaFullVersion"
                    ]);
                    return hints;
                } catch (e) {
                    return `Error fetching high entropy hints: ${e.message}`;
                }
            }
            return 'User-Agent Client Hints API not supported or no high entropy values';
        })
    };

    // --- 7. Sensor API Access (Mobile-Only / HTTPS) ---
    browserInfo.sensorAPIs = {
        deviceMotionEvent: safeGet(() => 'DeviceMotionEvent' in window ? 'Supported' : 'Not Supported'),
        deviceOrientationEvent: safeGet(() => 'DeviceOrientationEvent' in window ? 'Supported' : 'Not Supported'),
        absoluteOrientationSensor: safeGet(() => 'AbsoluteOrientationSensor' in window ? 'Supported' : 'Not Supported'),
        accelerometer: safeGet(() => 'Accelerometer' in window ? 'Supported' : 'Not Supported'),
        gyroscope: safeGet(() => 'Gyroscope' in window ? 'Supported' : 'Not Supported'),
        magnetometer: safeGet(() => 'Magnetometer' in window ? 'Supported' : 'Not Supported'),
        ambientLightSensor: safeGet(() => 'AmbientLightSensor' in window ? 'Supported (Experimental)' : 'Not Supported'),
    };

    // --- 8. Obscure / Side-Channel / Research-Only Techniques ---

    // Math Precision Fingerprinting
    browserInfo.obscureFingerprinting = {
        mathSin: safeGet(() => Math.sin(0.123456789).toFixed(15)), // Test floating point precision
        mathAcos: safeGet(() => Math.acos(0.123456789).toFixed(15)),
    };

    // Clickjacking / Frame Detection
    browserInfo.obscureFingerprinting.isFramed = safeGet(() => window.top !== window.self);
    browserInfo.obscureFingerprinting.documentHasFocus = safeGet(() => document.hasFocus());

    // CSS-Based Extension / Adblock Detection (simple example)
    browserInfo.obscureFingerprinting.adBlockDetected = safeGet(() => {
        const div = document.createElement('div');
        div.className = 'ad-banner'; // Common adblock class name
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        div.style.height = '1px';
        div.style.width = '1px';
        document.body.appendChild(div);
        const isBlocked = getComputedStyle(div).display === 'none' || getComputedStyle(div).visibility === 'hidden';
        document.body.removeChild(div);
        return isBlocked;
    });

    // Error Stack Trace Fingerprinting
    browserInfo.obscureFingerprinting.errorStackFormat = safeGet(() => {
        try {
            throw new Error('test');
        } catch (e) {
            return e.stack.substring(0, 100); // Get first 100 chars to compare format
        }
    });

    // Clipboard Format Probing (requires user paste event) - Demonstrative, not directly accessible on load
    browserInfo.obscureFingerprinting.clipboardProbe = 'Requires user paste event. Listen for "paste" and check event.clipboardData.types';

    // CSS Scrollbar Width Detection
    browserInfo.obscureFingerprinting.scrollbarWidth = safeGet(() => {
        const scrollDiv = document.createElement("div");
        scrollDiv.style.overflow = "scroll";
        scrollDiv.style.width = "100px";
        scrollDiv.style.height = "100px";
        document.body.appendChild(scrollDiv);
        const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
    });

    // IME Auto-Composition Events (requires user input) - Demonstrative, not directly accessible on load
    browserInfo.obscureFingerprinting.imeDetection = 'Requires input event listener (e.g., "compositionstart")';

    // System Uptime (highly speculative and indirect)
    // This is purely theoretical and extremely unreliable in browser JS.
    // It would involve complex timing analyses across long periods, combined
    // with battery info and would still be a guess. Not implemented here.
    browserInfo.obscureFingerprinting.systemUptime = "Highly speculative, not reliably accessible via browser JS.";


    // Final render
    reportElement.textContent = JSON.stringify(browserInfo, null, 2);
});
