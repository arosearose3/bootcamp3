<script>
    import { onMount, afterUpdate, tick } from 'svelte';
    import { vitals, fetchVitals } from '$stores/patientStore.js';
    import { get } from 'svelte/store';
    import { browser } from '$app/environment';
    import AddVitals from '$components/AddVitals.svelte';


    let isLoading = false;
    let isRefreshing = false;
    let groupedObservations = {};
    let vitalTypes = [];
    let selectedVitalType = null;
    let chart;
    let ApexCharts;
    let navPanelWidth = '200px'; // Default width
    let chartElement;
    let showAddVitalsPopup = false;

    function toggleAddVitalsPopup() {
        showAddVitalsPopup = !showAddVitalsPopup;
    }

    async function handleAddVital() {
                // Scroll to the top of the page
        if (typeof window !== 'undefined') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        await refreshVitals();
        showAddVitalsPopup = false;
        

    }
    function handleClosePopup() {
        showAddVitalsPopup = false;
    }

    onMount(async () => {
        if (browser) {
            ApexCharts = (await import('apexcharts')).default;
            await refreshVitals();
            if (selectedVitalType) {
                renderChart();
            }
        }
    });

    afterUpdate(() => {
        if (selectedVitalType) {
            console.log('selectedVitalType', selectedVitalType);
            console.log('sorted vitals:', sortedVitals);
        }
    });

    async function refreshVitals() {
        isRefreshing = true; // Set refreshing state to true
        isLoading = true;
        await fetchVitals();
        const vitalObservations = get(vitals)?.entry || [];
        groupedObservations = groupObservationsByCode(vitalObservations);
        vitalTypes = Object.keys(groupedObservations);
        selectedVitalType = selectedVitalType || vitalTypes[0] || null;
        isLoading = false;
        isRefreshing = false; // Set refreshing state back to false
        if (selectedVitalType) {
            await tick();  // Ensure the DOM has updated
            renderChart();
        }
    }

    function groupObservationsByCode(observations) {
        return observations.reduce((acc, { resource }) => {
            if (resource.resourceType === 'Observation') {
                const code = resource.code.coding[0].display;
                if (!acc[code]) acc[code] = [];
                acc[code].push(resource);
            }
            return acc;
        }, {});
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    function selectVitalType(type) {
        selectedVitalType = type;
        // The update of sortedVitals will happen reactively
    }

    function renderChart() {
    if (!browser || !ApexCharts || !chartElement) return;

    if (chart) {
        chart.destroy();
    }

    const vitals = sortedVitals.filter(v => v.valueQuantity || (v.component && v.component.every(c => c.valueQuantity)));
    if (vitals.length < 2) return;

    const isBloodPressure = selectedVitalType.toLowerCase().includes('blood pressure');
    const isTemperature = selectedVitalType.toLowerCase().includes('temperature');

    let series, options;

    if (isBloodPressure) {
        series = [{
            data: vitals.map(v => ({
                x: new Date(v.effectiveDateTime),
                y: [
                    v.component.find(c => c.code.text === 'Systolic Blood Pressure').valueQuantity.value,
                    v.component.find(c => c.code.text === 'Systolic Blood Pressure').valueQuantity.value,
                    v.component.find(c => c.code.text === 'Diastolic Blood Pressure').valueQuantity.value,
                    v.component.find(c => c.code.text === 'Diastolic Blood Pressure').valueQuantity.value
                ]
            }))
        }];
        options = {
            chart: {
                type: 'candlestick',
                height: 350
            },
            title: {
                text: 'Blood Pressure Over Time',
                align: 'left'
            },
            xaxis: {
                type: 'datetime'
            },
            yaxis: {
                tooltip: {
                    enabled: true
                }
            }
        };
    } else {
        series = [{
            name: selectedVitalType,
            data: vitals.map(v => ({
                x: new Date(v.effectiveDateTime),
                y: v.valueQuantity.value
            }))
        }];
        options = {
            chart: {
                type: 'line',
                height: 350
            },
            title: {
                text: `${selectedVitalType} Over Time`,
                align: 'left'
            },
            xaxis: {
                type: 'datetime'
            },
            yaxis: {
                title: {
                    text: vitals[0].valueQuantity.unit
                }
            }
        };

        if (isTemperature) {
            const temperatureRanges = [
                { y: 41, borderColor: '#FF0000', label: { text: 'Heatstroke', style: { color: '#FF0000' } }, fillColor: '#FF000020' },
                { y: 40, borderColor: '#FF3300', label: { text: 'Hyperpyrexia', style: { color: '#FF3300' } }, fillColor: '#FF330020' },
                { y: 38.1, borderColor: '#FF6600', label: { text: 'High-Grade Fever', style: { color: '#FF6600' } }, fillColor: '#FF660020' },
                { y: 37.2, borderColor: '#FF9900', label: { text: 'Low-Grade Fever', style: { color: '#FF9900' } }, fillColor: '#FF990020' },
                { y: 35, borderColor: '#3366FF', label: { text: 'Mild Hypothermia', style: { color: '#3366FF' } }, fillColor: '#3366FF20' },
                { y: 32, borderColor: '#0033FF', label: { text: 'Moderate Hypothermia', style: { color: '#0033FF' } }, fillColor: '#0033FF20' },
                { y: 28, borderColor: '#0000FF', label: { text: 'Severe Hypothermia', style: { color: '#0000FF' } }, fillColor: '#0000FF20' }
            ];

            options.annotations = {
                yaxis: temperatureRanges.map(range => ({
                    y: range.y,
                    borderColor: range.borderColor,
                    label: {
                        borderColor: range.borderColor,
                        style: { color: '#fff', background: range.borderColor },
                        text: range.label.text
                    }
                }))
            };

            options.fill = {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.9,
                    stops: [0, 100]
                }
            };
        }
    }

    chart = new ApexCharts(chartElement, { series, ...options });
    chart.render();
}
    function getTextWidth(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = getComputedStyle(document.body).font;
        return context.measureText(text).width;
    }

    function updateNavPanelWidth() {
        if (browser && vitalTypes.length > 0) {
            const longestLabelWidth = Math.max(...vitalTypes.map(getTextWidth));
            navPanelWidth = `${longestLabelWidth + 40}px`; // 20px padding on each side
        }
    }

    $: selectedVitals = groupedObservations[selectedVitalType] || [];
    $: sortedVitals = selectedVitals.sort((a, b) => new Date(b.effectiveDateTime) - new Date(a.effectiveDateTime));
    $: if (browser && ApexCharts && selectedVitalType && sortedVitals.length > 1 && chartElement) {
        renderChart();
    }
    $: if (browser && vitalTypes.length > 0) {
        updateNavPanelWidth();
    }

    function addVital () {

    }

</script>

<div class="vitals-container">
    <nav class="navigation-panel" style="width: {navPanelWidth}">
        <h2>Vital Types</h2>
        <ul>
            {#each vitalTypes as type}
                <li>
                    <button
                        class:active={type === selectedVitalType}
                        on:click={() => selectVitalType(type)}
                    >
                        {type}
                    </button>
                </li>
            {/each}
        </ul>
    </nav>
    <div class="content-panel">
        <div class="header">
            <!-- <h2>Vitals: {selectedVitalType}</h2> -->
            <button on:click={refreshVitals} disabled={isRefreshing}>
                {#if isRefreshing}
                    <div class="spinner"></div>
                    Refreshing...
                {:else}
                    Refresh From Server
                {/if}
            </button>
        </div>
        {#if browser && sortedVitals.length > 1}
            <div id="chart" bind:this={chartElement}></div>
        {/if}
        {#if sortedVitals.length > 0}
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Value</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {#each sortedVitals as vital}
                        <tr>
                            <td>{formatDate(vital.effectiveDateTime)}</td>
                            <td>
                                {#if vital.valueQuantity}
                                {vital.valueQuantity.value}
                                {#if vital.valueQuantity.unit}
                                    {vital.valueQuantity.unit}
                                {/if}
                            {:else if vital.component}
                                {vital.component.map(c => 
                                    `${c.code.text}: ${
                                        c.valueQuantity 
                                            ? `${c.valueQuantity.value}${c.valueQuantity.unit ? ` ${c.valueQuantity.unit}` : ''}`
                                            : 'N/A'
                                    }`
                                ).join(', ')}
                            {:else if vital.dataAbsentReason}
                                Data Absent Reason: {vital.dataAbsentReason.coding[0].display}
                            {:else if vital.valueString}
                                Result: {vital.valueString}
                            {:else}
                                N/A
                            {/if}
                            </td>
                            <td>{vital.status}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {:else}
            <p>No data available for {selectedVitalType}.</p>
        {/if}

        <button class="add-vital-button" on:click={toggleAddVitalsPopup}>
            Add Vital: {selectedVitalType}
        </button>
    </div>
</div>

{#if showAddVitalsPopup}
    <div class="popup-overlay active">
        <div class="popup-content">
            <AddVitals 
                on:addVital={handleAddVital} 
                on:close={handleClosePopup}
            />
        </div>
    </div>
{/if}


<style>

/*     :global(:root) {
      --smart-color-background: #edeae3;
      --smart-color-error: #9e2d2d;
      --smart-color-highlight: #69b5ce;
      --smart-color-modal-backdrop: rgba(0, 0, 0, 0.5);
      --smart-color-success: #498e49;
      --smart-color-text: #303030;
      --smart-border-radius: 6px;
      --smart-font-size: 13px;
      --smart-spacing-size: 20px;
      --smart-font-family-body: Georgia, Times, 'Times New Roman', serif;
      --smart-font-family-heading: 'HelveticaNeue-Light', Helvetica, Arial, 'Lucida Grande', sans-serif;
    } */

    .vitals-container {
        display: flex;
        height: 100%;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }
    .navigation-panel {
        padding: 1em;
        border-right: 1px solid #ddd;
        box-sizing: border-box;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }
    .navigation-panel ul {
        list-style-type: none;
        padding: 0;
    }
    .navigation-panel li {
        margin-bottom: 0.5em;
    }
    .navigation-panel button {
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        padding: 0.5em;
        cursor: pointer;
        font-size: 1em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }
    .navigation-panel button.active {
        background-color: #f0f0f0;
        font-weight: bold;
    }
    .content-panel {
        flex-grow: 1;
        padding: 1em;
        overflow-x: auto;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1em;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }
    .header button {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 0.5em 1em;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    .header button:hover {
        background-color: #45a049;
    }
    .header button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 0.5em;
        text-align: left;
    }
    th {
        background-color: #f2f2f2;
    }
    #chart {
        margin-bottom: 1em;
    }
    .add-vital-button {
        margin-top: 1em;
        padding: 0.5em 1em;
        background-color: #4CAF50;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 1em;
    }

    .add-vital-button:hover {
        background-color: #45a049;
    }

    .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition: opacity 1s ease, visibility 1s ease;
}

.popup-overlay.active {
    opacity: 1;
    visibility: visible;
}

.popup-content {
    background-color: white;
    padding: 2em;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 1s ease, transform 1s ease;
}

.popup-overlay.active .popup-content {
    opacity: 1;
    transform: translateY(0);
}



</style>