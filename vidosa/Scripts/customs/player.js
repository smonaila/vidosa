/// <reference path="../jquery-3.3.1.min.js" />
/// <reference path="../jquery.signalr-2.4.0.min.js" />

(function () {
    var mediaSource = null;
    var sourceBuffer = null;
    var vidplayer = $("#vidplayer")[0];
    var fileReader = new FileReader();
    var videoId = $("#videoId").val();
    var descvalue = document.getElementById("descvalue").value;
    var bandwidth = $("#bandwidth").val();
    var parentWindow = window.parent;
    var duration = null;
    var progressBar = $(".progress-buffered");
    var totalwidth = 0;
    var segments = [];
    var windowState = false;

    var mediaFile = null;
    var mfileView = null;

    var testVid = document.createElement("video");

    // A web worker for processing the video streams
    if (typeof (Worker) != "undefined") {
        if (typeof (player_worker) === "undefined") {
            player_worker = new Worker("/scripts/customs/player_worker.js");
        }
    }

    var isomediaStream = {
        streamId: ""
    };

    // waiting for more data.
    let waiting = function () {
        $(".loading-img").css({
            "display": "block"
        });
        console.log("Waiting for Buffer");
        fileContent.videoElement.waiting = true;
        fileContent.videoElement.playing = false;

        // if (fileContent.playerInitialized && !fileContent.isForceAppend) {
        //    console.log("Force Append Buffer");
        //    if (fileContent.byteOffset > fileContent.sliceOffset) {
        //        // fileContent._appendBuffer();
                
        //    }
        //    // fileContent.isForceAppend = true;
        // }
    }

    let getType = function (ftype) {
        let ftypView = new DataView(ftype);

        return String.fromCharCode(ftypView.getUint8(0)) + String.fromCharCode(ftypView.getUint8(1)) +
            String.fromCharCode(ftypView.getUint8(2)) + String.fromCharCode(ftypView.getUint8(3));
    }

    // Insert an Ad
    let playAd = function () {

    }

    // the segCounter is temporary for testing to move between an Ad and the currently playing video.
    let segCounter = 0;
    let resetParser = function (seg) {
        sourceBuffer.abort();
        sourceBuffer.mode = "sequence";
    }

    // Append Initialization Segment
    // let AppendInit = function (event) {
    //    if (vidplayer.currentTime > 0 && vidplayer.currentTime <= sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)) {
    //        buffer.push(event.data.segment);
    //    } else {
    //        console.log("First Init");
    //        sourceBuffer.appendBuffer(event.data.segment);
    //    }
    // }

    var children = function (box) {
        try {
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
        } catch (e) {
            console.log("Error on the children method");
        }
    }
    

    var mpdFile;
    var ads = [];
    var mvideo = {
        start: 0,
        duration: 0,
        isplaying: false,
        isEnded: false,
        currentTime: 0
    };

    var init_mpdfile = function (file) {
        mpdFile = file;
    }

    // Parse mpd presentation times
    var parsePDuration = function (dur) {
        let h = dur.split("PT")[1].split("H")[0];
        let m = dur.split("PT")[1].split("H")[1].split("M")[0];
        let s = dur.split("PT")[1].split("H")[1].split("M")[1].split("S")[0];

        // alert(h + ":" + m + ":" + s);
    }

    // compute durations
    var getDurations = function (dur) {

        let h = dur.split("PT")[1].split("H")[0];
        let m = dur.split("PT")[1].split("H")[1].split("M")[0];
        let s = dur.split("PT")[1].split("H")[1].split("M")[1].split("S")[0];

        return ((h * 60 * 60) + (m * 60) + (Math.floor(s)));
    }

    // object to hold the streaming file content.
    var fileContent = {
        processSeg: {
            boxes: ["sidx", "moov", "free", "mdat", "ftyp", "tref", "trak", "pdin", "mvhd", "tkhd",
                "edts", "elst", "mdia", "mdhd", "hdlr", "minf", "vmhd", "smhd", "hmhd", "nmhd",
                "dinf", "dref", "stbl", "stsd", "stts", "ctts", "stsc", "stsz", "stz2", "stco",
                "co64", "stss", "stsh", "padb", "stdp", "sdtp", "sbgp", "sgpd", "subs", "trep",
                "mvex", "mehd", "trex", "ipmc", "moof", "mfhd", "traf", "tfhd", "trun",
                "sdtp", "sbgp", "subs", "mfra", "tfra", "mfro", "mdat", "free", "skip", "iods",
                "udta", "cprt", "meta", "hdlr", "dinf", "dref", "iloc", "ipro", "tfdt",
                "sinf", "frma", "imif", "schm", "schi", "iinf", "xml ", "bxml", "pitm"],
            getboxInf: function (boxInfBytes) {
                try {
                    let boxView = new DataView(boxInfBytes);
                    let boxSize = boxView.getUint32(0);
                    let boxName = String.fromCharCode(boxView.getUint8(4)) + String.fromCharCode(boxView.getUint8(5)) + String.fromCharCode(boxView.getUint8(6)) + String.fromCharCode(boxView.getUint8(7));

                    var findBox = this.boxes.find(function (name) {
                        return name.trim() === boxName.trim();
                    });

                    var objBoxInf = {
                        size: boxSize, name: boxName, boxValid: true
                    };

                    if (findBox === null || findBox === undefined) {
                        objBoxInf.boxValid = false;
                        console.log("Unknown box " + boxName);
                    }
                    return objBoxInf;
                } catch (e) {
                    console.log("Error on the getInf method");
                }
            },
            isAppendable: function (seg) {
                var boxView = new DataView(seg);
                var boxesInf = this.getBoxes(seg);

                // console.log("byteLength = " + boxView.byteLength + " boxesLength = " + boxLength);
                if (!boxesInf.validSeg) {
                    console.log("This segment is Invalid");
                    console.log("byteLength = " + boxView.byteLength + " boxesLength = " + boxLength);
                    return false;
                }
                fileContent.getConformence(seg);
                return true;
            },
            Mp4Structure: {
                free: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== free printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== free end printing ======");
                },
                ftyp: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

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
                },
                mvhd: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== mvhd printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== mvhd end printing ======");
                },
                trak: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== trak printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== trak end printing ======");
                },
                moov: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== moov printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== moov end printing ======");

                    let children = children(box);

                    // console.log("moov children\n===================================");
                    for (var i = 0; i < children.length; i++) {
                        let nextChild = children[i];
                        let fun = this[nextChild.name];
                        fun(box.slice(nextChild.offset, nextChild.size + nextChild.offset));

                        // console.log("Box Name: " + nextChild.name + "\nBox Size: " + nextChild.size, "\nOffset: " + nextChild.offset);
                    }
                    // console.log("moov children Ends\n===============================");
                },
                sidx: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));
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
                        subSegInf.reference_size = subSegInf.reference_size & 0x7fffffff;
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
                },
                moof: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== moof printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== moof end printing ======");

                    let children = children(box);

                    //console.log("moof children\n===================================");
                    for (var i = 0; i < children.length; i++) {
                        let nextChild = children[i];

                        let fun = this[nextChild.name];
                        fun(box.slice(nextChild.offset, nextChild.size + nextChild.offset));
                    }
                    // console.log("moof children Ends\n===============================");
                },
                traf: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

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
                },
                tfhd: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

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
                },
                tfdt: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== tfdt printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== tfdt end printing ======");

                    let boxView = new DataView(box);
                    return { baseMediaDecodeTime: boxView.getInt32(12) }
                },
                sbgp: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== sbgp printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== sbgp end printing ======");
                },
                trun: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));
                    let trunBoxView = new DataView(box);

                    let byteIndex = 12;

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                     console.log("====== trun printing ======");
                     console.log("boxName: " + boxName);
                     console.log("boxSize: " + boxSize);
                     console.log("====== trun end printing ======");         

                    var trunObj = {
                        tr_flags: trunBoxView.getUint32(8),
                        sample_count: trunBoxView.getUint32(12),
                        data_offset: 0,
                        first_sample_flags: 0,
                        sample_duration: 0,
                        composite_time_offset: 0
                    }; 

                    byteIndex += (((trunBoxView.getUint32(8) & 0x000001) === 0x000001) ? 4 : 0);
                    trunObj.data_offset = (((trunBoxView.getUint32(8) & 0x000001) === 0x000001) ? trunBoxView.getUint32(byteIndex) : 0);
                    byteIndex += (((trunBoxView.getUint32(8) & 0x000004) === 0x000004) ? 4 : 0);
                    trunObj.first_sample_flags = (((trunBoxView.getUint32(8) & 0x000004) === 0x000004) ? trunBoxView.getUint32(byteIndex) : 0);
                    byteIndex += (((trunBoxView.getUint32(8) & 0x000100) === 0x000100) ? 4 : 0);
                    trunObj.sample_duration = (((trunBoxView.getUint32(8) & 0x000100) === 0x000100) ? trunBoxView.getUint32(byteIndex) : 0);
                    byteIndex += (((trunBoxView.getUint32(8) & 0x000800) === 0x000800) ? 4 : 0);
                    trunObj.composite_time_offset = (((trunBoxView.getUint32(8) & 0x000800) === 0x000800) ? trunBoxView.getUint32(byteIndex) : 0);

                    console.log("Is the Composition Time Available? " + ((trunBoxView.getUint32(8) & 0x000800) === 0x000800));
                    console.log("tr_flags: " + (trunBoxView.getUint32(8)) + "\nsample_count: " + (trunBoxView.getUint32(12)) + 
                        "\ndata_offset: " + trunObj.data_offset +
                        "\nfirst_sample_flags: " + trunObj.first_sample_flags)
                        + "\nsample_duration: " + trunObj.sample_duration
                        + "\ncomposite_time_offset: " + trunObj.composite_time_offset;

                    console.log("================== Start Printing Details ================================");
                    console.log("tr_flags: " + (trunObj.tr_flags) + "\tdata_offset: " +
                        trunObj.data_offset + "\tfirst_sample_flags: " +
                        trunObj.first_sample_flags +
                        "\tsample_duration: " + trunObj.sample_duration + "\tsample_count: " +
                        trunObj.sample_count);
                    console.log("=================== End Printing Details ==================================");

                    return trunObj;
                },
                mfhd: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== mfhd printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("====== mfhd end printing ======");

                    let mfhdView = new DataView(box.slice(12, boxSize));
                    let sequence_number = mfhdView.getFloat32(0);

                    // console.log("sequence_number: " + sequence_number);
                    return { sequence_number: sequence_number };
                },
                mvex: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

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
                },
                trex: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== trex printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== trex end printing ======");

                    let trexView = new DataView(box);

                    // console.log("trackID: " + trexView.getUint32(12) + "\tdefault_sample_description_index: " + trexView.getUint32(16) +
                    //    "\tdefault_sample_duration: " + trexView.getUint32(20) + "\tdefault_sample_size: " + trexView.getUint32(24) +
                    //    "\tdefault_sample_flags: " + (trexView.getUint32(28) & 0x000020));

                    return {
                        trackID: trexView.getUint32(12),
                        default_sample_description_index: trexView.getUint32(16),
                        default_sample_duration: trexView.getUint32(20),
                        default_sample_size: trexView.getUint32(24),
                        default_sample_flags: trexView.getUint32(28)
                    };
                },
                mehd: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

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
                },
                mvhd: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== mvhd printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== mvhd end printing ======");
                },
                mdat: function (box) {
                    let boxInf = fileContent.processSeg.getboxInf(box.slice(0, 8));

                    let boxSize = boxInf.size;
                    let boxName = boxInf.name;

                    // console.log("====== mdat printing ======");
                    // console.log("boxName: " + boxName);
                    // console.log("boxSize: " + boxSize);
                    // console.log("====== mdat end printing ======");
                },
            },
            getAllboxes: function (segment) {
                let arrayInts = new Uint8Array(segment);
                let objboxes = { isvalid: true, boxes: [] };

                let boxOffset = 0;
                do {
                    let boxInf = fileContent.processSeg.getboxInfo(segment.slice(boxOffset, boxOffset + 8));

                    if (boxInf.boxValid) {
                        let boxSize = boxInf.size;
                        let boxName = boxInf.name;

                        console.log("boxName: " + boxName + " boxSize: " + boxSize);
                        objboxes.boxes.push({ name: boxName, size: boxSize, offset: boxOffset });
                        boxOffset += boxSize;
                    } else {
                        console.log("Invalid box found");
                        objboxes.isvalid = false;
                        break;
                    }
                } while (boxOffset < arrayInts.length);
                return objboxes;
            },
            getboxInfo: function (bytes) {
                try {
                    let boxView = new DataView(bytes);
                    let boxSize = boxView.getUint32(0);
                    let boxName = String.fromCharCode(boxView.getUint8(4)) + String.fromCharCode(boxView.getUint8(5)) + String.fromCharCode(boxView.getUint8(6)) + String.fromCharCode(boxView.getUint8(7));
                    let regexExp = /[^A-Za-z0-9]/;

                    var findBox = fileContent.processSeg.boxes.find(function (name) {
                        return name.trim() === boxName.trim();
                    });

                    var objBoxInf = {
                        size: boxSize, name: boxName, boxValid: true
                    };

                    if (findBox === null || findBox === undefined) {
                        if (regexExp.test(objBoxInf.name)) {                                                        
                            console.log("The box may be valid but not on the list of box names: " +
                                objBoxInf.name + " boxSize = " + objBoxInf.size);
                            fileContent.segmentsInf.isProcessing = false;
                            fileContent.segmentsInf.loading = false;
                        } else {
                            objBoxInf.boxValid = false;
                            console.log("Invalid box " + boxName);
                        }
                    }
                    return objBoxInf;
                } catch (e) {
                    console.log("Error on the getInf method");
                }
            },
            getboxChildren: function (box) {
                let childboxSize = 0;
                let childboxOffset = 8;
                let boxView = new DataView(box);

                let currentBoxLength = boxView.getInt32(0);
                let objboxCollection = { isvalid: true, boxCollection: [] };

                do {
                    let boxInf = this.getboxInf(box.slice(childboxOffset, childboxOffset + 8));
                    if (boxInf.boxValid) {
                        let childboxName = boxInf.name;
                        childboxSize = boxInf.size;
                        objboxCollection.boxCollection.push({ size: childboxSize, name: childboxName, offset: childboxOffset });
                        childboxOffset += childboxSize;
                    } else {
                        objboxCollection.isvalid = false;
                        console.log("The segment may be incorrect");
                        break;
                    }
                } while (childboxOffset < currentBoxLength);
                return objboxCollection;
            },
            getFirstSample: function (moofbox, sidxbox, initseg) {
                let validColl = fileContent.processSeg.getboxChildren(moofbox);
                let children = [];

                if (validColl.isvalid) {
                    children = validColl.boxCollection;
                } else {
                    console.log("Segment corrupted!");
                    return;
                }
                
                let fun = null;

                let contentComponent = fileContent.mpdFile.querySelector("ContentComponent[contentType='video']");
                let initialization = fileContent.mpdFile.querySelector("Initialization");

                let contentId = contentComponent.getAttribute("id");
                let sampleEPT = {
                    ept: 0, trackId: 0,
                    lpt: 0, smplduration: 0,
                    isInit: false,
                    tr_flags: false,
                    default_sample_duration: 0,
                    sample_duration: 0,
                    timescale: 0,
                    baseMediaDecodeTime: 0,
                    composite_time_offset: 0
                };

                // workout the initialization segment in case you need it.
                // let init = segments.find(function (seg) {
                //    return seg.name === "init";
                // });

                // let initBuffer = initseg;

                // get all the boxes inside the initialization segment.
                let validCollection = fileContent.processSeg.getAllboxes(initseg);
                let initBoxes = [];
                if (validCollection.isvalid) {
                    initBoxes = validCollection.boxes;
                } else {
                    console.log("Init segment is Invalid");
                    return;
                }                
                 
                // get the moov box from initialization
                let moovBox = initBoxes.find(function (box) {
                    return box.name === "moov";
                });

                // get all the children of moov box
                let validmoov = fileContent.processSeg.getboxChildren(initseg.slice(moovBox.offset, moovBox.offset + moovBox.size));      
                let moovChildren = [];

                if (validmoov.isvalid) {
                    moovChildren = validmoov.boxCollection;
                } else {
                    console.log("MoovChildren invalid");
                    return;
                }

                // get the trex with the default_duration for the samples
                let mvexoffsets = moovChildren.find(function (b) {
                    return b.name === "mvex";
                });

                // get all the children of mvex box.
                let objmvexChildren = fileContent.processSeg.getboxChildren(initseg.slice(moovBox.offset, moovBox.offset + moovBox.size).slice(mvexoffsets.offset, mvexoffsets.offset + mvexoffsets.size));
                let mvexChildren = [];

                if (objmvexChildren.isvalid) {
                    mvexChildren = objmvexChildren.boxCollection;
                } else {
                    console.log("Mvex children not valid");
                    return;
                }

                // get the buffer for mvex
                console.log("Mvex buffer got!");
                let mvexBuffer = initseg.slice(moovBox.offset, moovBox.offset + moovBox.size).slice(mvexoffsets.offset, mvexoffsets.offset + mvexoffsets.size);
                let trexs = mvexChildren.filter(function (mvc) { return mvc.name === "trex" });
                let trafs = children.filter(function (box) {
                    return box.name === "traf";
                });

                let sidxInf = fileContent.processSeg.getboxInf(sidxbox.slice(0, 8));

                let decodeTime = 0;
                console.log("Number of Trafs = " + trafs.length);
                for (var i = 0; i < trafs.length && !sampleEPT.isInit; i++) {
                    // console.log("===================== Traf Number " + (i + 1) + " Information ===========================");
                    let objtrafChildren = fileContent.processSeg.getboxChildren(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size));
                    let trafChildren = [];

                    if (objtrafChildren.isvalid) {
                        trafChildren = objtrafChildren.boxCollection;
                    } else {
                        console.log("traf children are not valid!");
                        return;
                    }

                    let tfdtinf = trafChildren.find(function (box) {
                        return box.name === "tfdt";
                    });

                    fun = fileContent.processSeg.Mp4Structure[sidxInf.name];
                    let sidxCon = fun(sidxbox);
                    let ts = sidxCon.timescale;

                    fun = fileContent.processSeg.Mp4Structure[tfdtinf.name];
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
                    console.log("Trunoffset length = " + trunoffsets.length);
                    for (var trunIndex = 0; trunIndex < trunoffsets.length; trunIndex++) {
                        console.log("Getting the reference to the Trunoffsets!");
                        fun = fileContent.processSeg.Mp4Structure[trunoffsets[trunIndex].name];
                        console.log("Calling Trunoffsets!");
                        let trunCon = fun(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size).slice(trunoffsets[trunIndex].offset, trunoffsets[trunIndex].offset + trunoffsets[trunIndex].size));
                        console.log("Getting the reference to the tfhdoffsets!");
                        fun = fileContent.processSeg.Mp4Structure[tfhdoffsets.name];
                        console.log("Calling tfhdoffsets!");
                        let tfhdCon = fun(moofbox.slice(trafs[i].offset, trafs[i].offset + trafs[i].size).slice(tfhdoffsets.offset, tfhdoffsets.offset + tfhdoffsets.size));
                        console.log("Get the TrackId = " + tfhdCon.trackId + " contentId = " + parseInt(contentId));
                        if (tfhdCon.trackId === parseInt(contentId)) {
                            // Sum of all the previous samples.
                            let smplduration = 0;
                            console.log("Finding trex with the contentId");
                            let ctrex = trexs.find(function (trex) {
                                fun = fileContent.processSeg.Mp4Structure[trex.name];
                                let trexCon = fun(mvexBuffer.slice(trex.offset, trex.offset + trex.size));
                                if (trexCon.trackID === tfhdCon.trackId) {
                                    sampleEPT.trackId = tfhdCon.trackId;
                                    sampleEPT.isInit = true;
                                    return trex;
                                }
                            });
                            console.log("ctrex " + (ctrex === null || ctrex === undefined));
                            // array of composition times for each sample
                            let ctcontent = { trackId: "", ct: [] };

                            console.log("Sample Durations");
                            for (var sampleIndex = 1; sampleIndex <= trunCon.sample_count; sampleIndex++) {
                                // Composition Time of the current sample.
                                let cntSmpCT = (decodeTime.baseMediaDecodeTime / ts) +
                                    (smplduration += (trunCon.tr_flags & 0x000004 === 4) ? ((fun(mvexBuffer.slice(ctrex.offset, ctrex.offset + ctrex.size)).default_sample_duration) / ts) : (trunCon.sample_duration / ts)) +
                                    (trunCon.composite_time_offset / ts);

                                // console.log("TrackId: " + tfhdCon.trackId + " composition time sample " + sampleIndex + " = " + cntSmpCT + ", sample duration = " + smplduration);
                                ctcontent.ct.push(cntSmpCT);
                            }
                            console.log("TrackId: " + tfhdCon.trackId + " composition time sample " + 1 + " = " + ctcontent.ct[0]);
                            console.log("TrackId: " + tfhdCon.trackId + " composition time sample " + (ctcontent.ct.length - 1) + " = " + ctcontent.ct[ctcontent.ct.length - 1]);

                            ctcontent.trackId = tfhdCon.trackId;
                            let segDuration = ctcontent.ct[ctcontent.ct.length - 1] - ctcontent.ct[0];

                            sampleEPT.ept = ctcontent.ct[0];
                            sampleEPT.lpt = ctcontent.ct[ctcontent.ct.length - 1];
                            sampleEPT.tr_flags = trunCon.tr_flags & 0x000004 === 4;
                            sampleEPT.default_sample_duration = fun(mvexBuffer.slice(ctrex.offset, ctrex.offset + ctrex.size)).default_sample_duration;
                            sampleEPT.sample_duration = trunCon.sample_duration;
                            sampleEPT.timescale = ts;
                            sampleEPT.baseMediaDecodeTime = decodeTime.baseMediaDecodeTime;
                            sampleEPT.composite_time_offset = trunCon.composite_time_offset;
                            sampleEPT.smplduration = smplduration;
                        }
                    }
                }
                return sampleEPT;
            },
            getConformence: function (segment) {
                
                let segView = new DataView(segment);
                let boxOffset = 0;
                let contentComponent = fileContent.mpdFile.querySelector("ContentComponent[contentType='video']");
                let contentId = contentComponent.getAttribute("id");
                let objsampleEPT = { ept: 0, isinit: false, trackId: parseInt(contentId), isConforming: false };
                let boxes = [];

                do {
                    // getboxInf(segment.slice());                    
                    let boxInf = fileContent.processSeg.getboxInfo(segment.slice(boxOffset, boxOffset + 8));

                    if (boxInf.boxValid) {
                        let boxSize = boxInf.size;
                        let boxName = boxInf.name;

                        boxes.push({ name: boxName, size: boxSize, offset: boxOffset });

                        if (boxName === "ftyp") {
                            let fun = fileContent.processSeg.Mp4Structure[boxName];
                            objsampleEPT.isConforming = true;
                            fileContent.processSeg.getAllboxes(segment);
                            sourceBuffer.appendBuffer(segment);

                            return objsampleEPT;
                        }

                        if (boxName === "sidx") {
                            console.log("SIDX would be called!");

                            // let fun = fileContent.processSeg.Mp4Structure[boxName];
                            // fun(segment.slice(boxOffset, boxOffset + boxSize));
                        }

                        // console.log("boxName: " + boxName + "\tboxSize: " + boxSize);

                        // if (boxName === "mdat") {
                        //    fun = this[boxName];
                        //    fun(segBuffer.slice(boxOffset, boxOffset + boxSize));
                        //    boxOffset += boxSize;
                        //    return;
                        // }

                        if (boxName === "moof") {
                            let sidxBoxes = boxes.filter(function (b) { return b.name === "sidx" });
                            let sidxoffsets = null;                            

                            let objmoofChildren = fileContent.processSeg.getboxChildren(segment.slice(boxOffset, boxSize + boxOffset));
                            let moofChildren = [];                            

                            if (objmoofChildren.isvalid) {
                                moofChildren = objmoofChildren.boxCollection;
                            } else {
                                console.log("moofChildren are not valid!");
                                return;
                            }

                            let trafs = moofChildren.filter(function (trafbox) {
                                return trafbox.name === "traf";
                            });                            

                            // trafs children
                            let fun = fileContent.processSeg.Mp4Structure[boxName];
                            let mooftrackId = 0;

                            for (var i = 0; i < trafs.length && !objsampleEPT.isinit; i++) {
                                fun = fileContent.processSeg.Mp4Structure[trafs[i].name];

                                let objtrafChildren = fileContent.processSeg.getboxChildren(segment.slice(boxOffset, boxSize + boxOffset).slice(trafs[i].offset, trafs[i].offset + trafs[i].size));
                                let ctrafChildren = [];

                                if (objtrafChildren.isvalid) {
                                    ctrafChildren = objtrafChildren.boxCollection;
                                } else {
                                    console.log("Traf children not valid");
                                    return;
                                }

                                let tfhd = ctrafChildren.find(function (trafchild) {
                                    return trafchild.name === "tfhd";
                                });

                                let trafBuffer = segment.slice(boxOffset, boxSize + boxOffset).slice(trafs[i].offset, trafs[i].offset + trafs[i].size);

                                // set the function to point to the tfhd function and call it to get the trackId.
                                fun = fileContent.processSeg.Mp4Structure[tfhd.name];
                                mooftrackId = fun(trafBuffer.slice(tfhd.offset, tfhd.offset + tfhd.size)).trackId;

                                // workout the trackId from the sidx box
                                if (parseInt(objsampleEPT.trackId) === mooftrackId) {
                                    for (var sidxIndex = 0; sidxIndex < sidxBoxes.length && !objsampleEPT.isinit; sidxIndex++) {
                                        fun = fileContent.processSeg.Mp4Structure[sidxBoxes[sidxIndex].name];
                                        let referenceId = fun(segment.slice(sidxBoxes[sidxIndex].offset,
                                            sidxBoxes[sidxIndex].offset + sidxBoxes[sidxIndex].size)).referenceId;

                                        if (referenceId === mooftrackId) {
                                            let initialization = fileContent.mpdFile.querySelector("Initialization");
                                            let start = parseInt(initialization.getAttribute("range").split("-")[0]);
                                            let end = parseInt(initialization.getAttribute("range").split("-")[1]);
                                            let byteLength = (end - start) + 1;

                                            let initSeg = fileContent.mediaFile.slice(start, start + byteLength);                                            
                                            console.log("GetSamples of the Segment");
                                            let sampleEPT = fileContent.processSeg.getFirstSample(segment.slice(boxOffset, boxSize + boxOffset),
                                                segment.slice(sidxBoxes[sidxIndex].offset,
                                                    sidxBoxes[sidxIndex].offset + sidxBoxes[sidxIndex].size), initSeg);                                           

                                            objsampleEPT.ept = sampleEPT.ept;
                                            objsampleEPT.isinit = true;
                                            objsampleEPT.trackId = mooftrackId;

                                            // (decodeTime.baseMediaDecodeTime / ts) +
                                            //    (smplduration += (trunCon.tr_flags & 0x000004 === 4) ? ((fun(mvexBuffer.slice(ctrex.offset, ctrex.offset + ctrex.size)).default_sample_duration) / ts)
                                            //        : (trunCon.sample_duration / ts)) + (trunCon.composite_time_offset / ts);

                                            console.log("Print Source Buffer Status { " + (sourceBuffer === null) + " }");
                                            if ((sourceBuffer !== null || sourceBuffer !== undefined)) {
                                                var bufferedTime = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1) : 0;
                                                var eptDif = (sampleEPT.baseMediaDecodeTime / sampleEPT.timescale) +
                                                    (bufferedTime + (sampleEPT.tr_flags) ? (sampleEPT.default_sample_duration / sampleEPT.timescale)
                                                        : (sampleEPT.sample_duration / sampleEPT.timescale) +
                                                        (sampleEPT.composite_time_offset / sampleEPT.timescale));

                                                console.log("BufferedTime = " + bufferedTime + " ept = " + eptDif);
                                                if ((eptDif <= sampleEPT.ept) || ((eptDif - bufferedTime <= 1) &&
                                                    (eptDif - bufferedTime >= 0))) {
                                                    objsampleEPT.isConforming = true;                                                    
                                                    if (!sourceBuffer.updating) {
                                                        fileContent.segmentsInf.loading = true;
                                                        sourceBuffer.appendBuffer(segment); 

                                                        console.log("StreamAppendedBuffered");

                                                        fileContent.segmentsInf.loading = false;
                                                        fileContent.segmentsInf.isProcessing = false;
                                                        fileContent.isForceAppend = false;
                                                        fileContent.segmentsInf.arrayIndex += 1;
                                                    }
                                                    // fileContent.mergeSeg(segment);
                                                } else {
                                                    fileContent.tempSeg.push({ segment: segment, segdetails: objsampleEPT });
                                                    var bufferedTime = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
                                                    for (var segIndex = 0; segIndex < fileContent.tempSeg.length; segIndex++) {
                                                        var _curr = fileContent.tempSeg.find(function (seg) {
                                                            return ((seg.segdetails.ept - bufferedTime <= 1 && seg.segdetails.ept - bufferedTime >= 0));
                                                        });
                                                        if (_curr !== null && _curr !== undefined) {
                                                            // sourceBuffer.appendBuffer(_curr);
                                                            // fileContent.segmentsInf.arrayIndex += 1;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            boxOffset += boxSize;                            
                        } else {
                            boxOffset += boxSize;
                        }
                    } else {
                        objsampleEPT.isConforming = false;
                        break;
                    }
                } while (boxOffset < segView.byteLength);
                return objsampleEPT;
            },
            getBoxes: function (seg) {
                try {
                    let arrayInts = new Uint8Array(seg);
                    let boxes = [];
                    let boxOffset = 0;
                    var objSegInf = { validSeg: true, totalSize: 0 };

                    do {
                        let boxInf = fileContent.processSeg.getboxInf(seg.slice(boxOffset, boxOffset + 8));
                        if (boxInf.boxValid) {
                            let boxSize = boxInf.size;
                            let boxName = boxInf.name;
                            objSegInf.validSeg = true;

                            console.log("Box Name: " + boxName);
                            console.log("Box Size: " + boxSize);

                            if (boxName === "moof") {

                            }
                            boxes.push({ name: boxName, size: boxSize, offset: boxOffset });
                            boxOffset += boxSize;
                            objSegInf.totalSize += boxSize;
                        } else {
                            objSegInf.validSeg = false;
                            console.log("Segment Invalid!");
                            break;
                        }
                    } while (boxOffset < arrayInts.length);
                    return objSegInf;
                } catch (e) {
                    console.log("Error on the checkingFile");
                }
            }
        },
        videoElement: {
            waiting: false,
            playing: false,
            played: false,
        },
        appendInit: function () {
            if (!fileContent.playerInitialized) {
                console.log("Appending Initialization");

                var initialization = fileContent.mpdFile.querySelector("Initialization");
                var start = initialization.getAttribute("range").split("-")[0].trim();
                var end = initialization.getAttribute("range").split("-")[1].trim();
                var byteLength = (end - start) + 1;

                console.log("Initialization Coordinates: { Start = " + start + ", End = " + end + " }");
                var isConforming = fileContent.processSeg.getConformence(fileContent.mediaFile.slice(start,
                    start + byteLength));
            }            
        },
        appendFirstSegment: function () {
            var arrayBuffer = fileContent.segmentUrls[0];
            var start = parseInt(arrayBuffer.getAttribute("mediaRange").split("-")[0]);
            var end = parseInt(arrayBuffer.getAttribute("mediaRange").split("-")[1]);

            console.log("start = " + start + ", end = " + end + ": byteOffset = " + fileContent.byteOffset);
            var firstSegInterval = setInterval(function () {
                if (!fileContent.segmentsInf.isProcessing &&
                    !fileContent.segmentsInf.loading
                    && !fileContent.sourceBuffInf.error) {
                    clearInterval(firstSegInterval);
                    fileContent.segmentsInf.isProcessing = true;
                    var byteLength = (end - start) + 1;

                    // console.log("Appending Buffer byteLength = " + byteLength + " sliceOffset = " + fileContent.sliceOffset + " start");
                    fileContent.processSeg.getConformence(fileContent.mediaFile.slice(start,
                        start + byteLength));
                }
            }, 10);            
        },
        _appendSegment: function () {
            try {
                var arrayBuffer = fileContent.segmentUrls[fileContent.segmentsInf.arrayIndex];
                var start = parseInt(arrayBuffer.getAttribute("mediaRange").split("-")[0]);
                var end = parseInt(arrayBuffer.getAttribute("mediaRange").split("-")[1]);

                console.log("start = " + start + ", end = " + end + ": byteOffset = " + fileContent.byteOffset);
                var nextSegment = fileContent.segmentUrls[fileContent.segmentsInf.arrayIndex + 1 < fileContent.segmentUrls.length ? fileContent.segmentsInf.arrayIndex + 1 : fileContent.segmentsInf.arrayIndex];
                var nextEnd = parseInt(nextSegment.getAttribute("mediaRange").split("-")[1]);

                if (fileContent.byteOffset >= nextEnd &&
                    !fileContent.segmentsInf.isProcessing &&
                    !fileContent.segmentsInf.loading && 
                    !fileContent.sourceBuffInf.error) {
                    fileContent.segmentsInf.isProcessing = true;
                    var byteLength = (end - start) + 1;

                    // console.log("Appending Buffer byteLength = " + byteLength + " sliceOffset = " + fileContent.sliceOffset + " start");
                    fileContent.processSeg.getConformence(fileContent.mediaFile.slice(start,
                        start + byteLength));
                }
            } catch (e) {
                if (e instanceof Error) {
                    if (e.name === "InvalidStateError") {
                        console.log("SourceBuffer is in an InvalidState");
                    }
                }
            }
        },
        mergeSeg: function (seg) {
            try {
                var segView = new DataView(seg);
                for (var i = 0; i < segView.byteLength; i++) {
                    try {
                        fileContent.mfileView.setInt8(fileContent.byteOffset, segView.getInt8(i));
                        fileContent.byteOffset += 1;
                    } catch (e) {
                        if (e instanceof RangeError) {

                        }
                    }
                }
                fileContent.segmentsInf.recIndex += 1;
            } catch (e) {
                console.log("Error during segments!");
            }
        },
        mfileView: null,
        mediaFile: null,
        isForceAppend: false,
        byteOffset: 0,
        sliceOffset: 0,
        playerInitialized: false,
        mpdFile: "",
        tempSeg: [],
        segmentUrls: [],
        sourceBuffInf: {
            error: false,
            removed: false,
            readyState: false,
        },
        segmentsInf: {
            arrayIndex: 0,
            recIndex: -1,
            isinit: false,
            byteOffset: 0,
            byteLength: 0,
            isProcessing: false,
            loading: false
        },
        playerError: function (e) {
            var error_main_wrapper = document.createElement("div");
            var error_wrapper = document.createElement("div");
            var code_span = document.createElement("span");
            var message_span = document.createElement("span");
            var replay_span = document.createElement("span");

            error_main_wrapper.classList = "error-main-wrapper";
            error_wrapper.classList = "error-wrapper";
            code_span.classList = "error-code";
            message_span.classList = "error-message";

            code_span.innerHTML = "Code: " + vidplayer.error.code;
            message_span.innerHTML = "Message: " + vidplayer.error.message;
            error_main_wrapper.appendChild(error_wrapper);
            error_wrapper.appendChild(replay_span);

            // append the error to the document.
            document.appendChild(error_main_wrapper);

            var obj_replay_span = document.getElementsByClassName("btn-replay");
        },
        playbackStatus: {
            currentTime: 0,
            bufferedTime: 0,
        },
        getMediaSource: function () {
            try {
                // Check if the media source is available
                if ("MediaSource" in window) {
                    mediaSource = new MediaSource();                      
                    vidplayer.src = URL.createObjectURL(mediaSource);
                    vidplayer.onerror = function (e) {
                        console.log("VideoElement Error: " + vidplayer.error.code + "; " + vidplayer.error.message);
                        fileContent.segmentsInf.loading = false;   
                        fileContent.playerInitialized = false;
                        fileContent.segmentsInf.isProcessing = false;
                        fileContent.segmentsInf.loading = false;
                        fileContent.playerError(e);

                        if (fileContent.sourceBuffInf.error) {
                            setTimeout(function () {
                                fileContent.addSourceBuffer(mediaSource);
                                fileContent.sourceBuffInf.error = false;
                            }, 100);
                        }

                        // fileContent.playerError(e);
                    }
                    mediaSource.addEventListener("sourceopen", function () {
                        try {
                            var isChromium = window.chrome;
                            var winNav = window.navigator;
                            var vendorName = winNav.vendor;
                            var isOpera = typeof window.opr !== "undefined";
                            var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
                            var isIOSChrome = winNav.userAgent.match("CriOS");

                            // var buffer = fileContent.addSourceBuffer(mediaSource);
                            if (isIOSChrome) {
                                // is Google Chrome on IOS
                                fileContent.addSourceBuffer(mediaSource);
                            } else if (
                                isChromium !== null &&
                                typeof isChromium !== "undefined" &&
                                vendorName === "Google Inc." &&
                                isOpera === false &&
                                isIEedge === false
                            ) {
                                // is Google Chrome
                                console.log("Edge is playing!");
                                fileContent.addSourceBuffer(mediaSource);
                                console.log("Source Buffer Added");
                            } else {
                                // not Google Chrome 
                                sourceBuffer = this.addSourceBuffer('video/mp4');
                            }
                        } catch (e) {
                            alert("Exception " + e.message);
                        }
                    });
                    mediaSource.addEventListener("sourceended", function () {
                        console.log("Source has ended");
                        fileContent.sourceBuffInf.removed = true;
                        fileContent.segmentsInf.loading = false;
                    });
                    mediaSource.addEventListener("sourceclosed", function () {
                        console.log("Source has closed");
                        fileContent.sourceBuffInf.removed = true;
                        fileContent.segmentsInf.loading = false;                        
                    });
                } else {
                    alert("The MediaSource object is not available in this browser therefore you will not be able to play videos!");
                    return;
                }
            } catch (e) {
                if (e instanceof Error) {
                    console.log("" + e);
                }
            }
        },
        addSourceBuffer: function (mediaSource) {
            try {
                var representation = fileContent.mpdFile.querySelector("Representation");
                var mimeType = representation.getAttribute("mimeType");
                var codecs = representation.getAttribute("codecs");
                var encodings = mimeType + ';codecs="' + codecs + '"';
                sourceBuffer = mediaSource.addSourceBuffer(encodings);
                fileContent.sourceBuffInf.readyState = true;

                // fileContent.byteOffset = 0;

                console.log("Codecs: " + encodings);
                sourceBuffer.mode = "sequence";

                sourceBuffer.addEventListener("error", function (e) {
                    console.log("Error " + e.toString());
                    fileContent.sourceBuffInf.error = true;     

                    // Try replaying the video.
                    fileContent.playbackStatus.currentTime = vidplayer.currentTime;
                    var currentSourceBuffer = mediaSource.sourceBuffers[0];
                    if (currentSourceBuffer != null || currentSourceBuffer != undefined) {
                        console.log("SourceBuffer would be removed!");
                        mediaSource.removeSourceBuffer(currentSourceBuffer);   
                        fileContent.sourceBuffInf.removed = true;
                    }                    
                });

                sourceBuffer.addEventListener("updateend", function () {
                    // console.log("Updateend method = " + (sourceBuffer.updating));
                    if (this != null && this.buffered != null && this.buffered.length) {                        
                        for (var i = 0; i < this.buffered.length; i++) {
                            var endY = sourceBuffer.buffered.end(i);
                            var startX = sourceBuffer.buffered.start(i);

                            $(".progress-buffered").css({
                                "width": (((endY - startX) * totalwidth) / mvideo.duration) + "px"
                            });
                        }
                        console.log("mediaSource readyState = " + mediaSource.readyState + " bufferedTime " + this.buffered.end(this.buffered.length - 1) +
                            " duration = " + mvideo.duration);
                        if (Math.ceil(this.buffered.end(this.buffered.length - 1)) >= Math.ceil(mvideo.duration) && mediaSource.readyState === "open") {
                            console.log("End of Stream");
                            mediaSource.endOfStream();
                        }
                    }
                });
                return sourceBuffer;
            } catch (e) {
                if (e instanceof Error) {
                    if (e.name === "InvalidStateError") {
                        this.getMediaSource();
                        console.log("MediaSource not ready!");
                    }
                    else if (e.name === "NotSupportedError") {
                        console.log("MimeType not supported.");
                    } else if (e.name === "InvalidAccessError") {
                        console.log("Empty string for mimeType");
                    }
                    else if (e.name === "QuotaExceededError") {
                        console.log("Empty string for mimeType");
                    }
                    return;
                }
            }
        },
        appendBuffer: function (segDet) {
            try {
                if (!fileContent.segmentsInf.isProcessing &&
                    !fileContent.segmentsInf.loading) {
                    fileContent.segmentsInf.isProcessing = true;
                    fileContent._appendBuffer();
                }
            } catch (e) {
                if (e instanceof Error) {
                    if (e.name === "InvalidStateError") {
                        console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " StackTrace: " + e.stack);
                    }
                }
            }
        }
    }

    // Get the Mpd of the file to stream.
    var mpd_request = $.ajax({
        url: "/video/getmpd?videoId=" + videoId,
    })
    mpd_request.done(function (mpdfile) {
        var domParser = new DOMParser();
        var xmlDoc = domParser.parseFromString(mpdfile, "text/xml");
        fileContent.mpdFile = mpdfile;
        var file = mpdfile;
        init_mpdfile(file);

        var representations = $(file).find("Representation");
        var inItSeg = $(file).find("Initialization");
        var mpd = $(file).find("MPD");

        // var period = $(file).find('Period[type="ad"]');
        var period = xmlDoc.querySelectorAll('Period[type="ad"]');
        if (period.length > 0) {
            for (var i = 0; i < period.length; i++) {
                ads[i] = {
                    start: $(period).attr("start"),
                    duration: getDurations($(period).attr("duration")),
                    isplaying: false,
                    adEnded: false,
                    currentTime: 0
                };
            }
        }

        // look for the main video
        period = mpdfile.querySelectorAll("Period[type='video']");
        var segmentURL = mpdfile.querySelectorAll("SegmentURL");
        var lastSegURL = segmentURL[segmentURL.length - 1];

        var byteLength = parseInt((lastSegURL.getAttribute("mediaRange").split('-')[1]).trim()) + 1;

        fileContent.mediaFile = new ArrayBuffer(byteLength);
        fileContent.mfileView = new DataView(fileContent.mediaFile);
        fileContent.getMediaSource();
        for (var i = 0; i < segmentURL.length; i++) {
            fileContent.segmentUrls[i] = segmentURL[i];
        }        

        var sumDurations = 0;
        for (var i = 0; i < ads.length; i++) {
            sumDurations += ads[i].duration;
        }

        if (period.length > 0) {
            mvideo.currentTime = 0;
            mvideo.duration = getDurations($(period).attr("duration"));
            mvideo.start = $(file).attr("start");
            mvideo.isplaying = false;
            mvideo.adsDurations = sumDurations;
        }
    })

    // Receive messages from the worker
    let buffer = [];
    let byteOffset = 0;
    let sliceOffset = 0;

    // End the MediaStream
    var endStream = function () {
        endStreamInterval = setInterval(function () {
            // console.log("MediaSource Ready State = " + mediaSource.readyState);
            if (!sourceBuffer.updating && mediaSource.readyState === "open") {
                clearInterval(endStreamInterval);
                mediaSource.endOfStream();
            }
        }, 1000);
    }

    // Check the currently playing file if there is any.
    var processSeg = function (data) {
        try {
            fileContent.mergeSeg(data.segment);
            if (fileContent.sourceBuffInf.readyState) {
                if (!fileContent.playerInitialized) {
                    fileContent.appendInit();
                }
                if (fileContent.playerInitialized && sourceBuffer.buffered.length <= 0) {
                    fileContent.appendFirstSegment(); 
                }
                if (fileContent.videoElement.played && fileContent.videoElement.waiting) {
                    console.log("played and waiting");
                    fileContent._appendSegment();
                }
            }0
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.name + ":" + e.message + ":" + e.stack);
            }
        }
    }

    var getboxInf = function (boxInfBytes) {
        try {
            let boxView = new DataView(boxInfBytes);
            let boxSize = boxView.getUint32(0);
            let boxName = String.fromCharCode(boxView.getUint8(4)) + String.fromCharCode(boxView.getUint8(5)) + String.fromCharCode(boxView.getUint8(6)) + String.fromCharCode(boxView.getUint8(7));

            var findBox = fileContent.processSeg.boxes.find(function (name) {
                return name.trim() === boxName.trim();
            });

            var objBoxInf = {
                size: boxSize, name: boxName, boxValid: true
            };

            if (findBox === null || findBox === undefined) {
                objBoxInf.boxValid = false;
                console.log("Unknown box " + boxName);
            }
            return objBoxInf;

        } catch (e) {
            if (e instanceof Error) {
                console.log("Error on the getInf method ");
            }
        }
    }

    var checkingFile = function (segment) {
        try {
            console.log("*** Checking Segment Begins ***");
            let arrayInts = new Uint8Array(segment);
            let boxes = [];

            let boxOffset = 0;
            do {

                let boxInf = getboxInf(segment.slice(boxOffset, boxOffset + 8));

                let boxSize = boxInf.size;
                let boxName = boxInf.name;

                console.log("Box Name: " + boxName);
                console.log("Box Size: " + boxSize);

                boxes.push({ name: boxName, size: boxSize, offset: boxOffset });
                boxOffset += boxSize;
            } while (boxOffset < arrayInts.length);
            console.log("*** Checking Segment End ***");
        } catch (e) {
            console.log("Error on the checkingFile");
        }
    }

    player_worker.onmessage = function (event) {
        try {
             processSeg(event.data);
        }
        catch (e) {
            // console.log("Error when apending " + e.MessageError);
        }
    }

    // Receive video segments
    let arrayCon = [];

    // removing waiting.
    let removewaiting = function () {
        alert("Removing!");
    };

    // post to the containing page that this page is ready to receive data.
    window.readyState = function () {
        return windowState;
    }

    // An object to collect the segments from the server and merge them into one big segments.
    var objsegment = {
        arrayCon: [],
        initRec: false
    }

    // Streaming Task Completed
    window.taskCompleted = function (data) {
        var currentTask = data;
        if (currentTask.IsCompleted) {
            if (mediaSource.readyState === "open") {
                mediaSource.endOfStream();
            }
        }
    }

    window.vidseg = function (data) {
        if (data.isLastsubsegment) {
            objsegment.arrayCon.push(data.currentvideo.content);
            console.log("Complete Segment");
            player_worker.postMessage({
                segment: new Uint8Array(data.currentvideo.segSize),
                content: objsegment.arrayCon.splice(0, objsegment.arrayCon.length),
                representationId: data.currentvideo.representationId,
                segIndex: data.currentvideo.segIndex
            });
        } else {
            if (data.initialization && !objsegment.initRec) {
                objsegment.initRec = true;
                console.log("Initialization Received!");
                objsegment.arrayCon.push(data.currentvideo.content);
                player_worker.postMessage({
                    segment: new Uint8Array(data.currentvideo.segSize),
                    content: objsegment.arrayCon.splice(0, objsegment.arrayCon.length),
                    representationId: data.currentvideo.representationId,
                    segIndex: data.currentvideo.segIndex
                });
                return;
            }
            objsegment.arrayCon.push(data.currentvideo.content);
        }
    };

    var btnQualities = document.getElementsByClassName("btn-sel-quality");
    var showQualities = function () {
        var p = document.getElementsByClassName("vid-qulty-popup");
        var btncloseQualities = document.getElementById("closequalities");

        for (var i = 0; i < p.length; i++) {
            p[i].style.display = "inline-block";
            btncloseQualities.addEventListener("click", function (e) {
                var p = document.getElementsByClassName("vid-qulty-popup");
                for (var j = 0; j < p.length; j++) {
                    p[j].style.display = "none";
                }
            });
        }
    }

    for (var i = 0; i < btnQualities.length; i++) {
        btnQualities[i].addEventListener("click", function (e) {
            showQualities();
        });
    }

    // request a new bandwidth from the server
    // $("#qualities span").click(function () {
    //    vidplayer.pause();

    //    // Cancel the current streamming thread
    //    parentWindow.beforeasyncCall();

    //    reqObj.functionName = "VideoRequest";
    //    reqObj.data.bandwidth = $(this).attr("value");
    //    reqObj.data.start = vidplayer.currentTime;
    //    reqObj.data.end = vidplayer.duration - vidplayer.currentTime;
    //    reqObj.data.videoId = videoId;

    //    reqObj.data.streamId = parentWindow.getStreamId();

    //    window.reqvid(JSON.stringify(reqObj));
    //    if (sourceBuffer.updating) {
    //        setOffset = setInterval(function () {
    //            if (!sourceBuffer.updating) {
    //                sourceBuffer.abort();
    //                sourceBuffer.timestampOffset = vidplayer.buffered.end(vidplayer.buffered.length - 1);
    //                vidplayer.play();
    //                clearInterval(setOffset);
    //            }
    //        }, 1000);
    //    } else {
    //        try {
    //            sourceBuffer.abort();
    //            sourceBuffer.timestampOffset = vidplayer.buffered.end(vidplayer.buffered.length - 1);
    //        } catch (e) {
    //            alert("Errot Setting timestamp");
    //        }
    //    }
    // });

    if ($(vidplayer).paused) {
        $(".btn-play").css({
            "display": "block"
        })
        $(".btn-pause").css({
            "display": "none"
        })
    } else {
        $(".btn-play").css({
            "display": "none"
        })
        $(".btn-pause").css({
            "display": "block"
        })
    }
    $(".btn-play").click(function (e) {
        vidplayer.play();
        $(".btn-play").css({
            "display": "none"
        })
        $(".custom-btn-play").css({
            "display": "none"
        })
        $(".btn-pause").css({
            "display": "block"
        })
    });

    var btn_repeat = document.getElementById("btn-repeat");
    var btn_pause = document.getElementById("btn-pause");
    var btn_play = document.getElementById("btn-play");
    var currnt_time_marker = document.getElementsByClassName("curnt-time-marker")[0];
    var progress_bar_tape = document.getElementsByClassName("progress-tape")[0];
    var progress_bar = document.getElementsByClassName("custom-progress")[0];
    var custom_progress = document.getElementsByClassName("custom-progress")[0];
    var seeking_bar_tape = document.getElementsByClassName("seeking-bar-tape")[0];
    var progress_buffered = document.getElementsByClassName("progress-buffered")[0];
    var dsply_seeking = document.getElementsByClassName("dspl-seeking-pos-wrap")[0];
    var cnter_play_wrapper = document.getElementsByClassName("cnter-play-wrapper")[0];
    

    // Calculate the Position to which the user wants to seek.
    var getSeekingPos = function (elem, e) {
        var offset = $(elem).offset();

        var relativeX = (e.pageX - offset.left);
        var relativeY = (e.pageY - offset.top);

        var seekingTime = (relativeX / totalwidth) * mvideo.duration;

        var totalSec = seekingTime;
        var hours = Math.floor(totalSec / 3600);
        var seconds = Math.floor(totalSec % 60);
        var minutes = Math.floor((totalSec % 3600) / 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }

        return {
            X: relativeX,
            Y: relativeY,
            start: hours < 10 ? minutes + " : " + seconds : hours + " : " + minutes + " : " + seconds
        }
    }
    // Hide the play center wrapper
    var hideCentrePlay = function () {
        btn_play.style.display = "none";
    }
    // This method transforms all the player progress bar tools.    
    var mouseover_trsform_bar_tools = function (elem, e) {
        var seek_pos = getSeekingPos(elem, e);
        progress_bar_tape.style.transform = "scaleY(2)";
        progress_bar.style.transform = "scaleY(2)";
        progress_buffered.style.transform = "scaleY(2)";
        seeking_bar_tape.style.transform = "scaleY(1.5)";
        currnt_time_marker.style.display = "block";
        dsply_seeking.style.display = "block";
        dsply_seeking.style.left = (seek_pos.X / 2) + "px";

        // dsply_seeking.style.bottom = (seek_pos.Y) + "px";

        var dsly_seeking_time = document.getElementsByClassName("dsply-seeking-time")[0];
        dsly_seeking_time.innerHTML = getSeekingPos(elem, e).start;

        if (getSeekingPos(elem, e).X > ((vidplayer.currentTime * totalwidth) / mvideo.duration)) {
            seeking_bar_tape.style.display = "block";
            seeking_bar_tape.style.left = (vidplayer.currentTime * totalwidth) / mvideo.duration;
            seeking_bar_tape.style.width = getSeekingPos(elem, e).X - ((vidplayer.currentTime * totalwidth) / mvideo.duration) + "px";
        }
    }
    var mouseleave_trsform_bar_tools = function (elem, e) {
        progress_bar_tape.style.transform = "scaleY(1)";
        progress_bar.style.transform = "scaleY(1)";
        seeking_bar_tape.style.display = "none";
        seeking_bar_tape.style.transform = "scaleY(1)";
        progress_buffered.style.transform = "scaleY(1)";
        currnt_time_marker.style.display = "none";
        dsply_seeking.style.display = "none";
    }
    var mousemove_trsform_bar_tools = function (elem, e) {
        mouseover_trsform_bar_tools(elem, e);
    }
    progress_bar_tape.addEventListener("mouseover", function (e) {
        mouseover_trsform_bar_tools(e.target, e);
    });
    progress_bar_tape.addEventListener("mousemove", function (e) {
        mouseover_trsform_bar_tools(e.target, e);
    });
    progress_buffered.addEventListener("mousemove", function (e) {
        mousemove_trsform_bar_tools(e.target, e);
    });
    progress_buffered.addEventListener("mouseover", function (e) {
        mouseover_trsform_bar_tools(e.target, e);
    });
    progress_buffered.addEventListener("mouseleave", function (e) {
        mouseleave_trsform_bar_tools(e.target, e);
    });
    progress_bar_tape.addEventListener("mouseleave", function (e) {
        mouseleave_trsform_bar_tools(e.target, e);
    });
    currnt_time_marker.addEventListener("mouseover", function (e) {
        mouseover_trsform_bar_tools(e.target, e);
    });
    currnt_time_marker.addEventListener("mouseleave", function (e) {
        mouseleave_trsform_bar_tools(e.target, e);
    });
    custom_progress.addEventListener("mouseover", function (e) {
        mouseover_trsform_bar_tools(e.target, e);
    });
    custom_progress.addEventListener("mouseleave", function (e) {
        mouseleave_trsform_bar_tools(e.target, e);
    });

    // code to execute when the repeat buttons are clicked.
    var repeatVideo = function () {
        vidplayer.currentTime = 0;
        vidplayer.play();
        btn_repeat.style.display = "none";
        btn_pause.style.display = "block";

        var btn_repeat_wrapper = document.getElementById("videndedcontrolswrapper");
        btn_repeat_wrapper.style.display = "none";
    }
    btn_repeat.addEventListener("click", function (e) {
        repeatVideo();
    });
    
    $(".btn-pause").click(function (e) {
        vidplayer.pause();
        cnter_play_wrapper.style.display = "block";
        $(".btn-play").css({
            "display": "block"
        })
        btn_play.style.display = "block";
        $(".btn-pause").css({
            "display": "none"
        })
        $(".custom-btn-play").css({
            "display": "block"
        })
    });

    // Code to execute when the play buttons are clicked.
    var playFunction = function () {
        vidplayer.play();
        btn_play.style.display = "none";
        cnter_play_wrapper.style.display = "none";
        $(".custom-btn-play").css({
            "display": "none"
        })
        $(".btn-pause").css({
            "display": "block"
        })
        $(".vid-ended-related").css({
            "display": "none"
        })
    }
    btn_play.addEventListener("click", function () {
        playFunction();
    });
    cnter_play_wrapper.addEventListener("click", function () {
        playFunction();
    });
    $(vidplayer).on("click", function () {
        if (vidplayer.paused) {
            vidplayer.play();
            cnter_play_wrapper.style.display = "none";
            $(".custom-btn-play").css({
                "display": "none"
            })
            $(".btn-play").css({
                "display": "none"
            })
            $(".btn-pause").css({
                "display": "block"
            })
            $(".vid-ended-related").css({
                "display": "none"
            })
        } else {
            vidplayer.pause();
            cnter_play_wrapper.style.display = "block";
            $(".btn-play").css({
                "display": "block"
            })
            $(".btn-pause").css({
                "display": "none"
            })
            $(".custom-btn-play").css({
                "display": "block"
            })
            $(".vid-ended-related").css({
                "display": "none"
            })
        }
    })

    // get Clicked Position
    var getPosition = function (el, e) {
        var offset = $(el).offset();
        var relativeX = (e.pageX - offset.left);
        var relativeY = (e.pageY - offset.top);

        var ad = ads.find(function (_a) {
            return _a.start <= (relativeX / totalwidth) * duration && (_a.start / duration) * totalwidth >= relativeX;
        });

        if (ad !== undefined) {
            relativeX = ((ad.start + ad.duration) / duration) * totalwidth;
        }

        // $(ads).each(function (ad) {            
        //    relativeX = ad.start <= ((relativeX / duration) * totalwidth) ? relativeX + ad.start : relativeX;
        // });

        vidplayer.currentTime = (relativeX / totalwidth) * duration;

        // vidplayer.play();

        $(".vid-ended-related").css({
            "display": "none"
        });
    }

    // Execute when loading
    $(vidplayer).on("waiting", waiting);

    // Execute when playing the video
    $(vidplayer).on("playing", function () {
        $(".loading-img").css({
            "display": "none"
        });
        $(".custom-btn-play").css({
            "display": "none"
        })
        $(".vid-ended-related").css({
            "display": "none"
        });
        
        fileContent.videoElement.waiting = false;
        fileContent.videoElement.playing = true;
        if (!fileContent.videoElement.played) {
            fileContent.videoElement.played = true;
        }        
    })

    // Execute when the browser can play through without stoping for buffering
    $(vidplayer).on("canplaythrough", function () {
        $(".loading-img").css({
            "display": "none"
        })
        // vidplayer.play();
    });

    // execute when the user clicks on the progress bar
    $(".custom-progress").on("click", function (e) {
        var currTarget = e.target;
        vidplayer.pause();
        getPosition(currTarget, e);
    });

    // execute when clicking the buffered time element
    $(".progress-buffered").on("click", function (e) {
        var currTarget = e.target;
        // vidplayer.pause();

        getPosition(currTarget, e);
    });

    var displayTime = function () {
        var totalSec = duration;
        var hours = Math.floor(totalSec / 3600);
        var seconds = Math.floor(totalSec % 60);
        var minutes = Math.floor((totalSec % 3600) / 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }

        currentTime = vidplayer.currentTime - mvideo.adsDurations;
        totalSec = currentTime;
        currHour = Math.floor(totalSec / 3600);
        currSec = Math.floor(totalSec % 60);
        currMin = Math.floor((totalSec % 3600) / 60);

        if (currHour < 10) {
            currHour = "0" + currHour;
        }
        if (currMin < 10) {
            currMin = "0" + currMin;
        }
        if (currSec < 10) {
            currSec = "0" + currSec;
        }
        $(".timeduration").text(currHour + ":" + currMin + ":" + currSec + "/" + hours + ":" + minutes + ":" + seconds);
    }

    vidplayer.onmouseover = function () {
        // $(".controls-container").css({
        //    "display": "block"
        // })
    }

    // the timeupdate event of the video element
    $(vidplayer).on("timeupdate", function () {
        // console.log("Time Update running");
        var currnt_time_marker = document.getElementsByClassName("curnt-time-marker")[0];
        currnt_time_marker.style.left = (vidplayer.currentTime * totalwidth) / mvideo.duration;

        // if ((sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1) >= mvideo.duration) && (mediaSource.readyState !== "ended")
        //    && (mediaSource.readyState === "open")) {
        //    // alert("End Of Stream!");
        //    endStream();
        // }

        console.log("IsProcessing = " + fileContent.segmentsInf.isProcessing + " Loading = " + fileContent.segmentsInf.loading + 
            " Duration = " + mvideo.duration + " BufferedTime = " + Math.ceil(sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)));
        if (!fileContent.segmentsInf.isProcessing && !fileContent.segmentsInf.loading &&
            (Math.ceil(sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)) < mvideo.duration)) {
            
            let percentBuffered = (vidplayer.currentTime / sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)) * (100);
            let nextSegment = fileContent.segmentUrls[fileContent.segmentsInf.arrayIndex < (fileContent.segmentUrls.length - 1) ?
                fileContent.segmentsInf.arrayIndex + 1 : fileContent.segmentsInf.arrayIndex];
            let end = parseInt(nextSegment.getAttribute("mediaRange").split("-")[1]);

            console.log("recIndex = " + fileContent.segmentsInf.recIndex + " end = " + end + " percentBuffered = " + percentBuffered + " byteLength = " +
                fileContent.mediaFile.byteLength);
            if ((fileContent.segmentsInf.recIndex > fileContent.segmentsInf.arrayIndex) &&
                (fileContent.segmentsInf.recIndex < fileContent.segmentUrls.length)) {
                if (percentBuffered >= 30) {
                    console.log("Timeupdate Appending!");
                    fileContent._appendSegment();
                }               
            }                     
        }

        // if ((vidplayer.currentTime / sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1) * 100) < 10) {
        //    var segmentURLs = [];
        //    segmentURLs = mpdFile.querySelectorAll("SegmentURL");           
        //    var segURL = function () {
        //        for (var i = 0; i < segmentURLs.length; i++) {    
        //            var cntSegStart = segmentURLs[i].getAttribute("mediaRange").split("-")[0]; 
        //            if (cntSegStart.trim() == sliceOffset) {
        //                return segmentURLs[i];
        //            }
        //        }
        //    };

        //    // alert("About to Append " + segmentURLs.length);
        //    // var segURL = segmentURLs.find(function (surl) {
        //    //    return surl.getAttribute("mediaRange").split("-")[0] === sliceOffset;
        //    // });           

        //    var mediaRange = segURL().getAttribute("mediaRange");
        //    var segLength = (mediaRange.split("-")[1].trim()) - (mediaRange.split("-")[0].trim()) + 1;

        //    var segBuffer = mediaFile.slice(sliceOffset, sliceOffset + segLength);
        //    checkingFile(mediaFile.slice(sliceOffset, sliceOffset + segLength));

        //    // sourceBuffer.appendBuffer(segBuffer);
        //    sliceOffset += segLength;
        // }

        $(ads).each(function (_index, ad) {
            // get the duration of the currently playing video
            if (mvideo.currentTime <= ad.start && ((vidplayer.currentTime - ad.start) <= ad.duration) && !ad.adEnded) {
                var adpval = ad.start <= 0 ? ((vidplayer.currentTime + ad.duration) - ad.duration) * totalwidth / ad.duration
                    : (vidplayer.currentTime - ad.start) * totalwidth / ad.duration;

                $(".ad-custom-progress").css({
                    "width": adpval + "px"
                });
                mvideo.isplaying = false;

                // console.log("Ad progress recorded " + vidplayer.currentTime);
                // console.log("Buffer Length = " + buffer.length);
                // console.log("Buffered Ad time = " + Math.floor(vidplayer.buffered.end(vidplayer.buffered.length - 1)));

                if (Math.floor(vidplayer.buffered.end((vidplayer.buffered.length - 1))) >= Math.floor(ad.duration)) {
                    if (ad.isplaying) {
                        ad.isplaying = false;
                        console.log("all of the ad  has been buffered!");
                    }
                }

                if (Math.round(vidplayer.currentTime) >= Math.floor(ad.duration)) {
                    //if (!sourceBuffer.updating && buffer.length > 0 && !ad.adEnded) {
                    //    console.log("Ad Finished currentTime = " + vidplayer.currentTime);

                    //    alert("Ad finished");
                    //    console.log("CurrentTime Before Removing = " + vidplayer.currentTime);
                    //    sourceBuffer.remove(0, vidplayer.currentTime);
                    //    var waitForRemove = setInterval(function () {
                    //        ad.adEnded = true;
                    //        if (!sourceBuffer.updating) {
                    //            $(".ad-cntrls").css({
                    //                "display": "none"
                    //            });
                    //            $(".ctrls-main-con").css({
                    //                "display": "inline-block"
                    //            })
                    //            console.log("Current Time Before Inserting Main Video = " + vidplayer.currentTime);
                    //            console.log("BufferedTime Before Inserting a new video");
                    //            for (var i = 0; i < sourceBuffer.buffered.length; i++) {
                    //                console.log("x = " + sourceBuffer.buffered.start(sourceBuffer.buffered[i]) + ", y = " +
                    //                    sourceBuffer.buffered.end(sourceBuffer.buffered[i]));
                    //            }
                    //            sourceBuffer.appendBuffer(buffer.shift());
                    //            vidplayer.currentTime = mvideo.currentTime;
                    //            console.log("Current Time After Inserting Main Video = " + vidplayer.currentTime);
                    //            console.log("BufferedTime After Inserting a new video");
                    //            for (var i = 0; i < sourceBuffer.buffered.length; i++) {
                    //                console.log("x = " + sourceBuffer.buffered.start(sourceBuffer.buffered[i]) + ", y = " +
                    //                    sourceBuffer.buffered.end(sourceBuffer.buffered[i]));
                    //            }
                    //            mvideo.isplaying = true;
                    //            $(".progress-buffered").css({
                    //                "width": (vidplayer.currentTime + sourceBuffer.buffered.length > 0 ? sourceBuffer.buffer.end(sourceBuffer.buffered.length - 1) : 0) + "px"
                    //            });
                    //            clearInterval(waitForRemove);
                    //        }
                    //    });
                    //}
                }
            }
        });

        var period = $(mpdFile).find('Period[type="video"]');
        if (vidplayer.currentTime >= ($(period).attr("start"))) {
            var myad = ads.find(function (ad) {
                return ad.start >= vidplayer.currentTime;
            });

            if (vidplayer.currentTime >= mvideo.currentTime && ((myad === undefined || myad.start > vidplayer.currentTime))) {
                $(".ad-cntrls").css({
                    "display": "none"
                });
                $(".ctrls-main-con").css({
                    "display": "inline-block"
                });
                var pval = ((vidplayer.currentTime - mvideo.adsDurations) * totalwidth / duration);
                $(".custom-progress").css({
                    "width": pval + "px"
                });
            }
            displayTime();
        }
    });

    // Re-order the items in the carousel.
    var reorderCarousel = function (relatedDocument) {
        var anchors = relatedDocument.getElementsByClassName("rltd-vid-anchor");
        var anchorsArray = [];
        var anchorPosition = 0;

        // populate the anchors array with anchors.
        for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
            anchorsArray.push(anchors[anchorIndex]);
        }

        var vid_ended_carousel = document.createElement("div");
        var video_ended_related = document.createElement("div");
        var video_ended_related_wrapper = document.createElement("div");

        vid_ended_carousel.classList = "carousel-inner vid-ended-carousel";
        video_ended_related.classList = "carousel";
        video_ended_related.setAttribute("id", "video-ended-related");
        video_ended_related_wrapper.classList = "vid-ended-related";

        video_ended_related.appendChild(vid_ended_carousel);
        video_ended_related_wrapper.appendChild(video_ended_related);

        var width = window.innerWidth;
        var rows = 0;
        var cols = 0;
        var carouselCounter = 0;
        var currentIndex = 0;

        console.log("anchors counter = " + anchors.length);

        // count the carousel index.
        carouselCounter += width < 514 ? anchors.length : 0;
        carouselCounter += width > 514 && width < 600 ? (Math.floor(anchors.length / 4) + (Math.floor(anchors.length  % 4))) : 0;
        carouselCounter += width > 600 && width < 768 ? ((Math.floor(anchors.length / 6)) + (anchors.length % 6)) : 0;
        carouselCounter += width > 768 ? ((Math.floor(anchors.length / 12)) + (anchors.length % 12)) : 0;

        console.log("carouselCounter = " + carouselCounter);

        // Max 500, min 500 and max 600 min 768
        rows += width < 514 ? 1 : 0;
        rows += width > 514 && width < 600 ? 2 : 0;
        rows += width > 600 ? 3 : 0;

        // Max 500, min 500 and max 600 min 768
        cols += width < 514 ? 1 : 0;
        cols += width > 514 && width < 600 ? 2 : 0;
        cols += width > 600 && width < 768 ? 3 : 0;
        cols += width > 768 ? 4 : 0;

        console.log("rows = " + rows + ", cols = " + cols);
        for (var carouselIndex = 0; carouselIndex < carouselCounter; carouselIndex++) {
            var item_main_wrapper = document.createElement("div");
            var active = carouselIndex < 1 ? "active" : "";
            item_main_wrapper.classList = active + " item item-main-wrapper";

            for (var row = 0; row < rows; row++) {
                var selected = [];
                if (anchorsArray.length - currentIndex <= rows) {
                    selected = anchorsArray.slice(currentIndex, anchorsArray.length);
                    currentIndex += anchorsArray.length - currentIndex;
                } else {
                    selected = anchorsArray.slice(currentIndex, currentIndex + cols);
                    currentIndex += cols;
                }
                console.log("selected videos = " + selected.length);
                var item_wrapper = document.createElement("div");
                item_wrapper.classList = "item-wrapper";
                for (var col = 0; col < selected.length; col++) {
                    var anchor = document.createElement("a");
                    var vid_ended_thumb_main_wrapper = document.createElement("div");
                    var vid_ended_thumb_con = document.createElement("div");
                    var durationSpan = document.createElement("span");
                    var imgThumb = document.createElement("img");

                    anchor.setAttribute("data-href", selected[col].getAttribute("data-href"));
                    anchor.classList = "rltd-vid-anchor _col-xsm _col-md _col-lg";

                    // The object vid_ended_thumb_main_wrapper to read props from
                    var obj_vid_ended_anchors = relatedDocument.getElementsByClassName("rltd-vid-anchor");

                    var anchorChildren = anchors[anchorPosition++].children;
                    var v_e_t_m_wrap = null;
                    var v_e_t_con = null;

                    console.log("anchorChildren length = " + anchorChildren.length);
                    for (var childIndex = 0; childIndex < anchorChildren.length; childIndex++) {
                        if (anchorChildren[childIndex].classList.contains("vid-ended-thumb-main-wrapper")) {
                            v_e_t_m_wrap = anchorChildren[childIndex];
                            break;
                        }
                    }
                    vid_ended_thumb_main_wrapper.setAttribute("data-href", v_e_t_m_wrap.getAttribute("data-href"));
                    vid_ended_thumb_main_wrapper.setAttribute("data-type", v_e_t_m_wrap.getAttribute("data-type"));
                    vid_ended_thumb_main_wrapper.classList = "col-xs-12 vid-ended-thumb-main-wrapper";

                    // look for the children of v_e_t_m_wrap
                    var v_e_t_m_wrap_children = v_e_t_m_wrap.children;

                    for (var childIndex = 0; childIndex < v_e_t_m_wrap_children.length; childIndex++) {
                        if (v_e_t_m_wrap_children[childIndex].classList.contains("vid-ended-thumb-con")) {
                            v_e_t_con = v_e_t_m_wrap_children[childIndex];
                            break;
                        }
                    }
                    vid_ended_thumb_con.classList = "vid-ended-thumb-con";

                    var obj_duration_span = v_e_t_con.firstElementChild;
                    var obj_img_thumb = v_e_t_con.lastElementChild;

                    durationSpan.classList = "duration";
                    durationSpan.innerHTML = obj_duration_span.innerHTML;

                    imgThumb.setAttribute("src", obj_img_thumb.getAttribute("src"));
                    imgThumb.setAttribute("title", obj_img_thumb.getAttribute("title"));
                    imgThumb.classList = "thum-img";

                    vid_ended_thumb_con.appendChild(durationSpan);
                    vid_ended_thumb_con.appendChild(imgThumb);
                    vid_ended_thumb_main_wrapper.appendChild(vid_ended_thumb_con);
                    anchor.appendChild(vid_ended_thumb_main_wrapper);
                    item_wrapper.appendChild(anchor);
                }
                item_main_wrapper.appendChild(item_wrapper);
            }
            vid_ended_carousel.appendChild(item_main_wrapper);
        }

        // carousel controls.
        var left_control = document.createElement("a");
        var right_control = document.createElement("a");
        var left_contron_icon = document.createElement("span");
        var right_control_icon = document.createElement("span");

        left_contron_icon.classList = "glyphicon glyphicon-chevron-left";
        right_control_icon.classList = "glyphicon glyphicon-chevron-right";

        left_control.classList = "left carousel-control";
        left_control.setAttribute("href", "#video-ended-related");
        left_control.setAttribute("data-slide", "prev");
        left_control.setAttribute("role", "button");
        left_control.appendChild(left_contron_icon);

        right_control.classList = "right carousel-control";
        right_control.setAttribute("href", "#video-ended-related");
        right_control.setAttribute("data-slide", "next");
        right_control.setAttribute("role", "button");
        right_control.appendChild(right_control_icon);

        vid_ended_carousel.appendChild(left_control);
        vid_ended_carousel.appendChild(right_control);

        var rltd_vid_ended = document.getElementById("rltd-vid-ended");        
        rltd_vid_ended.appendChild(video_ended_related_wrapper);
    }

    // the ended event of the video element
    $(vidplayer).on("ended", function () {
        var related_vid = $.ajax({
            url: "/Video/GetRelated?isvidended=true",
        });
        related_vid.done(function (htmlString) {
            var parser = new DOMParser();
            var html = parser.parseFromString(htmlString, "text/html");
            
            reorderCarousel(html);
        })        

        $(".vid-ended-carousel").on("mouseover", function () {
            $(".carousel-inner a[href='#video-ended-related']").css({
                "display": "block"
            })
        })

        var monitorAds = function () {
            var mpd = $(mpdFile).find("MPD");
            var totalPT = getDurations($(mpd).attr("mediaPresentationDuration"));
            $(ads).filter(function (ad) {
                if ((ad.start < (totalPT - ad.duration))
                    && (Math.floor(ad.duration) === Math.floor(vidplayer.duration))
                    && (ad.isplaying === true && !ad.adEnded)) {
                    ad.adEnded = true;
                    ad.isplaying = false;

                    // alert("Your this Ad has finished!");
                    period = $(mpdFile).find('Period[type="video"]');
                    if (!(vidplayer.currentTime >= getDurations($(period).attr("duration")))) {
                        vidplayer.currentTime = 0;
                    }
                    return ad;
                };
            });
        }

        var period = $(mpdFile).find('Period[start="' + Math.floor(vidplayer.duration) + '"]');
        if ($(period).length > 0) {
            if ($(period).attr("type") === "ad") {
                monitorAds();
                sourceBuffer.remove(0, sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1));
                let appInterval = setInterval(function () {
                    if (buffer.length > 0 && !sourceBuffer.updating) {
                        sourceBuffer.appendBuffer(buffer.shift());
                        clearInterval(appInterval);
                    }
                }, 1000);

                $(".ad-cntrls").css({
                    "display": "inline-block"
                })
                $(".ctrls-main-con").css({
                    "display": "none"
                })
            } else {
                monitorAds();
                sourceBuffer.remove(0, sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1));
                if (buffer.length > 0 && !sourceBuffer.updating) {
                    sourceBuffer.appendBuffer(buffer.shift());
                } else {
                    var appInterval = setInterval(function () {
                        if (buffer.length > 0 && !sourceBuffer.isupdating) {
                            console.log("Buffered Length Array = " + buffer.length);
                            var test = buffer.shift();
                            console.log("Buffered Length Array = " + buffer.length + " After Shifting!");
                            sourceBuffer.appendBuffer(test);
                            if (vidplayer.paused()) {
                                console.log("Video would be played!");
                                vidplayer.play();
                            }
                            clearInterval(appInterval);
                            alert("Should Play Main Video!");
                        }
                    }, 1000);
                }

                // alert("Main Video about to play!");
                $(".ad-cntrls").css({
                    "display": "none"
                })
                $(".ctrls-main-con").css({
                    "display": "inline-block"
                })
            }
        }
        $(".vid-ended-carousel").on("mouseout", function () {
            $(".carousel-inner a[href='#video-ended-related']").css({
                "display": "none"
            })
        })

        $("div[data-type='anchor']").on("click", function (e) {
            var href = $(this).attr("data-href");
            parentWindow.video_ended_anchor(href);
        })
    })

    vidplayer.onmouseout = function () {
        // setTimeout(function () {
        //    $(".controls-container").css({
        //        "display": "none"
        //    })
        // }, 3000);
    }

    // on duration loaded
    vidplayer.ondurationchange = function () {
        if (duration <= 0) {
            duration = mvideo.duration + mvideo.adsDurations;
            parentWindow.getRelated(descvalue, videoId, false);
            parentWindow.getRelatedVidInf(videoId);
            parentWindow.getComments(1, videoId, 1);
            fileContent.segmentsInf.loading = false;
            fileContent.segmentsInf.isProcessing = false;
            fileContent.playerInitialized = true;

            // This code would be here temporarily.
            var xmlRequest = new XMLHttpRequest();
            xmlRequest.open("GET", "/video/getviews?videoId=" + document.getElementById("videoId").getAttribute("value"));
            xmlRequest.onload = function (e) {
                if (this.status === 200) {
                    // alert("View Counted!");
                }
            }
            xmlRequest.send();
        }

        var width = $(vidplayer).innerWidth();
        var height = $(vidplayer).innerHeight();
        var ctrls_con = document.getElementById("ctrls-con");
        totalwidth = ctrls_con.clientWidth;
        var controls = $(".controls-container").innerWidth();

        $(ads).each(function (_index, ad) {
            if ((ad.start >= vidplayer.currentTime) && !ad.isplaying) {
                $(".ad-cntrls").css({
                    "display": "inline-block"
                });
                $(".ctrls-main-con").css({
                    "display": "none"
                });
                ad.isplaying = true;
            }
        });
        // console.log("Durration Changed! " + duration);
        displayTime();
        parentWindow.domContentLoaded();
    }
    vidplayer.onloadedmetadata = function () {
        // $(ads).each(function (_index, ad) {
        //    if ((ad.start >= vidplayer.currentTime)) {
        //        $(".ad-cntrls").css({
        //            "display": "inline-block"
        //        });
        //        $(".ctrls-main-con").css({
        //            "display": "none"
        //        })
        //        console.log("Loaded Metadata duration = " + vidplayer.duration);
        //    }
        // });    
    }
    window.playerError = function (errordata) {
        var player_con = document.getElementsByClassName("ply-parent-con")[0];
        var error_con = document.createElement("div");
        var error_wrapper = document.createElement("div");
        var retryLink = document.createElement("button");
        var _videoId = videoId;

        retryLink.textContent = "Retry";

        // retryLink.setAttribute("href", "/video/getplayer");
        // retryLink.setAttribute("data-ajax", true);
        // retryLink.setAttribute("data-ajax-success", "");
        // retryLink.setAttribute("data-ajax-failure", "");
        // retryLink.setAttribute("data-ajax-before", "");

        retryLink.classList = "btn btn-primary";

        var code = document.createElement("span");
        var message = document.createElement("span");
        var id = document.createElement("span");

        var error_inf = errordata;
        code.innerHTML = "Code: " + error_inf.code;
        message.innerHTML = "Message: " + error_inf.message;
        id.innerHTML = "PlaybackId: " + error_inf.Id;

        error_con.classList = "frameCon-plchldr";
        error_con.setAttribute("id", "frame-wrapper");
        error_wrapper.appendChild(id);
        error_wrapper.appendChild(message);
        error_wrapper.appendChild(code);
        error_wrapper.appendChild(retryLink);

        error_con.appendChild(error_wrapper);

        error_con.classList = "error-con";
        error_wrapper.classList = "error-wrapper";

        player_con.replaceWith(error_con);

        retryLink.addEventListener("click", function (e) {
            parentWindow.retry(videoId);
        });
    }
    window.addEventListener("DOMContentLoaded", function (e) {
        parentWindow.domContentLoaded();
    });

    // this is debugging the resize event.
    var resizingWidth = function () {
        var debuggingSpan = document.getElementById("debugging");
        var width = window.innerWidth;
        var height = window.innerHeight;

        debuggingSpan.style.color = "white";
        debuggingSpan.style.fontWeight = "bold";

        // console.log(width + "px x " + height + "px");
        debuggingSpan.innerHTML = width + "px X " + + height + "px";

        // reorderCarousel();
        // reorderCarousel();
    }

    window.addEventListener("resize", function (e) {
        resizingWidth();
        parentWindow.domContentLoaded();
    });
    window.addEventListener("load", function (e) {
        windowState = true;
        resizingWidth();
        parentWindow.readyState();
    });
})()

