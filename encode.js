function playCode(code) {
    codes = {
        1: [697, 1209],
        2: [697, 1336],
        3: [697, 1477],
        A: [697, 1633],
        4: [770, 1209],
        5: [770, 1336],
        6: [770, 1477],
        B: [770, 1633],
        7: [852, 1209],
        8: [852, 1336],
        9: [852, 1477],
        C: [852, 1633],
        S: [941, 1209],
        0: [941, 1336],
        X: [941, 1477],
        D: [941, 1633],
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
