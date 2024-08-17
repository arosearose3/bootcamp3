<script>
    import { onMount } from 'svelte';
  
    let stylesLoaded = false;
  
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
        stylesLoaded = true;
      } else {
        console.error('Failed to fetch smart styles');
      }
    }
  
    onMount(fetchAndApplySmartStyles);
  </script>
  
  {#if stylesLoaded}
    <div class="style-test">
      <h1>StyleTest</h1>
      <p>This is body text.</p>
      <div class="color-samples">
        <div class="color-sample error">Error Color</div>
        <div class="color-sample highlight">Highlight Color</div>
        <div class="color-sample success">Success Color</div>
      </div>
      <div class="modal">
        <div class="modal-content">Modal Content</div>
      </div>
      <div class="spacing-sample">Spacing Sample</div>
    </div>
  {:else}
    <div class="loading">Loading styles...</div>
  {/if}
  
  <style>
    :global(:root) {
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
    }
  
    .style-test {
      width: 100%;
      min-height: 100vh;
      padding: 20px;
      background-color: var(--smart-color-background);
      color: var(--smart-color-text);
      font-family: var(--smart-font-family-body);
      font-size: var(--smart-font-size);
    }
  
    h1 {
      font-family: var(--smart-font-family-heading);
    }
  
    .color-samples {
      display: flex;
      justify-content: space-between;
      margin-top: var(--smart-spacing-size);
    }
  
    .color-sample {
      padding: 10px;
      border-radius: var(--smart-border-radius);
    }
  
    .error {
      background-color: var(--smart-color-error);
      color: white;
    }
  
    .highlight {
      background-color: var(--smart-color-highlight);
      color: black;
    }
  
    .success {
      background-color: var(--smart-color-success);
      color: white;
    }
  
    .modal {
      position: relative;
      width: 100%;
      height: 100px;
      background-color: var(--smart-color-modal-backdrop);
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: var(--smart-spacing-size);
    }
  
    .modal-content {
      background-color: var(--smart-color-background);
      padding: 10px;
      border-radius: var(--smart-border-radius);
    }
  
    .spacing-sample {
      margin-top: var(--smart-spacing-size);
      padding: var(--smart-spacing-size);
      border: 1px solid var(--smart-color-text);
    }
  
    .loading {
      width: 100%;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f0f0f0;
      color: #333333;
    }
  </style>