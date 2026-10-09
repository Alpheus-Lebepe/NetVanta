const API_BASE_URL = "http://localhost:8080/api";
let healthChart = null;
let healthChartSignature = "";
let healthDeviceSelectorSignature = "";
let selectedDeviceId = null;
let securityEvents = [];
let activeDeviceDetailsId = null;
let alerts = [];
let alertSignature = "";

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
DEVICE AVAILABILITY CALCULATION
========================================

Uses the latest 20 health checks for
both the dashboard and Device Details.

This keeps both locations using the
exact same availability calculation.
*/

function calculateDeviceAvailability(
    healthChecks
) {

    const recentChecks =
        Array.isArray(healthChecks)
            ? healthChecks.slice(0, 20)
            : [];

    if (recentChecks.length === 0) {
        return "—";
    }

    const onlineCount =
        recentChecks.filter(
            check =>
                String(
                    check.status || ""
                ).toUpperCase() === "ONLINE"
        ).length;

    return `${(
        onlineCount /
        recentChecks.length *
        100
    ).toFixed(1)}%`;
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
            `${API_BASE_URL}/devices?refresh=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Device request failed: ${response.status}`
            );
        }

        const devices = await response.json(); 
        const currentDeviceIds =
            devices.map(device =>
        String(device.id)
    );

document
    .querySelectorAll(
        ".device-card[data-device-id]"
    )
    .forEach(card => {

        const cardDeviceId =
            String(
                card.dataset.deviceId
            );

        if (
            !currentDeviceIds.includes(
                cardDeviceId
            )
        ) {
            card.remove();
        }
    });

    const loadingState =
        deviceList.querySelector(
        ".empty-state"
    );

if (
    loadingState &&
    loadingState.textContent.includes(
        "Loading devices"
    )
) {
    loadingState.remove();
}

        // deviceList.innerHTML = "";

        if (devices.length === 0) {

            deviceList.innerHTML = `
                <div class="empty-state">
                    No devices have been added yet.
                </div>
            `;

            return;
        }

        /*
         * Load the additional information required
         * for the richer device cards.
         *
         * Existing backend endpoints are reused:
         *
         * /devices/{id}/health-checks
         * /security-events/device/{id}
         */
        const enrichedDevices =
            await Promise.all(
                devices.map(async device => {

                    let healthChecks = [];
                    let securityEventsForDevice = [];

                    try {

                        const [
                            healthResponse,
                            securityResponse
                        ] = await Promise.all([

                            fetch(
                                `${API_BASE_URL}/devices/${device.id}/health-checks?refresh=${Date.now()}`,
                                {
                                    method: "GET",
                                    cache: "no-store"
                                }
                            ),

                            fetch(
                                `${API_BASE_URL}/security-events/device/${device.id}?refresh=${Date.now()}`,
                                {
                                    method: "GET",
                                    cache: "no-store"
                                }
                            )

                        ]);

                        if (healthResponse.ok) {
                            healthChecks =
                                await healthResponse.json();
                        }

                        if (securityResponse.ok) {
                            securityEventsForDevice =
                                await securityResponse.json();
                        }

                    } catch (error) {

                        console.error(
                            `Unable to load card details for device ${device.id}:`,
                            error
                        );

                    }

                    return {
                        device,
                        healthChecks,
                        securityEventsForDevice
                    };

                })
            );


        enrichedDevices.forEach(
            ({
                device,
                healthChecks,
                securityEventsForDevice
            }) => {

                const status =
                    String(
                        device.status || "UNKNOWN"
                    ).toLowerCase();


                /*
                 * ========================================
                 * HEALTH INFORMATION
                 * ========================================
                 */

                const recentChecks =
                    Array.isArray(healthChecks)
                        ? healthChecks.slice(0, 20)
                        : [];

                const latestHealthCheck =
                    recentChecks.length > 0
                        ? recentChecks[0]
                        : null;


                let responseTime = "—";

                if (latestHealthCheck) {

                    responseTime =
                        `${latestHealthCheck.responseTime ?? 0} ms`;
                }

            const availability =
                    calculateDeviceAvailability(
                    recentChecks
                );


                const healthStatus =
                    latestHealthCheck
                        ? String(
                            latestHealthCheck.status ||
                            device.status ||
                            "UNKNOWN"
                        )
                        : String(
                            device.status ||
                            "UNKNOWN"
                        );


                const lastCheck =
                    latestHealthCheck?.checkedAt ||
                    device.lastChecked ||
                    null;


                const formattedLastCheck =
                    lastCheck
                        ? new Date(
                            lastCheck
                        ).toLocaleTimeString(
                            [],
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            }
                        )
                        : "Never";


                /*
                 * ========================================
                 * SECURITY INFORMATION
                 * ========================================
                 */

                const latestSecurityEvent =
                    Array.isArray(
                        securityEventsForDevice
                    ) &&
                    securityEventsForDevice.length > 0
                        ? securityEventsForDevice[0]
                        : null;


                const securitySeverity =
                    latestSecurityEvent
                        ? String(
                            latestSecurityEvent.severity ||
                            "INFO"
                        ).toLowerCase()
                        : "info";


                const securityLabel =
                    latestSecurityEvent
                        ? String(
                            latestSecurityEvent.severity ||
                            "INFO"
                        )
                        : "NO EVENTS";


                /*
                 * ========================================
                 * DEVICE CARD
                 * ========================================
                 */
                const existingDeviceCard =
                    document.querySelector(
                    `.device-card[data-device-id="${device.id}"]`
                );

                const deviceCard =
                    document.createElement("div");

                deviceCard.className =
                    "device-card";

                deviceCard.dataset.deviceId =
                    device.id;

                deviceCard.dataset.deviceId =
                    device.id;


                deviceCard.innerHTML = `

                    <!-- DEVICE HEADER -->

                    <div
                        class="device-info device-details-trigger"
                        data-device-id="${device.id}">

                        <span
                            class="device-indicator ${status}">
                        </span>

                        <div class="device-main-info">

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

                        <div
                            class="device-status ${status}">

                            ${device.status}

                        </div>

                    </div>


                    <!-- LIVE HEALTH SUMMARY -->

                    <div class="device-health-summary">

                        <div class="device-health-item">

                            <span>
                                RESPONSE TIME
                            </span>

                            <strong class="device-card-response-time">
                                ${responseTime}
                            </strong>

                        </div>


                        <div class="device-health-item">

                            <span>
                                AVAILABILITY
                            </span>

                            <strong class="device-card-availability">
                                ${availability}
                            </strong>

                        </div>


                        <div class="device-health-item">

                            <span>
                                LAST CHECK
                            </span>

                            <strong
                                class="device-card-last-check">

                                ${formattedLastCheck}

                            </strong>

                        </div>

                    </div>


<!-- MONITORING SUMMARY -->

<div class="device-monitoring-summary">

    <div class="device-monitoring-item">

        <span>
            Device Status:
        </span>

        <div class="device-monitoring-value">

            <span
                class="device-mini-indicator ${status}">
            </span>

            <strong
                class="device-card-health-label ${status}">

                ${healthStatus}

            </strong>

        </div>

    </div>


    <div class="device-monitoring-item">

        <span>
            Security Status:
        </span>

        <div class="device-monitoring-value">

            <span
                class="device-mini-indicator ${securitySeverity}">
            </span>

            <strong
                class="device-card-security-label">

                ${securityLabel}

            </strong>

        </div>

    </div>

</div>


                    <!-- ACTIONS -->

                    <div class="device-actions">

                        <div class="device-primary-actions">

                            <button
                                type="button"
                                class="check-device-btn"
                                data-device-id="${device.id}">

                                CHECK NOW

                            </button>


                            <button
                                type="button"
                                class="edit-device-btn"
                                data-device-id="${device.id}">

                                EDIT

                            </button>

                        </div>


                        <div class="device-secondary-actions">

                            <button
                                type="button"
                                class="device-details-trigger device-details-button"
                                data-device-id="${device.id}">

                                VIEW DETAILS

                            </button>


                            <button
                                type="button"
                                class="delete-device-btn"
                                data-device-id="${device.id}">

                                DELETE

                            </button>

                        </div>

                    </div>

                `;


                if (existingDeviceCard) {

                    existingDeviceCard.innerHTML =
                    deviceCard.innerHTML;
                    } else {
                        deviceList.appendChild(deviceCard);
                }

            }
        );


        /*
         * Reconnect the existing functionality.
         *
         * These functions are NOT being replaced.
         */

        attachDeviceCheckButtons();
        attachDeviceManagementButtons();
        attachDeviceDetailsButtons();


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
DEVICE DETAILS MODAL
========================================

Opens the device details modal and loads
the selected device's information.
*/

async function openDeviceDetails(deviceId) {

    const modal =
        document.getElementById(
            "deviceDetailsModal"
        );

    if (!modal) {
        return;
    }

    activeDeviceDetailsId =
        String(deviceId);

if (deviceHealthChart) {

    deviceHealthChart.destroy();

    deviceHealthChart = null;
}

if (deviceAvailabilityChart) {

    deviceAvailabilityChart.destroy();

    deviceAvailabilityChart = null;
}

    /*
     * Show the modal immediately.
     */
    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    /*
     * Reset the modal while loading.
     */
    document.getElementById(
        "deviceDetailsName"
    ).textContent = "Loading device...";

    document.getElementById(
        "deviceDetailsSubtitle"
    ).textContent =
        "Loading network information...";

    try {

        /*
         * Get the device itself.
         */
        const deviceResponse =
            await fetch(
                `${API_BASE_URL}/devices/${deviceId}?refresh=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!deviceResponse.ok) {

            throw new Error(
                `Device request failed: ${deviceResponse.status}`
            );
        }

        const device =
            await deviceResponse.json();


        /*
         * Populate basic device information.
         */
        document.getElementById(
            "deviceDetailsName"
        ).textContent =
            device.name;

        document.getElementById(
            "deviceDetailsSubtitle"
        ).textContent =
            `${device.deviceType} • ${device.ipAddress}`;

        document.getElementById(
            "deviceDetailsIp"
        ).textContent =
            device.ipAddress;

        document.getElementById(
            "deviceDetailsType"
        ).textContent =
            device.deviceType;

        document.getElementById(
            "deviceDetailsLocation"
        ).textContent =
            device.location || "Unknown location";

        document.getElementById(
            "deviceDetailsId"
        ).textContent =
            device.id;


        /*
         * Device status.
         */
        const status =
            String(
                device.status || "UNKNOWN"
            ).toLowerCase();

        const statusIndicator =
            document.getElementById(
                "deviceDetailsStatusIndicator"
            );

        const statusText =
            document.getElementById(
                "deviceDetailsStatus"
            );

        statusIndicator.className =
            `device-indicator ${status}`;

        statusText.textContent =
            device.status;

        statusText.className =
            `device-details-current-status ${status}`;


        /*
         * Last checked time.
         */
        const lastChecked =
            document.getElementById(
                "deviceDetailsLastChecked"
            );

        if (device.lastChecked) {

            lastChecked.textContent =
                `Last checked: ${new Date(
                    device.lastChecked
                ).toLocaleString()}`;

        } else {

            lastChecked.textContent =
                "Last checked: Never";
        }


        /*
         * Load health checks and security
         * events independently.
         */
        await Promise.all([
            loadDeviceHealthDetails(device.id),
            loadDeviceSecurityEvents(device.id)
        ]);


        /*
         * Store the current device ID on
         * the Check Now button.
         */
        const checkButton =
            document.getElementById(
                "deviceDetailsCheckBtn"
            );

        if (checkButton) {

            checkButton.dataset.deviceId =
                device.id;
        }

    } catch (error) {

        console.error(
            "Unable to load device details:",
            error
        );

        document.getElementById(
            "deviceDetailsName"
        ).textContent =
            "Unable to load device";

        document.getElementById(
            "deviceDetailsSubtitle"
        ).textContent =
            "An error occurred while loading this device.";
    }
}


/*
========================================
DEVICE HEALTH DETAILS
========================================

Loads:

1. Latest health check
2. Average response time
3. Minimum response time
4. Maximum response time
5. Device availability
6. Response-time history chart
*/

async function loadDeviceHealthDetails(deviceId) {

    const responseTime =
        document.getElementById(
            "deviceDetailsResponseTime"
        );

    const healthStatus =
        document.getElementById(
            "deviceDetailsHealthStatus"
        );

    const healthTime =
        document.getElementById(
            "deviceDetailsHealthTime"
        );


    const averageElement =
        document.getElementById(
            "deviceHealthAverage"
        );

    const minimumElement =
        document.getElementById(
            "deviceHealthMinimum"
        );

    const maximumElement =
        document.getElementById(
            "deviceHealthMaximum"
        );

    const availabilityElement =
        document.getElementById(
            "deviceHealthAvailability"
        );


    if (
        !responseTime ||
        !healthStatus ||
        !healthTime
    ) {
        return;
    }


    /*
     * Reset the latest health information.
     */

    responseTime.textContent = "—";

    healthStatus.textContent = "—";

    healthTime.textContent = "—";


    /*
     * Reset performance metrics.
     */

    if (averageElement) {
        averageElement.textContent = "—";
    }

    if (minimumElement) {
        minimumElement.textContent = "—";
    }

    if (maximumElement) {
        maximumElement.textContent = "—";
    }

    if (availabilityElement) {
        availabilityElement.textContent = "—";
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/devices/${deviceId}/health-checks?refresh=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Health checks request failed: ${response.status}`
            );
        }


        const healthChecks =
            await response.json();

        if (
            String(activeDeviceDetailsId) !==
                String(deviceId)
                ) {
            return;
        }


        /*
         * No health-check history.
         */

        if (
            !healthChecks ||
            healthChecks.length === 0
        ) {

            healthStatus.textContent =
                "NO DATA";

            renderDeviceHealthChart([]);
            renderDeviceAvailabilityChart([]);

            return;
        }


        /*
         * The API returns newest checks first.
         */

        const latest =
            healthChecks[0];


        /*
         * ========================================
         * LATEST HEALTH CHECK
         * ========================================
         */

        responseTime.textContent =
            `${latest.responseTime ?? 0} ms`;


        const latestStatus =
    String(
        latest.status || "UNKNOWN"
    ).toLowerCase();

    healthStatus.textContent =
    latest.status;

    healthStatus.className =
    `device-details-health-status ${latestStatus}`;


        healthTime.textContent =
            latest.checkedAt
                ? new Date(
                    latest.checkedAt
                ).toLocaleString()
                : "—";


        /*
         * ========================================
         * RECENT CHECKS
         * ========================================
         *
         * Use the same latest 20 checks
         * displayed by the chart.
         */

        const recentChecks =
            healthChecks.slice(0, 20);


        /*
         * ========================================
         * ONLINE CHECKS
         * ========================================
         *
         * Response-time statistics are based
         * only on ONLINE checks.
         *
         * This prevents OFFLINE timeout values
         * from artificially inflating latency.
         */

        const onlineChecks =
            recentChecks.filter(
                check =>
                    String(
                        check.status
                    ).toUpperCase() === "ONLINE"
            );


        /*
         * ========================================
         * RESPONSE TIME METRICS
         * ========================================
         */

        if (
            onlineChecks.length > 0
        ) {

            const responseTimes =
                onlineChecks.map(
                    check =>
                        Number(
                            check.responseTime ?? 0
                        )
                );


            const totalResponseTime =
                responseTimes.reduce(
                    (
                        total,
                        value
                    ) =>
                        total + value,
                    0
                );


            const averageResponseTime =
                totalResponseTime /
                responseTimes.length;


            const minimumResponseTime =
                Math.min(
                    ...responseTimes
                );


            const maximumResponseTime =
                Math.max(
                    ...responseTimes
                );


            if (averageElement) {

                averageElement.textContent =
                    `${Math.round(
                        averageResponseTime
                    )} ms`;
            }


            if (minimumElement) {

                minimumElement.textContent =
                    `${minimumResponseTime} ms`;
            }


            if (maximumElement) {

                maximumElement.textContent =
                    `${maximumResponseTime} ms`;
            }

        }

/*
 * ========================================
 * AVAILABILITY
 * ========================================
 *
 * Uses the same shared calculation
 * as the device dashboard.
 */

const availability =
    calculateDeviceAvailability(
        recentChecks
    );

if (availabilityElement) {

    availabilityElement.textContent =
        availability;
}


        /*
         * ========================================
         * RESPONSE TIME HISTORY CHART
         * ========================================
         *
         * API returns newest first.
         *
         * Reverse the latest 20 checks so:
         *
         * oldest → newest
         */

        const chartData =
            recentChecks
                .slice()
                .reverse();


        renderDeviceHealthChart(
            chartData
        );

        renderDeviceAvailabilityChart(
            chartData
        );


    } catch (error) {

        console.error(
            "Unable to load device health:",
            error
        );


        healthStatus.textContent =
            "UNAVAILABLE";


        if (averageElement) {
            averageElement.textContent = "—";
        }

        if (minimumElement) {
            minimumElement.textContent = "—";
        }

        if (maximumElement) {
            maximumElement.textContent = "—";
        }

        if (availabilityElement) {
            availabilityElement.textContent = "—";
        }


        renderDeviceHealthChart([]);
        renderDeviceAvailabilityChart([]);
    }
}


/*
========================================
DEVICE RESPONSE TIME CHART
========================================

Displays the response-time history for
the device currently opened in Device
Details.
*/

let deviceHealthChart = null;
let deviceAvailabilityChart = null;

function renderDeviceHealthChart(
    healthChecks
) {

    const canvas =
        document.getElementById(
            "deviceHealthChart"
        );

    if (!canvas) {
        return;
    }

    /*
     * Destroy the previous chart before
     * creating a new one.
     *
     * This is important because the Device
     * Details modal can be opened for
     * different devices repeatedly.
     */
    if (deviceHealthChart) {

        deviceHealthChart.destroy();

        deviceHealthChart = null;
    }


    const labels =
        healthChecks.map(
            check => {

                return new Date(
                    check.checkedAt
                ).toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    }
                );
            }
        );

    const responseTimes =
        healthChecks.map(
            check =>
                check.responseTime ?? 0
        );

    deviceHealthChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label:
                                "Response Time (ms)",

                            data:
                                responseTimes,

                            tension: 0.35,

                            borderWidth: 2,

                            pointRadius: 3,

                            pointHoverRadius: 5,

                            fill: false
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    animation: {
                        duration: 400
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

            }
        );
}


/*
========================================
DEVICE SECURITY EVENTS
========================================
*/

async function loadDeviceSecurityEvents(deviceId) {

    const eventsContainer =
        document.getElementById(
            "deviceDetailsEvents"
        );

    if (!eventsContainer) {
        return;
    }

    eventsContainer.innerHTML = `
        <div class="device-details-loading">
            Loading security events...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/security-events/device/${deviceId}?refresh=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Security events request failed: ${response.status}`
            );
        }

        const events =
            await response.json();

        if (
            !events ||
            events.length === 0
        ) {

            eventsContainer.innerHTML = `
                <div class="device-details-empty">
                    No security events recorded for this device.
                </div>
            `;

            return;
        }

        eventsContainer.innerHTML = "";

        events.forEach(event => {

            const severity =
                String(
                    event.severity || "INFO"
                ).toLowerCase();

            const eventElement =
                document.createElement("div");

            eventElement.className =
                "device-details-event";

            eventElement.innerHTML = `

                <div class="device-details-event-top">

                    <div class="device-details-event-type">
                        ${event.eventType}
                    </div>

                    <div class="device-details-event-time">
                        ${
                            event.createdAt
                                ? new Date(
                                    event.createdAt
                                ).toLocaleString()
                                : "—"
                        }
                    </div>

                </div>

                <div class="device-details-event-message">
                    ${event.message}
                </div>

                <span
                    class="device-details-event-badge ${severity}"
                >
                    ${event.severity}
                </span>
            `;

            eventsContainer.appendChild(
                eventElement
            );
        });

    } catch (error) {

        console.error(
            "Unable to load device security events:",
            error
        );

        eventsContainer.innerHTML = `
            <div class="device-details-empty">
                Unable to load security events.
            </div>
        `;
    }
}


/*
========================================
DEVICE DETAILS MODAL CONTROLS
========================================
*/

function closeDeviceDetails() {

    const modal =
        document.getElementById(
            "deviceDetailsModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


function initializeDeviceDetailsModal() {

    const modal =
        document.getElementById(
            "deviceDetailsModal"
        );

    const closeButton =
        document.getElementById(
            "closeDeviceDetailsModal"
        );

    const closeFooterButton =
        document.getElementById(
            "deviceDetailsCloseBtn"
        );

    const deviceDetailsCheckButton =
        document.getElementById(
            "deviceDetailsCheckBtn"
    );

if (deviceDetailsCheckButton) {

    deviceDetailsCheckButton.addEventListener(
        "click",
        () => {

            const deviceId =
                deviceDetailsCheckButton.dataset.deviceId;

            if (!deviceId) {
                return;
            }

            checkDevice(
                deviceId,
                deviceDetailsCheckButton
            );

        }
    );
}

    if (!modal) {
        return;
    }

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeDeviceDetails
        );
    }

    if (closeFooterButton) {

        closeFooterButton.addEventListener(
            "click",
            closeDeviceDetails
        );
    }

    /*
     * Close when clicking the dark
     * area outside the modal.
     */
    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeDeviceDetails();
            }
        }
    );

    /*
     * Close with Escape.
     */
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {

                closeDeviceDetails();
            }
        }
    );
}


/*
========================================
ATTACH DEVICE DETAILS BUTTONS
========================================
*/

function attachDeviceDetailsButtons() {

    const triggers =
        document.querySelectorAll(
            ".device-details-trigger"
        );

    triggers.forEach(trigger => {

        if (
            trigger.dataset.listenerAttached ===
            "true"
        ) {
            return;
        }

        trigger.addEventListener(
            "click",
            () => {

                const deviceId =
                    trigger.dataset.deviceId;

                if (deviceId) {

                    openDeviceDetails(
                        deviceId
                    );
                }
            }
        );

        trigger.dataset.listenerAttached =
            "true";
    });
}


/*
========================================
DEVICE STATUS SYNCHRONIZATION
========================================

Checks the latest device statuses from
Spring Boot without rebuilding the
device cards.

Only changed status elements are updated.
*/

async function syncDeviceStatuses() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/devices?refresh=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {

            throw new Error(
                `Device status request failed: ${response.status}`
            );
        }

        const devices =
            await response.json();

        devices.forEach(device => {

            /*
             * Find the device card using
             * its Check Now button.
             */
            const checkButton =
                document.querySelector(
                    `.check-device-btn[data-device-id="${device.id}"]`
                );

            if (!checkButton) {
                return;
            }

            const deviceCard =
                checkButton.closest(".device-card");

            if (!deviceCard) {
                return;
            }

            /*
             * Find the status elements
             * inside this device card.
             */
            const indicator =
                deviceCard.querySelector(
                    ".device-indicator"
                );

            const status =
                deviceCard.querySelector(
                    ".device-status"
                );

            if (!indicator || !status) {
                return;
            }

            const newStatus =
                String(
                    device.status || "UNKNOWN"
                ).toLowerCase();

            /*
             * Check the current status
             * before changing anything.
             */
            const currentStatus =
                status.textContent
                    .trim()
                    .toLowerCase();

            /*
             * Nothing changed.
             *
             * Leave the DOM untouched.
             */
            if (currentStatus === newStatus) {
                return;
            }

            /*
             * Update only the status indicator.
             */
            indicator.className =
                `device-indicator ${newStatus}`;

            /*
             * Update only the status badge.
             */
            status.className =
                `device-status ${newStatus}`;

            status.textContent =
                device.status;

            console.log(
                `Device status updated: ${device.name} → ${device.status}`
            );

        });

    } catch (error) {

        /*
         * Background synchronization failure
         * should NOT disturb the existing UI.
         */
        console.error(
            "Unable to synchronize device statuses:",
            error
        );
    }
}


/*
========================================
SECURITY EVENTS
========================================

Loads security events from the backend,
stores them locally, and renders them
using the active search and filters.
*/

async function loadSecurityEvents() {

    const eventsList =
        document.getElementById(
            "securityEventsList"
        );

    if (!eventsList) {

        console.error(
            "ERROR: #securityEventsList does not exist."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/security-events?refresh=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        console.log(
            "Security Events HTTP status:",
            response.status
        );

        if (!response.ok) {

            throw new Error(
                `Security events request failed: ${response.status}`
            );
        }

        const events =
            await response.json();

        console.log(
            "Security Events received:",
            events
        );

        if (!Array.isArray(events)) {

            throw new Error(
                "Security events response is not an array."
            );
        }

        /*
        ========================================
        STORE EVENTS
        ========================================
        */

        securityEvents = events;

        /*
        ========================================
        EMPTY STATE
        ========================================
        */

        if (events.length === 0) {

            eventsList.dataset.eventSignature = "";

            eventsList.innerHTML = `
                <div class="security-events-empty">
                    No security events recorded.
                </div>
            `;

            return;
        }

        /*
        ========================================
        EVENT SIGNATURE
        ========================================

        Used to detect whether the backend
        data actually changed.

        This prevents unnecessary DOM
        rebuilding every 5 seconds.
        */

        const currentEventSignature =
            events
                .map(event =>
                    `${event.id}-${event.createdAt}`
                )
                .join("|");

        const previousEventSignature =
            eventsList.dataset.eventSignature || "";

        /*
        ========================================
        NO DATA CHANGE
        ========================================
        */

        if (
            currentEventSignature ===
            previousEventSignature
        ) {

            /*
             * Do not rebuild the event cards.
             *
             * The filters/search remain
             * untouched.
             */

            return;
        }

        /*
        ========================================
        REMEMBER EVENT STATE
        ========================================
        */

        eventsList.dataset.eventSignature =
            currentEventSignature;

        /*
        ========================================
        RENDER EVENTS
        ========================================
        */

        renderSecurityEvents();

    } catch (error) {

        console.error(
            "Unable to load security events:",
            error
        );

        /*
         * Do NOT destroy existing events
         * if a background refresh fails.
         */
    }
}


/*
========================================
RENDER SECURITY EVENTS
========================================

Applies the current search and filters
to the locally stored security events.
*/

function renderSecurityEvents() {

    const eventsList =
        document.getElementById(
            "securityEventsList"
        );

    if (!eventsList) {
        return;
    }

    /*
    ========================================
    READ FILTER VALUES
    ========================================
    */

    const searchInput =
        document.getElementById(
            "securityEventSearch"
        );

    const severityFilter =
        document.getElementById(
            "securityEventSeverityFilter"
        );

    const typeFilter =
        document.getElementById(
            "securityEventTypeFilter"
        );

    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const selectedSeverity =
        severityFilter
            ? severityFilter.value
            : "ALL";

    const selectedType =
        typeFilter
            ? typeFilter.value
            : "ALL";

    /*
    ========================================
    FILTER EVENTS
    ========================================
    */

    const filteredEvents =
        securityEvents.filter(event => {

            const deviceName =
                String(
                    event.deviceName || ""
                ).toLowerCase();

            const ipAddress =
                String(
                    event.ipAddress || ""
                ).toLowerCase();

            const eventType =
                String(
                    event.eventType || ""
                ).toLowerCase();

            const message =
                String(
                    event.message || ""
                ).toLowerCase();

            const severity =
                String(
                    event.severity || ""
                ).toUpperCase();

            /*
             * Search checks:
             *
             * Device name
             * IP address
             * Event type
             * Message
             */

            const matchesSearch =
                !searchTerm ||
                deviceName.includes(searchTerm) ||
                ipAddress.includes(searchTerm) ||
                eventType.includes(searchTerm) ||
                message.includes(searchTerm);

            /*
             * Severity filter
             */

            const matchesSeverity =
                selectedSeverity === "ALL" ||
                severity === selectedSeverity;

            /*
             * Event type filter
             */

            const matchesType =
                selectedType === "ALL" ||
                event.eventType === selectedType;

            return (
                matchesSearch &&
                matchesSeverity &&
                matchesType
            );
        });

    /*
    ========================================
    NO MATCHES
    ========================================
    */

    if (filteredEvents.length === 0) {

        eventsList.innerHTML = `
            <div class="security-events-empty">
                No security events match the current filters.
            </div>
        `;

        return;
    }

    /*
    ========================================
    BUILD EVENT CARDS
    ========================================
    */

    const fragment =
        document.createDocumentFragment();

    filteredEvents.forEach(event => {

        const severity =
            String(
                event.severity || "INFO"
            ).toLowerCase();

        const createdAt =
            new Date(
                event.createdAt
            );

        const formattedTime =
            isNaN(createdAt.getTime())
                ? event.createdAt
                : createdAt.toLocaleString();

        const eventCard =
            document.createElement("div");

        eventCard.className =
            "security-event";

        eventCard.innerHTML = `

            <div
                class="security-event-severity ${severity}"
            >
            </div>

            <div class="security-event-content">

                <div class="security-event-top">

                    <div class="security-event-type">
                        ${event.eventType}
                    </div>

                    <div class="security-event-time">
                        ${formattedTime}
                    </div>

                </div>

                <div class="security-event-device">

                    ${event.deviceName}
                    •
                    ${event.ipAddress}

                </div>

                <div class="security-event-message">

                    ${event.message}

                </div>

                <span
                    class="security-event-badge ${severity}"
                >

                    ${event.severity}

                </span>

            </div>
        `;

        fragment.appendChild(
            eventCard
        );
    });

    /*
    ========================================
    UPDATE EVENT LIST
    ========================================
    */

    eventsList.replaceChildren(
        fragment
    );

    console.log(
        `Rendered ${filteredEvents.length} filtered security events.`
    );
}


/*
========================================
SECURITY EVENT FILTER CONTROLS
========================================
*/

function initializeSecurityEventFilters() {

    const searchInput =
        document.getElementById(
            "securityEventSearch"
        );

    const severityFilter =
        document.getElementById(
            "securityEventSeverityFilter"
        );

    const typeFilter =
        document.getElementById(
            "securityEventTypeFilter"
        );

    const clearButton =
        document.getElementById(
            "clearSecurityEventFilters"
        );

    /*
    ========================================
    SEARCH
    ========================================
    */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                renderSecurityEvents();

            }
        );
    }

    /*
    ========================================
    SEVERITY
    ========================================
    */

    if (severityFilter) {

        severityFilter.addEventListener(
            "change",
            () => {

                renderSecurityEvents();

            }
        );
    }

    /*
    ========================================
    EVENT TYPE
    ========================================
    */

    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            () => {

                renderSecurityEvents();

            }
        );
    }

    /*
    ========================================
    CLEAR FILTERS
    ========================================
    */

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                if (searchInput) {
                    searchInput.value = "";
                }

                if (severityFilter) {
                    severityFilter.value = "ALL";
                }

                if (typeFilter) {
                    typeFilter.value = "ALL";
                }

                renderSecurityEvents();

            }
        );
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
         * Keep the health chart synchronized
         * with the device that was just checked.
         */
        selectedDeviceId = device.id;

        const healthDeviceSelect =
            document.getElementById(
                "healthDeviceSelect"
            );

        if (healthDeviceSelect) {
            healthDeviceSelect.value = device.id;
        }

        /*
         * Refresh everything affected by the
         * device health check.
         */
        await loadDashboardStats();

        await loadDevices();

        await loadHealthChart(device.id);

        await loadDeviceHealthDetails(device.id);

        await loadSecurityEvents();

    /*
 * Refresh security events after the
 * backend creates any new event.
 */
        await loadDeviceSecurityEvents(device.id);

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
            ".device-card .check-device-btn"
        );

    buttons.forEach(button => {

        if (
            button.dataset.listenerAttached ===
            "true"
        ) {
            return;
        }

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

        button.dataset.listenerAttached =
            "true";
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

        /*
        ========================================
        CHECK WHETHER DEVICE LIST CHANGED
        ========================================
        */

        const currentSignature =
            devices
                .map(device =>
                    `${device.id}-${device.name}-${device.ipAddress}`
                )
                .join("|");

        /*
        If the devices have not changed,
        do not rebuild the selector.
        */

        if (
            currentSignature ===
            healthDeviceSelectorSignature
        ) {
            return;
        }

        healthDeviceSelectorSignature =
            currentSignature;

        /*
        ========================================
        HANDLE EMPTY DEVICE LIST
        ========================================
        */

        if (devices.length === 0) {

            selector.innerHTML = `
                <option value="">
                    No devices available
                </option>
            `;

            selectedDeviceId = null;

            return;
        }

        /*
        ========================================
        PRESERVE CURRENT SELECTION
        ========================================
        */

        const currentSelectedId =
            selectedDeviceId;

        selector.innerHTML = "";

        devices.forEach(device => {

            const option =
                document.createElement("option");

            option.value =
                device.id;

            option.textContent =
                `${device.name} (${device.ipAddress})`;

            selector.appendChild(option);

        });

        const selectedDeviceStillExists =
            devices.some(
                device =>
                    String(device.id) ===
                    String(currentSelectedId)
            );

        if (selectedDeviceStillExists) {

            selectedDeviceId =
                currentSelectedId;

        } else {

            selectedDeviceId =
                devices[0].id;

        }

        selector.value =
            selectedDeviceId;

        /*
        ========================================
        ATTACH CHANGE LISTENER ONLY ONCE
        ========================================
        */

        if (
            selector.dataset.changeListenerAttached !==
            "true"
        ) {

            selector.addEventListener(
                "change",
                async () => {

                    selectedDeviceId =
                        selector.value;

                    await loadHealthChart(
                        selectedDeviceId
                    );

                }
            );

            selector.dataset.changeListenerAttached =
                "true";
        }

    } catch (error) {

        console.error(
            "Unable to load health device selector:",
            error
        );

    }
}



async function loadHealthChart(deviceId = selectedDeviceId) {

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

        const currentSignature =
    `${deviceId}|` +
    healthChecks
        .map(check =>
            `${check.id}-${check.checkedAt}-${check.responseTime}`
        )
        .join("|");

if (
    currentSignature ===
    healthChartSignature
) {
    return;
}

healthChartSignature =
    currentSignature;

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

    healthChart.data.labels =
        labels;

    healthChart.data.datasets[0].data =
        responseTimes;

    healthChart.update("none");

    return;
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

/*
========================================
INITIALIZE DASHBOARD
========================================

Runs when the webpage has finished loading.
*/

async function initializeDashboard() {

    console.log("Initializing NetVanta dashboard...");

    initializeDeviceModal();
    initializeEditDeviceModal();
    initializeDeviceDetailsModal();
    initializeSecurityEventFilters();
    initializeAlertFilters();
    initializeAlertSeverityCards();
    initializeAlertsKpiNavigation();

const monitoringToggleBtn =
    document.getElementById(
        "monitoringToggleBtn"
    );

if (monitoringToggleBtn) {

    monitoringToggleBtn.addEventListener(
        "click",
        toggleMonitoring
    );
}


const monitoringIntervalSelect =
    document.getElementById(
        "monitoringIntervalSelect"
    );

if (monitoringIntervalSelect) {

    monitoringIntervalSelect.addEventListener(
        "change",
        changeMonitoringInterval
    );
}

    await loadDashboardStats();

    await loadDevices();

    await loadHealthDeviceSelector();

    await loadSecurityEvents();

    await loadHealthChart();

    await loadMonitoringStatus();

    console.log(
        "NetVanta dashboard initialized."
    );
}

setInterval(async () => {

    console.log(
        "Refreshing NetVanta dashboard data..."
    );

    try {

        await loadDashboardStats();
        await loadDevices();
        await loadHealthDeviceSelector();

        if (selectedDeviceId) {
            await loadHealthChart(
                selectedDeviceId
    );
}

        await loadSecurityEvents();
        await loadMonitoringStatus();

        console.log(
            "NetVanta dashboard refresh completed."
        );

    } catch (error) {

        console.error(
            "Automatic dashboard refresh failed:",
            error
        );
    }

}, 10000);


/*
 * Monitoring status synchronization.
 */
setInterval(async () => {

    await loadMonitoringStatus();

}, 5000);


/*
 * Security events refresh independently
 * so new events appear without waiting
 * for the full dashboard refresh.
 */
setInterval(async () => {

    await loadSecurityEvents();

}, 5000);

setInterval(async () => {

    await loadAlerts();

}, 5000);


/*
 * Device statuses refresh independently
 * so automatic monitoring changes appear
 * without rebuilding the device cards.
 */
setInterval(async () => {

    await syncDeviceStatuses();

}, 5000);


function initializeAlertsKpiNavigation() {

    const alertsKpiCard =
        document.getElementById(
            "activeAlertsKpiCard"
        );

    const alertsPanel =
        document.querySelector(
            ".alerts-panel"
        );

    if (
        !alertsKpiCard ||
        !alertsPanel
    ) {
        return;
    }

    if (
        alertsKpiCard.dataset.listenerAttached ===
        "true"
    ) {
        return;
    }

    alertsKpiCard.dataset.listenerAttached =
        "true";

    alertsKpiCard.addEventListener(
        "click",
        () => {

            alertsPanel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }
    );

}


async function addDevice(event) {

    event.preventDefault();

    const form =
        document.getElementById("addDeviceForm");

    const message =
        document.getElementById("deviceFormMessage");

    const submitButton =
        form.querySelector(".modal-submit-btn");

    const device = {

        name:
            document.getElementById("deviceName")
                .value
                .trim(),

        ipAddress:
            document.getElementById("deviceIp")
                .value
                .trim(),

        deviceType:
            document.getElementById("deviceType")
                .value,

        location:
            document.getElementById("deviceLocation")
                .value
                .trim()

    };

    message.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "ADDING...";

    try {

        const response = await fetch(
            `${API_BASE_URL}/devices`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(device)
            }
        );

        if (!response.ok) {

            throw new Error(
                `Failed to add device: ${response.status}`
            );

        }

        const savedDevice =
            await response.json();

        console.log(
            "Device added successfully:",
            savedDevice
        );

        message.textContent =
            "Device added successfully.";

        form.reset();

        await loadDashboardStats();

        await loadDevices();

        await loadHealthDeviceSelector();

        setTimeout(() => {

            closeDeviceModal();

        }, 700);

    } catch (error) {

        console.error(
            "Unable to add device:",
            error
        );

        message.textContent =
            "Unable to add device. Please try again.";

    } finally {

        submitButton.disabled = false;
        submitButton.textContent = "ADD DEVICE";

    }
}

function openDeviceModal() {

    const modal =
        document.getElementById("deviceModal");

    if (!modal) {
        return;
    }

    modal.classList.add("active");

}


function closeDeviceModal() {

    const modal =
        document.getElementById("deviceModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

}

function initializeDeviceModal() {

    const addButton =
        document.getElementById("addDeviceBtn");

    const closeButton =
        document.getElementById("closeDeviceModal");

    const cancelButton =
        document.getElementById("cancelDeviceBtn");

    const form =
        document.getElementById("addDeviceForm");

    const modal =
        document.getElementById("deviceModal");


    if (addButton) {

        addButton.addEventListener(
            "click",
            openDeviceModal
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeDeviceModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeDeviceModal
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            addDevice
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (event.target === modal) {

                    closeDeviceModal();

                }

            }
        );

    }

}

async function openEditDeviceModal(deviceId) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}`
        );

        if (!response.ok) {

            throw new Error(
                `Unable to load device: ${response.status}`
            );

        }

        const device = await response.json();

        document.getElementById(
            "editDeviceId"
        ).value = device.id;

        document.getElementById(
            "editDeviceName"
        ).value = device.name || "";

        document.getElementById(
            "editDeviceIp"
        ).value = device.ipAddress || "";

        document.getElementById(
            "editDeviceType"
        ).value = device.deviceType || "";

        document.getElementById(
            "editDeviceLocation"
        ).value = device.location || "";

        document.getElementById(
            "editDeviceFormMessage"
        ).textContent = "";

        document.getElementById(
            "editDeviceModal"
        ).classList.add("active");

    } catch (error) {

        console.error(
            "Unable to open edit device:",
            error
        );

        alert(
            "Unable to load device information."
        );

    }

}

async function updateDevice(event) {

    event.preventDefault();

    const deviceId =
        document.getElementById(
            "editDeviceId"
        ).value;

    const message =
        document.getElementById(
            "editDeviceFormMessage"
        );

    const submitButton =
        document.querySelector(
            "#editDeviceForm .modal-submit-btn"
        );


    const device = {

        name:
            document.getElementById(
                "editDeviceName"
            ).value.trim(),

        ipAddress:
            document.getElementById(
                "editDeviceIp"
            ).value.trim(),

        deviceType:
            document.getElementById(
                "editDeviceType"
            ).value,

        location:
            document.getElementById(
                "editDeviceLocation"
            ).value.trim()

    };


    submitButton.disabled = true;

    submitButton.textContent =
        "SAVING...";

    message.textContent = "";


    try {

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(device)
            }
        );


        if (!response.ok) {

            throw new Error(
                `Update failed: ${response.status}`
            );

        }


        const updatedDevice =
            await response.json();


        console.log(
            "Device updated:",
            updatedDevice
        );


        message.textContent =
            "Device updated successfully.";


        await loadDashboardStats();

        await loadDevices();

        await loadHealthDeviceSelector();


        setTimeout(() => {

            closeEditDeviceModal();

        }, 700);


    } catch (error) {

        console.error(
            "Unable to update device:",
            error
        );

        message.textContent =
            "Unable to update device.";

    } finally {

        submitButton.disabled = false;

        submitButton.textContent =
            "SAVE CHANGES";

    }

}

function closeEditDeviceModal() {

    const modal =
        document.getElementById(
            "editDeviceModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

}

async function deleteDevice(deviceId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this device?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/devices/${deviceId}`,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) {

            throw new Error(
                `Delete failed: ${response.status}`
            );

        }


        console.log(
            `Device ${deviceId} deleted successfully.`
        );


        await loadDashboardStats();

        await loadDevices();

        await loadHealthDeviceSelector();

        await loadSecurityEvents();


    } catch (error) {

        console.error(
            "Unable to delete device:",
            error
        );

        alert(
            "Unable to delete device."
        );

    }

}

function attachDeviceManagementButtons() {

    const editButtons =
        document.querySelectorAll(
            ".edit-device-btn"
        );

    const deleteButtons =
        document.querySelectorAll(
            ".delete-device-btn"
        );

    editButtons.forEach(button => {

        if (
            button.dataset.listenerAttached ===
            "true"
        ) {
            return;
        }

        button.addEventListener(
            "click",
            () => {

                const deviceId =
                    button.dataset.deviceId;

                openEditDeviceModal(
                    deviceId
                );

            }
        );

        button.dataset.listenerAttached =
            "true";
    });

    deleteButtons.forEach(button => {

        if (
            button.dataset.listenerAttached ===
            "true"
        ) {
            return;
        }

        button.addEventListener(
            "click",
            () => {

                const deviceId =
                    button.dataset.deviceId;

                deleteDevice(
                    deviceId
                );

            }
        );

        button.dataset.listenerAttached =
            "true";
    });
}

function initializeEditDeviceModal() {

    const closeButton =
        document.getElementById(
            "closeEditDeviceModal"
        );

    const cancelButton =
        document.getElementById(
            "cancelEditDeviceBtn"
        );

    const form =
        document.getElementById(
            "editDeviceForm"
        );

    const modal =
        document.getElementById(
            "editDeviceModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeEditDeviceModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeEditDeviceModal
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            updateDevice
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (event.target === modal) {

                    closeEditDeviceModal();

                }

            }
        );

    }

}

async function loadAlerts() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/alerts?refresh=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {

            throw new Error(
                `Alerts request failed: ${response.status}`
            );

        }

        const data = await response.json();

        alerts = Array.isArray(data)
            ? data
            : [];

        renderAlerts();

    } catch (error) {

        console.error(
            "Unable to load alerts:",
            error
        );

        const alertsList =
            document.getElementById(
                "alertsList"
            );

        if (alertsList) {

            alertsList.innerHTML = `
                <div class="alerts-error">
                    Unable to load alerts.
                </div>
            `;

        }

    }

}

function renderAlerts() {

    const alertsList =
        document.getElementById("alertsList");

    if (!alertsList) {
        return;
    }


    /*
    ========================================
    UPDATE SUMMARY COUNTS
    ========================================
    */

    const activeCount =
        alerts.filter(
            alert => alert.status === "ACTIVE"
        ).length;

    const criticalAlertsCount = alerts.filter(
        (alert) => alert.status === "ACTIVE" && alert.severity === "CRITICAL",
    ).length;

    const warningAlertsCount = alerts.filter(
        (alert) => alert.status === "ACTIVE" && alert.severity === "WARNING",
    ).length;

    const infoAlertsCount = alerts.filter(
        (alert) => alert.status === "ACTIVE" && alert.severity === "INFO",
    ).length;

    const criticalAlertsElement = document.getElementById(
        "criticalAlertsCount",
    );

    const warningAlertsElement = document.getElementById("warningAlertsCount");

    const infoAlertsElement = document.getElementById("infoAlertsCount");

    const criticalSeverityCard =
    criticalAlertsElement?.closest(
        ".alert-severity-item"
    );

const warningSeverityCard =
    warningAlertsElement?.closest(
        ".alert-severity-item"
    );

const infoSeverityCard =
    infoAlertsElement?.closest(
        ".alert-severity-item"
    );

if (criticalSeverityCard) {

    criticalSeverityCard.classList.toggle(
        "has-alerts",
        criticalAlertsCount > 0
    );

}

if (warningSeverityCard) {

    warningSeverityCard.classList.toggle(
        "has-alerts",
        warningAlertsCount > 0
    );

}

if (infoSeverityCard) {

    infoSeverityCard.classList.toggle(
        "has-alerts",
        infoAlertsCount > 0
    );

}

    if (criticalAlertsElement) {
        criticalAlertsElement.textContent = criticalAlertsCount;
    }

    if (warningAlertsElement) {
        warningAlertsElement.textContent = warningAlertsCount;
    }

    if (infoAlertsElement) {
        infoAlertsElement.textContent = infoAlertsCount;
    }


    const activeAlertsKpi = document.getElementById("activeAlertsKpi");

    if (activeAlertsKpi) {
        activeAlertsKpi.textContent = activeCount;

        activeAlertsKpi
        .closest(".alerts-stat-card")
        ?.classList.toggle("has-alerts", activeCount > 0);
    }

    const acknowledgedCount =
        alerts.filter(
            alert => alert.status === "ACKNOWLEDGED"
        ).length;

    const resolvedCount =
        alerts.filter(
            alert => alert.status === "RESOLVED"
        ).length;


    const activeAlertsCount =
        document.getElementById(
            "activeAlertsCount"
        );

    const acknowledgedAlertsCount =
        document.getElementById(
            "acknowledgedAlertsCount"
        );

    const resolvedAlertsCount =
        document.getElementById(
            "resolvedAlertsCount"
        );


    if (activeAlertsCount) {
        activeAlertsCount.textContent =
            activeCount;
    }

    if (acknowledgedAlertsCount) {
        acknowledgedAlertsCount.textContent =
            acknowledgedCount;
    }

    if (resolvedAlertsCount) {
        resolvedAlertsCount.textContent =
            resolvedCount;
    }


    /*
    ========================================
    READ FILTER VALUES
    ========================================
    */

    const searchInput =
        document.getElementById(
            "alertSearch"
        );

    const statusFilter =
        document.getElementById(
            "alertStatusFilter"
        );

    const severityFilter =
        document.getElementById(
            "alertSeverityFilter"
        );


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "ALL";

    const selectedSeverity =
        severityFilter
            ? severityFilter.value
            : "ALL";


    /*
    ========================================
    FILTER ALERTS
    ========================================
    */

    const filteredAlerts =
        alerts.filter(alert => {

            const matchesSearch =
                !searchTerm ||
                (
                    alert.deviceName &&
                    alert.deviceName
                        .toLowerCase()
                        .includes(searchTerm)
                ) ||
                (
                    alert.ipAddress &&
                    alert.ipAddress
                        .toLowerCase()
                        .includes(searchTerm)
                ) ||
                (
                    alert.message &&
                    alert.message
                        .toLowerCase()
                        .includes(searchTerm)
                ) ||
                (
                    alert.eventType &&
                    alert.eventType
                        .toLowerCase()
                        .includes(searchTerm)
                );


            const matchesStatus =
                selectedStatus === "ALL" ||
                alert.status === selectedStatus;


            const matchesSeverity =
                selectedSeverity === "ALL" ||
                alert.severity === selectedSeverity;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesSeverity
            );

        });


    /*
    ========================================
    EMPTY FILTER RESULT
    ========================================
    */

    if (filteredAlerts.length === 0) {

        alertsList.innerHTML = `
            <div class="alerts-empty">
                No alerts match the current filters.
            </div>
        `;

        return;
    }


    /*
    ========================================
    CREATE SIGNATURE
    ========================================
    */

    const currentSignature =
        filteredAlerts
            .map(alert =>
                [
                    alert.id,
                    alert.status,
                    alert.severity,
                    alert.message,
                    alert.acknowledgedAt,
                    alert.resolvedAt
                ].join("-")
            )
            .join("|");


    /*
    ========================================
    PREVENT UNNECESSARY REBUILD
    ========================================
    */

    if (
        currentSignature ===
        alertSignature
    ) {
        return;
    }


    alertSignature =
        currentSignature;


    /*
    ========================================
    RENDER ALERT CARDS
    ========================================
    */

    alertsList.innerHTML =
        filteredAlerts
            .map(alert => {

                const severity =
                    (
                        alert.severity ||
                        "INFO"
                    ).toLowerCase();

                const status =
                    (
                        alert.status ||
                        "ACTIVE"
                    ).toLowerCase();


                const eventType =
                    alert.eventType
                        ? alert.eventType
                            .replaceAll("_", " ")
                        : "SECURITY EVENT";


                const createdAt =
                    alert.createdAt
                        ? new Date(
                            alert.createdAt
                        ).toLocaleString()
                        : "Unknown";


                return `
                    <div
                        class="alert-card"
                        data-alert-id="${alert.id}"
                    >

                        <div class="alert-card-header">

                            <div class="alert-card-type">
                                ${eventType}
                            </div>

                            <div class="alert-card-time">
                                ${createdAt}
                            </div>

                        </div>


                        <div class="alert-card-device">

                            <strong>
                                ${alert.deviceName || "Unknown Device"}
                            </strong>

                            <span>
                                ${alert.ipAddress || "No IP address"}
                            </span>

                        </div>


                        <div class="alert-card-message">
                            ${alert.message || "No message available."}
                        </div>


                        <div class="alert-card-badges">

                            <span
                                class="alert-badge ${severity}"
                            >
                                ${alert.severity || "INFO"}
                            </span>

                            <span
                                class="alert-badge ${status}"
                            >
                                ${alert.status || "ACTIVE"}
                            </span>

                        </div>


                        <div class="alert-card-actions">

                            ${
                                alert.status !== "ACKNOWLEDGED" &&
                                alert.status !== "RESOLVED"
                                    ? `
                                        <button
                                            type="button"
                                            class="alert-action-btn acknowledge"
                                            data-alert-id="${alert.id}"
                                        >
                                            ACKNOWLEDGE
                                        </button>
                                    `
                                    : ""
                            }


                            ${
                                alert.status !== "RESOLVED"
                                    ? `
                                        <button
                                            type="button"
                                            class="alert-action-btn resolve"
                                            data-alert-id="${alert.id}"
                                        >
                                            RESOLVE
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `;

            })
            .join("");


    /*
    ========================================
    ATTACH ACTION BUTTONS
    ========================================
    */

    initializeAlertActionButtons();

}


function initializeAlertActionButtons() {

    const alertButtons =
        document.querySelectorAll(
            ".alert-action-btn"
        );

    alertButtons.forEach(button => {

        if (
            button.dataset.listenerAttached ===
            "true"
        ) {
            return;
        }

        button.dataset.listenerAttached =
            "true";


        button.addEventListener(
            "click",
            async () => {

                const alertId =
                    button.dataset.alertId;

                if (!alertId) {
                    return;
                }


                const isAcknowledge =
                    button.classList.contains(
                        "acknowledge"
                    );

                const action =
                    isAcknowledge
                        ? "acknowledge"
                        : "resolve";


                button.disabled = true;

                const originalText =
                    button.textContent;

                button.textContent =
                    isAcknowledge
                        ? "ACKNOWLEDGING..."
                        : "RESOLVING...";


                try {

                    const response =
                        await fetch(
                            `${API_BASE_URL}/alerts/${alertId}/${action}`,
                            {
                                method: "POST"
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            `Alert action failed: ${response.status}`
                        );

                    }


                    const updatedAlert =
                        await response.json();


                    /*
                    Update the local alert
                    immediately.
                    */

                    alerts =
                        alerts.map(alert =>
                            String(alert.id) ===
                            String(updatedAlert.id)
                                ? updatedAlert
                                : alert
                        );


                    /*
                    Force the renderer to
                    recognize the change.
                    */

                    alertSignature = "";


                    renderAlerts();


                } catch (error) {

                    console.error(
                        `Unable to ${action} alert:`,
                        error
                    );


                    button.disabled = false;

                    button.textContent =
                        originalText;

                }

            }
        );

    });

}

function initializeAlertFilters() {

    const searchInput =
        document.getElementById(
            "alertSearch"
        );

    const statusFilter =
        document.getElementById(
            "alertStatusFilter"
        );

    const severityFilter =
        document.getElementById(
            "alertSeverityFilter"
        );

    const clearButton =
        document.getElementById(
            "clearAlertFilters"
        );


    /*
    ========================================
    SEARCH
    ========================================
    */

    if (
        searchInput &&
        searchInput.dataset.listenerAttached !==
            "true"
    ) {

        searchInput.dataset.listenerAttached =
            "true";

        searchInput.addEventListener(
            "input",
            () => {

                alertSignature = "";

                renderAlerts();

            }
        );

    }


    /*
    ========================================
    STATUS FILTER
    ========================================
    */

    if (
        statusFilter &&
        statusFilter.dataset.listenerAttached !==
            "true"
    ) {

        statusFilter.dataset.listenerAttached =
            "true";

        statusFilter.addEventListener(
            "change",
            () => {

                alertSignature = "";

                renderAlerts();

            }
        );

    }


    /*
    ========================================
    SEVERITY FILTER
    ========================================
    */

    if (
        severityFilter &&
        severityFilter.dataset.listenerAttached !==
            "true"
    ) {

        severityFilter.dataset.listenerAttached =
            "true";

        severityFilter.addEventListener(
            "change",
            () => {

                alertSignature = "";

                renderAlerts();

            }
        );

    }


    /*
    ========================================
    CLEAR FILTERS
    ========================================
    */

    if (
        clearButton &&
        clearButton.dataset.listenerAttached !==
            "true"
    ) {

        clearButton.dataset.listenerAttached =
            "true";

        clearButton.addEventListener(
            "click",
            () => {

                if (searchInput) {
                    searchInput.value = "";
                }

                if (statusFilter) {
                    statusFilter.value = "ALL";
                }

                if (severityFilter) {
                    severityFilter.value = "ALL";
                }

                alertSignature = "";

                renderAlerts();

            }
        );

    }

}


function initializeAlertSeverityCards() {

    const severityCards =
        document.querySelectorAll(
            "[data-severity-filter]"
        );

    const severityFilter =
        document.getElementById(
            "alertSeverityFilter"
        );

    const searchInput =
        document.getElementById(
            "alertSearch"
        );

    const statusFilter =
        document.getElementById(
            "alertStatusFilter"
        );

    severityCards.forEach(card => {

        if (
            card.dataset.listenerAttached === "true"
        ) {
            return;
        }

        card.dataset.listenerAttached = "true";

        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");

        const applySeverityFilter = () => {

            if (!severityFilter) {
                return;
            }

            severityFilter.value =
                card.dataset.severityFilter;

            // Remove other filters so this
            // severity can be viewed clearly.
            if (searchInput) {
                searchInput.value = "";
            }

            if (statusFilter) {
                statusFilter.value = "ALL";
            }

            alertSignature = "";

            renderAlerts();

        };

        card.addEventListener(
            "click",
            applySeverityFilter
        );

        card.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    applySeverityFilter();
                }

            }
        );

    });

}




async function loadMonitoringStatus() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/monitoring/status?refresh=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {

            throw new Error(
                `Monitoring status request failed: ${response.status}`
            );
        }

        const status =
            await response.json();

        const statusDot =
            document.getElementById(
                "monitoringStatusDot"
            );

        const statusText =
            document.getElementById(
                "monitoringStatusText"
            );

        const lastScanValue =
            document.getElementById(
                "lastScanValue"
            );

        const monitoredDevicesValue =
            document.getElementById(
                "monitoredDevicesValue"
            );

        const nextScanValue =
            document.getElementById(
                "nextScanValue"
            );

        const monitoringToggleBtn =
            document.getElementById(
                "monitoringToggleBtn"
            );

        const monitoringIntervalSelect =
            document.getElementById(
                "monitoringIntervalSelect"
            );

        if (
            !statusDot ||
            !statusText ||
            !lastScanValue ||
            !monitoredDevicesValue ||
            !nextScanValue
        ) {
            return;
        }

        /*
 * Monitoring ACTIVE / PAUSED
 */
if (status.active) {

    if (statusDot.className !== "active") {

        statusDot.className =
            "active";
    }

    if (
        statusText.textContent.trim() !==
        "AUTOMATIC MONITORING ACTIVE"
    ) {

        statusText.textContent =
            "AUTOMATIC MONITORING ACTIVE";
    }

    if (monitoringToggleBtn) {

        if (
            monitoringToggleBtn.textContent !==
            "PAUSE MONITORING"
        ) {

            monitoringToggleBtn.textContent =
                "PAUSE MONITORING";
        }

        monitoringToggleBtn.classList.remove(
            "paused"
        );
    }

} else {

    if (statusDot.className !== "inactive") {

        statusDot.className =
            "inactive";
    }

    if (
        statusText.textContent.trim() !==
        "MONITORING PAUSED"
    ) {

        statusText.textContent =
            "MONITORING PAUSED";
    }

    if (monitoringToggleBtn) {

        if (
            monitoringToggleBtn.textContent !==
            "RESUME MONITORING"
        ) {

            monitoringToggleBtn.textContent =
                "RESUME MONITORING";
        }

        monitoringToggleBtn.classList.add(
            "paused"
        );
    }
}

        /*
         * Display last completed scan.
         */
        if (status.lastScan) {

            const lastScan =
                new Date(
                    status.lastScan
                );

            lastScanValue.textContent =
                lastScan.toLocaleString();

        } else {

            lastScanValue.textContent =
                "—";
        }

        /*
         * Display number of monitored devices.
         */
        monitoredDevicesValue.textContent =
            status.monitoredDevices;

        /*
         * Backend is the source of truth.
         *
         * status.scanning tells the frontend
         * whether a scan is ACTUALLY running.
         */
        updateNextScanCountdown(
            status.lastScan
                ? new Date(status.lastScan)
                : null,
            nextScanValue,
            status.scanInterval,
            status.active,
            status.scanning
        );

        /*
         * Keep interval selector synchronized
         * with the backend.
         */
        if (monitoringIntervalSelect) {

            monitoringIntervalSelect.value =
                String(
                    status.scanInterval / 1000
                );
        }

    } catch (error) {

        console.error(
            "Unable to load monitoring status:",
            error
        );

        const statusText =
            document.getElementById(
                "monitoringStatusText"
            );

        if (statusText) {

            statusText.textContent =
                "MONITORING STATUS UNAVAILABLE";
        }
    }
}

let nextScanCountdownTimer = null;

function updateNextScanCountdown(
    lastScan,
    nextScanElement,
    scanInterval,
    isActive,
    isScanning
) {

    if (!nextScanElement) {
        return;
    }

    if (nextScanCountdownTimer) {

        clearInterval(
            nextScanCountdownTimer
        );

        nextScanCountdownTimer = null;
    }

    /*
     * Monitoring is paused.
     */
    if (!isActive) {

        nextScanElement.textContent =
            "PAUSED";

        return;
    }

    /*
     * Backend is ACTUALLY scanning.
     */
    if (isScanning) {

        nextScanElement.textContent =
            "SCANNING...";

        return;
    }

    /*
     * No scan has happened yet.
     */
    if (!lastScan) {

        nextScanElement.textContent =
            "WAITING FOR FIRST SCAN";

        return;
    }

    const nextScan =
        new Date(
            lastScan.getTime() +
            scanInterval
        );

    function updateCountdown() {

        const now =
            new Date();

        const remainingMilliseconds =
            nextScan.getTime() -
            now.getTime();

        const remainingSeconds =
            Math.max(
                0,
                Math.ceil(
                    remainingMilliseconds / 1000
                )
            );

        /*
         * Do NOT automatically display
         * SCANNING here.
         *
         * The backend is the authority.
         */
        if (remainingSeconds <= 0) {

            nextScanElement.textContent =
                "WAITING FOR SCAN...";

            return;
        }

        nextScanElement.textContent =
            `in ${remainingSeconds} seconds`;
    }

    updateCountdown();

    nextScanCountdownTimer =
        setInterval(
            updateCountdown,
            1000
        );
}

async function toggleMonitoring() {

    const button =
        document.getElementById(
            "monitoringToggleBtn"
        );

    if (!button) {
        return;
    }

    try {

        button.disabled = true;

        const statusResponse =
            await fetch(
                `${API_BASE_URL}/monitoring/status?refresh=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!statusResponse.ok) {

            throw new Error(
                `Unable to read monitoring status: ${statusResponse.status}`
            );
        }

        const status =
            await statusResponse.json();

        const endpoint =
            status.active
                ? "/monitoring/pause"
                : "/monitoring/resume";

        const response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    method: "POST"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Unable to change monitoring state: ${response.status}`
            );
        }

        const updatedStatus =
            await response.json();

        /*
         * Immediately stop the countdown
         * when monitoring is paused.
         */
        if (!updatedStatus.active) {

            if (nextScanCountdownTimer) {

                clearInterval(
                    nextScanCountdownTimer
                );

                nextScanCountdownTimer = null;
            }

            const nextScanValue =
                document.getElementById(
                    "nextScanValue"
                );

            if (nextScanValue) {

                nextScanValue.textContent =
                    "PAUSED";
            }
        }

        await loadMonitoringStatus();

    } catch (error) {

        console.error(
            "Unable to toggle monitoring:",
            error
        );

    } finally {

        button.disabled = false;
    }
}

async function changeMonitoringInterval() {

    const select =
        document.getElementById(
            "monitoringIntervalSelect"
        );

    if (!select) {
        return;
    }

    const seconds =
        Number(select.value);

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/monitoring/interval?seconds=${seconds}`,
                {
                    method: "PUT"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Unable to change monitoring interval: ${response.status}`
            );
        }

        /*
         * Stop the old countdown immediately.
         */
        if (nextScanCountdownTimer) {

            clearInterval(
                nextScanCountdownTimer
            );

            nextScanCountdownTimer = null;
        }

        /*
         * Get the backend's new state and
         * rebuild the countdown using the
         * new interval.
         */
        await loadMonitoringStatus();

    } catch (error) {

        console.error(
            "Unable to change monitoring interval:",
            error
        );
    }
}


function renderDeviceAvailabilityChart(healthChecks) {

    const canvas =
        document.getElementById(
            "deviceAvailabilityChart"
        );

    if (!canvas) {
        return;
    }

    if (deviceAvailabilityChart) {

        deviceAvailabilityChart.destroy();

        deviceAvailabilityChart = null;
    }

    /*
     * The API returns newest checks first.
     *
     * Reverse the array so the chart moves
     * chronologically from oldest to newest.
     */

    const checks =
        [...healthChecks].reverse();

    const labels =
        checks.map(check => {

            return new Date(
                check.checkedAt
            ).toLocaleTimeString([], {

                hour: "2-digit",

                minute: "2-digit",

                second: "2-digit"
            });
        });

    /*
     * ONLINE = 100
     * OFFLINE = 0
     */

    const availability =
        checks.map(check => {

            return String(
                check.status || "").toUpperCase() === "ONLINE"
                ? 100
                : 0;
        });

    deviceAvailabilityChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [{

                    label: "Availability",

                    data: availability,

                    tension: 0.25,

                    borderWidth: 2,

                    pointRadius: 3,

                    pointHoverRadius: 5,

                    fill: false,

                    stepped: true
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 400
                },

                plugins: {

                    legend: {
                        display: true
                    },

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return context.raw === 100
                                    ? "ONLINE"
                                    : "OFFLINE";
                            }
                        }
                    }
                },

                scales: {

                    y: {

                        min: 0,

                        max: 100,

                        ticks: {

                            stepSize: 25,

                            callback: function(value) {

                                return value + "%";
                            }
                        },

                        title: {

                            display: true,

                            text: "Availability"
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
}
/*
========================================
START APPLICATION
========================================
*/

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);