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

    var mpd_request = $.ajax({
        url: "/video/getmpd?videoId=" + videoId,
    })
    mpd_request.done(function (mpdfile) {
        var file = mpdfile;
        alert($(file).find("SegmentURL").attr("mediaRange"))        
    })

    // A web worker for processing the video streams
    if (typeof (Worker) != "undefined") {
        if (typeof (player_worker) === "undefined") {
            player_worker = new Worker("/scripts/customs/player_worker.js");
        }
    }

    // Receive messages from the worker
    player_worker.onmessage = function (event) {
        try {
             myframe = document.getElementById("player-frame");
             if (myframe === null || myframe === "undefined") {
                 window.beforeasyncCall();
                 return;
             }
             pframe = myframe.contentWindow;
             if (event.data.streamId === current_vid.streamId) {
                 current_vid.received(event.data);
             } else {
                 current_vid.iswaiting = false;
             }
        } catch (e)
        {

        }
    }

    function CurrentVid(videoId, streamId, start, end) {
        this.videoId = videoId;
        this.start = start;
        this.end = end;
        this.blobs = [];
        this.content = [];
        this.subcont = [];
        this._subcontents = [];
        this.isInitialization = false;
        this.streamId = streamId;
        this.isLastSegment = false;
        this.segIndex = 0;
        this.isplaying = false;

        this.iswaiting = false;

        // merge all of the subsegments into a single segments.
        this.mergeSegments = function () {
            if (!this.iswaiting) {
                if (this.subcont.length > 0) {
                    var subseginfo = {
                        streamId: this.streamId,
                        isLastSeg: this.isLastSegment,
                        content: this.subcont,
                        segIndex: this.segIndex
                    }
                    if (this._subcontents.length > 0) {
                        this._subcontents.push(subseginfo);
                        this.iswaiting = true;
                        player_worker.postMessage(this._subcontents.shift());
                    } else {
                        var subseginfo = {
                            streamId: this.streamId,
                            isLastSeg: this.isLastSegment,
                            content: this.subcont,
                            segIndex: this.segIndex
                        }
                        this.iswaiting = true;
                        player_worker.postMessage(subseginfo);
                        
                    }
                } else {
                    if (this._subcontents.length > 0) {
                        this.iswaiting = true;
                        player_worker.postMessage(this._subcontents.shift());
                    }
                }
            } else {
                var subseginfo = {
                    streamId: this.streamId,
                    isLastSeg: this.isLastSegment,
                    content: this.subcont,
                    segIndex: this.segIndex
                }
                this._subcontents.push(subseginfo);
                this.iswaiting = false;
            }
        }

        // receive subsegment
        this.rec_sub_seg = function (subcont) {
            this.subcont.push(subcont);
        }

        // Append Initialization Segment
        this.initialization = function (initSeg) {
            // Initialization code            
            var ints = new Uint8Array(initSeg.length);
            for (var i = 0; i < initSeg.length; i++) {
                ints[i] = initSeg[i];
            }
            var blob = new Blob([ints]);

            pframe = document.getElementById("player-frame").contentWindow;
            pframe.vidseg({
                streamId: this.streamId,
                seg: blob,
                isLastSeg: false,
                isInit: true,
                segIndex: 0
            })
        }

        // Append segment
        this.appendSegment = function (current_seg) {
            myframe = document.getElementById("player-frame");
            if (myframe === null || myframe === "undefined") {
                window.beforeasyncCall();
                return;
            }
            pframe = myframe.contentWindow;
            pframe.vidseg({
                streamId: current_seg.streamId,
                seg: current_seg.seg,
                isLastSeg: current_seg.isLastSeg,
                isInit: false,
                segIndex: this.segIndex
            })
        }

        // Receive full segment
        this.received = function (seg) {
            if (this.streamId === seg.streamId) {
                var segment = {
                    streamId: seg.streamId,
                    seg: seg.seg,
                    isLastSeg: seg.isLastSeg,
                    segIndex: seg.segIndex
                };
                this.appendSegment(segment);
                this.iswaiting = false;
            }
        }
    }

    // error variable
    var handle_error = null;

    // handle receiving a segment;
    var receive_seg = null;

    // A constructor to handle append error
    function handleError() {
        this.iserror = false;
        this.segments = [];
    }

    // A constructor for handling receiving the segments
    function receiveseg() {
        this.segments = [];
        this.buffers = [];
        this.isDecoding = false;
        this.isLastSeg = false;

        this.append = function () {
            var _todecode = this.buffers.shift();            
            if (_todecode !== null || _todecode !== "undefined") {
                try {
                    if (!this.isDecoding && !handle_error.iserror) {
                        this.isDecoding = true;
                        if (_todecode.isLastSeg) {
                            this.isLastSeg = true;
                        }
                        sourceBuffer.appendBuffer(_todecode.seg);
                        handle_error.segments.push(_todecode);
                    } else {
                        this.buffers.unshift(_todecode);
                        this.isDecoding = false;
                    }
                } catch (e) {
                    if (e.name === "InvalidStateError") {
                        console.log("Error " + e.name);
                        this.buffers.unshift(_todecode);
                        console.log(_todecode);
                        this.isDecoding = false;
                    }
                }
            } else {
                console.log("_todecode is null");
            }
        }
    }   

    // keep the appended segments for when the error is encountered
    var appendedSegs = [];

    // current playing video
    var reqObj = {
        functionName: "",
        data: {
            videoId: "",
            bandwidth: "",
            start: 0,
            end: 0,
            content: [],
            isInitialization: false,
            streamId: "",
            isLastSegment: false,
            segIndex: 0,
            senderId: "",
            isplaying: false,
            lastSeg: false
        },
    };
    
    // Check if the media source is available
    if ("MediaSource" in window) {
        handle_error = new handleError();
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
                        sourceBuffer = this.addSourceBuffer('video/mp4; codecs="avc3.4D401F,mp4a.40.2"');
                    } else if (
                        isChromium !== null &&
                        typeof isChromium !== "undefined" &&
                        vendorName === "Google Inc." &&
                        isOpera === false &&
                        isIEedge === false
                    ) {
                        // is Google Chrome
                        sourceBuffer = this.addSourceBuffer('video/mp4; codecs="avc3.4D401F,mp4a.40.2"');
                    } else {
                        // not Google Chrome 
                        sourceBuffer = this.addSourceBuffer('video/mp4');  
                    }                    
                }
            } catch (e) {
                alert("Exception " + e.ExceptionName);
            }

            sourceBuffer.addEventListener("error", function (e) {                
                for (var i = 0; i < handle_error.segments.length; i++) {
                    console.log(handle_error.segments[i]);
                }
                for (var i = 0; i < segments.length; i++) {
                    console.log("segments " + segments[i]);
                }
            });

            // execute when the updateend event fires (appendingBuffer/removeBuffer)
            sourceBuffer.addEventListener("updateend", function () {
                if (sourceBuffer != null && sourceBuffer.buffered != null) {
                    for (var i = 0; i < sourceBuffer.buffered.length; i++) {
                        startX = sourceBuffer.buffered.start(i) * totalwidth / vidplayer.duration;
                        endY = sourceBuffer.buffered.end(i) * totalwidth / vidplayer.duration;

                        bufferedW = endY - startX;
                        $(".progress-buffered").css({
                            "width": bufferedW + "px"
                        })
                    }
                } 
                if (receive_seg.isLastSeg) {
                    reqObj.data.lastSeg = true;

                    receive_seg.isLastSeg = false;
                    reqObj.data.isplaying = false;
                    receive_seg.segments = [];

                    mediaSource.endOfStream();
                    parentWindow.updateRequestedObject(JSON.stringify(reqObj));
                }
                receive_seg.isDecoding = false;
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
    
    // array of segments.
    var segments = [];

    // array of converted segments
    var appendSegments = [];

    // make a request for a video
    window.reqvid = function (data) {
        jsonreq = JSON.parse(data);
        reqObj.functionName = jsonreq.functionName;
        reqObj.data.videoId = jsonreq.data.videoId;
        reqObj.data.bandwidth = jsonreq.data.bandwidth;
        reqObj.data.start = jsonreq.data.start;
        reqObj.data.end = jsonreq.data.end;
        reqObj.data.streamId = jsonreq.data.streamId;
        reqObj.data.senderId = jsonreq.data.senderId;
        reqObj.data.isplaying = false;
        reqObj.data.lastSeg = false;

        parentWindow.updateRequestedObject(JSON.stringify(reqObj));
        parentWindow.request(JSON.stringify(reqObj));

        receive_seg = new receiveseg();        
    }

    // update the requested video with the new data properties from the server.
    window.updatereq_vid = function (data) {
        reqObj.data.streamId = data.streamId;
    }

    // Receive video segments
    window.vidseg = function (data) {
        if (data.streamId === reqObj.data.streamId) {
            receive_seg.segments.push(data);
        } else {
            if (receive_seg.segments.find(function (_seg) {
                return _seg.streamId === data.streamId;
            })) {
                receive_seg.segments = [];
                receive_seg.isDecoding = false;
            }            
            receive_seg.segments.push(data);            
        }
    };       

    // segment interval reader
    var readsegment = setInterval(function () {
        // check to see if the fileReader object is ready to read a file.        
        var isFileReaderReady = fileReader.readyState === fileReader.DONE || fileReader.readyState === fileReader.EMPTY;
        if (isFileReaderReady && receive_seg.segments.length > 0) {
            try {

                // the fileReader object is ready to read. you can start working with it.
                // filter out the segments of the oldest stream.
                var filtered_segments = receive_seg.segments.filter(function (seg) {                    
                    return seg.streamId === reqObj.data.streamId;
                })

                filtered_segments.sort(function (first_seg, sec_seg) {
                    return first_seg.segIndex - sec_seg.segIndex;
                })
                
                // check if the filtered_segments array has data in it after filtering and sorting
                if (filtered_segments.length > 0) {
                    var curr_seg = filtered_segments.shift();

                    // read the file as a buffer object.
                    fileReader.readAsArrayBuffer(curr_seg.seg);
                }
            } catch (e) {

            }         
        }
    });

    // request a new bandwidth from the server
    $("#qualities span").click(function () {
        vidplayer.pause();

        // Cancell the current streamming thread
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
                vidplayer.play();
            } catch (e) {
                alert("Errot Setting timestamp");
            }            
        }        
    });

    // fileReader error
    fileReader.onerror = function (e) {
        console.log("error reading the file");
    }

    fileReader.onloadend = function (e) {
        var currSeg = receive_seg.segments.shift();
        var data = {
            seg: this.result,
            streamId: currSeg.streamId,
            isLastSeg: currSeg.isLastSeg,
            isInit: currSeg.isInit,
            segIndex: currSeg.segIndex
        };        
        receive_seg.buffers.push(data);
        
        if (data.isLastSeg) {
            var appendInterval = setInterval(function () {
                if (receive_seg.buffers.length > 0) {
                    receive_seg.append();
                } else {
                    clearInterval(appendInterval);
                }
            }, 1000);
        } else {
            receive_seg.append();
        }
    }

    // the current playing video information
    reqObj.functionName = "VideoRequest";
    reqObj.data.videoId = videoId;
    reqObj.data.bandwidth = bandwidth;
    reqObj.data.start = 0;
    reqObj.data.end = 0;
    
    window.reqvid(JSON.stringify(reqObj));
    receive_seg = new receiveseg();
    
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
            "display":"block"
        });
    });

    // Execute when playing the video
    $(vidplayer).on("playing", function () {
        $(".loading-img").css({
            "display":"none"
        });
        $(".custom-btn-play").css({
            "display": "none"
        })
        $(".vid-ended-related").css({
            "display": "none"
        })
        if (!reqObj.data.isplaying && !reqObj.data.lastSeg) {
            reqObj.data.isplaying = true;
            parentWindow.updateRequestedObject(JSON.stringify(reqObj));
        }
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
        $(".timeduration").text(currHour + ":" + currMin + ":" + currSec + "/" +  hours + ":" + minutes + ":" + seconds);
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
                "display" : "block"
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

    vidplayer.onmouseout = function(){
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

        displayTime();
        parentWindow.domContentLoaded();
    }   

    window.addEventListener("DOMContentLoaded", function (e) {
        parentWindow.domContentLoaded();       
    })

    window.addEventListener("resize", function (e) {
        parentWindow.domContentLoaded();
    })
})()