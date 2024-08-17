<script>
    import { onMount } from 'svelte';
    import { patient } from '../stores/patientStore.js';
    
    let patientId = '';
    let oxygenFlowRate = '';
    let fio2 = '';
    let spo2 = '';
    let effectiveDateTime = '';
    
    $: if ($patient) {
        patientId = $patient;
    }
    
    async function submitVital() {
        const url = '/api/insert_vital';
        
        const payload = {
            patientId,
            oxygenFlowRate: parseFloat(oxygenFlowRate),
            fio2: parseFloat(fio2),
            spo2: parseFloat(spo2),
            effectiveDateTime
        };
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const result = await response.json();
            console.log('Vital sign submitted successfully:', result);
            
            // Clear the form
            oxygenFlowRate = '';
            fio2 = '';
            spo2 = '';
            
            alert('Vital sign submitted successfully!');
        } catch (error) {
            console.error('Error submitting vital sign:', error);
            alert('Error submitting vital sign. Please try again.');
        }
    }
    
    onMount(() => {
        effectiveDateTime = new Date().toISOString().slice(0, 16); // Format for datetime-local input
    });
    </script>
    
    <div class="container">
        <h2>Enter Pulse Oximetry Data</h2>
        <form on:submit|preventDefault={submitVital}>
            <div class="form-group">
                <label for="patientId">Patient ID:</label>
                <input type="text" id="patientId" bind:value={patientId} readonly>
            </div>
            <div class="form-group">
                <label for="oxygenFlowRate">Oxygen Flow Rate (L/min):</label>
                <input type="number" id="oxygenFlowRate" bind:value={oxygenFlowRate} step="0.1" required>
            </div>
            <div class="form-group">
                <label for="fio2">FIO2 (%):</label>
                <input type="number" id="fio2" bind:value={fio2} min="0" max="100" required>
            </div>
            <div class="form-group">
                <label for="spo2">SpO2 (%):</label>
                <input type="number" id="spo2" bind:value={spo2} min="0" max="100" required>
            </div>
            <div class="form-group">
                <label for="effectiveDateTime">Effective Date and Time:</label>
                <input type="datetime-local" id="effectiveDateTime" bind:value={effectiveDateTime} required>
            </div>
            <button type="submit">Submit Vital Sign</button>
        </form>
    </div>
    
    <style>
        .container {
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
        }
        input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        input[readonly] {
            background-color: #f0f0f0;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
    </style>