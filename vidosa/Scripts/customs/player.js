/// <reference path="../jquery-3.3.1.min.js" />
/// <reference path="../jquery.signalr-2.4.0.min.js" />

(function () {
    var mediaSource;
    var sourceBuffer;
    var vidplayer = $("#vidplayer")[0];
    var videoId = $("#videoId").val();
    var descvalue = document.getElementById("descvalue").value;
    var parentWindow = window.parent;
    var duration = null;
    var totalwidth = 0;
    var windowState = false;

    // A web worker for processing the video streams
    if (typeof (Worker) != "undefined") {
        if (typeof (player_worker) === "undefined") {
            player_worker = new Worker("/scripts/customs/player_worker.js");
        }
    }

    // waiting for more data.
    let waiting = function () {
        $(".loading-img").css({
            "display": "block"
        });
        console.log("Waiting for Buffer");
        fileContent.videoElement.waiting = true;
        fileContent.videoElement.playing = false;
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

    // compute durations
    var getDurations = function (dur) {

        let h = dur.split("PT")[1].split("H")[0];
        let m = dur.split("PT")[1].split("H")[1].split("M")[0];
        let s = dur.split("PT")[1].split("H")[1].split("M")[1].split("S")[0];

        return ((h * 60 * 60) + (m * 60) + (Math.floor(s)));
    }

    // Create an in memory mp4 file

    // Declare object variables that represent the boxes.
    var trakBoxObj;
    var moofBoxObj;
    var trafBoxObj;
    var trunBoxObj;
    var tfhdBoxObj;
    var tfdtBoxObj;
    var mfhdBoxObj;
    var mvexBoxObj;
    var trexBoxObj;
    var mehdBoxObj;
    var mvhdBoxObj;
    var sttsBoxObj;
    var stcoBoxObj;
    var mdiaBoxObj;
    var minfBoxObj;
    var stblBoxObj;
    var cttsBoxObj;
    var stsdBoxObj;
    var moovBoxObj;
    var ftypBoxObj;
    var sidxBoxObj;
    var tkhdBoxObj;
    var iodsBoxObj;
    var mdhdBoxObj;
    var hdlrBoxObj;
    var vmhdBoxObj;
    var dinfBoxObj;
    var stszBoxObj;

    // The FullBox where all the boxes of the file inherit from.
    function FullBox(length, typeName) {
        this.length = length;
        this.typeName = typeName;
    }
    // FTYP Box
    function FtypBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.major_brand = "";
        this.minor_version = 0;
        this.compatible_brands = [];
    }
    // ftyp inherit from Fullbox
    FtypBox.prototype = new FullBox();
    
    // TRAK
    function TrakBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.tkhd = tkhdBoxObj;
        this.mdia = mdiaBoxObj;
        this.iods = iodsBoxObj;
    }
    // trak inherit from FullBox
    TrakBox.prototype = new FullBox();

    // MDAT
    var mdatBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
    }
    // mdatBox inherit from fullBox
    mdatBox.prototype = new FullBox();

    // MOOV
    function MoovBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.mvex = mvexBoxObj;
        this.trex = [];
        this.trak = [];
        this.mvhd = mvhdBoxObj;
    }
    // moov inherit from fullBox
    MoovBox.prototype = new FullBox();
    
    // moof
    var moofBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.mfhd = mfhdBoxObj;
        this.trafs = [];
    }
    // moofBox inherit from FullBox
    moofBox.prototype = new FullBox();

    // TRAF
    function TrafBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.tfdt = tfdtBoxObj;
        this.tfhd = tfhdBoxObj;
        this.trun = [];
    }
    // traf box inherit FullBox
    TrafBox.prototype = new FullBox();

    // tfhd 
    function TfhdBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.trackId = 0;
    }
    // tfhd box inherit FullBox
    TfhdBox.prototype = new FullBox();

    // trun
    function TrunBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.tr_flags = 0;
        this.sample_count = 0;
        this.data_offset = 0;
        this.first_sample_flags = 0;
        this.sample_duration = 0;
        this.composite_time_offset = 0;
    }
    // trun box inherit FullBox
    TrunBox.prototype = new FullBox();

    // MFHD
    function MfhdBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.sequence_number = 0;
    }
    // mfhd box inherit FullBox
    MfhdBox.prototype = new FullBox();
    
    // SIDX
    function SidxBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.version = 0;
        this.referenceCount = 0;
        this.reserved = 0;
        this.earliestPresentation = 0;
        this.referenceId = 0;
        this.timescale = 0;
        this.entry_count = [];
    }
    // sidx inherit from FullBox
    SidxBox.prototype = new FullBox();

    // MVEX
    function MvexBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.mehd = mehdBoxObj;
        this.trex = [];
    }
    // mvex box inherit from FullBox
    MvexBox.prototype = new FullBox();

    // TREX
    function TrexBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        
        this.trackID = 0;
        this.default_sample_description_index = 0;
        this.default_sample_duration = 0;
        this.default_sample_size = 0;
        this.default_sample_flags = 0;
    }
    // trex box inherit from FullBox
    TrexBox.prototype = new FullBox();

    // TKHD
    function TkhdBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.version = 0;
        this.creation_time = 0;
        this.modification_time = 0;
        this.track_Id = 0;
        this.reserved = 0;
        this.duration = 0;
        this.layer = 0;
        this.alternate_group = 0;
        this.volume = 0;
        this.matrix = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];
        this.width = 0;
        this.height = 0;
    }
    // tkhdbox inherit FullBox
    TkhdBox.prototype = new FullBox();

    // MDIA
    function MdiaBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.mdhd = mdhdBoxObj;
        this.minf = minfBoxObj;
        this.hdlr = hdlrBoxObj;
    }
    // MdiaBox inherit FullBox
    MdiaBox.prototype = new FullBox();

    // IODS
    var iodsBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
    }
    // iodsbox inherit FullBox
    iodsBox.prototype = new FullBox();

    // MDHD
    function MdhdBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.version = 0;
        this.creation_time = 0;
        this.modification_time = 0;
        this.timescale = 0;
        this.duration = 0;
        this.pad = 0;
        this.language = 0;
        this.pre_defined = 0;
    }
    // mdhdBox inherit FullBox
    MdhdBox.prototype = new FullBox();

    // MINF
    function MinfBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.vmhd = vmhdBoxObj;
        this.dinf = dinfBoxObj;
        this.stbl = stblBoxObj;
    }
    // minf inherit FullBox
    MinfBox.prototype = new FullBox();

    // HDLR
    function HdlrBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.pre_defined = 0;
        this.handler_type = 0;
        this.reserved = [];
        this.name = "";
    }
    // hdlrBox inherit FullBox
    HdlrBox.prototype = new FullBox();

    // VMHD
    function VmhdBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
    }
    // vmhdBox inherit FullBox
    VmhdBox.prototype = new FullBox();

    // DINF
    function DinfBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.dref = drefBoxObj;
    }
    // dinfBox inherit FullBox
    DinfBox.prototype = new FullBox();

    // STBL
    function StblBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.stsd = stsdBoxObj;
        this.stts = sttsBoxObj;
        this.stsz = stszBoxObj;
        this.stco = stcoBoxObj;
        this.ctts = cttsBoxObj;
    }
    // StblBox inherit FullBox
    StblBox.prototype = new FullBox();

    // DREF
    var drefBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
    }
    // drefBox inherit FullBox
    drefBox.prototype = new FullBox();

    // STSD
    function StsdBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.entry_count = 0;
        this.entries = [];

        // Add a method to the StsdBox prototype.
        StsdBox.prototype.create_entries_table = function (stsdBox) {
            var stsdView = new DataView(stsdBox);

            this.entry_count = stsdView.getUint32(12);
            let byteOffset = 16;

            for (var i = 0; i < this.entry_count; i++) {
                let sample_size = stsdView.getUint32(byteOffset);
                byteOffset += 4;
                let data_format = "";
                for (var charIndex = 0; charIndex < 4; charIndex++) {
                    data_format += String.fromCharCode(stsdView.getUint8(byteOffset + charIndex));
                }
                byteOffset += 4;
                let reference_index = stsdView.getUint16(byteOffset);
                byteOffset += 2;

                this.entries.push({ sample_size: sample_size, data_format: data_format, reference_index: reference_index });
            }
        }
    }    
    // stsdBox inherit FullBox
    StsdBox.prototype = new FullBox();

    // STTS
    function SttsBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.entry_count = 0;
        this.entries = [];    

        // Add the method to the prototype of SttsBox
        SttsBox.prototype.create_entries_table = function (sttsBox) {
            var sttsView = new DataView(sttsBox);
            // console.log("Length = " + sttsView.byteLength);
            this.entry_count = sttsView.getUint32(12);
            var byteOffset = 16;

            let typeName = "";
            for (var i = 0; i < 4; i++) {
                typeName += String.fromCharCode(sttsView.getInt8(4 + i));
            }
            
            // console.log("SampleCount\tSampleDelta" + " EntryCount = " + this.entry_count);
            for (var i = 0; i < this.entry_count; i++) {
                let sample_count = sttsView.getUint32(byteOffset);
                byteOffset += 4;
                let sample_delta = sttsView.getUint32(byteOffset);
                byteOffset += 4;
                this.entries.push({
                    sample_count: sample_count,
                    sample_delta: sample_delta
                });
                console.log(this.entries[i].sample_count + "\t" + this.entries[i].sample_delta);
            }
            return this.entry_count;
        }
    };
    
    // SttsBox inherit FullBox
    SttsBox.prototype = new FullBox();
    SttsBox.prototype.constructor = SttsBox;

    // STCO box
    function StcoBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.entry_count = 0;
        this.chunk_offsets = [];

        // Process the stcoBox (get out the offsets);
        StcoBox.prototype.processOffsets = function (stcoBox) {
            var stcoView = new DataView(stcoBox);
            var byteOffset = 12;

            this.entry_count = stcoView.getUint32(byteOffset);
            // console.log("Offsets: EntryCount = " + (this.entry_count));
            for (var i = 0; i < this.entry_count; i++) {
                byteOffset += 4;
                this.chunk_offsets.push(stcoView.getUint32(byteOffset));
                console.log(this.chunk_offsets[i]);
            }
        }       
    }    
    // StcoBox inherit FullBox.
    StcoBox.prototype = new FullBox();
    StcoBox.prototype.constructor = StcoBox;

    // STSS box
    function StssBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.entry_count = 0;
        this.sample_numbers = [];

        StssBox.prototype.get_sample_numbers = function (stssBox) {
            let stssView = new DataView(stssBox);
            this.entry_count = stssView.getUint32(12);
            let byteOffset = 16;
            for (var i = 0; i < this.entry_count; i++) {
                this.sample_numbers.push(stssView.getUint32(byteOffset));
                byteOffset += 4;
            }
        }
    }
    // StssBox inherit from FullBox
    StssBox.prototype = new FullBox();

    // STSZ
    function StszBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.sample_count = 0;
        this.sample_size = 0;
        this.entry_size_table = [];        
    }
    // Add the method to the StszBox
    StszBox.prototype.create_size_table = function (stszBox) {
        let stszView = new DataView(stszBox);
        let byteOffset = 12;
        this.sample_size = stszView.getUint32(byteOffset);
        byteOffset += 4;
        this.sample_count = stszView.getUint32(byteOffset);
        byteOffset += 4;

        if (this.sample_size === 0) {
            for (var i = 0; i < this.sample_count; i++) {
                this.entry_size_table.push(stszView.getUint32(byteOffset));
                byteOffset = i + 1 === this.sample_count ? byteOffset + 4 : byteOffset;
            }
        }
    }
    // stszBox inherit FullBox
    StszBox.prototype = new FullBox();

    // STZ2 box
    function Stz2Box(length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.sample_count = 0;
        this.sample_size = 0;
        this.entry_size_table = [];

        Stz2Box.prototype.create_size_table = function (stz2Box) {
            let stz2View = new DataView(stz2Box);
            let byteOffset = 12;
            this.sample_size = stszView.getUint32(byteOffset);
            byteOffset += 4;
            this.sample_count = stszView.getUint32(byteOffset);
            byteOffset += 4;

            if (this.sample_size === 0) {
                for (var i = 0; i < this.sample_count; i++) {
                    this.entry_size_table.push(stz2View.getUint32(byteOffset) + stz2View.getUint32(byteOffset + 4));
                    byteOffset = i + 1 === this.sample_count ? byteOffset + 8 : byteOffset;
                }
            }
        }
    }
    // Stz2Box inherit from FullBox
    Stz2Box.prototype = new FullBox();

    // TFDT box
    var tfdtBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.baseMediaDecodeTime = 0;
    }
    // tfdtBox inherit from FullBox
    tfdtBox.prototype = new FullBox();

    // MFHD box
    var mfhdBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.sequence_number = 0;
    }
    // mfhdBox inherit from FullBox
    mfhdBox.prototype = new FullBox();

    // MEHD box
    var mehdBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.fragment_duration = 0;
    }
    // MVHD box
    var mvhdBox = function (length, typeName) {
        FullBox.apply(this, [length, typeName]);
        this.creation_time = 0;
        this.modification_time = 0;
        this.timescale = 0;
        this.duration = 0;

        this.rate = 0x00010000; // typically 1.0
        this.volume = 0x0100; // typically, full volume
        this.reserved = 0;
        this.matrix = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000]; // Unity matrix
        this.pre_defined = [];
        this.next_trackId = 0;
    }
    // mvhdBox inherit from FullBox
    mvhdBox.prototype = new FullBox();

    // CTTS box
    function CttsBox(length, typeName) {
        FullBox.apply(this, [length, typeName]);

        this.entry_count = 0;
        this.entries = [];

        // Add a method to the prototype of CttsBox
        CttsBox.prototype.create_entries_table = function (cttsBox) {
            let cttsView = new DataView(cttsBox);
            this.entry_count = cttsView.getUint32(12);
            let byteOffset = 16;
            for (var i = 0; i < this.entry_count; i++) {
                let sample_count = cttsView.getUint32(byteOffset);
                byteOffset += 4;
                let sample_offset = cttsView.getUint32(byteOffset);
                byteOffset += 4;
                this.entries.push({ sample_count: sample_count, sample_offset: sample_offset });
            }
        }
    }
    // CTTS box End

    // VideoPlayer
    function VideoPlayer() {
        var player = vidplayer;
        this.initialized = false;
        this.duration = 0;
        this.waiting = false;
        this.playing = false;

        // on duration loaded
        
        VideoPlayer.prototype.AddEventListeners = function () {
            vidplayer.ondurationchange = function () {
                if (duration <= 0) {
                    duration = mvideo.duration + mvideo.adsDurations;
                    parentWindow.getRelated(descvalue, videoId, false);
                    parentWindow.getRelatedVidInf(videoId);
                    parentWindow.getComments(1, videoId, 1);

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
                VideoPlayer.prototype.durationchanged();
            }

            // add the on error event listener.
            vidplayer.addEventListener("error", function (e) {
                console.log("VideoElement Error: " + vidplayer.error.code + "; " + vidplayer.error.message);
            });
        }
        VideoPlayer.prototype.durationchanged = function () {
            console.log("Player Initialized");
            this.initialized = true;            
        }
        VideoPlayer.prototype.waiting = function () {
            this.playing = false;
        }
        VideoPlayer.prototype.error = function (error) {
            console.log("VideoElement Error: " + vidplayer.error.code + "; " + vidplayer.error.message);
        }
        VideoPlayer.prototype.player = function () {
            return player;
        }
    }
    var videoPlayer = new VideoPlayer();

    // Mp4 file
    function ISOMp4File() {
        this.sidx = [];
        this.ftyp = ftypBoxObj;
        this.moof = [];
        this.moov = moovBoxObj;
        this.mfra = [];
        this.free = [];
        this.skip = [];
    }
    // Create an object of the ISOMp4File object
    var objIsoMp4File = new ISOMp4File(); 

    // Current File Streaming.
    function FileDetails() {
        this.mediaFile = null;
        this.mfileView = null;
        this.segmentUrls = [];

        this.byteOffset = 0;
        this.isinit = false;
        this.boxes = ["sidx", "moov", "free", "mdat", "ftyp", "tref", "trak", "pdin", "mvhd", "tkhd",
            "edts", "elst", "mdia", "mdhd", "hdlr", "minf", "vmhd", "smhd", "hmhd", "nmhd",
            "dinf", "dref", "stbl", "stsd", "stts", "ctts", "stsc", "stsz", "stz2", "stco",
            "co64", "stss", "stsh", "padb", "stdp", "sdtp", "sbgp", "sgpd", "subs", "trep",
            "mvex", "mehd", "trex", "ipmc", "moof", "mfhd", "traf", "tfhd", "trun",
            "sdtp", "sbgp", "subs", "mfra", "tfra", "mfro", "mdat", "free", "skip", "iods",
            "udta", "cprt", "meta", "hdlr", "dinf", "dref", "iloc", "ipro", "tfdt",
            "sinf", "frma", "imif", "schm", "schi", "iinf", "xml ", "bxml", "pitm"];

        this.mpdFile = "";
        FileDetails.prototype.mergeSeg = function (segment) {
            try {                
                var segView = new DataView(segment);
                for (var i = 0; i < segView.byteLength; i++) {
                    this.mfileView.setInt8(this.byteOffset, segView.getInt8(i));
                    this.byteOffset += 1;
                }
            } catch (e) {
                if (e instanceof Error) {
                    console.log("General Error");
                }
                if (e instanceof RangeError) {
                    console.log("Range Error");
                }
            }
        }
        FileDetails.prototype.getboxInf = function (boxInfBytes) {
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
        }
        // create a segment that conforms to the dash standard.
        FileDetails.prototype.createIsoMp4 = function (segment) {
            let arrayInts = new Uint8Array(segment);
            this.isConforming = false;
            let boxOffset = 0;
            objIsoMp4File = new ISOMp4File();
            try {
                do {
                    let boxInf = this.getboxInf(segment.slice(boxOffset, boxOffset + 8));
                    // console.log("Box Name: " + boxInf.name + " Box Offset: " + boxOffset);
                    if (boxInf.boxValid) {
                        let boxSize = boxInf.size;
                        let boxName = boxInf.name;
                        let objbox = { name: boxName, size: boxSize, offset: boxOffset };

                        if (boxName === "ftyp") {
                            // console.log("Ftype Found");
                            FileDetails.prototype.ftyp(segment.slice(objbox.offset, objbox.offset + objbox.size));
                            objIsoMp4File.ftyp = ftypBoxObj;
                        }
                        if (boxName === "sidx") {
                            // console.log("Sidx Found");
                            FileDetails.prototype.sidx(segment.slice(objbox.offset, objbox.offset + objbox.size));
                            objIsoMp4File.sidx.push(sidxBoxObj);
                        }
                        if (boxName === "moof") {
                            // console.log("moof Found");
                            FileDetails.prototype.moof(segment.slice(objbox.offset, objbox.offset + objbox.size));
                            objIsoMp4File.moof.push(moofBoxObj);
                        }
                        if (boxName === "moov") {
                            // console.log("moov Found");
                            FileDetails.prototype.moov(segment.slice(objbox.offset, objbox.offset + objbox.size));
                            objIsoMp4File.moov = moovBoxObj;
                        }
                        boxOffset += boxSize;
                    }
                } while (boxOffset < arrayInts.byteLength);
            } catch (e) {
                if (e instanceof Error) {
                    console.log("An Error during the conformence check.");
                    console.log("ErrorName: " + e.name + "Message: " + "Stack: " + e.stack);
                }
            }
        }
        // check if the segment conforms to the dash standard.
        FileDetails.prototype.getConformence = function (segment) {
            let contentComponent = this.mpdFile.querySelector("ContentComponent[contentType='video']");
            let contentId = contentComponent.getAttribute("id");
            let objsampleEPT = { ept: 0, isinit: false, trackId: parseInt(contentId), isConforming: false };
            try {
                // console.log("Count Moofs = " + objIsoMp4File.moof.length);
                objIsoMp4File.moof.forEach(function (_moof) {
                    // console.log("Trafs Count = " + _moof.trafs.length);
                    var traf = _moof.trafs.find(function (_traf) {
                        // console.log("TfhdId = " + _traf.tfhd.trackId);
                        return parseInt(_traf.tfhd.trackId) === objsampleEPT.trackId;
                    });
                    if (traf === undefined || traf === null) {
                        console.log("trafs cannot be null");
                        return;
                    }
                    var trex = objIsoMp4File.moov.mvex.trex.find(function (_trex) {
                        return parseInt(_trex.trackID) === parseInt(traf.tfhd.trackId);
                    });
                    var objsidx = objIsoMp4File.sidx.find(function (_sidx) {
                        return _sidx.referenceId === traf.tfhd.trackId;
                    });
                    if ((objsidx === undefined || objsidx === null)) {
                        console.log("sidx cannot be null");
                    }
                    var timescale = objsidx.timescale;
                    var decodeTime = traf.tfdt.baseMediaDecodeTime;

                    // console.log("timescale = " + timescale + " decodeTime = " + decodeTime + " trun.sample_count = " + traf.trun.sample_count + " count truns = " + traf.trun);

                    let ctcontent = { trackId: "", ct: [] };
                    let smplduration = 0;

                    for (var sampleIndex = 1; sampleIndex <= traf.trun.sample_count; sampleIndex++) {
                        // Composition Time of the current sample.
                        let cntSmpCT = (decodeTime / timescale) +
                            (smplduration += (traf.trun.tr_flags & 0x000004 === 4) ? trex.default_sample_duration / timescale : traf.trun.sample_duration / timescale) +
                            (traf.trun.composite_time_offset / timescale);

                        // console.log("TrackId: " + traf.tfhd.trackId + " composition time sample " + sampleIndex + " = " + cntSmpCT + ", sample duration = " + smplduration);
                        ctcontent.ct.push(cntSmpCT);
                    }
                    // console.log("Sequency Number: " + _moof.mfhd.sequence_number);
                    if (_moof.mfhd.sequence_number === 1) {
                        console.log("Sequency Number: " + _moof.mfhd.sequence_number);
                        return true;
                    }
                });
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
            return true;
        }
        //  The Child boxes of the supplied box.
        FileDetails.prototype.getboxChildren = function (box) {
            let childboxSize = 0;
            let childboxOffset = 8;
            let boxView = new DataView(box);

            let currentBoxLength = boxView.getInt32(0);
            let objboxCollection = { isvalid: true, boxCollection: [] };

            do {
                let boxInf = FileDetails.prototype.getboxInf(box.slice(childboxOffset, childboxOffset + 8));
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
        }

        // The functions that manipulate the boxes.
        FileDetails.prototype.free = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;
        }
        FileDetails.prototype.ftyp = function (box) {
            console.log("FTYP Method Started");
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;
            ftypBoxObj = new FtypBox(boxSize, boxName);

            // create a view for the ftype box
            let ftypView = new DataView(box, 0, boxSize);
            let major_brand = "";

            let byteOffset = 8;
            for (var i = 0; i < 4; i++) {
                major_brand += String.fromCharCode(ftypView.getInt8(byteOffset));
            }
            byteOffset += 4;

            let minor_version = ftypView.getInt32(byteOffset);
            let com_brands = "";
            byteOffset += 4;
            let brands_counter = (ftypView.byteLength - byteOffset) / 4;
            ftypBoxObj.minor_version = minor_version;
            ftypBoxObj.major_brand = major_brand;

            for (var i = 0; i < brands_counter; i++) {
                for (var brandIndex = 0; brandIndex < 4; brandIndex++) {
                    com_brands += String.fromCharCode(ftypView.getInt8(byteOffset));
                    byteOffset += 1;
                }
                ftypBoxObj.compatible_brands.push(com_brands);
                com_brands = "";
            }
            objIsoMp4File.ftyp = ftypBoxObj;
            // console.log("FTYP Method ENDED");
            return ftypBoxObj;
        }
        FileDetails.prototype.trak = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            trakBoxObj = new TrakBox(boxSize, boxName);

            let children = FileDetails.prototype.getboxChildren(box).boxCollection;
            var _tkhd = children.find(function (child) {
                return child.name === "tkhd";
            });
            var _mdia = children.find(function (child) {
                return child.name === "mdia";
            });
            var _iods = children.find(function (child) {
                return child.name === "iods";
            });
            trakBoxObj.tkhd = _tkhd !== undefined ? FileDetails.prototype.tkhd(box.slice(_tkhd.offset, _tkhd.offset + _tkhd.size)) : null;
            trakBoxObj.mdia = _mdia !== undefined ? FileDetails.prototype.mdia(box.slice(_mdia.offset, _mdia.offset + _mdia.size)) : null;
            trakBoxObj.iods = _iods !== undefined ? FileDetails.prototype.iods(box.slice(_iods.offset, _iods.offset + _iods.size)) : null;

            return trakBoxObj;
        }
        FileDetails.prototype.moov = function (box) {
            try {
                // console.log("MOOV Method Started");
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
                let boxSize = boxInf.size;
                let boxName = boxInf.name;
                let children = FileDetails.prototype.getboxChildren(box).boxCollection;
                let _mvex = children.find(function (child) {
                    return child.name === "mvex";
                });
                let _traks = children.filter(function (child) {
                    return child.name === "trak";
                });
                let _mvhd = children.find(function (child) {
                    return child.name === "mvhd";
                });
                moovBoxObj = new MoovBox(boxSize, boxName);
                moovBoxObj.mvex = _mvex !== undefined ?
                    FileDetails.prototype.mvex(box.slice(_mvex.offset, _mvex.offset + _mvex.size)) : null;
                moovBoxObj.mvhd = _mvhd !== undefined ?
                    FileDetails.prototype.mvhd(box.slice(_mvhd.offset, _mvhd.offset + _mvhd.size)) : null;
                for (var i = 0; i < _traks.length; i++) {
                    moovBoxObj.trak.push(FileDetails.prototype.trak(box.slice(_traks[i].offset, _traks[i].offset + _traks[i].size)));
                }
                // console.log("MOOV Method Started");
                return moovBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.sidx = function (box) {
            try {
                // console.log("SIDX Method Started");
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
                let sidxView = new DataView(box);

                let boxSize = boxInf.size;
                let boxName = boxInf.name;

                sidxBoxObj = new SidxBox(boxSize, boxName);

                sidxBoxObj.version = sidxView.getUint32(8);
                sidxBoxObj.referenceId = sidxView.getUint32(12);
                sidxBoxObj.timescale = sidxView.getUint32(16);
                sidxBoxObj.earliestPresentation = sidxBoxObj.version === 0 ? sidxView.getUint32(20) : (sidxView.getUint32(20) + sidxView.getUint32(24)) / sidxView.getUint32(16);
                sidxBoxObj.offset = sidxBoxObj.version === 0 ? sidxView.getUint32(24) : sidxView.getUint32(28) + sidxView.getUint32(32);
                sidxBoxObj.reserved = sidxBoxObj.version === 0 ? sidxView.getInt16(28) : sidxView.getUint16(36);
                sidxBoxObj.referenceCount = sidxBoxObj.version === 0 ? sidxView.getInt16(30) : sidxView.getInt16(38);

                let _1stSubseg_index = sidxView.getUint32(8) === 0 ? 32 : 40;

                for (var i = 0; i < sidxBoxObj.referenceCount; i++) {
                    sidxBoxObj.entry_count.push({
                        reference_type: sidxView.getUint32(_1stSubseg_index) >>> 31,
                        reference_size: sidxView.getUint32(_1stSubseg_index) & 0x7fffffff,
                        sub_seg_duration: sidxView.getUint32(_1stSubseg_index + 4) / sidxBoxObj.timescale,
                        starts_with_SAP: ((sidxView.getUint32(_1stSubseg_index + 8)) >>> 31),
                        contains_sap: (sidxView.getUint32(_1stSubseg_index + 8) << 1) >>> 28,
                        sap_delta_time: (((sidxView.getUint32(_1stSubseg_index + 8)) << 1) << 3) / sidxBoxObj.timescale
                    });
                }
                objIsoMp4File.sidx.push(sidxBoxObj);
                // console.log("SIDX Method Ended");
                return sidxBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " Stack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.moof = function (box) {
            try {
                // console.log("MOOF Method Started");
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

                let boxSize = boxInf.size;
                let boxName = boxInf.name;
                let children = FileDetails.prototype.getboxChildren(box).boxCollection;

                moofBoxObj = new moofBox(boxSize, boxName);

                let _mfhd = children.find(function (child) {
                    return child.name === "mfhd";
                });

                let trafs = children.filter(function (child) {
                    return child.name === "traf";
                });
                moofBoxObj.mfhd = _mfhd !== undefined ?
                    this.mfhd(box.slice(_mfhd.offset, _mfhd.offset + _mfhd.size)) : null;
                // console.log("Sequence Number: " + (parseInt(moofBoxObj.mfhd.sequence_number)));
                for (var i = 0; i < trafs.length; i++) {
                    // console.log("TrafOffset: " + trafs[i].offset + " TrafSize: " + trafs[i].size);
                    moofBoxObj.trafs.push(FileDetails.prototype.traf(box.slice(trafs[i].offset, trafs[i].offset + trafs[i].size)));
                }
                objIsoMp4File.moof.push(moofBoxObj);
                // console.log("MOOF Method Ended");
                return moofBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.traf = function (box) {

            try {
                let boxInf = this.getboxInf(box.slice(0, 8));
                let boxSize = boxInf.size;
                let boxName = boxInf.name;
                let children = this.getboxChildren(box).boxCollection;
                let _tfdt = children.find(function (child) {
                    return child.name === "tfdt";
                });
                let _tfhd = children.find(function (child) {
                    return child.name === "tfhd";
                });
                let _trun = children.find(function (child) {
                    return child.name === "trun";
                });
                trafBoxObj = new TrafBox(boxSize, boxName);
                trafBoxObj.tfdt = _tfdt !== undefined ?
                    FileDetails.prototype.tfdt(box.slice(_tfdt.offset, _tfdt.offset + _tfdt.size)) : null;
                trafBoxObj.tfhd = _tfhd !== undefined ?
                    FileDetails.prototype.tfhd(box.slice(_tfhd.offset, _tfhd.offset + _tfhd.size)) : null;
                trafBoxObj.trun = _trun !== undefined ?
                    FileDetails.prototype.trun(box.slice(_trun.offset, _trun.offset + _trun.size)) : null;
                // console.log("TRAF Ended");

                return trafBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.tfhd = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            tfhdBoxObj = new TfhdBox(boxSize, boxName);
            let boxView = new DataView(box);
            tfhdBoxObj.trackId = boxView.getInt32(12);
            return tfhdBoxObj;
        }
        FileDetails.prototype.tfdt = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            tfdtBoxObj = new tfdtBox(boxSize, boxName);

            let boxView = new DataView(box);
            tfdtBoxObj.baseMediaDecodeTime = boxView.getInt32(12);
            return tfdtBoxObj;
        }
        FileDetails.prototype.sbgp = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            // console.log("====== sbgp printing ======");
            // console.log("boxName: " + boxName);
            // console.log("boxSize: " + boxSize);
            // console.log("====== sbgp end printing ======");
        }
        FileDetails.prototype.trun = function (box) {
            try {
                // console.log("TRUN Started");
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
                let trunBoxView = new DataView(box);

                let byteIndex = 12;

                let boxSize = boxInf.size;
                let boxName = boxInf.name;

                trunBoxObj = new TrunBox(boxSize, boxName);

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

                trunBoxObj.tr_flags = trunObj.tr_flags;
                trunBoxObj.composite_time_offset = trunObj.composite_time_offset;
                trunBoxObj.data_offset = trunObj.data_offset;
                trunBoxObj.first_sample_flags = trunObj.first_sample_flags;
                trunBoxObj.sample_count = trunObj.sample_count;
                trunBoxObj.sample_duration = trunObj.sample_duration;

                // console.log("TRUN ENDED");
                return trunBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.mfhd = function (box) {
            try {
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

                let boxSize = boxInf.size;
                let boxName = boxInf.name;

                mfhdBoxObj = new mfhdBox(boxSize, boxName);

                let mfhdView = new DataView(box.slice(12, boxSize));
                let sequence_number = mfhdView.getUint32(0);
                mfhdBoxObj.sequence_number = sequence_number;

                return mfhdBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.mvex = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
            let boxSize = boxInf.size;
            let boxName = boxInf.name;
            let children = FileDetails.prototype.getboxChildren(box).boxCollection;
            let _mehd = children.find(function (child) {
                return child.name === "mehd";
            });
            let _trexs = children.filter(function (child) {
                return child.name === "trex";
            });
            mvexBoxObj = new MvexBox(boxSize, boxName);
            mvexBoxObj.mehd = _mehd !== undefined ?
                FileDetails.prototype.mehd(box.slice(_mehd.offset, _mehd.offset + _mehd.size)) : null;

            for (var i = 0; i < _trexs.length; i++) {
                mvexBoxObj.trex.push(FileDetails.prototype.trex(box.slice(_trexs[i].offset, _trexs[i].offset + _trexs[i].size)));
            }
            return mvexBoxObj;
        }
        FileDetails.prototype.trex = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            let trexView = new DataView(box);
            trexBoxObj = new TrexBox(boxSize, boxName);

            trexBoxObj.trackID = trexView.getUint32(12);
            trexBoxObj.default_sample_description_index = trexView.getUint32(16);
            trexBoxObj.default_sample_duration = trexView.getUint32(20);
            trexBoxObj.default_sample_flags = trexView.getUint32(28);
            trexBoxObj.default_sample_size = trexView.getUint32(24);

            return trexBoxObj;
        }
        FileDetails.prototype.mehd = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            let mehdView = new DataView(box);
            mehdBoxObj = new mehdBox(boxSize, boxName);
            mehdBoxObj.fragment_duration = mehdView.getUint32(8);

            return mehdBoxObj;
        }
        FileDetails.prototype.mvhd = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;
            let mvhdView = new DataView(box);
            let byteOffset = 0;
            let versionFlags = mvhdView.getUint32(8, false);
            byteOffset += 8;
            mvhdBoxObj = new mvhdBox(boxSize, boxName);

            byteOffset += versionFlags >>> 24 === 1 ? 4 : 0;
            mvhdBoxObj.creation_time = versionFlags >>> 24 === 1 ?
                (mvhdView.getUint32(byteOffset, false) + mvhdView.getUint32(byteOffset + 4, false)) : mvhdView.getUint32(byteOffset, false);
            byteOffset += versionFlags >>> 24 === 1 ? 8 : 4;
            mvhdBoxObj.modification_time = versionFlags >>> 24 === 1 ?
                (mvhdView.getUint32(byteOffset, false) + mvhdView.getUint32(byteOffset + 4, false)) : mvhdView.getUint32(byteOffset, false);
            byteOffset += versionFlags >>> 24 === 1 ? 8 : 4;
            mvhdBoxObj.timescale = mvhdView.getUint32(byteOffset, false);
            byteOffset += 4;
            mvhdBoxObj.duration = versionFlags >>> 24 === 1 ?
                (mvhdView.getUint32(byteOffset, false) + mvhdView.getUint32(byteOffset + 4, false)) : mvhdView.getUint32(byteOffset, false);
            byteOffset += versionFlags >>> 24 === 1 ? 8 : 4;

            return mvhdBoxObj;
        }
        FileDetails.prototype.mdat = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

        }
        FileDetails.prototype.stts = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            sttsBoxObj = new SttsBox(boxSize, boxName);
            sttsBoxObj.create_entries_table(box);

            return sttsBoxObj;
        }
        FileDetails.prototype.stco = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            stcoBoxObj = new StcoBox(boxSize, boxName);
            stcoBoxObj.processOffsets(box);

            return stcoBoxObj;
        }
        FileDetails.prototype.mdia = function (box) {
            try {
                // console.log("Mdia Started");
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

                let boxSize = boxInf.size;
                let boxName = boxInf.name;

                let children = FileDetails.prototype.getboxChildren(box).boxCollection;
                let _mdhd = children.find(function (child) {
                    return child.name === "mdhd";
                });
                let _hdlr = children.find(function (child) {
                    return child.name === "hdlr";
                });
                let _minf = children.find(function (child) {
                    return child.name === "minf";
                });
                mdiaBoxObj = new MdiaBox(boxSize, boxName);
                mdiaBoxObj.minf = _minf !== undefined ?
                    FileDetails.prototype.minf(box.slice(_minf.offset, _minf.offset + _minf.size)) : null;
                mdiaBoxObj.mdhd = _mdhd !== undefined ?
                    FileDetails.prototype.mdhd(box.slice(_mdhd.offset, _mdhd.offset + _mdhd.size)) : null;
                mdiaBoxObj.hdlr = _hdlr !== undefined ?
                    FileDetails.prototype.hdlr(box.slice(_hdlr.offset, _hdlr.offset + _hdlr.size)) : null;
                // console.log("Mdia ENDED");
                return mdiaBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.minf = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            let children = FileDetails.prototype.getboxChildren(box).boxCollection;
            let _stbl = children.find(function (child) {
                return child.name === "stbl";
            });
            minfBoxObj = new MinfBox(boxSize, boxName);
            minfBoxObj.stbl = _stbl !== undefined ?
                this.stbl(box.slice(_stbl.offset, _stbl.offset + _stbl.size)) : null;

            return minfBoxObj;
        }
        FileDetails.prototype.mdhd = function (box) {
            try {
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
                let mdhdView = new DataView(box);
                let boxSize = boxInf.size;
                let boxName = boxInf.name;
                mdhdBoxObj = new MdhdBox(boxSize, boxName);

                let byteOffset = 8;
                mdhdBoxObj.version = mdhdView.getUint32(byteOffset);
                byteOffset += 4;
                mdhdBoxObj.creation_time = mdhdBoxObj.version === 1 ? mdhdView.getUint32(byteOffset) + mdhdView.getUint32(byteOffset + 4) : mdhdView.getUint32(byteOffset);
                byteOffset += mdhdBoxObj.version === 1 ? 8 : 4;
                mdhdBoxObj.modification_time = mdhdBoxObj.version === 1 ? mdhdView.getUint32(byteOffset) + mdhdView.getUint32(byteOffset + 4) : mdhdView.getUint32(byteOffset);
                mdhdBoxObj.timescale = mdhdView.getUint32(byteOffset);
                byteOffset += 4;
                mdhdBoxObj.duration = mdhdBoxObj.version === 1 ? mdhdView.getUint32(byteOffset) + mdhdView.getUint32(byteOffset + 4) : mdhdView.getUint32(byteOffset);

                // More properties to be assigned.
                return mdhdBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.hdlr = function (box) {
            try {
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
                let hdlrView = new DataView(box);
                let boxSize = boxInf.size;
                let boxName = boxInf.name;

                let byteOffset = 12;
                hdlrBoxObj = new HdlrBox(boxSize, boxName);
                hdlrBoxObj.pre_defined = hdlrView.getUint32(byteOffset);
                byteOffset += 4;
                hdlrBoxObj.handler_type = hdlrView.getUint32(byteOffset);

                // Set more properties.

                return hdlrBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
        FileDetails.prototype.stbl = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            let children = FileDetails.prototype.getboxChildren(box).boxCollection;
            let _stsd = children.find(function (child) {
                return child.name === "stsd";
            });
            let _stts = children.find(function (child) {
                return child.name === "stts";
            });
            let _ctts = children.find(function (child) {
                return child.name === "ctts";
            });
            let _stco = children.find(function (child) {
                return child.name === "stco";
            });

            stblBoxObj = new StblBox(boxSize, boxName);
            stblBoxObj.stts = _stts !== undefined ?
                FileDetails.prototype.stts(box.slice(_stts.offset, _stts.offset + _stts.size)) : null;
            stblBoxObj.stco = _stco !== undefined ?
                FileDetails.prototype.stco(box.slice(_stco.offset, _stco.offset + _stco.size)) : null;
            stblBoxObj.stsd = _stsd !== undefined ?
                FileDetails.prototype.stsd(box.slice(_stsd.offset, _stsd.offset + _stsd.size)) : null;
            stblBoxObj.ctts = _ctts !== undefined ?
                FileDetails.prototype.ctts(box.slice(_ctts.offset, _ctts.offset + _ctts.size)) : null;

            return stblBoxObj;
        }
        FileDetails.prototype.stsd = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            stsdBoxObj = new StsdBox(boxSize, boxName);
            stsdBoxObj.create_entries_table(box);
            return stsdBoxObj;
        }
        FileDetails.prototype.ctts = function (box) {
            let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));

            let boxSize = boxInf.size;
            let boxName = boxInf.name;

            cttsBoxObj = new CttsBox(boxSize, boxName);
            cttsBoxObj.create_entries_table(box);

            return cttsBoxObj;
        }
        FileDetails.prototype.tkhd = function (box) {
            try {
                // console.log("TKHD Started");
                let boxInf = FileDetails.prototype.getboxInf(box.slice(0, 8));
                let tkhdView = new DataView(box);
                let boxSize = boxInf.size;
                let boxName = boxInf.name;
                let byteOffset = 8;

                tkhdBoxObj = new TkhdBox(boxSize, boxName);
                tkhdBoxObj.version = tkhdView.getUint32(byteOffset) >>> 24;
                byteOffset += 4;
                tkhdBoxObj.creation_time = tkhdBoxObj.version === 1 ? (tkhdView.getUint32(byteOffset) + tkhdView.getUint32(byteOffset + 4)) : tkhdView.getUint32(byteOffset);
                byteOffset += tkhdBoxObj.version === 1 ? 8 : 4;
                tkhdBoxObj.modification_time = tkhdBoxObj.version === 1 ? (tkhdView.getUint32(byteOffset) + tkhdView.getUint32(byteOffset + 4)) : tkhdView.getUint32(byteOffset);
                byteOffset += tkhdBoxObj.version === 1 ? 8 : 4;
                tkhdBoxObj.track_Id = tkhdView.getUint32(byteOffset);
                byteOffset += 4;
                byteOffset += 4; // Reserved bytes.
                tkhdBoxObj.duration = tkhdBoxObj.version === 1 ? (tkhdView.getUint32(byteOffset) + tkhdView.getUint32(byteOffset + 4)) : tkhdView.getUint32(byteOffset);
                byteOffset += tkhdBoxObj.version === 1 ? 8 : 4;
                byteOffset += 16; // Array of two 32 bit reserved bytes.
                tkhdBoxObj.layer = tkhdView.getUint16(byteOffset);
                byteOffset += 2;
                tkhdBoxObj.alternate_group = tkhdView.getUint16(byteOffset);

                // console.log("TrackId: " + tkhdBoxObj.track_Id);
                // More object properties to add.
                // console.log("TKHD Ended");
                return tkhdBoxObj;
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ErrorName: " + e.name + " ErrorMessage: " + e.message + " ErrorStack: " + e.stack);
                }
            }
        }
    }
    FileDetails.prototype = new FileDetails();    
    var fileDetails = null;

    // Custom SourceBuffer
    function Source_Buffer() {
        this.sourceBuffer = null;
        this.updating = false;
        this.mode = "";
        this.textTracks = [];
        this.videoTracks = [];
        this.audioTracks = [];
        this.buffered = null;
        this.timeStampOffset = 0;
        this.appendWindowStart = 0;
        this.appendWindowEnd = 0;

        // Custom Properties.
        this.codecs = "";
        this.presentationId = 0;
        this.fileName = "";
        this.isupdating = false;
        this.segment_index = 0;
        this.iserror = false;

        // Append into the buffer.
        Source_Buffer.prototype.appendBuffer = function (buffer) {     
            var fileName = fileDetails.mpdFile.querySelector("BaseURL").innerHTML;
            var sourceBuffer = mediaSource.sourceBuffers.find(function (sb) {
                return sb.fileName === fileName;
            });
            if (!sourceBuffer.sourceBuffer.updating) {
                sourceBuffer.sourceBuffer.appendBuffer(buffer);                
            }
        }
        // Remove from the buffer.
        Source_Buffer.prototype.remove = function (start, end) {            
            this.sourceBuffer.remove(start, end);
        }

        // Report an error.
        Source_Buffer.prototype.error = function (e) {
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
        }

        // Add Event Listeners.
        Source_Buffer.prototype.addEventListeners = function () {
            this.sourceBuffer.addEventListener("updateend", function () {
                try {
                    var fileName = fileDetails.mpdFile.querySelector("BaseURL").innerHTML;                  
                    var sourceBuffer = mediaSource.sourceBuffers.find(function (sb) {
                        return sb.fileName === fileName;
                    });                 
                    if (this != null && this.buffered != null && this.buffered.length) {
                        for (var i = 0; i < this.buffered.length; i++) {
                            var endY = this.buffered.end(i);
                            var startX = this.buffered.start(i);
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
                        sourceBuffer.segment_index += 1;                       
                    }
                    sourceBuffer.updating = this.updating;
                } catch (e) {
                    if (e instanceof Error) {
                        if (e.name === "InvalidStateError") {
                            // this.getMediaSource();
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
                    }
                }
            });
            this.sourceBuffer.addEventListener("error", function (e) {
                alert("Error in the Source Buffer");
            });
        }

        Source_Buffer.prototype.monitorFile = function () {
            var monitorInterval = setInterval(function () {                
                fileDetails = fileDetails === null || fileDetails === undefined ? new FileDetails() : fileDetails;
                var fileName = fileDetails.mpdFile.querySelector("BaseURL").innerHTML;
                // console.log("Buffers In Media Source = " + mediaSource.sourceBuffers.length);

                var sourceBuffer = mediaSource.sourceBuffers.find(function (sb) {
                    return sb.fileName === fileName;
                });

                if (!videoPlayer.initialized) {
                    var initCoords = fileDetails.mpdFile.querySelector("Initialization");
                    var start = parseInt(initCoords.getAttribute("range").split("-")[0]);
                    var end = parseInt(initCoords.getAttribute("range").split("-")[1]);                  

                    if (fileDetails.byteOffset > end) {
                        // console.log("ByteOffset = " + fileDetails.byteOffset);
                        videoPlayer.AddEventListeners();
                        var Init = fileDetails.mediaFile.slice(start, (end - start) + 1);
                        fileDetails.createIsoMp4(Init);
                        if (fileDetails.getConformence(Init)) {                            
                            if (sourceBuffer !== null && sourceBuffer !== undefined) {    
                                videoPlayer.initialized = true;
                                sourceBuffer.updating = true;
                                sourceBuffer.appendBuffer(Init);
                            }                            
                        }
                    }
                }

                // console.log("Updating = " + sourceBuffer.updating);
                if (fileDetails.segmentUrls[sourceBuffer.segment_index] !== null &&
                    fileDetails.segmentUrls[sourceBuffer.segment_index] !== undefined &&
                    !sourceBuffer.updating) {
                    
                    var start = parseInt(fileDetails.segmentUrls[sourceBuffer.segment_index].getAttribute("mediaRange").split("-")[0]);
                    var end = parseInt(fileDetails.segmentUrls[sourceBuffer.segment_index].getAttribute("mediaRange").split("-")[1]);
                    
                    if (fileDetails.byteOffset > end && videoPlayer.initialized) {
                        var segment = fileDetails.mediaFile.slice(start, start + ((end - start) + 1));
                        fileDetails.createIsoMp4(segment);
                        if (fileDetails.getConformence(segment)) {
                            sourceBuffer.updating = true;
                            sourceBuffer.appendBuffer(segment);
                        }
                    }
                }
                if (fileDetails.byteOffset >= fileDetails.byteLength) {
                    clearInterval(monitorInterval);
                }
            }, 10);
        };
    };
    Source_Buffer.prototype = new Source_Buffer();

    // Error Handlinng
    function TypeNotSupported(message = "", name = "CodingTypeNotSupported") {
        this.message = message;
        this.name = name;
    }
    Error.prototype.error = function (name, message) {
        parentWindow.pausePlayStream("playerErrorCall");
        var videlemcon = document.getElementById("videlemcon");
        var loadingImage = document.getElementsByClassName("loading-img")[0];
        loadingImage.style.display = "none";

        var errormessageDiv = document.createElement("div");
        var errorheader = document.createElement("h5");
        var errormessageCon = document.createElement("div");
        var errorbodyCon = document.createElement("div");
        var messagelabel = document.createElement("span");
        var messagetitle = document.createElement("span");
        var labeltitleCon = document.createElement("div");
        var warningSignCon = document.createElement("span");
        var messagetitleCon = document.createElement("div");
        var messagelabel_ = document.createElement("span");
        var messagetitle_ = document.createElement("span");

        // Set Attributes and properties for the errormessage and messagetitle span.
        messagelabel.className = "messagelabel";
        messagelabel.innerHTML = "Error Name: ";
        messagetitle.className = "messagetitle";
        messagetitle.innerHTML = name;

        messagelabel_.className = "messagelabel";
        messagelabel_.innerHTML = "Message: ";
        messagetitle_.className = "messagelabel";
        messagetitle_.innerHTML = message;

        // Set Attributes and properties for the errormessage div.
        errormessageDiv.className = "errormessage";
        errormessageDiv.setAttribute("id", "errorMessage");

        // Set Attributes and properties for the error body div.
        errorbodyCon.className = "errorbody";

        // Set Attributes and properties for the warning sign span.
        warningSignCon.className = "glyphicon glyphicon-warning-sign";

        // Set Attributes and properties for the error header (h5).
        errorheader.className = "errorheader";
        errorheader.appendChild(warningSignCon);
        errorheader.append(" Error");

        errormessageCon.className = "errormessagecon";
        errormessageCon.appendChild(messagelabel);

        errormessageCon.appendChild(messagetitle);

        // Set the attributes and properties of the labeltitleCon div.
        labeltitleCon.className = "errorcontentCon";
        labeltitleCon.appendChild(messagelabel);
        labeltitleCon.appendChild(messagetitle);

        errorbodyCon.appendChild(labeltitleCon);


        // append the the messagelabe and messagetitle span with the new values.
        messagetitleCon.className = "errorcontentCon";
        messagetitleCon.appendChild(messagelabel_);
        messagetitleCon.appendChild(messagetitle_);

        errorbodyCon.appendChild(messagetitleCon);

        errormessageDiv.appendChild(errorbodyCon);

        // Create the retry anchor
        var retry = document.createElement("a");
        retry.classList = "btn btn-primary";
        retry.setAttribute("href", "/");

        videlemcon.appendChild(errormessageDiv);
    };
    TypeNotSupported.prototype = Error.prototype;

    // Custom MediaSource.
    function Media_Source() {
        var media_source = new MediaSource();
        
        this.source_buffers = [];     
        this.activeSourceBuffers = [];
        this.sourceBuffers = [];
        this.duration = 0;
        this.readyState = false;
        this.mediasource = media_source;

        Media_Source.prototype.addSourceBuffer = function (sourceBuffer) {
            try {
                var isChromium = window.chrome;
                var winNav = window.navigator;
                var vendorName = winNav.vendor;
                var isOpera = typeof window.opr !== "undefined";
                var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
                var isIOSChrome = winNav.userAgent.match("CriOS");

                var representation = fileDetails.mpdFile.querySelector("Representation");
                var adaptationSet = fileDetails.mpdFile.querySelector("AdaptationSet");
              
                var fileName = fileDetails.mpdFile.querySelector("BaseURL");
                var mimeType = adaptationSet.getAttribute("mimType");
                var codecs = representation.getAttribute("codecs");
                var encodings = mimeType + ';codecs="' + codecs + '"';

                if (MediaSource.isTypeSupported(encodings)) {
                    sourceBuffer.codecs = encodings;
                    sourceBuffer.fileName = fileName.innerHTML;
                    console.log("Codecs: " + sourceBuffer.codecs);
                }
                else {
                    throw new TypeNotSupported("Codec not supported", "CodingTypeNotSupported");   
                    }                

                if (isIOSChrome) {
                    // is Google Chrome on IOS                              
                    sourceBuffer.sourceBuffer = media_source.addSourceBuffer(encodings);                    
                } else if (
                    isChromium !== null &&
                    typeof isChromium !== "undefined" &&
                    vendorName === "Google Inc." &&
                    isOpera === false &&
                    isIEedge === false
                ) {
                    // is Google Chrome
                    sourceBuffer.sourceBuffer = media_source.addSourceBuffer(encodings);
                    console.log("Source Buffer Added");
                } else {
                    // not Google Chrome 
                    sourceBuffer.sourceBuffer = media_source.addSourceBuffer('video/mp4');
                }
                sourceBuffer.sourceBuffer.mode = "sequence";
                sourceBuffer.addEventListeners();
                this.sourceBuffers.push(sourceBuffer);
                var source_buffer = this.sourceBuffers.find(function (sb) {
                    return sb.fileName === fileName.innerHTML;
                });                
                source_buffer.monitorFile();
                return sourceBuffer.sourceBuffer;
            } catch (e) {
                if (e instanceof Error) {
                    if (e.name === "CodingTypeNotSupported") {
                        e.error("CodingTypeNotSupported", "There was an error during parsing of an mpd file.");
                    } else {
                        alert("Something Happened during adding a sourceBuffer");
                    }
                }
            }
        }
        Media_Source.prototype.addEventListeners = function () {
            // videoPlayer = videoPlayer === null || videoPlayer === undefined ? new VideoPlayer() : videoPlayer;
            vidplayer.src = URL.createObjectURL(media_source);                 
            media_source.addEventListener("sourceopen", function () {
                try {
                    //alert("Source Open");
                    var sourceBuffer = new Source_Buffer();
                    mediaSource.addSourceBuffer(sourceBuffer);
                } catch (e) {
                    alert("Exception " + e.message);
                }
            });
            media_source.addEventListener("sourceclosed", function () {

            });
        }
        Media_Source.prototype.getSourceBuffers = function () {
            return this.sourceBuffers;
        }
        Media_Source.prototype.getActiveSourceBuffers = function () {
            return this.activeSourceBuffers;
        }
    };    
    Media_Source.prototype = new Media_Source();
    //var mediaSource = new Media_Source();
    
    // object to hold the streaming file content.
    var fileContent = {
        videoElement: {
            waiting: false,
            playing: false,
            played: false,
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
       }

    // Get the Mpd of the file to stream.
    var mpd_request = $.ajax({
        url: "/video/getmpd?videoId=" + videoId,
    })
    mpd_request.done(function (mpdfile) {
        var domParser = new DOMParser();
        var xmlDoc = domParser.parseFromString(mpdfile, "text/xml");
        
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
        var fileName = mpdFile.querySelector("BaseURL");
        var byteLength = parseInt((lastSegURL.getAttribute("mediaRange").split('-')[1]).trim()) + 1;

        fileDetails = new FileDetails();
        fileDetails.mediaFile = new ArrayBuffer(byteLength);
        fileDetails.mfileView = new DataView(fileDetails.mediaFile);
        // console.log("SegmentURL Length = " + segmentURL.length);
        for (var i = 0; i < segmentURL.length; i++) {
            fileDetails.segmentUrls.push(segmentURL[i]);
        }
        // console.log("fileDetails.segmentUrls Length = " + fileDetails.segmentUrls.length);

        fileDetails.mpdFile = mpdfile;
        mediaSource = mediaSource === null || mediaSource === undefined ? new Media_Source() : mediaSource;                
        mediaSource.addEventListeners();

        //alert("New Buffers in Media = " + mediaSource.sourceBuffers.length);

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
            fileDetails = fileDetails === null || fileDetails === undefined ? new FileDetails() : fileDetails;
            fileDetails.createIsoMp4(data.segment);
            if (fileDetails.getConformence(data.segment)) {
                console.log("Merge Segment");
                fileDetails.mergeSeg(data.segment);                
            } else {

            }            
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

    // Receive the merged segment from the web worker.
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

    // Receiving segments 
    function RecSegments() {
        this.subsegments = [];
        this.content = [];
        this.representationId = 0;
        this.segment_index = 0;
        this.isinit = false;
        this.Uint8Array = null;     
    }
    var objrec_segments = new RecSegments();
    
    window.vidseg = function (data) {
        if (data.isLastsubsegment) {
            objrec_segments.subsegments.push(data.currentvideo.content);
            objrec_segments.content = objrec_segments.subsegments.splice(0, objrec_segments.subsegments.length);
            objrec_segments.segment_index = data.currentvideo.segIndex;
            objrec_segments.Uint8Array = new Uint8Array(data.currentvideo.segSize);
            console.log("Complete Segment");
            player_worker.postMessage(objrec_segments);
        } else {
            if (data.initialization) {
                objrec_segments = objrec_segments === null  || objrec_segments === undefined ? new RecSegments() : objrec_segments;
                objrec_segments.subsegments.push(data.currentvideo.content);
                objrec_segments.content = objrec_segments.subsegments.splice(0, objrec_segments.subsegments.length);
                objrec_segments.representationId = data.currentvideo.representationId;
                objrec_segments.Uint8Array = new Uint8Array(data.currentvideo.segSize);
                objrec_segments.segment_index = data.currentvideo.segIndex;
                player_worker.postMessage(objrec_segments);

                console.log("Initialization Received!");                
                return;
            }
            objrec_segments.subsegments.push(data.currentvideo.content);            
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

        //console.log("IsProcessing = " + fileContent.segmentsInf.isProcessing + " Loading = " + fileContent.segmentsInf.loading + 
        //    " Duration = " + mvideo.duration + " BufferedTime = " + Math.ceil(sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)));
        //if (!fileContent.segmentsInf.isProcessing && !fileContent.segmentsInf.loading &&
        //    (Math.ceil(sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)) < mvideo.duration)) {
            
        //    let percentBuffered = (vidplayer.currentTime / sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)) * (100);
        //    let nextSegment = fileContent.segmentUrls[fileContent.segmentsInf.arrayIndex < (fileContent.segmentUrls.length - 1) ?
        //        fileContent.segmentsInf.arrayIndex + 1 : fileContent.segmentsInf.arrayIndex];
        //    let end = parseInt(nextSegment.getAttribute("mediaRange").split("-")[1]);

        //    console.log("recIndex = " + fileContent.segmentsInf.recIndex + " end = " + end + " percentBuffered = " + percentBuffered + " byteLength = " +
        //        fileContent.mediaFile.byteLength);
        //    if ((fileContent.segmentsInf.recIndex > fileContent.segmentsInf.arrayIndex) &&
        //        (fileContent.segmentsInf.recIndex < fileContent.segmentUrls.length)) {
        //        if (percentBuffered >= 30) {
        //            console.log("Timeupdate Appending!");
        //            fileContent._appendSegment();
        //        }               
        //    }                     
        //}
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

