const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const audioPlayback = document.getElementById('audioPlayback');
const resultUl = document.getElementById('result-ul');
let recordingTimeout;

let recorder;
let audioBlob;
let gumStream;

function stopRecording() {
    if (recorder && recorder.recording) {
        recorder.stop(); // Stop the recording
        gumStream.getAudioTracks()[0].stop(); // Stop the audio stream
        clearTimeout(recordingTimeout); // Clear the timeout
        processRecording(); // Process the recording after stopping
    }
}

startBtn.addEventListener('click', async () => {
    // Clear old search results
    clearSearchResults();
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // Get the user's microphone input
    gumStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const input = audioContext.createMediaStreamSource(gumStream);

    recorder = new Recorder(input, { numChannels: 1 });

    recorder.record();

    // Automatically stop recording after 20 seconds
    recordingTimeout = setTimeout(stopRecording, 15000);
});

stopBtn.addEventListener('click', () => {
    stopRecording();
});

playBtn.addEventListener('click', () => {
    audioPlayback.play();
});

function processRecording() {
    startBtn.disabled = false;
    stopBtn.disabled = true;

    // Export the recording to a Blob
    recorder.exportWAV(async (blob) => {
        audioBlob = blob;
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
        playBtn.disabled = false;

        // Submit the audio to your backend API
        await submitToBackendAPI(audioBlob);
    });
}

async function submitToBackendAPI(audioBlob) {
    // Show the loading overlay
    document.getElementById('loadingOverlay').classList.add('active');

    try {
        // Convert the Blob to a File object with a proper name and type
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

        // Prepare the form data
        const formData = new FormData();
        formData.append('file', audioFile);

        // Send the audio file to the backend API
        const response = await fetch('https://api.sformer.tech/api/detect-song', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to send audio file to backend');
        }

        const result = await response.json();
        updateSearchResults(result);
    } catch (error) {
        console.error('Error with backend API:', error);
        const li = document.createElement("li");
        li.appendChild(document.createTextNode("No result"));
        resultUl.appendChild(li);
    } finally {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
}

function clearSearchResults() {
    resultUl.innerHTML = ''; // Clears all previous results
}

function updateSearchResults(result) {
    if (result && result.vids?.length) {
        for (const item of result.vids) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `https://youtube.com/watch?v=${item.id.videoId}`;
            a.textContent = item.snippet.title;
            a.target = '_blank';
            li.appendChild(a);
            resultUl.appendChild(li);
        }
    } else {
        const li = document.createElement("li");
        li.appendChild(document.createTextNode("No result"));
        resultUl.appendChild(li);
    }
}
