/// <reference path="../jquery-3.3.1.min.js" />
/// <reference path="../jquery.signalr-2.4.0.min.js" />

(function () {
    var mediaSource = null;
    var sourceBuffer = null;
    var vidplayer = $("#vidplayer")[0];
    var fileReader = new FileReader();
    var videoId = $("#videoId").val();
    var bandwidth = $("#bandwidth").val();
    var parentWindow = window.parent;
    var duration = null;
    var progressBar = $(".progress-buffered");
    var totalwidth = 0;
    var segments = [];

    // A web worker for processing the video streams
    if (typeof (Worker) != "undefined") {
        if (typeof (player_worker) === "undefined") {
            player_worker = new Worker("/scripts/customs/player_worker.js");
        }
    }

    // Initialize the frame holding the video.
    parentWindow.frameInit();

    var isomediaStream = {
        streamId: ""
    };

    var mpdFile;
    var init_mpdfile = function (file) {
        mpdFile = file;
    }

    var mpd_request = $.ajax({
        url: "/video/getmpd?videoId=" + videoId,
    })
    mpd_request.done(function (mpdfile) {
        var file = mpdfile;
        init_mpdfile(mpdFile);

        var representations = $(file).find("Representation");
        var inItSeg = $(file).find("Initialization");

        var req_stream = $.ajax({
            url: "/video/startstreaming?videoId=" + videoId,
        })
    })

    // Receive messages from the worker
    player_worker.onmessage = function (event) {
        try {
            try {
                var blob = new Blob([event.data.segment], { type: "video/mp4" });
                var sourceBuffer = mediaSource.sourceBuffers[event.data.representationId - 1];
                var reader = new FileReader();
                reader.addEventListener("loadend", function () {
                    sourceBuffer.appendBuffer(reader.result);
                });
                reader.readAsArrayBuffer(blob);
            } catch (e) {
                console.log("Error when apending " + e.ErrorName);
            }
        } catch (e) {
            console.log("Error Reading the blob");
        }
    }

    // Functions for prototypal inheritance

    // Cloning
    var clone = function (donor) {
        var Proxy = function () { };
        Proxy.prototype = donor;
        return new Proxy();
    }
    // Emulate
    var emulate = function (donor, more) {
        var Proxy = function () { }, child, m;
        Proxy.prototype = donor;
        child = new Proxy();
        for (var m in more) {
            child[m] = more[m];
        }
        return child;
    }
    // cloneMembers
    var cloneMembers = function (donor, donee) {
        donee = donee || {};
        for (var m in donor) {
            if (typeof donor[m] === "object" && donor[m] !== null) {
                donee[m] = typeof donor[m].pop === "function" ? [] : {};
            } else {
                donee[m] = donor[m];
            }
        }
        return donee;
    }
    // Extend
    var extend = function () {
        var Proxy = function () { };
        return function (child, parent) {
            Proxy.prototype = parent.prototype;
            child.prototype = new Proxy();
            child.prototype.constructor = child;
            child.donor = parent.prototype;
        }
    };

    var createMp4 = function (segment) {

        var readfType = function (ftypeBox) {

        }

        // Create an in memory mp4 file
        var FullBox = function FullBox(length, typeName) {
            this.length = length;
            this.typeName = typeName;
        }
        FullBox.prototype = {};

        // FTYPE Box
        var FtypeBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.majorBrand = "";
            this.minorBrand = "";
            this.compatibleBrands = "";
            this.isdata = true;
        }
        // ftype inherit from Fullbox
        extend(FtypeBox, FullBox);
        FtypeBox.prototype = {

        };

        // ftype box object
        var ftypeBoxObj = new FtypeBox(0, "ftyp")

        // TRAK
        var trakBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.tkhd = tkhdBoxObj;
            this.mdia = mdiaBoxObj;
            this.iods = iodsBoxObj;
            this.isdata = false;
        }
        // trak inherit from FullBox
        extend(trakBox, FullBox);
        trakBox.prototype = {

        }
        // trakBox object
        var trakBoxObj = new trakBox(0, "trak");

        // MDAT
        var mdatBox = function (length, typeName) {
            FullBox.apply(this, typeName);
        }
        // mdatBox inherit from fullBox
        extend(mdatBox, FullBox);
        mdatBox.prototype = {

        }

        // mdatBox object
        var mdatBoxObj = new mdatBox(0, "mdat");

        // MOOV
        var moovBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.mvex = mvexBoxObj;
            this.trex = [];
            this.isdata = false;
        }

        // moov inherit from fullBox
        extend(moov, FullBox);
        moov.prototype = {

        }

        // moov box object
        var moovBoxObj = new moovBox(0, "moov")

        // moof
        var moofBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.mfhd = mfhdBoxObj;
            this.trafs = [];
        }

        // moofBox inherit from FullBox
        extend(moofBox, FullBox);
        moofBox.prototype = {

        }

        // moof box object
        var moofBoxObj = new moofBox(0, "moof");

        // TRAF
        var traf = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.tfhd = tfhdBoxObj;
            this.trun = [];
        }

        // traf box inherit FullBox
        extend(traf, FullBox);
        traf.prototype = {

        }

        // tfhd 
        var tfhdBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // tfhd box inherit FullBox
        extend(tfhdBox, FullBox);
        tfhdBox.prototype = {

        }

        // tfhd box object
        var tfhdBoxObj = new trunBox(0, "tfhd");

        // trun
        var trunBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // trun box inherit FullBox
        extend(trunBox, FullBox);
        trunBox.prototype = {

        }

        // trunBox object
        var trunBoxObj = new trunBox(0, "trun");

        // MFHD
        var mfhdBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // mfhd box inherit FullBox
        extend(mfhdBox, FullBox);
        mfhdBox.prototype = {

        }

        // mfhd box object
        var mfhdBoxObj = new mfhdBox(length, "mfhd");

        // SIDX
        var sidxBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.version = 0;
            this.referenceCount = 0;
            this.reserved = 0;
            this.earliestPresentation = 0;
            this.referenceId = 0;
            this.timescale = 0
            if (this.version === 0) {

            } else {

            }

            this.subsegment = {
                referenceType: 0,
                referenceSize: 0,
                subsegmentDuration: 0,
                startWithSAP: 0,
                sapType: 0,
                sapDeltaTime: 0
            }
        }

        // sidx inherit from FullBox
        extend(sidxBox, FullBox);
        sidxBox.prototype = {

        }

        // sidx box object
        var sidxBoxObj = new sidxBox(0, "sidx");

        // MVEX
        var mvexBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // mvex box inherit from FullBox
        extend(mvexBox, FullBox);
        mvexBox.prototype = {

        }

        // mvex box object
        var mvexBoxObj = new mvexBox(0, "mvex");

        // TREX
        var trexBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // trex box inherit from FullBox
        extend(trexBox, FullBox);
        trexBox.prototype = {

        }

        // trex box object
        var trexBoxObj = new trexBox(0, "trex");

        // TKHD
        var tkhdBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // tkhdbox inherit FullBox
        extend(tkhdBox, FullBox);
        tkhdBox.prototype = {

        }
        // tkhdbox object
        var tkhdBoxObj = new tkhdBox(0, "tkhd");

        // MDIA
        var mdiaBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.mdhd = mdhdBoxObj;
            this.minf = minfBoxObj;
            this.hdlr = hdlrBoxObj;
        }
        // mdiaBox inherit FullBox
        extend(mdiaBox, FullBox);
        mdiaBox.prototype = {

        }
        // mdiabox object
        var mdiaBoxObj = new mdiaBox(0, "mdia");

        // IODS
        var iodsBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }
        // iodsbox inherit FullBox
        extend(iodsBox, FullBox);
        iodsBox.prototype = {

        }
        // iodsBox object
        var iodsBoxObj = new iodsBox(0, "iods");

        // MDHD
        var mdhdBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // mdhdBox inherit FullBox
        extend(mdhdBox, FullBox);
        mdhdBox.prototype = {

        }

        // mdhdBox object
        var mdhdBoxObj = new mdhdBox(0, "mdhd");

        // MINF
        var minfBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.vmhd = vmhdBoxObj;
            this.dinf = dinfBoxObj;
            this.stbl = stblBoxObj;
        }

        // minf inherit FullBox
        extend(minfBox, FullBox);
        minfBox.prototype = {

        }

        // minfbox object
        var minfBoxObj = new minfBox(0, "minf");

        // HDLR
        var hdlrBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }

        // hdlrBox inherit FullBox
        extend(hdlrBox, FullBox);
        hdlrBox.prototype = {

        }
        // hdlrBox object
        var hdlrBoxObj = new hdlrBox(0, "hdlr");

        // VMHD
        var vmhdBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }
        // vmhdBox inherit FullBox
        extend(vmhdBox, FullBox);
        vmhdBox.prototype = {

        }
        // vmhdBox object
        var vmhdBoxObj = new vmhdBox(0, "vmhd");

        // DINF
        var dinfBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.dref = drefBoxObj;
        }
        // dinfBox inherit FullBox
        extend(dinfBox, FullBox);
        dinfBox.prototype = {

        }
        // dinfBox object
        var dinfBoxObj = new dinfBox(0, "dinf");

        // STBL
        var stblBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
            this.stsd = stsdBoxObj;
            this.stts = sttsBoxObj;
            this.stsz = stszBoxObj;
        }
        // stblBox inherit FullBox
        var stblBoxObj = new stblBox(0, "stbl");

        // DREF
        var drefBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }
        // drefBox inherit FullBox
        extend(drefBox, FullBox);
        drefBox.prototype = {

        }
        // drefBox object
        var drefBoxObj = new drefBox(0, "dref");

        // STSD
        var stsdBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }
        // stsdBox inherit FullBox
        extend(stsdBox, FullBox);
        stsdBox.prototype = {

        }
        // stsdBox object
        var stsdBoxObj = new stsdBox(0, "stsd");

        // STTS
        var sttsBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }
        // sttsBox inherit FullBox
        extend(sttsBox, FullBox);
        sttsBox.prototype = {

        }
        // sttsBox object
        var sttsBoxObj = new sttsBox(0, "stts");

        // STSZ
        var stszBox = function (length, typeName) {
            FullBox.apply(this, [length, typeName]);
        }
        // stszBox inherit FullBox
        extend(stszBox, FullBox);
        stszBox.prototype = {

        }
        // stszBox object
        var stszBoxObj = new stszBox(0, "stsz");

        // Create an mp4 file in memory.
        var mp4 = new Int8Array(1000);
    }

    // Check if the media source is available
    if ("MediaSource" in window) {
        mediaSource = new MediaSource();
        vidplayer.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener("sourceopen", function () {
            try {
                if (sourceBuffer == null) {
                    var isChromium = window.chrome;
                    var winNav = window.navigator;
                    var vendorName = winNav.vendor;
                    var isOpera = typeof window.opr !== "undefined";
                    var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
                    var isIOSChrome = winNav.userAgent.match("CriOS");

                    if (isIOSChrome) {
                        // is Google Chrome on IOS

                        sourceBuffer = this.addSourceBuffer('video/mp4; codecs="avc3.64001F,mp4a.40.2"');
                    } else if (
                        isChromium !== null &&
                        typeof isChromium !== "undefined" &&
                        vendorName === "Google Inc." &&
                        isOpera === false &&
                        isIEedge === false
                    ) {
                        // is Google Chrome
                        sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc3.64001F,mp4a.40.2"');
                        sourceBuffer.mode = "sequence";
                    } else {
                        // not Google Chrome 
                        sourceBuffer = this.addSourceBuffer('video/mp4');
                    }
                }
            } catch (e) {
                alert("Exception " + e.ExceptionName);
            }

            sourceBuffer.addEventListener("error", function (e) {
                console.log("Error " + e.ErrorName);
            });

            // execute when the updateend event fires (appendingBuffer/removeBuffer)
            let counter = 1;
            sourceBuffer.addEventListener("updateend", function () {
                if (this != null && this.buffered != null) {
                    console.log("Source Buffered " + this.buffered.length);
                    for (var j = 0; j < this.buffered.length; j++) {
                        startX = this.buffered.start(j) * totalwidth / vidplayer.duration;
                        endY = this.buffered.end(j) * totalwidth / vidplayer.duration;
                        console.log("x = " + startX + ", y = " + endY);
                        bufferedW = endY - startX;
                        $(".progress-buffered").css({
                            "width": bufferedW + "px"
                        })
                    }
                }
                console.log("Source Buffer update ended");
            });
        });

        mediaSource.addEventListener("sourceended", function () {

        });

        mediaSource.addEventListener("sourceclosed", function () {

        });
    } else {
        alert("The MediaSource object is not available in this browser therefore you will not be able to play videos!");
        return;
    }

    // Receive video segments
    let arrayCon = [];

    window.vidseg = function (data) {

        if (data.isLastsubsegment) {
            arrayCon.push(data.currentvideo.content);

            player_worker.postMessage({
                segment: new Uint8Array(data.currentvideo.segSize),
                content: arrayCon.splice(0, arrayCon.length),
                representationId: data.currentvideo.representationId,
                segIndex: data.currentvideo.segIndex
            });
        } else {
            if (data.initialization) {
                try {
                    let init = new Uint8Array(data.currentvideo.segSize);
                    for (var i = 0; i < data.currentvideo.content.length; i++) {
                        init[i] = data.currentvideo.content[i];
                    }
                    var blob = new Blob([init], { type: "video/mp4" });
                    // var sourceBuffer = mediaSource.sourceBuffers[data.currentvideo.representationId - 1];
                    var reader = new FileReader();
                    reader.addEventListener("loadend", function () {
                        sourceBuffer.appendBuffer(reader.result);
                    });
                    reader.readAsArrayBuffer(blob);
                } catch (e) {
                    console.log("Error when apending " + e.ErrorName);
                }
                return;
            }
            arrayCon.push(data.currentvideo.content);
        }
    };

    // request a new bandwidth from the server
    $("#qualities span").click(function () {
        vidplayer.pause();

        // Cancel the current streamming thread
        parentWindow.beforeasyncCall();

        reqObj.functionName = "VideoRequest";
        reqObj.data.bandwidth = $(this).attr("value");
        reqObj.data.start = vidplayer.currentTime;
        reqObj.data.end = vidplayer.duration - vidplayer.currentTime;
        reqObj.data.videoId = videoId;

        reqObj.data.streamId = parentWindow.getStreamId();

        window.reqvid(JSON.stringify(reqObj));
        if (sourceBuffer.updating) {
            setOffset = setInterval(function () {
                if (!sourceBuffer.updating) {
                    sourceBuffer.abort();
                    sourceBuffer.timestampOffset = vidplayer.buffered.end(vidplayer.buffered.length - 1);
                    vidplayer.play();
                    clearInterval(setOffset);
                }
            }, 1000);
        } else {
            try {
                sourceBuffer.abort();
                sourceBuffer.timestampOffset = vidplayer.buffered.end(vidplayer.buffered.length - 1);
            } catch (e) {
                alert("Errot Setting timestamp");
            }
        }
    });

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

    $(".btn-pause").click(function (e) {
        vidplayer.pause();
        $(".btn-play").css({
            "display": "block"
        })
        $(".btn-pause").css({
            "display": "none"
        })
        $(".custom-btn-play").css({
            "display": "block"
        })
    });

    $(".custom-btn-play").on("click", function () {
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
        $(".vid-ended-related").css({
            "display": "none"
        })
    })

    $(vidplayer).on("click", function () {
        if (vidplayer.paused) {
            vidplayer.play();
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

        vidplayer.currentTime = (relativeX / totalwidth) * duration;
        vidplayer.play();

        $(".vid-ended-related").css({
            "display": "none"
        });
    }

    // Execute when loading
    $(vidplayer).on("waiting", function () {
        $(".loading-img").css({
            "display": "block"
        });

        if (vidplayer.currentTime > 0) {
            mediaSource.addSourceBuffer('video/mp4; codecs="avc3.64000C,mp4a.40.2"');
        }
    });

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
        })
    })

    // Execute when the browser can play through without stoping for buffering
    $(vidplayer).on("canplaythrough", function () {
        $(".loading-img").css({
            "display": "none"
        })
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
        vidplayer.pause();
        getPosition(currTarget, e);
    });

    // Executed when seeking to the position to start the playback
    var seek = function () {

    }

    var displayTime = function () {
        var totalSec = vidplayer.duration;
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

        currentTime = vidplayer.currentTime;
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
        //$(".controls-container").css({
        //    "display": "block"
        //})
    }

    // the timeupdate event of the video element
    $(vidplayer).on("timeupdate", function () {
        var pval = (vidplayer.currentTime * totalwidth / duration);
        $(".custom-progress").css({
            "width": pval + "px"
        });
        displayTime();
    });

    // the ended event of the video element
    $(vidplayer).on("ended", function () {
        var related_vid = $.ajax({
            url: "/Video/GetRelated?matching='i'&current_vid_id=" + $("#videoId").val(),
        });
        related_vid.done(function (html) {
            $(".vid-ended-related").css({
                "display": "inline-block"
            })
        })

        $(".vid-ended-carousel").on("mouseover", function () {
            $(".carousel-inner a[href='#video-ended-related']").css({
                "display": "block"
            })
        })

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
        //setTimeout(function () {
        //    $(".controls-container").css({
        //        "display": "none"
        //    })
        //}, 3000);
    }

    // on duration loaded
    vidplayer.ondurationchange = function () {
        duration = vidplayer.duration;
        var width = $(vidplayer).innerWidth();
        var height = $(vidplayer).innerHeight();
        totalwidth = width;
        var controls = $(".controls-container").innerWidth();
        console.log("Durration Changed! " + vidplayer.duration);
        displayTime();
        parentWindow.domContentLoaded();
    }
    vidplayer.onloadedmetadata = function () {
        //displayTime();
        //console.log("Durration Changed! " + vidplayer.c);
    }
    window.addEventListener("DOMContentLoaded", function (e) {
        parentWindow.domContentLoaded();
    })

    window.addEventListener("resize", function (e) {
        parentWindow.domContentLoaded();
    })
})()