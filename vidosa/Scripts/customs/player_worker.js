var segments = [];
var segCTS = [];

var getboxInf = function (boxInfBytes) {
    try {
        let boxView = new DataView(boxInfBytes);
        let boxSize = boxView.getUint32(0);
        let boxName = String.fromCharCode(boxView.getUint8(4)) + String.fromCharCode(boxView.getUint8(5)) + String.fromCharCode(boxView.getUint8(6)) + String.fromCharCode(boxView.getUint8(7));

        // console.log("BoxName = " + boxName);
        
        return { name: boxName, size: boxSize };
    } catch (e) {
        console.log("Error on the getInf method");
    }
}

var getBoxes = function (seg) {
    try {
        let arrayInts = new Uint8Array(seg);
        let boxes = [];
        let boxOffset = 0;
        var objSegInf = { validSeg: true, totalSize: 0 };

        do {
            let boxInf = getboxInf(seg.slice(boxOffset, boxOffset + 8));
            let boxSize = boxInf.size;
            let boxName = boxInf.name;
            objSegInf.validSeg = true;

            boxes.push({ name: boxName, size: boxSize, offset: boxOffset });
            boxOffset += boxSize;
            objSegInf.totalSize += boxSize;
        } while (boxOffset < arrayInts.length);
        return boxes;
    } catch (e) {
        console.log("Error on the checkingFile");
    }
}

var rec_con = function (data) {    
    let arrayCon = data.content;
    let index = 0;
    let arrayInts = data.Uint8Array;

    // console.log("ByteLength = "  + arrayInts.byteLength);
    // console.log("About to Merge Segments");

    for (var arrayIndex = 0; arrayIndex < arrayCon.length; arrayIndex++) {
        for (var i = 0; i < arrayCon[arrayIndex].length; i++) {
            arrayInts[index] = arrayCon[arrayIndex][i];
            index++;
        }
    }
    let blob = new Blob([arrayInts], { type: "video/mp4" });

    // console.log("About to read the blob ");
    let fileReader = new FileReader();
    fileReader.addEventListener("loadend", function (e) {     
        var content = fileReader.result;
        var getFtype = getBoxes(content).find(function (b) {
            return b.name === "ftyp";
        });
        var isInit = getFtype === undefined ? false : true;
        postMessage({ segment: fileReader.result, init: isInit });        
    });
    fileReader.readAsArrayBuffer(blob);
}

onmessage = function (event) {
    // console.log("Segment Received");
    rec_con(event.data);
}


