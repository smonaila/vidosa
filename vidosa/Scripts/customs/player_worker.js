var segments = [];
var segCTS = [];

var getboxInf = function (boxInfBytes) {
    let boxView = new DataView(boxInfBytes);

    let boxSize = boxView.getUint32(0);
    let boxName = String.fromCharCode(boxView.getUint8(4)) + String.fromCharCode(boxView.getUint8(5)) + String.fromCharCode(boxView.getUint8(6)) + String.fromCharCode(boxView.getUint8(7));

    return { size: boxSize, name: boxName };
}

// return all the boxes inside the initialization segment.
var getallBoxes = function (segment) {
    let arrayInts = new Uint8Array(segment);
    let boxes = [];

    let boxOffset = 0;
    do {
        let boxInf = getboxInf(segment.slice(boxOffset, boxOffset + 8));

        let boxSize = boxInf.size;
        let boxName = boxInf.name;

        // console.log("boxName: " + boxName + " boxSize: " + boxSize);
        boxes.push({ name: boxName, size: boxSize, offset: boxOffset });
        boxOffset += boxSize;
    } while (boxOffset < arrayInts.length);
    return boxes;
}

// calculate the composition time of each sample in a segment
var getCompositionTime = function (moofbox, sidxbox) {
    let children = this.children(moofbox);
    let fun = null;

    // workout the initialization segment in case you need it.
    let init = segments.find(function (seg) {
        return seg.name === "init";
    });
    let initBuffer = init.content;

    // get all the boxes inside the initialization segment.
    let initBoxes = getallBoxes(initBuffer);

    // get the moov box from initialization
    let moovBox = initBoxes.find(function (box) {
        return box.name === "moov";
    });

    // get all the children of moov box
    let moovChildren = this.children(initBuffer.slice(moovBox.offset, moovBox.offset + moovBox.size));

    // get the trex with the default_duration for the samples
    let mvexoffsets = moovChildren.find(function (b) {
        return b.name === "mvex";
    });

    // get all the children of mvex box.
    let mvexChildren = this.children(initBuffer.slice(moovBox.offset, moovBox.offset + moovBox.size).slice(mvexoffsets.offset, mvexoffsets.offset + mvexoffsets.size));

    // get the buffer for mvex
    let mvexBuffer = initBuffer.slice(moovBox.offset, moovBox.offset + moovBox.size).slice(mvexoffsets.offset, mvexoffsets.offset + mvexoffsets.size);
    let trexs = mvexChildren.filter(function (mvc) { return mvc.name === "trex" });
    let trafs = children.filter(function (box) {
        return box.name === "traf";
    });

    let sidxInf = getboxInf(sidxbox.slice(0, 8));

    let decodeTime = 0;

    for (var i = 0; i < trafs.length; i++) {
        // console.log("===================== Traf Number " + (i + 1) + " Information ===========================");
        let trafChildren = this.children(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size));

        let tfdtinf = trafChildren.find(function (box) {
            return box.name === "tfdt";
        });

        fun = this[sidxInf.name];
        let sidxCon = fun(sidxbox);
        let ts = sidxCon.timescale;

        fun = this[tfdtinf.name];
        decodeTime = fun(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size).slice(tfdtinf.offset, tfdtinf.offset + tfdtinf.size));

        // console.log("BaseMediaDecodeTime: " + decodeTime.baseMediaDecodeTime + "\tcalculated dts: " + decodeTime.baseMediaDecodeTime / ts);

        // trun
        let trunoffsets = trafChildren.filter(function (trun) {
            return trun.name === "trun";
        });

        // tfhd
        let tfhdoffsets = trafChildren.find(function (tfhd) {
            return tfhd.name === "tfhd";
        });

        for (var trunIndex = 0; trunIndex < trunoffsets.length; trunIndex++) {
            fun = this[trunoffsets[trunIndex].name];
            let trunCon = fun(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size).slice(trunoffsets[trunIndex].offset, trunoffsets[trunIndex].offset + trunoffsets[trunIndex].size));

            fun = this[tfhdoffsets.name];
            let tfhdCon = fun(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size).slice(tfhdoffsets.offset, tfhdoffsets.offset + tfhdoffsets.size));

            // Sum of all the previous samples.
            let smplduration = 0;

            let ctrex = trexs.find(function (trex) {
                fun = this[trex.name];
                let trexCon = fun(mvexBuffer.slice(trex.offset, trex.offset + trex.size));
                if (trexCon.trackID === tfhdCon.trackId) {
                    return trex;
                }
            });

            // array of composition times for each sample
            let ctcontent = { trackId: "", ct: [] };

            for (var sampleIndex = 1; sampleIndex <= trunCon.sample_count; sampleIndex++) {
                // Composition Time of the current sample.
                let cntSmpCT = (decodeTime.baseMediaDecodeTime / ts) +
                    (smplduration += (trunCon.tr_flags & 0x000004 === 4) ? ((fun(mvexBuffer.slice(ctrex.offset, ctrex.offset + ctrex.size)).default_sample_duration) / ts) : (trunCon.sample_duration / ts)) +
                    (trunCon.composite_time_offset / ts);

                // console.log("TrackId: " + tfhdCon.trackId + " composition time sample " + sampleIndex + " = " + cntSmpCT + ", sample duration = " + smplduration);
                ctcontent.ct.push(cntSmpCT);
            }
            ctcontent.trackId = tfhdCon.trackId;
            let segDuration = ctcontent.ct[ctcontent.ct.length - 1] - ctcontent.ct[0];

            // console.log("Segment Duration: " + segDuration);
        }
        // console.log("===================== End Traf Number " + (i + 1) + " Information ===========================");
    }
    // console.log("Done with the previous MOOF!");
}

// calculate the duration of each segment
var getSegDuration = function (currSeg) {

}

var free = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    //console.log("====== free printing ======");
    //console.log("boxName: " + boxName);
    //console.log("boxSize: " + boxSize);
    //console.log("====== free end printing ======");
}

var ftyp = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== ftyp printing ======");
    // console.log("box Name = " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== ftyp end printing ======");

    // create a view for the ftype box
    let ftypView = new DataView(box, 0, boxSize);
    let major_brand = String.fromCharCode(ftypView.getInt8(8)) + String.fromCharCode(ftypView.getInt8(9)) + String.fromCharCode(ftypView.getInt8(10)) + String.fromCharCode(ftypView.getInt8(11));
    let minor_version = ftypView.getInt32(13);

    let com_brands = String.fromCharCode(ftypView.getInt8(16)) +
        String.fromCharCode(ftypView.getInt8(17)) + String.fromCharCode(ftypView.getInt8(18)) +
        String.fromCharCode(ftypView.getInt8(19)) + ";";

    com_brands += String.fromCharCode(ftypView.getInt8(20)) + String.fromCharCode(ftypView.getInt8(21)) +
        String.fromCharCode(ftypView.getInt8(22)) + String.fromCharCode(ftypView.getInt8(23)) + ";";
    com_brands += String.fromCharCode(ftypView.getInt8(24)) + String.fromCharCode(ftypView.getInt8(25)) +
        String.fromCharCode(ftypView.getInt8(26)) + String.fromCharCode(ftypView.getInt8(27)) + ";";
    com_brands += String.fromCharCode(ftypView.getInt8(28)) + String.fromCharCode(ftypView.getInt8(29)) +
        String.fromCharCode(ftypView.getInt8(30)) + String.fromCharCode(ftypView.getInt8(31));

    // console.log("major_brand = " + major_brand + "\nminor_version = " + minor_version + "\ncompatible_brands = " + com_brands);
}

var mvhd = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== mvhd printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== mvhd end printing ======");
}

var trak = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== trak printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== trak end printing ======");
}

var moov = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== moov printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== moov end printing ======");

    let children = children(box);

    //console.log("moov children\n===================================");
    for (var i = 0; i < children.length; i++) {
        let nextChild = children[i];
        let fun = this[nextChild.name];
        fun(box.slice(nextChild.offset, nextChild.size + nextChild.offset));

        // console.log("Box Name: " + nextChild.name + "\nBox Size: " + nextChild.size, "\nOffset: " + nextChild.offset);
    }
    //console.log("moov children Ends\n===============================");
}

var sidx = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));
    let sidxView = new DataView(box);

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== sidx printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== sidx end printing ======");

    // console.log("Timescale in sidx = " +
    //    sidxView.getUint32(16) + " version = " +
    //    sidxView.getUint32(8) + " ReferenceId = " +
    //    sidxView.getUint32(12));

    let segInfo = {
        version: sidxView.getUint32(8),
        referenceId: sidxView.getUint32(12),
        timescale: sidxView.getUint32(16),
        ept: (sidxView.getUint32(8) === 0 ? sidxView.getUint32(20) : (sidxView.getUint32(20) + sidxView.getUint32(24))) / sidxView.getUint32(16),
        offset: sidxView.getUint32(8) === 0 ? sidxView.getUint32(24) : (sidxView.getUint32(28) + sidxView.getUint32(32)),
        reserved: sidxView.getUint32(8) === 0 ? sidxView.getInt16(28) : (sidxView.getUint16(36)),
        reference_count: sidxView.getUint32(8) === 0 ? sidxView.getInt16(30) : (sidxView.getInt16(38)),
        entryCount: []
    };

    let subSegInf = {
        reference_type: 0,
        reference_size: 0,
        sub_seg_duration: 0,
        starts_with_SAP: 0,
        contains_sap: 0,
        sap_delta_time: 0
    };

    let _1stSubseg_index = sidxView.getUint32(8) === 0 ? 32 : 40;

    // console.log("reference_count: " + segInfo.reference_count);
    for (var i = 0; i < segInfo.reference_count; i++) {
        subSegInf.reference_size = sidxView.getUint32(_1stSubseg_index);
        subSegInf.reference_type = sidxView.reference_size >>> 31;
        subSegInf.reference_size = sidxView.reference_size & 0x7fffffff;
        subSegInf.sub_seg_duration = sidxView.getUint32(_1stSubseg_index + 4) / segInfo.timescale;
        subSegInf.starts_with_SAP = ((sidxView.getUint32(_1stSubseg_index + 8)) >>> 31);
        subSegInf.contains_sap = (sidxView.getUint32(_1stSubseg_index + 8) << 1) >>> 28;
        subSegInf.sap_delta_time = (((sidxView.getUint32(_1stSubseg_index + 8)) << 1) << 3) / segInfo.timescale;

        segInfo.entryCount.push(subSegInf);

        // console.log("Current Subsegment duration: " + subSegInf.sub_seg_duration + " sap: " +
        //    subSegInf.contains_sap + " reference_type: " + subSegInf.reference_type + " sap_delta_time: " + subSegInf.sap_delta_time +
        //    " ept: " + segInfo.ept + " referenceId: " + segInfo.referenceId + " starts_with_SAP: " + subSegInf.starts_with_SAP);

        _1stSubseg_index += 8;
    }
    return segInfo;
}

var moof = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    //console.log("====== moof printing ======");
    //console.log("boxName: " + boxName);
    //console.log("boxSize: " + boxSize);
    //console.log("====== moof end printing ======");

    let children = children(box);

    //console.log("moof children\n===================================");
    for (var i = 0; i < children.length; i++) {
        let nextChild = children[i];

        let fun = this[nextChild.name];
        fun(box.slice(nextChild.offset, nextChild.size + nextChild.offset));
    }
    //console.log("moof children Ends\n===============================");
}

var traf = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== traf printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== traf end printing ======");

    let children = children(box);

    //console.log("traf children\n========================================");
    for (var i = 0; i < children.length; i++) {
        let nextChild = children[i];

        let fun = this[nextChild.name];
        fun(box.slice(nextChild.offset, nextChild.size + nextChild.offset));
    }
    // console.log("traf children End\n=====================================");
}

var tfhd = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    //console.log("====== tfhd printing ======");
    //console.log("boxName: " + boxName);
    //console.log("boxSize: " + boxSize);
    //console.log("====== tfhd end printing ======");

    let boxView = new DataView(box);

    // console.log("boxSize: " + boxSize);
    // console.log("TrackId: " + boxView.getInt32(12), "\ttf_flags: " + (boxView.getInt32(8)));

    return { trackId: boxView.getInt32(12) }
}

var tfdt = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== tfdt printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== tfdt end printing ======");

    let boxView = new DataView(box);
    return { baseMediaDecodeTime: boxView.getInt32(12) }
}

var sbgp = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== sbgp printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== sbgp end printing ======");
}

var trun = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));
    let trunBoxView = new DataView(box);

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== trun printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== trun end printing ======");

    // console.log("tr_flags: " + (trunBoxView.getUint32(8) & 0x000004) + "\tdata_offset: " + trunBoxView.getUint32(16) + "\tfirst_sample_flags: " + trunBoxView.getUint32(20) +
    //    "\tsample_duration: " + trunBoxView.getUint32(24) + "\tsample_size: " + trunBoxView.getUint32(28) + "\tsample_flags: " + trunBoxView.getUint32(32) +
    //    "\tcomposition_time_offset: " + trunBoxView.getUint32(36) + "\tsample_count: " + trunBoxView.getUint32(12));

    // console.log("Is the Composition Time Available? " + (trunBoxView.getUint32(8) & 0x000800));
    return {
        tr_flags: trunBoxView.getUint32(8),
        sample_count: trunBoxView.getUint32(12),
        data_offset: (trunBoxView.getUint32(8) & 0x000001) ? trunBoxView.getUint32(16) : 0,
        first_sample_flags: (trunBoxView.getUint32(8) & 0x000004) ? trunBoxView.getUint32(20) : 0,
        sample_duration: (trunBoxView.getUint32(8) & 0x000100) ? trunBoxView.getUint32(24) : 0,
        composite_time_offset: (trunBoxView.getUint32(8) & 0x000800) ? trunBoxView.getUint32(36) : 0
    }
}

var mfhd = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== mfhd printing ======");
    // console.log("boxName: " + boxName);
    // console.log("====== mfhd end printing ======");

    let mfhdView = new DataView(box.slice(12, boxSize));
    let sequence_number = mfhdView.getFloat32(0);

    // console.log("sequence_number: " + sequence_number);
    return { sequence_number: sequence_number };
}

var mvex = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== mvex printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== mvex end printing ======");

    let children = this.children(box);

    // console.log("Children of mvex box\n======================================");
    for (var i = 0; i < children.length; i++) {
        let nextChild = children[i];

        let fun = this[nextChild.name];
        fun(box.slice(nextChild.offset, nextChild.size + nextChild.offset));
    }
    // console.log("Children of mvex box\n======================================");
}

var trex = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    //console.log("====== trex printing ======");
    //console.log("boxName: " + boxName);
    //console.log("boxSize: " + boxSize);
    //console.log("====== trex end printing ======");

    let trexView = new DataView(box);

    //console.log("trackID: " + trexView.getUint32(12) + "\tdefault_sample_description_index: " + trexView.getUint32(16) +
    //    "\tdefault_sample_duration: " + trexView.getUint32(20) + "\tdefault_sample_size: " + trexView.getUint32(24) +
    //    "\tdefault_sample_flags: " + (trexView.getUint32(28) & 0x000020));

    return {
        trackID: trexView.getUint32(12),
        default_sample_description_index: trexView.getUint32(16),
        default_sample_duration: trexView.getUint32(20),
        default_sample_size: trexView.getUint32(24),
        default_sample_flags: trexView.getUint32(28)
    };
}

var mehd = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== mehd printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== mehd end printing ======");

    let mehdView = new DataView(box);

    // console.log("Fragment duration: " + mehdView.getUint32(8));
    return {
        fragment_duration: mehdView.getUint32(8)
    }
}

var mvhd = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== mvhd printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== mvhd end printing ======");
}

var mdat = function (box) {
    let boxInf = getboxInf(box.slice(0, 8));

    let boxSize = boxInf.size;
    let boxName = boxInf.name;

    // console.log("====== mdat printing ======");
    // console.log("boxName: " + boxName);
    // console.log("boxSize: " + boxSize);
    // console.log("====== mdat end printing ======");
}

// Read all the child boxes of the current box
var children = function (box) {
    let childboxSize = 0;
    let childboxOffset = 8;
    let boxView = new DataView(box);

    let currentBoxLength = boxView.getInt32(0);
    let boxCollection = [];

    do {
        let boxInf = getboxInf(box.slice(childboxOffset, childboxOffset + 8));

        let childboxName = boxInf.name;
        childboxSize = boxInf.size;
        boxCollection.push({ size: childboxSize, name: childboxName, offset: childboxOffset });
        childboxOffset += childboxSize;
    } while (childboxOffset < currentBoxLength);
    return boxCollection;
}

let checkConformence = function (segBuffer) {
    let arrayInts = new Uint8Array(segBuffer);
    let boxes = [];

    let boxOffset = 0;
    do {
        let boxInf = getboxInf(segBuffer.slice(boxOffset, boxOffset + 8));

        let boxSize = boxInf.size;
        let boxName = boxInf.name;

        boxes.push({ name: boxName, size: boxSize, offset: boxOffset });

        if (boxName === "ftyp") {
            let fun = this[boxName];
            segments.push({ name: "init", content: segBuffer });

            console.log("******** All Boxes You see under this belong to the same File***********");

            // postMessage({ segment: segBuffer, init: true });
        }

        if (boxName === "sidx") {
            let fun = this[boxName];
            fun(segBuffer.slice(boxOffset, boxOffset + boxSize));
        }

        // console.log("boxName: " + boxName + "\tboxSize: " + boxSize);

        //if (boxName === "mdat") {
        //    fun = this[boxName];
        //    fun(segBuffer.slice(boxOffset, boxOffset + boxSize));
        //    boxOffset += boxSize;
        //    return;
        //}

        if (boxName === "moof") {
            let sidxBoxes = boxes.filter(function (b) { return b.name === "sidx" });
            let sidxoffsets = null;
            let moofChildren = children(segBuffer.slice(boxOffset, boxSize + boxOffset));

            let trafs = moofChildren.filter(function (trafbox) {
                return trafbox.name === "traf";
            });

            // trafs childres
            let fun = this[boxName];
            let mooftrackId = 0;

            for (var i = 0; i < trafs.length; i++) {
                fun = this[trafs[i].name];
                let ctrafChildren = children(segBuffer.slice(boxOffset, boxSize + boxOffset).slice(trafs[i].offset, trafs[i].offset + trafs[i].size));

                let tfhd = ctrafChildren.find(function (trafchild) {
                    return trafchild.name === "tfhd";
                });

                let trafBuffer = segBuffer.slice(boxOffset, boxSize + boxOffset).slice(trafs[i].offset, trafs[i].offset + trafs[i].size);

                // set the function to point to the tfhd function and call it to get the trackId.
                fun = this[tfhd.name];
                mooftrackId = fun(trafBuffer.slice(tfhd.offset, tfhd.offset + tfhd.size)).trackId;

                // workout the trackId from the sidx box
                for (var sidxIndex = 0; sidxIndex < sidxBoxes.length; sidxIndex++) {
                    fun = this[sidxBoxes[sidxIndex].name];
                    let referenceId = fun(segBuffer.slice(sidxBoxes[sidxIndex].offset, sidxBoxes[sidxIndex].offset + sidxBoxes[sidxIndex].size)).referenceId;
                    if (referenceId === mooftrackId) {
                        getCompositionTime(segBuffer.slice(boxOffset, boxSize + boxOffset), segBuffer.slice(sidxBoxes[sidxIndex].offset, sidxBoxes[sidxIndex].offset + sidxBoxes[sidxIndex].size));
                    }
                }
            }
            boxOffset += boxSize;
        } else {
            boxOffset += boxSize;
        }
    } while (boxOffset < arrayInts.length);

    let ftype = boxes.find(function (b) {
        return b.name === "ftyp";
    });
    postMessage({ segment: segBuffer, init: ftype !== undefined ? true : false });
}

var rec_con = function (data) {    
    let arrayCon = data.content;
    let index = 0;
    let arrayInts = data.segment;

    // console.log("About to Merge Segments");

    for (var arrayIndex = 0; arrayIndex < arrayCon.length; arrayIndex++) {
        for (var i = 0; i < arrayCon[arrayIndex].length; i++) {
            arrayInts[index] = arrayCon[arrayIndex][i];
            index++;
        }
    }
    let blob = new Blob([arrayInts], { type: "video/mp4" })

    // console.log("About to read the blob ");
    let fileReader = new FileReader();
    fileReader.addEventListener("loadend", function (e) {     
        var content = fileReader.result;
        var getFtype = getallBoxes(content).find(function (b) {
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


