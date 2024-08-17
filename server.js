import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5173;
const svelteAppUrl = process.env.SVELTE_APP_URL || 'http://localhost:3000';

// CORS configuration
const corsOptions = {
  origin: svelteAppUrl,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// In-memory storage for SMART on FHIR state
const stateStore = new Map();

// Handle the initial launch request from the EHR
app.get('/', (req, res) => {
  const { iss, launch } = req.query;

  if (!iss || !launch) {
    // If no SMART parameters, redirect to the Svelte app
    return res.redirect(svelteAppUrl);
  }

  console.log('Received launch request:', { iss, launch });

  // Redirect to the SMART launch endpoint
  res.redirect(`/api/smart-launch?iss=${encodeURIComponent(iss)}&launch=${encodeURIComponent(launch)}`);
});

// SMART on FHIR launch endpoint
app.get('/api/smart-launch', async (req, res) => {
    const { iss, launch } = req.query;
  
    if (!iss || !launch) {
      return res.status(400).json({ error: 'Missing iss or launch parameter' });
    }
  
    console.log('Processing SMART launch:', { iss, launch });
  
    try {
      // Parse the iss URL
      const issUrl = new URL(iss);
      
      // Extract the parts of the path
      const pathParts = issUrl.pathname.split('/');
      
      // Find the index of 'r4' in the path
      const r4Index = pathParts.indexOf('r4');
      
      if (r4Index === -1 || r4Index === pathParts.length - 1) {
        throw new Error('Invalid iss URL structure');
      }
      
      // Get the client ID (assuming it's the part after 'r4')
      const clientId = pathParts[r4Index + 1];
      
      // Construct the wellKnownUrl
      const wellKnownUrl = new URL(`${issUrl.origin}/r4/${clientId}/.well-known/smart-configuration`);
      
      const { data: smartConfig } = await axios.get(wellKnownUrl.toString());
  
      const state = crypto.randomBytes(16).toString('hex');
      // Store iss, launch, and the SMART configuration in stateStore
      stateStore.set(state, { iss, launch, smartConfig });
  
      const authUrl = new URL(smartConfig.authorization_endpoint);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env.CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', `${process.env.SERVER_URL}/callback`);
     // authUrl.searchParams.append('scope', 'launch openid fhirUser Patient/*.read Patient/*.write');
     // authUrl.searchParams.append('scope', 'launch openid fhirUser Patient/[patient-id].read Patient/[patient-id].write');
      authUrl.searchParams.append('scope', 'launch openid fhirUser online_access user/Patient.read user/Observation.read user/Observation.write');
      
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('aud', iss);
      authUrl.searchParams.append('launch', launch);
  
      console.log('Authorization URL:', authUrl.toString());
  
      // Redirect the user to the authorization URL for OAuth2
      res.redirect(authUrl.toString());
  
    } catch (error) {
      console.error('Error in launch:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      }
      res.status(500).json({ error: 'An error occurred during launch' });
    }
  });
  

// SMART on FHIR callback endpoint to exchange token and get context
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
  
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }
  
    const storedState = stateStore.get(state);
    if (!storedState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
  
    console.log('Processing callback:', { code, state });
  
    try {
      // Extract the stored SMART configuration along with iss and launch
      const { iss, launch, smartConfig } = storedState;
  
      if (!smartConfig || !smartConfig.token_endpoint) {
        throw new Error('SMART configuration is missing or incomplete');
      }
  
      // Exchange the authorization code for an access token
      const tokenResponse = await axios.post(smartConfig.token_endpoint, new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.SERVER_URL}/callback`,
        client_id: process.env.CLIENT_ID
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
  
      console.log('Token response:', tokenResponse.data);
  
      const { access_token, refresh_token, expires_in, patient, need_patient_banner, smart_style_url,encounter, user, username } = tokenResponse.data;

     // console.log('Access Token:', access_token);
//console.log('Refresh Token:', refresh_token);
console.log('Expires In:', expires_in);
console.log('Patient ID:', patient);
console.log('Need Patient Banner:', need_patient_banner);
console.log('Encounter ID:', encounter);
console.log('User ID:', user);
console.log('Username:', username);
console.log('smart_style_url:', smart_style_url);

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: expires_in * 1000,
        sameSite: 'lax',
      });
  
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
  
      const smartStyles = await fetchSmartStyles(smart_style_url);
      if (smartStyles) {
        res.cookie('smart_styles', JSON.stringify(smartStyles), {
          httpOnly: false, // Allow client-side access
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000, // 1 day
          sameSite: 'lax',
        });
      }

      // Redirect to the Svelte app after successful authentication
      const redirectUrl = new URL(svelteAppUrl);
      redirectUrl.searchParams.append('patient', patient);
      redirectUrl.searchParams.append('needPatientBanner', need_patient_banner);
      redirectUrl.searchParams.append('encounter', encounter);
      redirectUrl.searchParams.append('user', user);
      redirectUrl.searchParams.append('username', username);
  
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Error in callback:', error);
      res.status(500).json({ error: 'An error occurred during token exchange' });
    } finally {
      stateStore.delete(state);
    }
  });

  
  async function fetchSmartStyles(styleUrl) {
    try {
      const response = await axios.get(styleUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching smart styles:', error);
      return null;
    }
  }
  
  app.get('/api/smart-styles', (req, res) => {
    const smartStyles = req.cookies.smart_styles;
    console.log('smartStyles:', smartStyles);
    if (smartStyles) {
      res.json(JSON.parse(smartStyles));
    } else {
      res.status(404).json({ error: 'Smart styles not found' });
    }
  });

//  endpoint for FHIR requests
app.use('/api/fhir', async (req, res) => {

  console.log('FHIR request:', { method: req.method, url: req.url, body: req.body });
 // console.log('cookies:', JSON.stringify(req.cookies, null, 2));

  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    console.log('in /api/fhir/, No access token available');
    return res.status(401).json({ error: 'No access token available' });
  }

  try {
    console.log (`url is: ${process.env.FHIR_SERVER_URL}${req.url}`);

    const axiosConfig = {
        method: req.method,
        url: `${process.env.FHIR_SERVER_URL}${req.url}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Conditionally add the data property if the method is not GET
      if (req.method !== 'GET') {
        axiosConfig.data = req.body;
      }
      
      //console.log('Axios Config:', JSON.stringify(axiosConfig, null, 2));

      // Make the axios call with the configured object
      const response = await axios(axiosConfig);

/*       console.log('FHIR request response:', {
        status: response.status,
        headers: response.headers,
        data: response.data,
      }); */

    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Implement token refresh logic here
      console.log('Token expired');
      res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Error in FHIR request:', error.response ? error.response.data : error.message);
      res.status(error.response ? error.response.status : 500).json(error.response ? error.response.data : { error: 'An error occurred' });
    }
  }
});


app.post('/api/insert_vital', async (req, res) => {
  console.log('Received payload:', JSON.stringify(req.body, null, 2));

  const {
      patientId,
      temperature,
      effectiveDateTime
  } = req.body;

  const observation = {
      "resourceType": "Observation",
      "status": "final",
      "category": [
          {
              "coding": [
                  {
                      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                      "code": "vital-signs",
                      "display": "Vital Signs"
                  }
              ],
              "text": "Vital Signs"
          }
      ],
      "code": {
          "coding": [
              {
                  "system": "http://loinc.org",
                  "code": "8331-1"
              }
          ],
          "text": "Temperature Oral"
      },
      "subject": {
          reference: `Patient/${patientId}`
      },
      "effectiveDateTime": effectiveDateTime,
      "valueQuantity": {
          "value": temperature,
          "unit": "degC",
          "system": "http://unitsofmeasure.org",
          "code": "Cel"
      }
  };

  console.log('Observation to be sent:', JSON.stringify(observation, null, 2));

  try {
      const response = await axios({
          method: 'POST',
          url: `${process.env.FHIR_SERVER_URL}/Observation`,
          headers: {
              'Authorization': `Bearer ${req.cookies.access_token}`,
              'Content-Type': 'application/json'
          },
          data: observation
      });

      console.log('Temperature inserted successfully:', response.data);
      res.status(201).json(response.data);
  } catch (error) {
      console.error('Error inserting temperature:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      res.status(error.response ? error.response.status : 500).json(error.response ? error.response.data : { error: 'An error occurred while inserting the temperature' });
  }
});

app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
  console.log(`Redirecting to Svelte app at ${svelteAppUrl}`);
});