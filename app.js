const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const audioPlayback = document.getElementById('audioPlayback');
const resultUl = document.getElementById('result-ul');
let recordingTimeout;

let mediaRecorder;
let audioChunks = [];
let audioBlob;

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    // Clear the timeout to prevent it from stopping the recorder again
    recordingTimeout && clearTimeout(recordingTimeout);
}

startBtn.addEventListener('click', async () => {
    // Clear old search results
    clearSearchResults();
    startBtn.disabled = true;
    stopBtn.disabled = false;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    recordingTimeout = setTimeout(stopRecording, 20000);

    mediaRecorder.onstop = async () => {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
        playBtn.disabled = false;

        // Submit the audio to your backend API
        await submitToBackendAPI(audioBlob);
        audioChunks = [];
    };

    mediaRecorder.start();
});

stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();
});

playBtn.addEventListener('click', () => {
    audioPlayback.play();
});

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
    if (result && result.length) {
        for (const item of result) {
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
