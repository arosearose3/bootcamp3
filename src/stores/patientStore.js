import { writable } from 'svelte/store';
import axios from 'axios';
import { get } from 'svelte/store';

// Create writable stores for each piece of data you want to keep
export const patient = writable(null);
export const needPatientBanner = writable(false);
export const encounter = writable(null);
export const user = writable(null);
export const username = writable(null);
export const vitals = writable([]); // Store to hold vitals data

// Function to update the stores based on the token response
export function setAuthData(authData) {
    patient.set(authData.patient);
    needPatientBanner.set(authData.needPatientBanner);
    encounter.set(authData.encounter);
    user.set(authData.user);
    username.set(authData.username);
}

// Function to fetch vitals from an API
export async function fetchVitals() {
    const patientId = get(patient);

    if (!patientId) {
        console.log('Vitals Not Retrieved: Patient ID is not set.');
        vitals.set([]); // Set vitals to an empty array if patient ID is not available
        return;
    }

    try {
      //  const response = await axios.get(`/api/fhir/Observation?patient=${patientId}&code=8302-2`);
      //8302-2 is body height
        const response = await axios.get(`/api/fhir/Observation?patient=${patientId}&category=vital-signs`);
        
        if (response.data.length === 0) {
            vitals.set([]); // Set vitals to an empty array if the response is empty
        } else {
            vitals.set(response.data); // Otherwise, set the fetched data
        }
    } catch (error) {
        console.error('Error fetching vitals:', error);
        vitals.set([]); // Set vitals to an empty array on error
    }
}
