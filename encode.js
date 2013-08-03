function playCode(code) {
    codes = {
        1: [577, 1209],
        2: [577, 1336],
        3: [577, 1477],
        A: [577, 1633],
        4: [632, 1209],
        5: [632, 1336],
        6: [632, 1477],
        B: [632, 1633],
        7: [697, 1209],
        8: [697, 1336],
        9: [697, 1477],
        C: [697, 1633],
        S: [770, 1209],
        0: [770, 1336],
        X: [770, 1477],
        D: [770, 1633],
    }

    var audio = new Audio();
    var wave = new RIFFWAVE();

    wave.header.sampleRate = 10000;
    wave.header.numChannels = 1;

    freq1 = codes[code][0];
    freq2 = codes[code][1];

    duration = 10;  // seconds
    data = [];
    i = 0;
    while (i < duration*wave.header.sampleRate) {
        data[i++] = 128+Math.round(127*Math.sin(6.2830*i*freq1/(wave.header.sampleRate-1)));
        data[i++] = 128+Math.round(127*Math.sin(6.2830*i*freq2/(wave.header.sampleRate-1)));
    }

    wave.Make(data);
    audio.src = wave.dataURI;
    audio.play();
}
