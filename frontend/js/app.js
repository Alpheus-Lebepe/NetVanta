const API_BASE_URL = "http://localhost:8080/api";
let healthChart = null;
let selectedDeviceId = null;
let securityEvents = [];

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

            deviceCard.innerHTML = ` <div
    class="device-info device-details-trigger"
    data-device-id="${device.id}">

    <span class="device-indicator ${status}">
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

    <div class="device-status ${status}">
        ${device.status}
    </div>

</div>

<div class="device-actions">

    <button
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

<button
    type="button"
    class="delete-device-btn"
    data-device-id="${device.id}">

    DELETE

</button>

    </div>
`;
            deviceList.appendChild(deviceCard);
            

        });

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


        healthStatus.textContent =
            latest.status;


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
         * Availability =
         *
         * ONLINE checks
         * ----------------
         * Total checks
         *
         * multiplied by 100.
         */

        const onlineCount =
            recentChecks.filter(
                check =>
                    String(
                        check.status
                    ).toUpperCase() === "ONLINE"
            ).length;


        const availability =
            (
                onlineCount /
                recentChecks.length
            ) * 100;


        if (availabilityElement) {

            availabilityElement.textContent =
                `${availability.toFixed(1)}%`;
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

    /*
     * No health-check data.
     */
    if (
        !healthChecks ||
        healthChecks.length === 0
    ) {

        return;
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
async function loadSecurityEvents() {

    console.log("Loading Security Events...");

    const eventsList =
        document.getElementById("securityEventsList");

    if (!eventsList) {

        console.error(
            "ERROR: #securityEventsList does not exist."
        );

        return;
    }

    try {

        eventsList.innerHTML = `
            <div class="security-events-loading">
                Loading security events...
            </div>
        `;

        const response = await fetch(
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

        const events = await response.json();

        console.log(
            "Security Events received:",
            events
        );

        
         * Completely remove whatever is
         * currently displayed.
         *
        eventsList.innerHTML = "";

        if (!events || events.length === 0) {

            eventsList.innerHTML = `
                <div class="security-events-empty">
                    No security events recorded.
                </div>
            `;

            return;
        }

        
         * Render EVERY event returned by
         * the backend.
         *
        events.forEach(event => {

            const severity =
                String(event.severity || "INFO")
                    .toLowerCase();

            const createdAt =
                new Date(event.createdAt);

            const formattedTime =
                createdAt.toLocaleString();

            const eventCard =
                document.createElement("div");

            eventCard.className =
                "security-event";

            eventCard.innerHTML = `

                <div
                    class="security-event-severity ${severity}">
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
                        class="security-event-badge ${severity}">

                        ${event.severity}

                    </span>

                </div>
            `;

            eventsList.appendChild(eventCard);

        });

        console.log(
            `Rendered ${events.length} security events.`
        );

    } catch (error) {

        console.error(
            "Unable to load security events:",
            error
        );

        eventsList.innerHTML = `
            <div class="security-events-error">
                Unable to load security events.
            </div>
        `;
    }
}

*/


/*async function loadSecurityEvents() {

    const eventsList =
        document.getElementById("securityEventsList");

    if (!eventsList) {
        console.error(
            "Security Events container not found."
        );
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/security-events`,
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

        const events = await response.json();

        console.log(
            "Security events loaded:",
            events
        );

        if (!Array.isArray(events)) {
            throw new Error(
                "Security events response is not an array."
            );
        }

        if (events.length === 0) {

            eventsList.innerHTML = `
                <div class="security-events-empty">
                    No security events recorded.
                </div>
            `;

            return;
        }

        
         * Clear the old events before rendering
         * the latest API response.
         *
        eventsList.innerHTML = "";

        events.forEach(event => {

            const severity =
                String(event.severity || "INFO")
                    .toLowerCase();

            const eventCard =
                document.createElement("div");

            eventCard.className =
                "security-event";

            const createdAt =
                new Date(event.createdAt);

            const formattedTime =
                isNaN(createdAt.getTime())
                    ? event.createdAt
                    : createdAt.toLocaleString();

            eventCard.innerHTML = `

                <div
                    class="security-event-severity ${severity}">
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
                        class="security-event-badge ${severity}">

                        ${event.severity}

                    </span>

                </div>
            `;

            eventsList.appendChild(eventCard);
        });

    } catch (error) {

        console.error(
            "Unable to load security events:",
            error
        );

        eventsList.innerHTML = `
            <div class="security-events-error">
                Unable to load security events.
            </div>
        `;
    }
}
*/

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
        selectedHealthDeviceId = device.id;

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


selectedHealthDeviceId = device.id;

const healthDeviceSelect =
    document.getElementById(
        "healthDeviceSelect"
    );

if (healthDeviceSelect) {

    healthDeviceSelect.value =
        device.id;
}

await Promise.all([
  loadDashboardStats(),
  loadDevices(),
  loadHealthChart(device.id),
  loadSecurityEvents(),
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
}*/

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

    console.log("Initializing NetVanta dashboard...");

    initializeDeviceModal();
    initializeEditDeviceModal();
    initializeDeviceDetailsModal();
    initializeSecurityEventFilters();

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

        if (selectedHealthDeviceId) {
            await loadHealthChart(
                selectedHealthDeviceId
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

}, 60000);


/*
 * Monitoring status needs much faster
 * synchronization than the rest of the dashboard.
 */
setInterval(async () => {

    await loadMonitoringStatus();

}, 1000);


/*
 * Security events refresh independently
 * so new events appear without waiting
 * for the full dashboard refresh.
 */
setInterval(async () => {

    await loadSecurityEvents();

}, 5000);


/*
 * Device statuses refresh independently
 * so automatic monitoring changes appear
 * without rebuilding the device cards.
 */
setInterval(async () => {

    await syncDeviceStatuses();

}, 5000);



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

    });


    deleteButtons.forEach(button => {

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

            statusDot.className = "active";

            statusText.textContent =
                "AUTOMATIC MONITORING ACTIVE";

            if (monitoringToggleBtn) {

                monitoringToggleBtn.textContent =
                    "PAUSE MONITORING";

                monitoringToggleBtn.classList.remove(
                    "paused"
                );
            }

        } else {

            statusDot.className = "inactive";

            statusText.textContent =
                "MONITORING PAUSED";

            if (monitoringToggleBtn) {

                monitoringToggleBtn.textContent =
                    "RESUME MONITORING";

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

    if (
        !healthChecks ||
        healthChecks.length === 0
    ) {
        return;
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

            return check.status === "ONLINE"
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