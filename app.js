const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const audioPlayback = document.getElementById('audioPlayback');
const resultUl = document.getElementById('result-ul');

let mediaRecorder;
let audioChunks = [];
let audioBlob;

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

    mediaRecorder.onstop = async () => {
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
    startBtn.disabled = false;
    stopBtn.disabled = true;
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
        const response = await fetch('http://localhost:8080/api/detect-song', {
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
