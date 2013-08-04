/* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;
var recIndex = 0;

/* TODO:

- offer mono option
- "Monitor input" switch
*/

function saveAudio() {
    audioRecorder.exportWAV( doneEncoding );
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
}

function drawWave( buffers ) {
    var canvas = document.getElementById( "wavedisplay" );

    drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers[0] );
}

function doneEncoding( blob ) {
    Recorder.forceDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    recIndex++;
}

function toggleRecording( e ) {
    if (e.classList.contains("recording")) {
        // stop recording
        audioRecorder.stop();
        e.classList.remove("recording");
        audioRecorder.getBuffers( drawWave );
    } else {
        // start recording
        if (!audioRecorder)
            return;
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();
    }
}

function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

function cancelAnalyserUpdates() {
    window.webkitCancelAnimationFrame( rafID );
    rafID = null;
}

var codes = {
	"1": [697, 1209, "EMERGENCY!"],
        "2": [697, 1336, "Hi"],
        "3": [697, 1477, "Hello."],
        "4": [770, 1209, "Good"],
        "5": [770, 1336, "Bad."],
        "6": [770, 1477, "Yes."],
        "7": [852, 1209, "Come over here."],
        "8": [852, 1336, "Look at me."],
        "9": [852, 1477, "Where are you?"],
        "0": [941, 1336, "Did you get your objectice?"],
	"A": [697, 1633, "How are you?"],
	"B": [770, 1633, "No."],
	"C": [852, 1633, "I'm almost out of air."],
	"D": [941, 1633, "Let's go."],
	"*": [941, 1209, "We should return to the surface"],
	"#": [941, 1477, "Are you OK?"]
}
var counters = {
	"1": 0,
	"2": 0,
	"3": 0,
	"4": 0,
	"5": 0,
	"6": 0,
	"7": 0,
	"8": 0,
	"9": 0,
	"0": 0,
	"A": 0,
	"B": 0,
	"C": 0,
	"D": 0,
	"*": 0,
	"#": 0
}

var smoothSpectrum = [];
for (i=0; i<1024; i++) smoothSpectrum[i] = 0;
		

function updateAnalysers(time) {
    if (!analyserContext) {
        var canvas = document.getElementById("analyser");
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        analyserContext = canvas.getContext('2d');
    }

    // analyzer draw code here
    {
        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(canvasWidth / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData); 

	// smooth spectrum
	for (i=0; i<1024; i++) {
		smoothSpectrum[i] = (0.8*smoothSpectrum[i]+0.2*freqByteData[i]);
	}
	freqByteData = smoothSpectrum;

	// frequency of each bin:
	// i * sampleRate / fftSize = freq
	// i * analyserNode.context.sampleRate
	factor = 1;
	delay = 70;
	function detect(frequency) {
		i = Math.round(frequency * analyserNode.fftSize / analyserNode.context.sampleRate);
		//return ((freqByteData[i] > factor*freqByteData[i+1]) || (freqByteData[i] > factor*freqByteData[i-1]));
		return (freqByteData[i] > factor*0.5*(freqByteData[i+1]+freqByteData[i-1]));
	}
	for (code in codes) {
		freqs = codes[code];
		if (detect(freqs[0]) && detect(freqs[1])) {
			counters[code] += 1;
			if (counters[code] > delay) {
				var node = document.getElementById("code");
				node.innerHTML = "<b>" + freqs[2] + "</b>";
			}
		} else {
			counters[code] = 0;
		}
	}

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.fillStyle = '#F6D565';
        analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );
            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
        }
    }
    
    rafID = window.webkitRequestAnimationFrame( updateAnalysers );
}

function toggleMono() {
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono( realAudioInput );
    }

    audioInput.connect(inputPoint);
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

//    audioInput = convertToMono( input );

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    audioRecorder = new Recorder( inputPoint );

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
    updateAnalysers();
}

function initAudio() {
        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    navigator.getUserMedia({audio:true}, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

window.addEventListener('load', initAudio );
