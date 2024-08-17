<script>
    import '../global.css';
	import PatientBanner from '$components/PatientBanner.svelte';
	import Vitals from '$components/Vitals.svelte';

    import { onMount } from 'svelte';
    import { patient, needPatientBanner, encounter, user, username } from '$stores/patientStore.js';
  import StyleTest from '../components/StyleTest.svelte';
    
    let showPatientBanner = false;
    let stylesApplied = false;

    function loadPatientDataFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);

        // Debugging: Log the contents of urlParams
        console.log('URL Parameters:', Object.fromEntries(urlParams.entries()));

        // Set the Svelte stores with the values from urlParams
        patient.set(urlParams.get('patient'));
        needPatientBanner.set(urlParams.get('needPatientBanner') === 'true');
        encounter.set(urlParams.get('encounter'));
        user.set(urlParams.get('user'));
        username.set(urlParams.get('username'));

        // Debugging: Log the current values of the stores
        patient.subscribe(value => console.log('Patient store:', value));
        needPatientBanner.subscribe(value => console.log('Need Patient Banner store:', value));
        encounter.subscribe(value => console.log('Encounter store:', value));
        user.subscribe(value => console.log('User store:', value));
        username.subscribe(value => console.log('Username store:', value));
    }


async function fetchAndApplySmartStyles() {
  console.log('Fetching smart styles...');
  const response = await fetch('/api/smart-styles');
  if (response.ok) {
    const styles = await response.json();
    console.log('Fetched styles:', styles);
    Object.entries(styles).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--smart-${key}`, value);
      console.log(`Set --smart-${key} to ${value}`);
    });
    // Log computed styles after setting
    const computedStyle = getComputedStyle(document.documentElement);
    Object.keys(styles).forEach(key => {
      console.log(`Computed --smart-${key}:`, computedStyle.getPropertyValue(`--smart-${key}`));
    });
  } else {
    console.error('Failed to fetch smart styles');
  }
  stylesApplied = true;
}


    // Load the data when the component is mounted
    onMount(() => {
        loadPatientDataFromUrl();
        fetchAndApplySmartStyles();
    });

    // Subscribe to the needPatientBanner store
    $: showPatientBanner = $needPatientBanner;
</script>

<main class:styles-applied={stylesApplied}>
    <!-- <StyleTest/> -->

	{#if showPatientBanner}
		<PatientBanner />
	{/if}
	<Vitals />
 
</main>

<style>
      
	main {
		text-align: center;
		padding: 1em;
		max-width: 800px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>