let video = document.getElementById('video');
let isStreaming = false;
let socket;
let frameInterval;
let currentCount = 5;
let selectedWord = null;

// Video URL mapping for each word
const videoMap = {
    'hello': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'mother': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'how': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'are': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'you': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'Lets': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'go': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'to': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'park': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    'evening': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
};

const DEFAULT_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

// Update counter display
function updateCounter(value) {
    const counterElement = document.querySelector('.counter-value');
    counterElement.textContent = value;
    counterElement.classList.add('changed');
    setTimeout(() => counterElement.classList.remove('changed'), 500);
}

// Reset counter
function resetCounter() {
    currentCount = 5;
    updateCounter(currentCount);
}

// Update WebSocket URL
function updateServerUrl() {
    const newUrl = document.getElementById('serverUrl').value;
    if (socket) {
        socket.close();
    }
    // Always hide the modal and update the URL
    document.getElementById('urlModal').classList.add('hidden');
    openSocket(newUrl);
}

// Open WebSocket connection
function openSocket(url = null) {
    const serverUrl = url || document.getElementById('serverUrl').value;
    socket = new WebSocket(serverUrl);

    socket.onopen = () => {
        console.log('WebSocket connection established');
        streamFrames();
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const trimmedData = data.map(item => item.split('_')[0]);
        
        // Check if any of the received words match the selected word
        if (selectedWord && trimmedData.includes(selectedWord)) {
            if (currentCount > 0) {
                currentCount--;
                updateCounter(currentCount);
                
                if (currentCount === 0) {
                    // Play a success sound or show a completion message
                    console.log('Gesture sequence completed!');
                }
            }
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };

    socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
    };
}

// Start webcam and stream frames
function startWebcam() {
    if (!isStreaming) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                isStreaming = true;
                openSocket();
            })
            .catch(err => console.error('Error accessing webcam:', err));
    }
}

// Stop webcam and streaming
function stopWebcam() {
    if (isStreaming) {
        let stream = video.srcObject;
        let tracks = stream.getTracks();

        tracks.forEach(track => track.stop());
        video.srcObject = null;
        isStreaming = false;

        clearInterval(frameInterval);

        if (socket) {
            socket.close();
        }
    }
}

// Capture video frame and send it as Uint8Array
function captureAndSendFrame() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
        let arrayBuffer = await blob.arrayBuffer();
        let uint8Array = new Uint8Array(arrayBuffer);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(uint8Array);
        }
    }, 'image/jpeg', 0.8);
}

// Send frames at 30 FPS using WebSocket
function streamFrames() {
    frameInterval = setInterval(() => {
        if (isStreaming) {
            captureAndSendFrame();
        }
    }, 1000 / 30); // 30 FPS
}

// Dark Theme Logic
document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        let darkMode = localStorage.getItem("darkMode") === "true";

        function applyTheme() {
            document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
            themeToggle.textContent = darkMode ? "☀️" : "🌙";
        }

        themeToggle.addEventListener("click", () => {
            darkMode = !darkMode;
            localStorage.setItem("darkMode", darkMode);
            applyTheme();
        });

        applyTheme();
    }
});

// Handle word selection from side navigation
function selectWord(word) {
    selectedWord = word;
    resetCounter();
    
    // Update the selected word display
    document.getElementById('selectedWord').textContent = word;
    
    // Update active state in navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.textContent === word) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update and play the corresponding video
    const videoElement = document.getElementById('tutorialVideo');
    const videoUrl = videoMap[word];
    
    if (videoUrl) {
        videoElement.src = videoUrl;
        videoElement.load();
        videoElement.play().catch(error => {
            console.log("Video autoplay failed:", error);
        });
    }
}

// Add event listener for when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Show URL input modal
    document.getElementById('urlModal').classList.remove('hidden');
    
    // Start webcam automatically
    startWebcam();
    
    // Ensure default video is playing
    const videoElement = document.getElementById('tutorialVideo');
    videoElement.load();
    videoElement.play().catch(error => {
        console.log("Default video autoplay failed:", error);
        setTimeout(() => {
            videoElement.play().catch(err => console.log("Second autoplay attempt failed:", err));
        }, 1000);
    });
});
