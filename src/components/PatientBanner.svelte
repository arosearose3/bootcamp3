<script>
    import { onMount } from 'svelte';
    import { patient, needPatientBanner, encounter, user, username } from '$stores/patientStore.js';

    let patientData;
    let patientName = '';
    let patientDOB = '';
    let patientGender = '';
    let patientAddress = '';
    let patientMaritalStatus = '';
    let patientTelecom = [];
    let generalPractitioners = [];

    onMount(() => {
        const unsubscribe = patient.subscribe(async (patientId) => {
            if (!patientId) {
                console.log('Patient ID is null or undefined. Waiting for it to be set.');
                return;
            }

            try {
                console.log('Fetching patient data for patient ID:', patientId);

                const response = await fetch(`http://localhost:5173/api/fhir/Patient/${patientId}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                patientData = data;
                if (patientData) {
                    const name = patientData.name && patientData.name[0];
                    patientName = name ? `${name.given.join(' ')} ${name.family}` : 'N/A';
                    patientDOB = patientData.birthDate || 'N/A';
                    patientGender = patientData.gender || 'N/A';
                    patientMaritalStatus = patientData.maritalStatus?.text || 'N/A';

                    const address = patientData.address && patientData.address[0];
                    if (address) {
                        patientAddress = `${address.line.join(', ')}, ${address.city}, ${address.state} ${address.postalCode}`;
                    } else {
                        patientAddress = 'N/A';
                    }

                    patientTelecom = patientData.telecom ? patientData.telecom[0] : null;

                    generalPractitioners = patientData.generalPractitioner ? patientData.generalPractitioner.map(practitioner => {
                        return practitioner.display || 'N/A';
                    }) : [];
                } else {
                    console.log('No patient data found.');
                }
            } catch (error) {
                console.error('Error fetching patient data:', error);
            }
        });

        return () => {
            unsubscribe();
        };
    });
</script>

<div class="patient-banner">
    <div class="patient-info">
        <span class="patient-name">{patientName}</span>
        <span><strong>ID:</strong> {$patient}</span>
        <span><strong>DOB:</strong> {patientDOB}</span>
        <span><strong>Gender:</strong> {patientGender}</span>
        <span><strong>Marital Status:</strong> {patientMaritalStatus}</span>
        <span><strong>Address:</strong> {patientAddress}</span>
        <span><strong>Contact:</strong> {patientTelecom ? `${patientTelecom.system}: ${patientTelecom.value}` : 'N/A'}</span>
    </div>
    <div class="providers">
        <strong>Providers:</strong> {generalPractitioners.join(', ')}
    </div>
</div>

<style>
    .patient-banner {
        
        padding: 1em;
        border-radius: 5px;
        margin-bottom: 1em;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }

    .patient-info {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1em;
        margin-bottom: 0.5em;
        background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }

    .patient-name {
        font-weight: bold;
        font-size: 1.2em;
    }

    .providers {
        margin-top: 2em;
        text-align: left;
    }
</style>