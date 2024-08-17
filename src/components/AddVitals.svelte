<script>
    import { createEventDispatcher } from 'svelte';
    import { fetchVitals, patient } from '$stores/patientStore.js';
    import { get } from 'svelte/store';

    const dispatch = createEventDispatcher();

    let temperatureValue = '';
    let temperatureUnit = 'degC';
    let isLoading = false;

    async function addTemperature() {
        if (!temperatureValue) {
            alert('Please enter a temperature value.');
            return;
        }

        const patientId = get(patient);
        if (!patientId) {
            alert('Patient ID is not set. Cannot add temperature.');
            return;
        }

        const observation = {
            patientId,
            temperature: parseFloat(temperatureValue),
            effectiveDateTime: new Date().toISOString()
        };

        isLoading = true;

        try {
            const response = await fetch('http://localhost:5173/api/insert_vital', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(observation),
                credentials: 'include'
            });

            if (response.ok) {
                alert('Temperature added successfully!');
                temperatureValue = '';
                // await fetchVitals();
                dispatch('addVital');
                dispatch('close');  // Close the popup after successful submission
            } else {
                const errorData = await response.json();
                console.error('Error adding temperature:', errorData);
                alert(`Failed to add temperature: ${errorData.issue?.[0]?.diagnostics || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error adding temperature:', error);
            alert('An error occurred while adding the temperature.');
        } finally {
            isLoading = false;
        }
    }

    function closePopup() {
        dispatch('close');
    }
</script>

<div class="add-vitals">
    <h2>Add New Temperature</h2>
    <input type="number" bind:value={temperatureValue} placeholder="Temperature" step="0.1" />
    <!-- <input type="text" bind:value={temperatureUnit} readonly /> -->
    <div class="button-group">
        <button class="submit" on:click={addTemperature} disabled={isLoading}>
            {#if isLoading}
                <div class="spinner"></div>
            {:else}
                Submit
            {/if}
        </button>
        <button class="cancel" on:click={closePopup} disabled={isLoading}>Cancel</button>
    </div>
</div>

<style>
    .add-vitals {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    input {
        padding: 0.5em;
        font-size: 1em;
    }

    .button-group {
        display: flex;
        justify-content: space-between;
    }

    button {
        padding: 0.5em 1em;
        font-size: 1em;
        cursor: pointer;
        transition: background-color 0.1s;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .submit {
        background-color: #4CAF50;
        color: white;
        border: none;
    }

    .submit:hover:not(:disabled) {
        background-color: #45a049;
    }

    .submit:active:not(:disabled) {
        background-color: #3d8b40;
    }

    .cancel {
        background-color: #f44336;
        color: white;
        border: none;
    }

    .cancel:hover:not(:disabled) {
        background-color: #d32f2f;
    }

    .cancel:hover:not(:disabled) {
        background-color: #b71c1c;
    }

    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        vertical-align: middle;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>