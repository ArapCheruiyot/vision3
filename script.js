const CLIENT_ID = '958416089916-mvdn670p5ugntc3i8b3mjad1rmmbao94.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let currentRole = '';

// Load GAPI and GIS
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.display = 'block';
    }
}

function handleRoleSelection() {
    currentRole = document.getElementById('role').value;
    if (currentRole === 'manager') {
        document.getElementById('managerSection').style.display = 'block';
        document.getElementById('downloadSection').style.display = 'block';
    } else if (currentRole === 'agent') {
        document.getElementById('managerSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'block';
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error) {
            throw resp;
        }
        document.getElementById('authorize_button').style.display = 'none';
        document.getElementById('signout_button').style.display = 'block';
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    document.getElementById('signout_button').style.display = 'none';
    document.getElementById('authorize_button').style.display = 'block';
}

function handleFileSelection() {
    const files = document.getElementById('file_input').files;
    const fileList = document.getElementById('file_list');
    fileList.innerHTML = '';
    for (let file of files) {
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        fileList.appendChild(listItem);
    }
}

async function uploadFiles() {
    if (currentRole !== 'manager') {
        alert('Only Managers can upload files.');
        return;
    }

    const files = document.getElementById('file_input').files;
    if (files.length === 0) {
        alert('Please select files to upload.');
        return;
    }
    for (let file of files) {
        const metadata = {
            'name': file.name,
            'mimeType': file.type,
        };
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
            body: formData,
        });
        if (response.ok) {
            alert(`File uploaded: ${file.name}`);
        } else {
            alert(`Failed to upload file: ${file.name}`);
        }
    }
}

async function listFiles() {
    const response = await gapi.client.drive.files.list({
        pageSize: 10,
        fields: 'files(id, name)',
    });
    const files = response.result.files;
    const downloadList = document.getElementById('download_list');
    downloadList.innerHTML = '';
    if (!files || files.length === 0) {
        downloadList.innerHTML = '<li>No files found.</li>';
        return;
    }
    files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${file.name} <a href="https://drive.google.com/uc?id=${file.id}" target="_blank">Download</a>`;
        downloadList.appendChild(listItem);
    });
}
