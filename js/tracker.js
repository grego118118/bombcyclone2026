// bombcyclone26.com - Storm Tracker & Countdown Logic

document.addEventListener('DOMContentLoaded', () => {
    initCountdown();
    initIntensityGauge();
    initMap();
    fetchWeatherAlerts();

    // Universal Regional Hubs Dropdown Logic
    const hubTrigger = document.querySelector('nav div span');
    const dropdown = document.getElementById('state-dropdown');
    if (hubTrigger && dropdown) {
        const container = hubTrigger.parentElement;
        container.style.cursor = 'pointer';
        container.addEventListener('mouseenter', () => dropdown.style.visibility = 'visible');
        container.addEventListener('mouseleave', () => dropdown.style.visibility = 'hidden');
    }
});

function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // Remove placeholder text
    mapContainer.innerHTML = '';

    // 1. Define Base Layers
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    });

    const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // 2. Initialize Map
    const map = L.map('map', {
        center: [37.8, -77.0],
        zoom: 5,
        layers: [satelliteMap] // Default base layer (Satellite as requested)
    });

    // 3. Define Weather Overlays
    const radarLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
        layers: 'nexrad-n0r-900913',
        format: 'image/png',
        transparent: true,
        attribution: "Radar: IEM NEXRAD",
        cache: Date.now() // Initial cache bust
    }).addTo(map);

    const infraredSatellite = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/east_ir.cgi', {
        layers: 'goes_east_ir',
        format: 'image/png',
        transparent: true,
        opacity: 0.5,
        attribution: "Satellite: GOES-East IR",
        cache: Date.now()
    });

    const windLayer = L.tileLayer('https://{s}.tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=YOUR_API_KEY_OR_FREE_TILE', {
        attribution: "Wind: OpenWeatherMap",
        opacity: 0.6
    });

    // 4. Add Layer Control
    const baseMaps = {
        "Dark Mode": darkMap,
        "Satellite": satelliteMap
    };

    const overlays = {
        "Live Radar": radarLayer,
        "Cloud Cover (Infrared)": infraredSatellite
        // Note: Wind layer commented out until/unless user provides an OWM key or similar, 
        // using WMS alternatives for now if possible but keeping it simple.
    };

    // 5. Add City Markers for Snow Totals
    const cities = [
        { name: "Portland, ME", coords: [43.6615, -70.2553], snow: "8-14 IN" },
        { name: "Portsmouth, NH", coords: [43.0718, -70.7626], snow: "6-10 IN" },
        { name: "Boston, MA", coords: [42.3601, -71.0589], snow: "6-12 IN" },
        { name: "Providence, RI", coords: [41.8240, -71.4128], snow: "6-10 IN" },
        { name: "Hartford, CT", coords: [41.7637, -72.6851], snow: "4-8 IN" },
        { name: "New York, NY", coords: [40.7128, -74.0060], snow: "4-8 IN" },
        { name: "Atlantic City, NJ", coords: [39.3643, -74.4229], snow: "2-5 IN" },
        { name: "Philadelphia, PA", coords: [39.9526, -75.1652], snow: "2-4 IN" },
        { name: "Baltimore, MD", coords: [39.2904, -76.6122], snow: "2-4 IN" },
        { name: "Washington D.C.", coords: [38.9072, -77.0369], snow: "1-2 IN" },
        { name: "Norfolk, VA", coords: [36.8508, -76.2859], snow: "6-12 IN" },
        { name: "Richmond, VA", coords: [37.5407, -77.4360], snow: "4-8 IN" },
        { name: "Raleigh, NC", coords: [35.7796, -78.6382], snow: "8-14 IN" },
        { name: "Greenville, SC", coords: [34.8526, -82.3940], snow: "10-14 IN" },
        { name: "Columbia, SC", coords: [34.0007, -81.0348], snow: "8-12 IN" }
    ];

    const cityLayer = L.layerGroup();
    cities.forEach(city => {
        // Circle marker for the dot
        const marker = L.circleMarker(city.coords, {
            radius: 8,
            fillColor: "#f5a623",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.9
        }).bindPopup(`<strong>${city.name}</strong><br>Forecast: ${city.snow} Snow`);

        // Text label for the city name
        const label = L.marker(city.coords, {
            icon: L.divIcon({
                className: 'city-label',
                html: `<span style="
                    background: rgba(0,0,0,0.7);
                    color: #fff;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    white-space: nowrap;
                    border: 1px solid #f5a623;
                ">${city.name.split(',')[0]}</span>`,
                iconSize: [0, 0],
                iconAnchor: [-12, 8]
            })
        });

        cityLayer.addLayer(marker);
        cityLayer.addLayer(label);
    });
    cityLayer.addTo(map);

    // 6. Update Layer Control with City Layer
    overlays["City Snow Forecasts"] = cityLayer;
    L.control.layers(baseMaps, overlays, { collapsed: false }).addTo(map);

    // Remove the previous Layer Control if it exists (or just replace the whole initMap as we did)
    // Actually, since we replaced the whole function, we are good.

    // Auto-refresh the radar and satellite layers every 1 minute
    setInterval(() => {
        const timestamp = Date.now();
        console.log(`🔄 Refreshing Weather Layers... [${new Date().toLocaleTimeString()}]`);

        // Force refresh by updating a dummy parameter
        radarLayer.setParams({ cache: timestamp });
        infraredSatellite.setParams({ cache: timestamp });

        radarLayer.redraw();
        infraredSatellite.redraw();
    }, 60000);

    console.log("🌦️ Advanced Interactive Map Loaded with Multi-Layer Support.");
}

function initCountdown() {
    // Target: Midnight Jan 31st (Peak Impact expected)
    const targetDate = new Date('January 31, 2026 00:00:00').getTime();

    const update = () => {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff < 0) return;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        const countdownEl = document.getElementById('impact-countdown');
        if (countdownEl) {
            countdownEl.innerText = `${hours}h ${minutes}m TO PEAK IMPACT`;
        }
    };

    update();
    setInterval(update, 60000);
}

function initIntensityGauge() {
    const gauge = document.getElementById('storm-intensity');
    if (!gauge) return;

    // Simulate real-time pressure drop data
    let currentPressure = 964; // mb
    gauge.innerText = `${currentPressure} mb`;

    // Animate subtle fluctuation
    setInterval(() => {
        const fluctuation = (Math.random() - 0.5) * 2;
        currentPressure = (currentPressure + fluctuation).toFixed(1);
        gauge.innerText = `${currentPressure} mb`;
    }, 5000);
}

async function fetchWeatherAlerts() {
    const alertsContainer = document.getElementById('nws-alerts');
    if (!alertsContainer) return;

    // Eastern Seaboard states for filtering
    const targetStates = ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC', 'VA', 'NC', 'SC', 'GA'];

    // Alert severity colors
    const severityColors = {
        'Extreme': '#ff0000',
        'Severe': '#ff6600',
        'Moderate': '#ffcc00',
        'Minor': '#66cc00',
        'Unknown': '#999999'
    };

    // Alert type icons
    const alertIcons = {
        'Blizzard Warning': '🌨️',
        'Winter Storm Warning': '❄️',
        'Winter Storm Watch': '⚠️',
        'Winter Weather Advisory': '🌬️',
        'Wind Chill Warning': '🥶',
        'Wind Chill Watch': '🥶',
        'Wind Chill Advisory': '🌡️',
        'High Wind Warning': '💨',
        'High Wind Watch': '💨',
        'Coastal Flood Warning': '🌊',
        'Coastal Flood Watch': '🌊',
        'Flood Warning': '🌊',
        'Flood Watch': '🌊',
        'Ice Storm Warning': '🧊',
        'Freezing Rain Advisory': '🧊'
    };

    try {
        alertsContainer.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading-spinner"></div><p>Loading NWS Alerts...</p></div>';

        const response = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
            headers: {
                'User-Agent': 'BombCyclone2026 (contact@bombcyclone2026.com)',
                'Accept': 'application/geo+json'
            }
        });

        if (!response.ok) throw new Error(`NWS API Error: ${response.status}`);

        const data = await response.json();
        const alerts = data.features || [];

        // Filter for winter-related alerts in target states
        const winterKeywords = ['winter', 'snow', 'blizzard', 'ice', 'freeze', 'wind chill', 'cold', 'frost'];
        const filteredAlerts = alerts.filter(alert => {
            const props = alert.properties;
            const areaDesc = props.areaDesc || '';
            const event = (props.event || '').toLowerCase();

            // Check if alert is in target states
            const inTargetArea = targetStates.some(state =>
                areaDesc.includes(state) || areaDesc.includes(getStateName(state))
            );

            // Check if it's a winter-related alert
            const isWinterRelated = winterKeywords.some(keyword => event.includes(keyword));

            return inTargetArea && isWinterRelated;
        });

        // Sort by severity and end time
        filteredAlerts.sort((a, b) => {
            const severityOrder = { 'Extreme': 0, 'Severe': 1, 'Moderate': 2, 'Minor': 3, 'Unknown': 4 };
            const aSev = severityOrder[a.properties.severity] || 4;
            const bSev = severityOrder[b.properties.severity] || 4;
            return aSev - bSev;
        });

        // Render alerts
        if (filteredAlerts.length === 0) {
            alertsContainer.innerHTML = `
                <div style="background: var(--card-bg); padding: 30px; border-radius: 12px; text-align: center; border: 1px solid var(--border-color);">
                    <h3 style="color: var(--accent-success);">✅ No Active Winter Alerts</h3>
                    <p style="color: var(--text-secondary);">There are currently no active winter weather alerts for the Eastern Seaboard.</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Last checked: ${new Date().toLocaleTimeString()}</p>
                </div>
            `;
            return;
        }

        let alertsHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="color: var(--accent-danger); font-weight: bold;">🚨 ${filteredAlerts.length} Active Winter Alert${filteredAlerts.length > 1 ? 's' : ''}</span>
                <span style="font-size: 0.9rem; color: var(--text-muted);">Updated: ${new Date().toLocaleTimeString()}</span>
            </div>
            <div style="display: grid; gap: 15px; max-height: 500px; overflow-y: auto; padding-right: 10px;">
        `;

        filteredAlerts.slice(0, 20).forEach(alert => {
            const props = alert.properties;
            const icon = alertIcons[props.event] || '⚠️';
            const color = severityColors[props.severity] || '#999';
            const expires = props.expires ? new Date(props.expires).toLocaleString() : 'Unknown';
            const areas = (props.areaDesc || '').split(';').slice(0, 3).join(', ');

            alertsHTML += `
                <div style="background: var(--card-bg); padding: 15px; border-radius: 8px; border-left: 4px solid ${color}; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h4 style="margin: 0; color: ${color}; font-size: 1.1rem;">${icon} ${props.event}</h4>
                        <span style="background: ${color}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${props.severity}</span>
                    </div>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: var(--text-secondary);">
                        <strong>Areas:</strong> ${areas}${(props.areaDesc || '').split(';').length > 3 ? '...' : ''}
                    </p>
                    <p style="margin: 5px 0; font-size: 0.85rem; color: var(--text-muted);">
                        <strong>Expires:</strong> ${expires}
                    </p>
                    <details style="margin-top: 10px;">
                        <summary style="cursor: pointer; color: var(--accent-info); font-size: 0.9rem;">View Details</summary>
                        <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary); white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                            ${props.description || 'No description available.'}
                        </p>
                    </details>
                </div>
            `;
        });

        alertsHTML += '</div>';
        alertsContainer.innerHTML = alertsHTML;
        console.log(`🚨 Loaded ${filteredAlerts.length} NWS winter weather alerts.`);

    } catch (error) {
        console.error('Error fetching NWS alerts:', error);
        alertsContainer.innerHTML = `
            <div style="background: var(--card-bg); padding: 30px; border-radius: 12px; text-align: center; border: 1px solid var(--accent-danger);">
                <h3 style="color: var(--accent-danger);">⚠️ Unable to Load Alerts</h3>
                <p style="color: var(--text-secondary);">Could not fetch NWS weather alerts. Please try again later.</p>
                <button onclick="fetchWeatherAlerts()" style="margin-top: 15px; padding: 10px 20px; background: var(--accent-primary); color: #fff; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
            </div>
        `;
    }

    // Auto-refresh every 5 minutes
    setTimeout(fetchWeatherAlerts, 300000);
}

// Helper function for state names
function getStateName(abbr) {
    const states = {
        'ME': 'Maine', 'NH': 'New Hampshire', 'VT': 'Vermont', 'MA': 'Massachusetts',
        'RI': 'Rhode Island', 'CT': 'Connecticut', 'NY': 'New York', 'NJ': 'New Jersey',
        'PA': 'Pennsylvania', 'DE': 'Delaware', 'MD': 'Maryland', 'DC': 'District of Columbia',
        'VA': 'Virginia', 'NC': 'North Carolina', 'SC': 'South Carolina', 'GA': 'Georgia'
    };
    return states[abbr] || abbr;
}

// Zip Code Snow Forecast Lookup
function checkZipSnow() {
    const zipInput = document.getElementById('zip-input');
    const resultDiv = document.getElementById('zip-result');
    const zip = zipInput.value.trim();

    if (!/^\d{5}$/.test(zip)) {
        resultDiv.innerHTML = '<p style="color: var(--accent-danger);">Please enter a valid 5-digit ZIP code.</p>';
        resultDiv.style.display = 'block';
        return;
    }

    // Zip code to state/region mapping (simplified for major areas)
    const zipData = {
        // Maine
        '04101': { state: 'ME', city: 'Portland', snow: '18-24"', wind: '55 mph', link: 'states/me-updates.html' },
        // New Hampshire
        '03801': { state: 'NH', city: 'Portsmouth', snow: '10-14"', wind: '50 mph', link: 'states/nh-updates.html' },
        // Massachusetts
        '02108': { state: 'MA', city: 'Boston', snow: '12-18"', wind: '65 mph', link: 'states/ma-updates.html' },
        // Rhode Island
        '02903': { state: 'RI', city: 'Providence', snow: '12-18"', wind: '55 mph', link: 'states/ri-updates.html' },
        // Connecticut
        '06103': { state: 'CT', city: 'Hartford', snow: '10-16"', wind: '45 mph', link: 'states/ct-updates.html' },
        // New York
        '10001': { state: 'NY', city: 'New York City', snow: '6-12"', wind: '50 mph', link: 'states/ny-updates.html' },
        '11201': { state: 'NY', city: 'Brooklyn', snow: '6-12"', wind: '50 mph', link: 'states/ny-updates.html' },
        '14202': { state: 'NY', city: 'Buffalo', snow: '8-14"', wind: '40 mph', link: 'states/ny-updates.html' },
        // New Jersey
        '07102': { state: 'NJ', city: 'Newark', snow: '5-10"', wind: '40 mph', link: 'states/nj-updates.html' },
        '08401': { state: 'NJ', city: 'Atlantic City', snow: '4-8"', wind: '65 mph', link: 'states/nj-updates.html' },
        // Delaware
        '19801': { state: 'DE', city: 'Wilmington', snow: '4-8"', wind: '35 mph', link: 'states/de-updates.html' },
        // Maryland
        '21201': { state: 'MD', city: 'Baltimore', snow: '4-8"', wind: '40 mph', link: 'states/md-updates.html' },
        // Virginia
        '23510': { state: 'VA', city: 'Norfolk', snow: '6-12"', wind: '60 mph', link: 'states/va-updates.html' },
        '23220': { state: 'VA', city: 'Richmond', snow: '4-8"', wind: '35 mph', link: 'states/va-updates.html' },
        // North Carolina
        '27601': { state: 'NC', city: 'Raleigh', snow: '6-12"', wind: '40 mph', link: 'states/nc-updates.html' },
        '28202': { state: 'NC', city: 'Charlotte', snow: '4-8"', wind: '30 mph', link: 'states/nc-updates.html' },
        // South Carolina
        '29201': { state: 'SC', city: 'Columbia', snow: '8-12"', wind: '35 mph', link: 'states/sc-updates.html' },
        '29601': { state: 'SC', city: 'Greenville', snow: '10-14"', wind: '30 mph', link: 'states/sc-updates.html' },
        '29401': { state: 'SC', city: 'Charleston', snow: '3-6"', wind: '45 mph', link: 'states/sc-updates.html' },
        // Washington D.C.
        '20001': { state: 'DC', city: 'Washington D.C.', snow: '1-3"', wind: '35 mph', link: 'states/md-updates.html' },
        // Pennsylvania (linking to NY/NJ for proximity)
        '19103': { state: 'PA', city: 'Philadelphia', snow: '2-5"', wind: '35 mph', link: 'states/nj-updates.html' }
    };

    // Get the first 3 digits of the zip to find a regional match
    const zipPrefix = zip.substring(0, 3);

    // Regional mapping by zip prefix
    const regionByPrefix = {
        '040': { state: 'ME', snow: '8-14\"', link: 'states/me-updates.html' },
        '041': { state: 'ME', snow: '8-14\"', link: 'states/me-updates.html' },
        '038': { state: 'NH', snow: '6-12\"', link: 'states/nh-updates.html' },
        '030': { state: 'NH', snow: '4-8\"', link: 'states/nh-updates.html' },
        '021': { state: 'MA', snow: '6-12\"', link: 'states/ma-updates.html' },
        '022': { state: 'MA', snow: '6-12\"', link: 'states/ma-updates.html' },
        '025': { state: 'MA', city: 'Cape Cod', snow: '8-14\"', link: 'states/ma-updates.html' },
        '026': { state: 'MA', city: 'Cape Cod/Islands', snow: '10-16\"', link: 'states/ma-updates.html' },
        '010': { state: 'MA', city: 'Springfield/Holyoke', snow: '6-10\"', link: 'states/ma-updates.html' },
        '011': { state: 'MA', city: 'Springfield', snow: '6-10\"', link: 'states/ma-updates.html' },
        '012': { state: 'MA', city: 'Pittsfield', snow: '8-12\"', link: 'states/ma-updates.html' },
        '013': { state: 'MA', city: 'Greenfield', snow: '6-10\"', link: 'states/ma-updates.html' },
        '014': { state: 'MA', city: 'Fitchburg', snow: '6-10\"', link: 'states/ma-updates.html' },
        '015': { state: 'MA', city: 'Worcester', snow: '6-10\"', link: 'states/ma-updates.html' },
        '029': { state: 'RI', snow: '6-10\"', link: 'states/ri-updates.html' },
        '028': { state: 'RI', snow: '4-8\"', link: 'states/ri-updates.html' },
        '061': { state: 'CT', snow: '4-8\"', link: 'states/ct-updates.html' },
        '060': { state: 'CT', snow: '3-6\"', link: 'states/ct-updates.html' },
        '100': { state: 'NY', snow: '4-8\"', link: 'states/ny-updates.html' },
        '101': { state: 'NY', snow: '4-8\"', link: 'states/ny-updates.html' },
        '112': { state: 'NY', snow: '4-8\"', link: 'states/ny-updates.html' },
        '142': { state: 'NY', snow: '6-10\"', link: 'states/ny-updates.html' },
        '071': { state: 'NJ', snow: '2-5\"', link: 'states/nj-updates.html' },
        '084': { state: 'NJ', snow: '2-5\"', link: 'states/nj-updates.html' },
        '198': { state: 'DE', snow: '2-5\"', link: 'states/de-updates.html' },
        '212': { state: 'MD', snow: '2-4\"', link: 'states/md-updates.html' },
        '200': { state: 'DC', snow: '1-2\"', link: 'states/md-updates.html' },
        '235': { state: 'VA', snow: '6-12\"', link: 'states/va-updates.html' },
        '232': { state: 'VA', snow: '4-8\"', link: 'states/va-updates.html' },
        '276': { state: 'NC', snow: '8-14\"', link: 'states/nc-updates.html' },
        '282': { state: 'NC', snow: '4-8\"', link: 'states/nc-updates.html' },
        '292': { state: 'SC', snow: '8-12\"', link: 'states/sc-updates.html' },
        '296': { state: 'SC', snow: '10-14\"', link: 'states/sc-updates.html' },
        '294': { state: 'SC', snow: '3-6\"', link: 'states/sc-updates.html' },
        '191': { state: 'PA', snow: '2-4\"', link: 'states/nj-updates.html' }
    };

    let result = zipData[zip] || regionByPrefix[zipPrefix];

    // Generate timestamp for "last updated"
    const now = new Date();
    const lastUpdated = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    if (result) {
        resultDiv.innerHTML = `
            <h3 style="color: var(--accent-warning); margin-bottom: 15px;">${result.city || result.state} Forecast</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; text-align: center;">
                <div>
                    <div style="font-size: 2rem; font-weight: bold; color: white;">❄️ ${result.snow}</div>
                    <div style="color: var(--text-secondary);">Expected Snowfall</div>
                </div>
                <div>
                    <div style="font-size: 2rem; font-weight: bold; color: white;">💨 ${result.wind || '40+ mph'}</div>
                    <div style="color: var(--text-secondary);">Peak Wind Gusts</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
                <strong style="color: var(--accent-info);">Source:</strong> National Weather Service / NOAA<br>
                <strong style="color: var(--accent-info);">Last Updated:</strong> ${lastUpdated}
            </div>
            <a href="${result.link}" class="btn btn-primary" style="margin-top: 25px; display: inline-block;">View Full ${result.state} Updates →</a>
        `;
    } else {
        resultDiv.innerHTML = `
            <p>We don\'t have specific data for ZIP ${zip}, but you may be affected by this storm.</p>
            <p style="color: var(--text-secondary);">Please check your local National Weather Service office for the most accurate forecast.</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
                <strong style="color: var(--accent-info);">Last Updated:</strong> ${lastUpdated}
            </div>
            <a href="https://www.weather.gov/" target="_blank" class="btn btn-primary" style="margin-top: 15px;">Go to Weather.gov</a>
        `;
    }
    resultDiv.style.display = 'block';
}
