const API_BASE_URL = "http://localhost:8080/api";
let healthChart = null;
let selectedDeviceId = null;

/*
========================================
DASHBOARD STATISTICS
========================================

Gets the summary information from Spring Boot
and places it into the dashboard cards.
*/

async function loadDashboardStats() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/dashboard/stats`
        );

        if (!response.ok) {
            throw new Error(
                `Dashboard request failed: ${response.status}`
            );
        }

        const stats = await response.json();

        document.getElementById("totalDevices").textContent =
            stats.totalDevices;

        document.getElementById("onlineDevices").textContent =
            stats.onlineDevices;

        document.getElementById("offlineDevices").textContent =
            stats.offlineDevices;

        document.getElementById("averageResponseTime").textContent =
            Math.round(stats.averageResponseTime);

    } catch (error) {

        console.error(
            "Unable to load dashboard statistics:",
            error
        );

    }
}


/*
========================================
DEVICE LIST
========================================

Gets all devices from Spring Boot
and creates a visual card for each device.
*/

async function loadDevices() {

    const deviceList =
        document.getElementById("deviceList");

    try {

        const response = await fetch(
            `${API_BASE_URL}/devices`
        );

        if (!response.ok) {
            throw new Error(
                `Device request failed: ${response.status}`
            );
        }

        const devices = await response.json();

        deviceList.innerHTML = "";

        if (devices.length === 0) {

            deviceList.innerHTML = `
                <div class="empty-state">
                    No devices have been added yet.
                </div>
            `;

            return;
        }

        devices.forEach(device => {

            const status =
                device.status.toLowerCase();

            const deviceCard =
                document.createElement("div");

            deviceCard.className = "device-card";

            deviceCard.innerHTML = `
    <div class="device-info">

        <span class="device-indicator ${status}">
        </span>

        <div>

            <div class="device-name">
                ${device.name}
            </div>

            <div class="device-details">
                ${device.ipAddress}
                •
                ${device.deviceType}
                •
                ${device.location ?? "Unknown location"}
            </div>

        </div>

    </div>

    <div class="device-actions">

        <div class="device-status ${status}">
            ${device.status}
        </div>

        <button
            class="check-device-btn"
            data-device-id="${device.id}">
            CHECK NOW
        </button>

    </div>
`;

        /* deviceCard.innerHTML = `
                <div class="device-info">

                    <span class="device-indicator ${status}">
                    </span>

                    <div>

                        <div class="device-name">
                            ${device.name}
                        </div>

                        <div class="device-details">
                            ${device.ipAddress}
                            •
                            ${device.deviceType}
                            •
                            ${device.location ?? "Unknown location"}
                        </div>

                    </div>

                </div>

                <div class="device-status ${status}">
                    ${device.status}
                </div>
            `;*/

            deviceList.appendChild(deviceCard);
            

        });

        attachDeviceCheckButtons();

    } catch (error) {

        console.error(
            "Unable to load devices:",
            error
        );

        deviceList.innerHTML = `
            <div class="empty-state">
                Unable to load devices.
            </div>
        `;
    }
}

/*
========================================
CHECK DEVICE
========================================

Sends a request to Spring Boot asking it
to perform a real network reachability test.
*/

async function checkDevice(deviceId, button) {

    try {

        button.disabled = true;

        button.textContent = "CHECKING...";

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}/check`,
            {
                method: "POST"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Device check failed: ${response.status}`
            );
        }

        const device = await response.json();

        console.log(
            "Device check completed:",
            device
        );

        button.textContent = "CHECKED";

        /*
        Reload dashboard data so the new
        device status and health-check data
        appear immediately.
        */

        await Promise.all([
            loadDashboardStats(),
            loadDevices(),
            loadHealthChart()
        ]);

    } catch (error) {

        console.error(
            "Unable to check device:",
            error
        );

        button.textContent = "FAILED";

    } finally {

        setTimeout(() => {

            button.disabled = false;

            button.textContent = "CHECK NOW";

        }, 1500);

    }
}

/*
========================================
DEVICE BUTTON EVENTS
========================================

Connects each CHECK NOW button to the
device monitoring function.
*/

function attachDeviceCheckButtons() {

    const buttons =
        document.querySelectorAll(
            ".check-device-btn"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const deviceId =
                    button.dataset.deviceId;

                checkDevice(
                    deviceId,
                    button
                );

            }
        );

    });
}

/*
========================================
NETWORK HEALTH CHART
========================================

Gets health-check history for the selected
device and displays response times.

The existing Chart.js instance is destroyed
before creating the updated chart.
*/
async function loadHealthDeviceSelector() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/devices`
        );

        if (!response.ok) {
            throw new Error(
                `Device request failed: ${response.status}`
            );
        }

        const devices = await response.json();

        const selector =
            document.getElementById(
                "healthDeviceSelect"
            );

        if (!selector) {
            return;
        }

        selector.innerHTML = "";

        if (devices.length === 0) {

            selector.innerHTML = `
                <option value="">
                    No devices available
                </option>
            `;

            selectedHealthDeviceId = null;

            return;
        }

        devices.forEach(device => {

            const option =
                document.createElement("option");

            option.value = device.id;

            option.textContent =
                `${device.name} (${device.ipAddress})`;

            selector.appendChild(option);

        });

        selectedHealthDeviceId = devices[0].id;

        selector.value =
            selectedHealthDeviceId;

        selector.addEventListener(
            "change",
            async () => {

                selectedHealthDeviceId =
                    selector.value;

                await loadHealthChart(
                    selectedHealthDeviceId
                );

            }
        );

    } catch (error) {

        console.error(
            "Unable to load health device selector:",
            error
        );

    }
}

async function loadHealthChart(deviceId = selectedHealthDeviceId) {

    try {

        if (!deviceId) {
            console.log("No device selected for health chart.");
            return;
        }

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}/health-checks`
        );

        if (!response.ok) {
            throw new Error(
                `Health history request failed: ${response.status}`
            );
        }

        const healthChecks = await response.json();

        healthChecks.reverse();

        const labels = healthChecks.map(check => {

            return new Date(
                check.checkedAt
            ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

        });

        const responseTimes = healthChecks.map(
            check => check.responseTime
        );

        const canvas =
            document.getElementById("healthChart");

        if (!canvas) {
            return;
        }

        if (healthChart) {
            healthChart.destroy();
            healthChart = null;
        }

        healthChart = new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [{

                    label: "Response Time (ms)",

                    data: responseTimes,

                    tension: 0.35,

                    borderWidth: 2,

                    pointRadius: 4,

                    pointHoverRadius: 6,

                    fill: false

                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 500
                },

                plugins: {

                    legend: {
                        display: true
                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Milliseconds"
                        }

                    },

                    x: {

                        title: {
                            display: true,
                            text: "Health Checks"
                        }

                    }

                }

            }

        });

    } catch (error) {

        console.error(
            "Unable to load health chart:",
            error
        );

    }
}

/*async function loadHealthChart() {

    try {

        const deviceId = 3;

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}/health-checks`
        );

        if (!response.ok) {
            throw new Error(
                `Health history request failed: ${response.status}`
            );
        }

        const healthChecks = await response.json();

        
        The API returns newest records first.

        Reverse them so the oldest check appears
        on the left and the newest check appears
        on the right.
        

        healthChecks.reverse();

        const labels = healthChecks.map(check => {

            return new Date(
                check.checkedAt
            ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

        });

        const responseTimes = healthChecks.map(
            check => check.responseTime
        );

        const canvas =
            document.getElementById("healthChart");

        if (!canvas) {
            return;
        }

        
        ========================================
        DESTROY EXISTING CHART
        ========================================

        Without this, Chart.js keeps the old
        chart attached to the canvas.
        

        if (healthChart) {

            healthChart.destroy();

            healthChart = null;
        }

        
        ========================================
        CREATE UPDATED CHART
        ========================================
        

        healthChart = new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [{

                    label: "Response Time (ms)",

                    data: responseTimes,

                    tension: 0.35,

                    borderWidth: 2,

                    pointRadius: 4,

                    pointHoverRadius: 6,

                    fill: false

                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 500
                },

                plugins: {

                    legend: {
                        display: true
                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Milliseconds"
                        }

                    },

                    x: {

                        title: {
                            display: true,
                            text: "Health Checks"
                        }

                    }

                }

            }

        });

    } catch (error) {

        console.error(
            "Unable to load health chart:",
            error
        );

    }
}*/

/*
========================================
NETWORK HEALTH CHART
========================================

Gets health-check history for the selected
device and displays response times.


async function loadHealthChart() {

    try {

        
        For now we use device ID 3 because
        that is the development PC currently
        being monitored.
        

        const deviceId = 3;

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}/health-checks`
        );

        if (!response.ok) {
            throw new Error(
                `Health history request failed: ${response.status}`
            );
        }

        const healthChecks = await response.json();

        
        The API returns newest records first.

        Reverse them so the chart displays
        the oldest check on the left and
        newest check on the right.
        

        healthChecks.reverse();

        const labels = healthChecks.map(check => {

            return new Date(
                check.checkedAt
            ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

        });

        const responseTimes = healthChecks.map(
            check => check.responseTime
        );

        const canvas =
            document.getElementById("healthChart");

        if (!canvas) {
            return;
        }

        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [{
                    label: "Response Time (ms)",

                    data: responseTimes,

                    tension: 0.35,

                    borderWidth: 2,

                    pointRadius: 4,

                    pointHoverRadius: 6,

                    fill: false
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Milliseconds"
                        }
                    },

                    x: {

                        title: {
                            display: true,
                            text: "Health Checks"
                        }
                    }
                }
            }
        });

    } catch (error) {

        console.error(
            "Unable to load health chart:",
            error
        );
    }
}*/

/*
========================================
INITIALIZE DASHBOARD
========================================

Runs when the webpage has finished loading.
*/

async function initializeDashboard() {

    await Promise.all([
        loadDashboardStats(),
        loadDevices(),
        loadHealthDeviceSelector()
    ]);

    await loadHealthChart();

}

/*async function initializeDashboard() {
  await Promise.all([loadDashboardStats(), loadDevices(), loadHealthChart()]);
}*/

/*async function initializeDashboard() {

    await Promise.all([
        loadDashboardStats(),
        loadDevices()
    ]);

}
*/

/*
========================================
START APPLICATION
========================================
*/

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);