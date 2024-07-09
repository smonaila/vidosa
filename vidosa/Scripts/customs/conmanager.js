/// <reference path="../jquery-1.10.2.min.js" />
/// <reference path="../jquery.signalr-2.4.0.js" />

$(document).ready(function () {
    var con = $.connection("/player");
    var pageId = "";
    var isConnected = false;
    var streamId = "";
    var frameLoaded = true;
    var frameReady = false;
    var myframe; 
    var tasks = [];

    class Page {
        static pageId = "";
        static frameLoaded = false;
        static frameReady = false;
        static streamId = "";
        static frameId = "";
    }

    // An object that is going to store the Status of Streaming.
    class StreamStatus {
        static Started = new StreamStatus("Started");
        static Running = new StreamStatus("Running");
        static Paused = new StreamStatus("Paused");
        static Ended = new StreamStatus("Ended");
        static Waiting = new StreamStatus("Waiting");
        static Canceled = new StreamStatus("Canceled");

        static Status = this.Waiting;

        constructor(statusName) {
            this.name = statusName;
        }
    }

    var Task = {
        Id: 0x00000,
        IsCompleted: false,
        IsCanceled: false,
        Status: StreamStatus.Status.name,
        IsFaulted: false,
        connectionId: "",
        IsCancellationRequested: false
    }

    // This is the class that is going to be holding the 
    // information about the connection.
    class Connection {
        static isConnected = false;
        static connectionId = "";
        constructor(id) {
            this.connectionId = id;
        }
    }

    // An object that is going to keep the Request Infor.
    class RequestInf {
        static requestIndex = 0;
        static isredirect = false;
        static requestFrom = "";
        static requestTo = "";
    }

    var getCurrentTask = function () {
        var currentTask = tasks.find(function (task) {
            return task.connectionId === Page.pageId;
        });
        return currentTask;
    }

    StreamStatus.Status = StreamStatus.Waiting;

    // Return the video matrics
    window.getVideoMetrics = function () {
        var playerMetricsElm = document.getElementById("player-metrics");
        var ar = playerMetricsElm.getAttribute("data-video-ar");

        var heightRatio = parseInt(ar.split(":")[1]);
        var widthRatio = parseInt(ar.split(":")[0]);

        return { hr: heightRatio, wr: widthRatio };
    }

    // Resize the player placeholder
    window.resizePlayerPlaceHolder = function () {
        var frameWrapper = document.getElementById("frame-wrapper");
        var metrcis = window.getVideoMetrics();
        frameWrapper.style.height = ((frameWrapper.clientWidth * metrcis.hr) / metrcis.wr) + "px";
    }

    // retry when there was an error.
    window.retry = function (videoId) {
        var frame = document.getElementById("player-frame");
        var frameWrapper = document.createElement("div");

        Page.frameLoaded = false;
        Page.frameReady = false;
        Page.streamId = window.getStreamId();
        frameWrapper.classList = "frameCon-plchldr";
        frameWrapper.setAttribute("id", "frame-wrapper");
        frame.replaceWith(frameWrapper);

        window.getPlayer(videoId);
    }

    window.getPlayPage = function (videoId) {
        var xmlRequest = new XMLHttpRequest();
        xmlRequest.open("GET", "/video/player?v=" + videoId + "&ispartial=TRUE");
        xmlRequest.onreadystatechange = function () {
            if (this.status === 200 && xmlRequest.readyState === 4) {

                Page.streamId = window.generateStreamId();
                Page.frameLoaded = false;
                Page.frameReady = false;

                var main_container = document.getElementById("container");
                main_container.innerHTML = "";

                var parser = new DOMParser()
                var htmlPage = parser.parseFromString(xmlRequest.response, "text/html");
                              
                var headerNodes = htmlPage.getElementsByTagName("head")[0].children;
                var bodyNodes = htmlPage.getElementsByTagName("body")[0].children;                
                var videoId = htmlPage.getElementById("videoId").value
                
                for (var headerIndex = 0; headerIndex < headerNodes.length; headerIndex++) {
                    var link = document.createElement("link");
                    link.setAttribute("id", headerNodes[headerIndex].getAttribute("href").replace("/", "").replace(".", ""));
                    link.setAttribute("href", headerNodes[headerIndex].getAttribute("href"));
                    link.setAttribute("rel", headerNodes[headerIndex].getAttribute("rel"));

                    console.log(headerNodes[headerIndex].getAttribute("href") + " headerIndex = " + headerIndex);
                    main_container.appendChild(link);
                }                

                for (var nodeIndex = 0; nodeIndex < bodyNodes.length; nodeIndex++) {                    
                    console.log(bodyNodes[nodeIndex] + " nodeIndex = " + nodeIndex);                   
                    main_container.appendChild(bodyNodes[nodeIndex]);
                }          
                main_container.appendChild(htmlPage.getElementById("videoId"));                
                window.getPlayer(videoId);
            }
        }
        xmlRequest.responseType = "text";
        xmlRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xmlRequest.setRequestHeader("_", "1665426308677");
        xmlRequest.send();
    }

    // get the player frame.
    window.getPlayer = function (videoId) {        
        var xmlReq = new XMLHttpRequest();
        xmlReq.open("GET", "/video/getplayer?videoId=" + videoId);
        xmlReq.onreadystatechange = function (e) {
            if (xmlReq.status === 200 && xmlReq.readyState === 4) {
                var playerCon = document.getElementById("frame-wrapper");
                var parser = new DOMParser();
                var file = parser.parseFromString(xmlReq.response, "text/html");

                var vidmetricElm = document.getElementById("player-metrics");
                var ar = vidmetricElm.getAttribute("data-video-ar"); 

                var heightRatio = parseInt(ar.split(":")[1]);
                var widthRatio = parseInt(ar.split(":")[0]);
                
                var frame = file.getElementById("player-frame");
                frame.style.height = ((playerCon.clientWidth * heightRatio) / widthRatio) + "px";
                console.log("NEXT PLAYER ABOUT TO APPEND");
                playerCon.replaceWith(frame);                
                window.frameInit();
                console.log("FRAME LOADED AND INITIALIZED");

                // Page.frameLoaded = true;
                // Page.frameReady = true;

                var startStreamInt = setInterval(function () {
                    if (Page.frameLoaded && Page.frameReady) {
                        clearInterval(startStreamInt);
                        window.startStreaming();
                    }
                }, 10);                
            } else if (xmlReq.status === 404 && xmlReq.readyState === 4) {
                // The page was not found.
                console.log("getPlayer.onreadystatechanged: Page Not Found! Request Status: { " + xmlReq.status + " }");
                var frameWin = myframe.contentWindow;
                var errorInf = {
                    message: "The page was not found",
                    code: xmlReq.status
                };
                frameWin.playerError(errorInf);
            } else if (xmlReq.status === 500 && xmlReq.readyState === 4) {
                // Internal Server Error.
                console.log("getPlayer.onreadystatechanged: internal Server Error! Request Status: { " + xmlReq.status + " }");
                var frameWin = myframe.contentWindow;
                var errorInf = {
                    message: "Server Experienced an error when processing your request",
                    code: xmlReq.status
                };
                frameWin.playerError(errorInf);
            }
        }
        xmlReq.onerror = function () {
            // The request experienced an error.
            console.log("getPlayer.onerror: executed! ");
        }
        xmlReq.responseType = "text";
        xmlReq.send();
    }

    // Return the PageLoaded statud
    window.IsFrameLoaded = function () {
        return Page.frameLoaded;
    }

    // Print an Error.
    window.printError = function (errorInf) {
        var player_con = document.getElementsByClassName("ply-parent-con")[0] || this.document.getElementById("frame-wrapper");

        var error_con = document.createElement("div");
        var error_wrapper = document.createElement("div");
        var retryLink = document.createElement("button");
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

        var error_inf = errorInf;
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
            window.retry(error_inf.Id);
        });
    }

    // Print the error message. 
    var frameReadyInterval = function (errorInf) {
        var frameWin = myframe.contentWindow;
        var interval = setInterval(function () {
            if (Page.frameLoaded && Page.frameReady) {
                clearInterval(interval);
                frameWin.playerError(errorInf);
            } else {
                window.printError(errorInf);
            }
        }, 10);
    }

    window.startStreaming = function () {

        // Initialize the frame holding the video.
        let currentVidInfo = window.getFrameId();
        var videoId = document.getElementById("videoId").getAttribute("value");
        
        var xmlRequest = new XMLHttpRequest();
        xmlRequest.open("POST", "/video/startstreaming");
        xmlRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        xmlRequest.onreadystatechange = function (e) {
            if (this.status === 200 && this.readyState === 4) {
                let streamStatus = JSON.parse(xmlRequest.response);
                switch (streamStatus.Status) {
                    case "Started":
                        StreamStatus.Status = StreamStatus.Started;
                        var currentTask = getCurrentTask();
                        if (currentTask !== null || currentTask !== undefined) {
                            currentTask.Status = StreamStatus.Status.name;
                        }
                        console.log("Streaming has started | main player page");
                        break;
                    case "Paused":
                        StreamStatus.Status = StreamStatus.Paused;
                        var currentTask = getCurrentTask();
                        if (currentTask !== null || currentTask !== undefined) {
                            currentTask.Status = StreamStatus.Status.name;
                        }
                        console.log("Streaming has been paused | main player page" + streamStatus.Status);
                        break;
                    case "Running":
                        StreamStatus.Status = StreamStatus.Running;
                        var currentTask = getCurrentTask();
                        if (currentTask !== null || currentTask !== undefined) {
                            currentTask.Status = StreamStatus.Status.name;
                        }
                        console.log("Streaming is running | main player page");
                        break;
                    case "Ended":
                        StreamStatus.Status = StreamStatus.Ended;
                        var currentTask = getCurrentTask();
                        if (currentTask !== null || currentTask !== undefined) {
                            if (myframe != null || myframe !== undefined) {
                                
                            }
                            currentTask.Status = StreamStatus.Status.name;
                            console.log("Streaming method for TaskId = " + currentTask.Id);
                        }
                        console.log("Streaming has ended | main player page streamId = " + streamStatus.StreamId);
                        break;
                    case "Waiting":
                        StreamStatus.Status = streamStatus.Status
                        var currentTask = getCurrentTask();
                        if (currentTask !== null || currentTask !== undefined) {
                            currentTask.Status = StreamStatus.Status.name;
                        }
                        break;
                    case "Error":
                        console.log("Error Occured " + streamStatus.Status + " { Message = " + streamStatus.Message + " }");              
                        var errorInf = {
                            message: streamStatus.Message,
                            code: streamStatus.Code,
                            Id: videoId,
                            clientError: false
                        };
                        if (RequestInf.requestIndex) {
                            frameReadyInterval(errorInf);
                            RequestInf.requestIndex = 0;
                        } else {
                            var model = {
                                videoId: videoId,
                                frameId: currentVidInfo.frameId,
                                connectionId: currentVidInfo.connectionId,
                                streamId: Page.streamId,
                                status: StreamStatus.Status.name
                            };
                            xmlRequest.send(JSON.stringify(model));
                            RequestInf.requestIndex += 1;
                        }                                                
                        break;
                    default:
                        console.log("Something wrong happened during Execution of the Stream " + streamStatus.Status);
                        var errorInf = {
                            message: streamStatus.Status,
                            code: streamStatus.Code,
                            Id: streamStatus.VideoId,
                            clientError: false
                        };   
                        if (RequestInf.requestIndex) {
                            frameReadyInterval(errorInf);
                            RequestInf.requestIndex = 0;
                        } else {
                            var model = {
                                videoId: videoId,
                                frameId: currentVidInfo.frameId,
                                connectionId: currentVidInfo.connectionId,
                                streamId: Page.streamId,
                                status: StreamStatus.Status.name
                            };
                            xmlRequest.send(JSON.stringify(model));
                            RequestInf.requestIndex += 1;
                        } 
                }
            } else if (this.status === 500 && this.readyState === 4) {
                // An internal server error when requesting a stream.
                console.log("window.startStreaming: internal Server Error! Request Status: { " + xmlReq.status + " }");
                var errorInf = {
                    message: "Server Experienced an error when processing your request",
                    code: xmlReq.status,
                    Id: videoId,
                    clientError: false
                };
                if (RequestInf.requestIndex) {
                    frameReadyInterval(errorInf);
                    RequestInf.requestIndex = 0;
                } else {
                    var model = {
                        videoId: videoId,
                        frameId: currentVidInfo.frameId,
                        connectionId: currentVidInfo.connectionId,
                        streamId: Page.streamId,
                        status: StreamStatus.Status.name
                    };
                    xmlRequest.send(JSON.stringify(model));
                    RequestInf.requestIndex += 1;
                }
            } else if (this.status === 404 && this.readyState === 4) {
                console.log("window.startStreaming: Page Not Found! Request Status: { " + xmlReq.status + " }");
                var errorInf = {
                    message: "The page could not be found",
                    code: xmlRequest.status,
                    Id: videoId,
                    clientError: false
                };
                if (RequestInf.requestIndex) {
                    frameReadyInterval(errorInf);
                    RequestInf.requestIndex = 0;
                } else {
                    var model = {
                        videoId: videoId,
                        frameId: currentVidInfo.frameId,
                        connectionId: currentVidInfo.connectionId,
                        streamId: Page.streamId,
                        status: StreamStatus.Status.name
                    };
                    xmlRequest.send(JSON.stringify(model));
                    RequestInf.requestIndex += 1;
                }
            }
        }
        xmlRequest.onerror = function () {
            // This is part of the code that needs to run when the error wen processing the startStreaming request.
            console.log("startStreaming.onerror: There was an error when processing request! Request Status: { " + xmlReq.status + " }");
            var errorInf = {
                message: "The request could not be completed, you could be offline",
                code: xmlRequest.status,
                Id: videoId,
                clientError: true
            };
            if (RequestInf.requestIndex) {
                frameReadyInterval(errorInf);
                RequestInf.requestIndex = 0;
            } else {
                var model = {
                    videoId: videoId,
                    frameId: currentVidInfo.frameId,
                    connectionId: currentVidInfo.connectionId,
                    streamId: Page.streamId,
                    status: StreamStatus.Status.name
                };
                xmlRequest.send(JSON.stringify(model));
                RequestInf.requestIndex += 1;
            }            
        }
        console.log("=================================");
        console.log("videoId = " + videoId + "\nframeId = " + currentVidInfo.frameId + "\nconnectionId = " + currentVidInfo.connectionId
        + "\nstreamId = " + Page.streamId + "\nstatus = " + StreamStatus.Status.name);
        console.log("=================================");
        var model = {
            videoId: videoId,
            frameId: currentVidInfo.frameId,
            connectionId: currentVidInfo.connectionId,
            streamId: Page.streamId,
            status: StreamStatus.Status.name
        };
        xmlRequest.send(JSON.stringify(model));
    }

    // next related video page loaded.
    window.nextLoaded = function (data) {
        // alert("Ajax Page Loaded!");
        var btnSub = document.getElementById("btn-subscribe");
        var videoId = document.getElementById("videoId").getAttribute("value");        
        var spanReaction = document.getElementsByClassName("reaction");
        var anchorLoadComm = document.getElementsByClassName("anc-load-comments-reply");

        console.log("NEXT PLAYER PAGE");
        window.resizePlayerPlaceHolder();
        window.getPlayer(videoId);
        
        StreamStatus.Status = StreamStatus.Waiting;
        window.getReactions(spanReaction);
        window.addClicksLoadComm(anchorLoadComm);
    }


    class NullException extends Error {
        constructor(message, errorName) {
            super(message);
            this.name = errorName;
        }
    }


    class CodingTypeNotSupported extends Error {
        constructor(name) {
            super(message, name);
            this.name = name;
            this.message = message;
        }
    }



    window.pausePlayStream = function (errorName) {
        try {
            if (errorName === "playerErrorCall") {
                return;
            }
            var model = {
                streamStatus: StreamStatus.Status.name,
                connectionId: currentVidInfo != null || currentVidInfo != undefined ?
                    currentVidInfo.connectionId : null
            };
            let currentVidInfo = window.getFrameId();
            if (model.connectionId === undefined || model.connectionId === null) {
                throw new NullException("ConnectionId is null", "ConnectioIdError");
            }

            if (currentVidInfo === null || currentVidInfo === undefined) {
                throw new NullException("Frame Id could not be defined", "FrameNullException");
            }
            var xmlRequest = new XMLHttpRequest();
            xmlRequest.open("POST", "/video/pauseplaystream");
            xmlRequest.setRequestHeader("Content-Type", "application/json;charset=utf-8");
            xmlRequest.onload = function (e) {
                if (this.status == 200) {
                    let streamStatus = JSON.parse(xmlRequest.response);
                    switch (streamStatus.Status) {
                        case "Started":
                            StreamStatus.Status = StreamStatus.Started;
                            console.log("Streaming has started | main player page");
                            break;
                        case "Paused":
                            StreamStatus.Status = StreamStatus.Paused;
                            console.log("Streaming has been paused | main player page");
                            break;
                        case "Running":
                            StreamStatus.Status = StreamStatus.Running;
                            console.log("Streaming is running | main player page");
                            break;
                        case "Ended":
                            StreamStatus.Status = StreamStatus.Ended;
                            console.log("Streaming has ended | main player page");
                            break;
                        case "Waiting":
                            StartStreaming();
                            StreamStatus.Status = StreamStatus.Waiting;
                            break;
                        case "Canceled":
                        case "Error":
                            console.log("Streaming Canceled!");
                            StreamStatus.Status = StreamStatus.Canceled;
                            var currentTask = getCurrentTask();

                            if (currentTask !== null || currentTask !== undefined) {
                                if (currentTask === streamStatus.TaskId) {
                                    currentTask.Id = streamStatus.TaskId;
                                    currentTask.IsCanceled = true;
                                }
                            }
                            break;
                        default:
                            console.log("Unknown Status Returned");
                    }
                }
            }
            xmlRequest.send(JSON.stringify(model));
        } catch (e) {
            if (e instanceof Error) {
                if (e.name === "ConnectioIdError") {
                    alert("ConnectionId is null cannot pause the stream.");
                } else if (e.name === "FrameNullException") {
                    alert("FrameNullException.");
                } else if (e.name === "CodingTypeNotSupported") {
                    // When Pausing because of Coding Error.
                }
            }
        }
    }
    // Set and get the status of streaming.
    window.receiveStatus = function (statusData) {
        var _statusInf = JSON.parse(statusData);
        StreamStatus.Status.name = _statusInf.status;
        var runningTask = getCurrentTask();
        
        if (runningTask !== null || runningTask !== undefined) {
            runningTask.Id = _statusInf.taskId;
            runningTask.IsCompleted = _statusInf.IsCompleted;
            runningTask.Status = _statusInf.status;
            runningTask.IsFaulted = _statusInf.IsFaulted;
            runningTask.IsCancellationRequested = _statusInf.IsCancellationRequested;

            var frameWin = myframe.contentWindow;
            
            // frameWin.taskCompleted(runningTask);

            // Let the video player know the status of the streaming task.
            console.log("Recieving From RunningTask Status " + StreamStatus.Status.name + "TaskId: " + runningTask.Id + "\nIsComplete: " +
                runningTask.IsCompleted + "\nStatus: " + runningTask.Status + "\nIsFaulted: " + runningTask.IsFaulted);

            if (runningTask.IsCancellationRequested) {
                // Add code to create a cookie that will hold the information about the currently canceled task.
                console.log("runningTask was cancelled by the user");
            }
        }
        console.log("Status Received " + StreamStatus.Status.name + "TaskId: " + runningTask.Id + "\nIsComplete: " +
            runningTask.IsCompleted + "\nStatus: " + runningTask.Status + "\nIsFaulted: " + runningTask.IsFaulted);
    }
    window.setStreamStatus = function (status) {
        StreamStatus.Status = status;
    }
    window.getStreamingStatus = function () {
        return StreamStatus.Status;
    }
    // get the video details infor
    window.getVideoDet = function () {
        var xmlReq = new XMLHttpRequest();
        xmlReq.open("GET", "/video/GetVideInf?videoId=" + videoId);
        xmlReq.onloadend = function (e) {
            if (xmlReq.status === 200) {
                var htmlRes = xmlReq.response;
                var main_rel = document.getElementById("videodesc-wrapper");
                main_rel.innerHTML = htmlRes;
            }
        }
        xmlReq.responseType = "text";
        xmlReq.send();
    }
    window.addClicksLoadComm = function (anchorLoadComm) {
        // var anchorLoadComm = document.getElementsByClassName("anc-load-comments-reply");
        for (var i = 0; i < anchorLoadComm.length; i++) {
            anchorLoadComm[i].addEventListener("click", function (e) {
                var parent = e.srcElement.parentElement;
                parent.removeChild(e.srcElement);
            });
        }
    }
    // This method loads the related and comments page.
    window.getRelated = function (matching, videoId, isvidended) {
        var xmlReq = new XMLHttpRequest();
        xmlReq.open("GET", "/video/GetRelated?matching=" + matching + "&current_vid_id=" + videoId + "&isvidended=" + isvidended);
        xmlReq.onloadend = function (e) {
            if (xmlReq.status === 200) {
                var htmlRes = xmlReq.response;
                var main_rel = document.getElementById("id_rltd-vid-wrapper");
                main_rel.innerHTML = htmlRes;
            }
        }
        xmlReq.responseType = "text";
        xmlReq.send();
    }
    window.getComments = function (ct, key, page) {
        var xmlReq = new XMLHttpRequest();
        xmlReq.open("GET", "/blog/getComments?ct=" + ct + "&key=" + key + "&page=" + page);
        xmlReq.onloadend = function (e) {
            if (xmlReq.status === 200) {
                var htmlcomm = xmlReq.response;
                var main_comm = document.getElementById("comments");
                main_comm.innerHTML = htmlcomm;
            }
        }
        xmlReq.responseText = "text";
        xmlReq.send();
    }
    $("[data-toggle='popover']").popover({
        html: true,
        template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    });   

    // get the video details
    window.getRelatedVidInf = function (videoId) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", "/video/GetVideInf?videoId=" + videoId);
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.status === 200 && xmlHttp.readyState === 4) {
                var videodet = document.getElementById("videodesc-wrapper");
                videodet.innerHTML = xmlHttp.response;

                var btnSub = document.getElementById("btn-subscribe");
                var videoId = document.getElementById("videoId").getAttribute("value");
                var spanReaction = document.getElementsByClassName("reaction");
                var anchorLoadComm = document.getElementsByClassName("anc-load-comments-reply");

                var subcribe = function () {
                    var channelId = btnSub.getAttribute("data-channelId");
                    var xmlRequest = new XMLHttpRequest();
                    xmlRequest.open("GET", "/video/subscribe?channelId=" + channelId);
                    xmlRequest.onload = function (e) {
                        if (this.status == 200) {
                            var isSub = xmlRequest.response;
                            var spanSub = document.createElement("span");
                            spanSub.style.color = "gray";
                            spanSub.style.fontWeight = "bold";
                            spanSub.innerHTML = isSub === true ? "SUBSCRIBED" : "UNSUBSCRIBED";
                            btnSub.replaceWith(spanSub);
                        }
                    }
                    xmlRequest.send();
                }
                btnSub.addEventListener("click", function (e) {
                    subcribe();
                });
                window.addEventListener("load", function (e) {
                    window.getReactions(spanReaction);
                    window.addClicksLoadComm(anchorLoadComm);
                });
            } else if (xmlHttp.status === 403 && xmlHttp.readyState === 4) {
                // If the request is forbidden.
            } else if (xmlHttp.status === 404 && xmlHttp.readyState === 4) {
                // The page Not Found.
            } else if (xmlHttp.status === 500 && xmlHttp.readyState === 4) {
                // Internal Server error.
            }
        }
        xmlHttp.onerror = function () {
            
        }
        xmlHttp.responseType = "text";
        xmlHttp.send();
    }
    window.testMethod = function () {
        this.alert("Testing Method!");
    }
    var clickElem = function (elem) {
        var eventMouse = document.createEvent("MouseEvents");
        eventMouse.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        elem.dispatchEvent(eventMouse);
    }
    window.getRelatedVid = function (url) {
        console.log("Received url = " + url);
        var variables = url.split("?")[1].split("&");       

        var objvideoId = variables.find(function (v) {
            return v.split("=")[0] === "v";
        });
        window.getPlayPage(objvideoId.split("=")[1]);
    }

    window.getReactions = function (targets) {
        var spanReaction = targets;
        for (var i = 0; i < spanReaction.length; i++) {
            spanReaction[i].addEventListener("click", function (e) {
                e.stopPropagation();
                var eventSource = e.target;

                var xmlRequest = new XMLHttpRequest();
                xmlRequest.open("GET", "/video/getreaction?ct=" + eventSource.getAttribute("data-contentType") + "&rt=" + eventSource.getAttribute("data-reactionType") + "&cid=" + eventSource.getAttribute("data-contentId"));
                xmlRequest.onload = function (e) {
                    if (this.status === 200) {
                        alert("Reacted!");
                    }
                }
                xmlRequest.send();
            });
        }
    }
    window.openFile = function (func, cev) {
        // alert("Open File!");
        var sourceId = cev.target.getAttribute("id");
        readFile = function (e) {
            if (cev === "select-file") {
                document.getElementsByClassName("upload-icons-con").item(0).style.display = "none";
                document.getElementsByClassName("progress-bar-con").item(0).style.display = "inline-block";
            }            
            var file = e.target.files[0];
            if (!file) {
                return;
            }
            fileInput.uploadFile(file, sourceId);
            document.body.removeChild(fileInput);
        }
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.style.display = "none";
        fileInput.onchange = readFile;
        fileInput.uploadFile = func;
        document.body.appendChild(fileInput);
        clickElem(fileInput);
    }
    window.uploadFile = function (_file, sourceId) {
        let file = _file;
        let allowed_mime_types = ["image/jpeg", "image/png", "video/mp4"];
        let allowed_size_mb = 50000;

        if (allowed_mime_types.indexOf(file.type) == -1) {
            alert("Error: Incorrect file type " + file.type);
            return;
        }

        if (file.size > allowed_size_mb * 1024 * 1024) {
            alert("Error: Exceeded size");
            return;
        }

        let data = new FormData();
        data.append("file", _file);

        // alert("Event SourceId = " + sourceId)
        let request = new XMLHttpRequest();
        request.open("POST", "/Video/UploadFile" + ((sourceId === "select-thumb" || sourceId === "edt-select-thumb") ? "?videoId=" + document.getElementById("videoId").getAttribute("value") : ""));
        request.upload.addEventListener("progress", function (e) {
            let percent_complete = Math.floor((e.loaded / e.total) * 100);

            // percentage of upload completed
            console.log("Uploading " + percent_complete + "%");
            progress_bar = document.getElementsByClassName("cust-progress-bar");
            $(progress_bar).width(percent_complete + "%");

            let pbt = document.getElementsByClassName("progress-bar-con")[0];
            pbt.style.display = "block";

            // percentage Value
            document.getElementsByClassName("percent-value")[0].innerHTML = Math.floor(percent_complete) + "%";
        });
        request.responseType = request.responseText;
        request.addEventListener("load", function (e) {
            // HTTP status message                    
            if (this.status == 200 && file.type == "video/mp4") {
                document.getElementById("uploadfileform").innerHTML = request.response;

                // Get the Preview
                request = new XMLHttpRequest();
                request.open("GET", "/Video/PreviewPlayer?v=" + document.getElementById("videoId").getAttribute("value"));
                request.responseType = this.responseText;
                request.addEventListener("load", function (e) {
                    // HTTP status message                            
                    if (this.status == 200) {
                        let _player = document.getElementById("upload-plyer-con");
                        _player.innerHTML = this.response;
                        document.getElementById("select-thumb").style.display = "inline-block";
                    }
                });
                request.send(data);
            } else if (this.status == 200 && (file.type == "image/jpeg" || file.type == "image/png")) {
                var imgElem = document.getElementById("edt-selected-thumb");
                imgElem.getAttribute("src", "");
            }
        });
        request.addEventListener("error", function (e) {
            alert("Error!");
        });
        request.send(data);
    }

    // Initialize the frame that's going to hold the player.
    window.frameInit = function () {
        myframe = document.getElementById("player-frame");
        let frameID = myframe.getAttribute("data-iframeId");
        Page.frameId = frameID;
        if (!Connection.isConnected) {
            con.start().done(function () {
                Connection.isConnected = true;
                if (Page.pageId === "") {
                    var waitPageId = setInterval(function () {
                        if (Page.pageId === "") {
                            clearInterval(waitPageId);
                            con.send(JSON.stringify({ frameId: Page.frameId, connectionId: Page.pageId }));
                            return { frameId: Page.frameId, connectionId: Page.pageId };
                        }
                    });
                }                
            });            
        } else {
            con.send(JSON.stringify({ frameId: Page.frameId, connectionId: Page.pageId }));
        }     
        return { frameId: Page.frameId, connectionId: Page.pageId };
    }
    window.getPageId = function () {
        return Page.pageId;
    }
    window.getFrameId = function () {
        try {
            let frameId = myframe.getAttribute("data-iframeId");
            if (frameId === null || frameId === undefined) {
                throw new NullException("The frame Id is not defined", "FrameNullException");
            }
            return { frameId: Page.frameId, connectionId: Page.pageId, isInitialized: true };
        } catch (e) {
            if (e instanceof Error) {
                alert("Frame Id could not be defined.");
            }
        }
    }  
    let htmlCode = "";
    window.showInsertUrlModal = function () {
        var ta = document.getElementById("HtmlCode");        
        htmlCode = ta.innerHTML;
        var sel, range, node;

        if (window.getSelection) {           
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = window.getSelection().getRangeAt(0);
                
                var html = '<a data-tempId="tempId">' + sel + '</a>';
                let n = htmlCode.search(sel);

                if (n != -1 || n > 0) {
                    htmlCode = htmlCode.replace(sel, html);
                }                
            } else if (document.selection && document.selection.createRange) {
                range = document.selection.createRange();
                range.collapse(false);
                range.pasteHTML(html);
            }
        }
        $("#insert-anchor-tag-url").modal("show");
        // alert("Form Test " + $("#test form").attr("name"));
    }
    window.selectPost = function () {        
        let postCon = $("#post-list-container");
        let radioBtn = document.createElement("input"), postTitle = document.createElement("h4"), anchorView = document.createElement("a");

        let postReq = $.ajax({
            url: "/blog/GetUserPost"
        });
        postReq.done(function (userPosts) {
            $(postCon).html();
            for (var i = 0; i < userPosts.posts.length; i++) {
                radioBtn.type = "radio";
                radioBtn.setAttribute("data-url", "/blog/post?ispartial=true&purl=" + userPosts.posts[i].url);

                postTitle.innerHTML = userPosts.posts[i].Title;

                $(anchorView).attr("href", "/blog/post?ispartial=true&purl=" + userPosts.posts[i].url);
                $(anchorView).attr("target", "_blank");
                $(anchorView).attr("title", userPosts.posts[i].Title);
                $(anchorView).text("View");

                $(postCon).append($(radioBtn));
                $(postCon).append($(postTitle));
                $(postCon).append($(anchorView));
            }            
        });
       
        $("#search-current-user-post").autocomplete({
            response: function (event, ui) {
                window.response(event, ui);
            },
            source: function (request, response) {
                // auto complete what the user is typing.
                var req;
                alert("About to make a request!1");
                window.search($("#select-url-form"), response);

                if ($("#select-url-form").find("input[type='text']").val().split(" ").length >= 2) {
                    // alert("About to make a request!");
                    var searched_vid_req = $.ajax({
                        url: "/Video/GetVideos?" + $("#select-url-form").serialize() + "&ispartial=true",
                    });
                    searched_vid_req.done(function (html) {
                        alert(html);
                         $("#container").html();
                         $("#container").html(html);
                         updateURL(html);
                         $(".ui-autocomplete").css({
                            "display": "none"
                         })
                    })
                };
            },
            select: function (event, ui) {

            },
            open: function (event, ui) {
                var items = $(".ui-front").find(".ui-menu-item");
            },
            _renderMenu: function (ul, items) {
                // alert("Rendering Menu");
            },
        }).autocomplete("instance")._renderItem = function (ul, item) {
            return window.renderItems(ul, item);
        };

        // the check status of the search option form checkbox status
        $("#select-url-form").find("input[type='checkbox']").change(function () {
            var checkboxes = $("#select-url-form").find("input[type='checkbox']");
            if ($(this).prop("name") === "select_url_all") {
                for (var i = 0; i < checkboxes.length; i++) {
                    if ($(checkboxes[i]).prop("name") !== "select_url_all") {
                        $(checkboxes[i]).prop("checked", true);
                        $(checkboxes[i]).attr("value", "true");
                    }
                }
            } else {
                for (var i = 0; i < checkboxes.length; i++) {
                    if ($(checkboxes[i]).prop("name") === "select_url_all") {
                        $(checkboxes[i]).prop("checked", false);
                        $(checkboxes[i]).attr("value", "false");
                    }
                }
            }

            if ($("#select-url-form").val().length >= 1) {
                alert("");
                var searched_vid_req = $.ajax({
                    url: "/Video/GetVideos?" + $("#select-url-form").serialize() + "&ispartial=true",
                });
                searched_vid_req.done(function (html) {
                    alert(html);
                    $("#container").html();
                    $("#container").html(html);
                    updateURL(html);
                    $(".ui-autocomplete").css({
                        "display": "none"
                    })
                })
            }
        });
    }
    window.insertAnchor = function () {
        let updatedHtml = document.createElement("div");
        updatedHtml.innerHTML = htmlCode;

        let insertedAnchor = $(updatedHtml).find("[data-tempId='tempId']");
        let anchorTitle = $("#anchor-title").val();
        let anchorUrl = $("#anchor-tag-url").val();

        $(insertedAnchor).attr("href", anchorUrl);
        $(insertedAnchor).attr("title", anchorTitle);        

        $(insertedAnchor).removeAttr("data-tempId");

        let ta = document.getElementById("HtmlCode");
        ta.innerHTML = $(updatedHtml).html();
    }
    window.updateURL = function (url) {
        history.pushState({
            url: url,
            currentPage: this.history.length + 1
        }, "Title", url);
    }
    // Receive commentNotification
    window.receiveComment = function (data) {
        var jsonMessage = JSON.parse(data);

        var message = {
            commentId: jsonMessage.Message.CommentId,
            parentId: jsonMessage.ParentId,
            message: jsonMessage.Message.Content,
            commentKey: jsonMessage.Message.CommentKey,
            IsMainComment: jsonMessage.Message.IsReply,
            IsNotification: true,
            commentType: jsonMessage.Message.CommentType,
            profilePic: jsonMessage.ProfilePic,
            fullName: jsonMessage.FullName
        };
        window.commentSuccess(message);
    }
    var parseHtmlPage = function (htmlString) {
        var elemParser = document.createElement("div");
        var inputs = elemParser.getElementsByTagName("input");
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].getAttribute("id") === "replyto") {
                inputs[i].remove();
                alert("Input removed");
            }
        }
        elemParser.innerHTML = htmlString.trim();        
        var htmlPage = elemParser.childNodes;
        return htmlPage;
    }
    window.getComment = function (htmlString) {
        var htmlElements = parseHtmlPage(htmlString);
        var commentsWrapper = document.getElementById("comments-wrapper");

        for (var i = 0; i < htmlElements.length; i++) {
            commentsWrapper.appendChild(htmlElements[i]);
        }        
    }
    window.loadCommentReplies = function (htmlString) {
        var domParser = new DOMParser();
        var htmlPage = domParser.parseFromString(htmlString, "text/html");
        var htmlElement = parseHtmlPage(htmlString);
        var parentId = htmlPage.getElementById("replyto");         
        var parentElem = document.getElementById(parentId.getAttribute("value"));

        for (var i = 0; i < htmlElement.length; i++) {
            parentElem.appendChild(htmlElement[i]);
        }
        // document.getElementById("replyto").remove();
    }
    window.commentSuccess = function (data) {
        var commentId = data.commentId;
        var parentId = document.getElementById(data.parentId);
        var media = document.createElement("div");
        var mediaLeft = document.createElement("div");
        var mediaObject = document.createElement("div");
        var img = document.createElement("img");
        var mediaBody = document.createElement("div");
        var heading = document.createElement("h4");
        var commentReaction = document.createElement("div");
        var cmnt_reply = document.createElement("span");
        var cmnt_like = document.createElement("span");
        var cmnt_unlike = document.createElement("span");
        var cmnt_content_wrapper = document.createElement("div");
        var headingAnchor = document.createElement("a");
        var userCommentWrapper = document.createElement("div");
        var hand_up = document.createElement("span");
        var hand_down = document.createElement("span");
        var like_count = document.createElement("span");
        var unlike_counter = document.createElement("span");

        hand_up.classList = "glyphicon glyphicon-hand-up reaction";
        hand_up.setAttribute("data-contentid", data.commentId);
        hand_up.setAttribute("data-contenttype", data.CommentType);
        hand_up.setAttribute("data-reactiontype", 1);

        hand_down.classList = "glyphicon glyphicon-hand-down reaction";
        hand_down.setAttribute("data-contentid", data.commentId);
        hand_down.setAttribute("data-contenttype", data.CommentType);
        hand_down.setAttribute("data-reactiontype", 2);

        media.classList = "cmedia col-lg-12 col-xs-12";
        media.setAttribute("id", data.commentId);
        mediaLeft.classList = "cmedia-left col-lg-1 col-xs-1";

        mediaObject.classList = "cmedia-object col-lg-1 col-xs-1";

        img.classList = "media-object";
        img.setAttribute("src", "/Images/" + data.profilePic);
        img.style.width = "30px";
        img.style.borderRadius = "15px";
        mediaLeft.append(img);

        mediaBody.classList = "cmedia-body col-lg-11 col-xs-11";
        cmnt_content_wrapper.classList = "cmnt-content-wrapper col-xs-12 col-lg-12";

        heading.classList = "media-heading col-xs-12";
        headingAnchor.innerHTML = data.fullName;
        heading.append(headingAnchor);
        commentReaction.classList = "cmnt-reaction-wrapper col-xs-12 col-lg-12";
        cmnt_reply.classList = "cmnt-reply";
        cmnt_reply.setAttribute("data-reply-to", data.commentId);

        cmnt_reply.innerHTML = "Reply";
        cmnt_like.classList = "cmnt-like";
        cmnt_unlike.classList = "cmnt-unlike";
        like_count.classList = "like-counter";
        unlike_counter.classList = "unlike-counter";

        like_count.innerHTML = "0 Like";
        unlike_counter.innerHTML = "0 Dislike";

        cmnt_like.append(hand_up);
        cmnt_unlike.append(hand_down);
        cmnt_like.append(like_count);
        cmnt_unlike.append(unlike_counter);
        commentReaction.append(cmnt_reply);
        commentReaction.append(cmnt_like);
        commentReaction.append(cmnt_unlike);

        mediaBody.append(heading);       
        mediaBody.append(cmnt_content_wrapper);
        mediaBody.append(commentReaction);

        let message = data.IsNotification ? data.message : parentId.getElementsByTagName("form")[0].getElementsByTagName("textarea")[0].value;
        cmnt_content_wrapper.append(message);
        cmnt_content_wrapper.classList = "cmnt-content-wrapper col-xs-12 col-lg-12";
        media.append(userCommentWrapper);

        userCommentWrapper.append(mediaLeft);
        userCommentWrapper.append(mediaBody);

        // userCommentWrapper.append(mediaBody);
        // userCommentWrapper.append(commentReaction)

        if (!data.IsMaincomment) {
            userCommentWrapper.classList = "col-lg-12 col-xs-12 ucomment";            
            parentId.append(media);
            form.getElementsByTagName("textarea")[0].innerHTML = "";
        } else {
            var commentsWrapper = document.getElementById("comments-wrapper");
            var form = commentsWrapper.getElementsByClassName("comment-form-wrapper")[0].getElementsByTagName("form")[0];
            let cmntWrapper = commentsWrapper.getElementsByClassName("cmnts-wrapper")[0];
            userCommentWrapper.classList = "col-lg-12 col-xs-12 musercomment";
            cmntWrapper.append(media);
            form.getElementsByTagName("textarea")[0].innerHTML = "";
        }
        var click_span = $("[data-reply-to=" + data.commentId + "]")[0];
        click_span.addEventListener("click", function (event) {
            onreply(event);
        });

        //$(click_span).click(function (event) {
        //    onreply(event);
        //});

        var focus_area = $(parentId).find("form").find("textarea")[0];

        $(focus_area).on("focusin", function (event) {
            console.log("Focus Received!");
        });
    }

    // Keep the history index
    var historyIndex = 0;

    window.attachClick_anchors = function (anchors) {
        $(anchors).click(function (event) {
            var target = $(event.target);
            var url = $(this).attr("href");
            // window.updateURL(url);
        });
    }
    window.updateContent = function(data) {
        var contentEl = document.getElementById("container");
        if (data == null)
            return;

        var req = $.ajax({
            url: data.url
        });
        req.done(function (userdata) {
            $(contentEl).html(userdata);
            var headContent = $(contentEl).find("meta");
            for (var i = 0; i < headContent.length; i++) {
                $(document.head).find("meta[name=" + headContent[i].name + "]").replaceWith($(headContent[i]));
            }
            $(document.head).find("title").val($(contentEl).find("meta[name=title]").attr("content"));
            var anchors = $(contentEl).find("a[data-ajax=true]");
            window.attachClick_anchors($(anchors));
        });
        req.fail(function () {
            alert("failed");
        });
    }

    // Revert to a previously saved state    
    window.addEventListener('popstate', function (event) {
        var state = event.state;
        var url = state.url;

        var queryString = url.indexOf("?") > 0 ? url.split("?")[1] : url;
        var qs_variables = queryString.indexOf("&") > 0 ? queryString.split("&") : [];
        var newurl = url.indexOf("?") > 0 ? url.split("?")[0] + "?" : url;

        for (var i = 0; i < qs_variables.length; i++) {
            if (qs_variables[i].split("=")[0] === "ispartial") {
                newurl += (i + 1) < qs_variables.length ? "ispartial=true&" : "ispartial=true";
            } else {
                newurl += (i + 1) < qs_variables.length ? qs_variables[i] + "&" : qs_variables[i];
            }
        }
        updateContent({ url: newurl });
        historyIndex = state.currentPage;
    });
    var docanchors = $(document.body).find("a[data-ajax=true]");
    window.attachClick_anchors($(docanchors));

    var shoping_cart = [];

    // Cancel the current stream of segments from the server
    window.cancelplayback = function () {

    }     
    // Generate stream Id
    window.generateStreamId = function () {
        var newStream = Math.random().toString().replace(".", "");
        if (newStream != streamId) {
            streamId = newStream;            
            return streamId;
        } else {
            window.generateStreamId();
        }        
    }
    Page.streamId = window.generateStreamId();
    window.getStreamId = function () {
        return Page.streamId;
    }
    // return the old streamId
    window.getOldStreamId = function () {
        return streamIdentity;
    }
    var newsletterIndex = 0;
    // Keep showing the modal when the user hides it.
    $("#coursenewsletter").on("hidden.bs.modal", function (e) {
        var req = $.ajax({
            url:"/Account/GetUser",
        });
        req.done(function (userdata) {            
            if (!userdata.IsAuthenticated) {    
                newsletterIndex += 1;
                setTimeout(function () {                    
                    if (newsletterIndex <= 3) {
                        $("#coursenewsletter").modal("show");
                    }
                }, 30000);
            }
        })        
    });
    // Get whether the current user is authenticated.
    var req = $.ajax({
        url: "/Account/GetUser"
    });
    req.done(function (userdata) {
        if (!userdata.IsAuthenticated) {
            $("#coursenewsletter").modal("show");
        }
    });
    req.fail(function () {
        alert("failed");
    });
    // Adding Items to the cart
    window.add_to_cart = function (videoId) {
        if ($("#checkout-link").length <= 0) {
            var shopping_cart_link = document.createElement("a");
            var shopping_cart_span = document.createElement("span");

            $(shopping_cart_link).attr("id", "checkout-link");
            $(shopping_cart_link).attr("href", "/finance/finance/Checkout?checkedoutvideos=");
            $(shopping_cart_link).attr("data-ajax", true);
            $(shopping_cart_link).attr("data-ajax-success", "loadSuccess");
            $(shopping_cart_link).attr("data-ajax-loading", "#async-page-loading-id");
            $(shopping_cart_link).attr("data-ajax-update", "#container");
            $(shopping_cart_link).attr("data-ajax-mode", "replace");
            $(shopping_cart_link).attr("title", "Checkout");
            $(shopping_cart_link).addClass("shopping_cart_anchor");
            $(shopping_cart_span).addClass("glyphicon glyphicon-shopping-cart");
            $(shopping_cart_link).append($(shopping_cart_span));
            $(shopping_cart_link).append(" Checkout");

            $(shopping_cart_link).insertAfter($("#application_name"));
        }
        var vid = $("#checkout-link").attr("href").split("?")[1];
        var variables = vid.split("&");
        for (var i = 0; i < variables.length; i++) {
            if (variables[i].split("=")[0] === "checkedoutvideos") {
                var new_variables = variables[i].split("=")[1] == "" ? videoId : variables[i].split("=")[1] + ";" + videoId;
                vid = "/finance/finance/Checkout?ispartial=true&checkedoutvideos=" + new_variables; 
                $("#checkout-link").attr("href", vid);
                break;
            }
        }
    }
    // Removing Items to the cart
    window.remove_from_cart = function (videoId) {
        var vid_link = $("#checkout-link").attr("href").split("?")[1];
        var variables = vid_link.split("&");
        var vid_variables = "checkedoutvideos=";
        for (var i = 0; i < variables.length; i++) {
            if (variables[i].split("=")[0] === "checkedoutvideos") {
                var new_variables = variables[i].split("=")[1].split(";");
                for (var j = 0; j < new_variables.length; j++) {
                    if (new_variables[j] !== videoId) {
                        vid_variables += new_variables[j];
                        if (j + 1 < new_variables.length) {
                            vid_variables += ";"
                        }
                    }
                }                
                if (vid_variables.split("=")[1] === "") {
                    $("#checkout-link").replaceWith("");
                }
            }
        }       
        vid_variables = "/finance/finance/Checkout" + vid_variables;
        
        vid_variables.trim();
        $("#checkout-link").attr("href", vid_variables);
    }
    // check if the user is authenticated or not
    window.IsUserAuthenticated = function () {
        var req = $.ajax({
            url: "/Account/GetUser",
        });
        req.done(function (userdata) {
            $(".upgrade-to-premium-con").html("");
            if (userdata.IsAuthenticated) {
                loginAnchor = document.createElement("a");
                logoutSpan = document.createElement("span");
                btnspanCon = document.createElement("div");

                $(btnspanCon).addClass("btn btn-sm");

                // divs for the and the columns to contain the login/logout glypicon
                divrow = document.createElement("div");
                divspancol = document.createElement("div");

                // a div to contain the login/logout text
                divlinlo = document.createElement("div");

                $(divrow).addClass("row vdm-lio-main-wrapper");
                $(divspancol).addClass("col-sm-4 col-xs-2 col-lg-6 vdm-glyphicon-wrapper");
                $(divlinlo).addClass("col-sm-8 col-xs-2 loginout-txt");

                // append the span with the glyphicon in the divspancol

                // logout span attributes
                $(logoutSpan).addClass("glyphicon glyphicon-log-out");

                // Append the span within the btn div container.
                $(btnspanCon).append($(logoutSpan));
                $(divspancol).append($(btnspanCon));

                // append the the logout text into the divlilo
                $(divlinlo).append(" Logout");

                $(divrow).append($(divspancol));
                $(divrow).append($(divlinlo));

                // login Enchor Attributes
                $(loginAnchor).attr("href", "/Account/Logout");
                $(loginAnchor).attr("title", "Logout of the site");
                $(loginAnchor).attr("data-ajax", true);
                $(loginAnchor).attr("data-ajax-loading", "#async-page-loading-id");
                $(loginAnchor).attr("data-ajax-method", "GET");
                $(loginAnchor).attr("data-ajax-update", "#container");
                $(loginAnchor).attr("data-ajax-mode", "replace");
                $(loginAnchor).attr("id", "loginAnchor");
                $(loginAnchor).attr("data-ajax-success", "loadSuccess");

                $(loginAnchor).append($(divrow));

                $("#loginAnchor").replaceWith($(loginAnchor));     

                if (!userdata.IsSubUser) {
                    upgradePr = document.createElement("a");

                    $(upgradePr).attr("data-ajax", true);
                    $(upgradePr).attr("data-ajax-method", "GET");
                    $(upgradePr).attr("data-ajax-loading", "#async-page-loading-id");
                    $(upgradePr).attr("data-ajax-update", "#container");
                    $(upgradePr).attr("data-ajax-mode", "replace");
                    $(upgradePr).attr("title", "Upgrade to Premium");
                    $(upgradePr).attr("class", "upgrade-to-premium");
                    $(upgradePr).attr("id", "btnpremium");
                    $(upgradePr).attr("data-ajax-begin", "beforeasyncCall");
                    $(upgradePr).attr("data-ajax-success", "loadSuccess");
                    $(upgradePr).attr("href", "/finance/finance/");
                    $(upgradePr).append("Upgrade");

                    $(".upgrade-to-premium-con").append($(upgradePr));
                }
            } else {
                logoutAnchor = document.createElement("a");
                loginSpan = document.createElement("span");
                btnspanCon = document.createElement("div");
                $(btnspanCon).addClass("btn btn-sm");

                // alert("User Not Authenticated!");
                // divs for the and the columns to contain the login/logout glypicon
                divrow = document.createElement("div");
                divspancol = document.createElement("div");

                // a div to contain the login/logout text
                divlinlo = document.createElement("div");

                $(divrow).addClass("row");
                $(divspancol).addClass("col-sm-4 col-xs-2");
                $(divlinlo).addClass("col-sm-8 col-xs-2 loginout-txt");
               
                // logout span attributes
                $(loginSpan).addClass("glyphicon glyphicon-log-in");

                // Append the span within the btn div container
                $(btnspanCon).append($(loginSpan));
                $(divspancol).append($(btnspanCon));

                // append the the logout text into the divlilo
                $(divlinlo).append(" Login");

                $(divrow).append($(divspancol));
                $(divrow).append($(divlinlo));

                // logout Anchor Attributes
                $(logoutAnchor).attr("href", "/Account/Login");
                $(logoutAnchor).attr("data-ajax", true);
                $(logoutAnchor).attr("data-ajax-loading", "#async-page-loading-id");
                $(logoutAnchor).attr("data-ajax-method", "GET");
                $(logoutAnchor).attr("data-ajax-update", "#container");
                $(logoutAnchor).attr("data-ajax-mode", "replace");
                $(logoutAnchor).attr("id", "loginAnchor");
                $(logoutAnchor).attr("data-ajax-success", "loadSuccess");
                
                $(logoutAnchor).append($(divrow));

                $("#loginAnchor").replaceWith($(logoutAnchor));

                if ($("#btnpremium").length > 0) {
                    premiumButton = $("#btnpremium");
                    $("#btnpremium").replaceWith("");
                }
            }
        });
        req.fail(function (xhr) {
            alert("Failed to login");
        });
    }
    // A method to call each time a page that was requested asynchronously is done loading
    window.loadSuccess = function (e) {
        IsUserAuthenticated();
        $(".loginerror").css({
            "display": "block"
        });
        var anchors = $("#container").find("a[data-ajax=true]");
        window.attachClick_anchors($(anchors));
        window.nextLoaded();
    }
    // waiting for cancellation
    window.waitingForCancellation = function (data) {
        jsonCon = JSON.parse(data);
    }
    // successful streamming task cancellation notification.
    window.taskCancelled = function (data) {
        console.log("Task Cancelled");
        // window.request(JSON.stringify(reqObj));
    }
    // error encountered
    window.errorEncountered = function (data) {
        console.log("About to add the task");
        // alert("Task Added!");
    }
    // video requested
    window.videoRequested = function (data) {
        // console.log("Video Requested StreamId = " + JSON.parse(data).streamId + " VideoId = " + JSON.parse(data).videoId);
    }
    // Testing function
    window.testingCancel = function (data) {
        // var jsonStatus = JSON.parse(data);
        // console.log("my data + " + data);
        // console.log("Task Started streamId = " + jsonStatus.streamId + " videoId = " + jsonStatus.videoId +
        //    " TaskCount = " + jsonStatus.sendertasks);
    }
    window.taskCancelRequest = function () {
        // console.log("Task cancel Requested");
    }
    // Before playing the next video and when moving from one page to the other.
    window.beforeasyncCall = function () {
        Page.streamId = window.generateStreamId();
        Page.frameLoaded = false;
        Page.frameReady = false;
        var runningTask = getCurrentTask();

        if ((runningTask !== undefined)) {
            // alert("Running Task Not Undefined!");
            if (runningTask.Status === StreamStatus.Running.name) {
                runningTask.Status = StreamStatus.Canceled.name;
                runningTask.IsCompleted = true;
            }
        }
        // alert("Running task Status = " + StreamStatus.Status.name);
        if (StreamStatus.Status.name === StreamStatus.Running.name) {
            // alert("There is a running Task We going to cancel it!");
            StreamStatus.Status = StreamStatus.Canceled;            
            window.pausePlayStream();
        }
    }

    // Login Success
    window.loginsuccess = function (e) {
         IsUserAuthenticated();
         $(".loginerror").css({
            "display": "block"
        })    
        window.nextLoaded();
    }

    // Logout Success
    window.logoutsuccess = function (e) {
        IsUserAuthenticated();
    }

    // Login Failed
    window.loginfailed = function () {
        alert("Login Failed");
    }
    window.resizeFrame = function (iframe) {
        var videlement = document.getElementsByTagName("video")[0];
        var vidHeight = videlement.clientHeight;

        var controlHeight = $(iframe.contentWindow.document.body).find(".controls-container");
        var progressHeight = $(iframe.contentWindow.document.body).find(".custom-progress");

        iframe.style.height = vidHeight + "px";
        var navbar = document.getElementsByClassName("nav-custom-bar")[0];
        var height = navbar.clientHeight;
        
        var footer = document.getElementsByTagName("footer")[0];
        var container = document.getElementById("container");

        if ($(document).innerWidth() < 500) {            
            container.style.position = "relative";
            container.style.top = vidHeight + height + "px";    
            $(footer).css({ "position": "relative", "top": navbar_height + $(iframe).innerHeight() + "px" });
        } else {
            container.style.removeProperty("position");
            container.style.removeProperty("top");
            footer.style.removeProperty("position");
            footer.style.removeProperty("top");
        }          
    }
    window.domContentLoaded = function () {
        // var iframe = document.getElementById("player-frame");
        // resizeFrame(iframe);
    }
    // Replying to a comment
    window.onreply = function (event) {
        var formWrapper = document.createElement("div");
        formWrapper.classList = "col-lg-12 comment-form-wrapper";
        
        var form = document.createElement("form");
        $(form).attr("data-ajax", true);
        $(form).attr("data-ajax-method", "post");
        $(form).attr("data-ajax-mode", "replaceAfter");
        $(form).attr("data-ajax-success", "commentSuccess");
        $(form).attr("action", "/blog/setcomment");

        var commentKey = document.createElement("input");
        $(commentKey).attr("type", "hidden");
        $(commentKey).attr("value", $("#comments-wrapper").data("cmnts-key"));
        $(commentKey).attr("name", "key");

        var commentType = document.createElement("input");
        $(commentType).attr("type", "hidden");
        $(commentType).attr("value", $("#comments-wrapper").data("comnts-type"));
        $(commentType).attr("name", "ct");

        var mainComment = document.createElement("input");
        $(mainComment).attr("type", "hidden");
        $(mainComment).attr("value", false);
        $(mainComment).attr("name", "IsmainComment");

        var parentId = document.createElement("input");
        $(parentId).attr("value", $(event.target).data("reply-to"));
        $(parentId).attr("type", "hidden");
        $(parentId).attr("name", "parentId");

        var txtMsgWrapper = document.createElement("div");
        txtMsgWrapper.classList = "col-lg-10 cmnt-input-wrapper";
        txtMsgWrapper.style.height = "34px";
        var textMessage = document.createElement("textarea");
        
        textMessage.style.width = "100%";
        textMessage.style.height = "34px";
        $(textMessage).attr("name", "cmnt-message");

        // Append the textArea into its wrapper.
        txtMsgWrapper.append(textMessage);
        formWrapper.append(txtMsgWrapper);

        var toolWrapper = document.createElement("div");
        $(toolWrapper).addClass("cmnt-reaction-wrapper");

        var cmntToolWrapper = document.createElement("div");
        cmntToolWrapper.classList = "cmnt-tool-wrapper col-lg-2";
        var btnSubmitSpan = document.createElement("span");
        btnSubmitSpan.classList = "btn-submit";

        // formWrapper.append(cmntToolWrapper);

        var submitForm = document.createElement("input");
        $(submitForm).attr("type", "submit");
        $(submitForm).addClass("btn btn-primary");
        $(submitForm).attr("value", "Send");

        // append the submit button to the span
        btnSubmitSpan.append(submitForm);

        // append the btnsubmit span to the cmntToolsWrapper.
        cmntToolWrapper.append(btnSubmitSpan);

        $(form).append($(commentKey));
        $(form).append($(commentType));
        $(form).append($(parentId));
        $(form).append($(mainComment));
        formWrapper.append(cmntToolWrapper);
        form.append(formWrapper);

        var parentCom = $('#' + $(event.target).data("reply-to"));
        $(parentCom).append(form);
    }

    // When the comment input receive focus.
    window.cmntFocus = function (event) {
        $(event.target).toggle();
    }

    // Trigger Replying to a comment.
    // $(".cmnt-reply").on("click", function (event) {
    //    onreply(event);
    // })

    // form check boxes
    window.formCheckboxes = function (form) {       
        var checkboxes = $(form).find("input[type='checkbox']");
        for (var i = 0; i < checkboxes.length; i++) {
            if ($(checkboxes[i]).prop("checked") === true) {
                $(checkboxes[i]).attr("value", "true");
            } else {
                $(checkboxes[i]).attr("value", "false");
            }
        };
        return checkboxes;
    }

    // search function from autocomplete of the form.
    window.response = function (event, ui) {        
        $.each(ui.content, function (index, item) {
            item.value = item.Title;
            item.label = item;

            console.log("Items " + item.label.Title);
        });
    }
    window.search = function (form, response) {
        var req, input = $(form).find("input[type='text']");     
        // alert("Form Serialized " + $(input).val());
        req = $.ajax({
            url: "/Video/Search?" + $(form).serialize() + "&ispartial=true",
        });
        req.done(function (xhr) {               
            response(xhr);

            // Search for video and return an html page with those videos
            if (($(input).val().split(" ")).length > 3) {
                // Make sure that the playing streamming is cancelled if it is neccessary.
                window.formCheckboxes($(form));
            }
        });
        req.fail(function (xhr) {

        });
    }    
    window.renderItems = function (ul, item) {        
        var sub = item.value.substring($("#searchbar").val().length, item.label.Title.length);
        var li = document.createElement("li");
        var item_wraper = document.createElement("div");
        var user_name = document.createElement("span");
        var user_icon = document.createElement("span");
        var matchItem = document.createElement("span");
        var type_log = document.createElement("span");

        $(type_log).addClass("search-menuitem-type-log");
        $(type_log).append(item.label.Type);

        $(matchItem).addClass("match-menuitem-content");
        $(matchItem).append($("#searchbar").val() + "<b>" + sub + "</b>");

        $(user_icon).addClass("glyphicon glyphicon-user search-user-icon");
        $(user_name).addClass("search-menu-item-user-name");
        $(user_name).append(item.label.Username);

        $(li).attr("data-value", item.value);

        // set the item wrapper attributes
        $(item_wraper).append($(matchItem), $(user_icon), $(user_name), $(type_log));

        return $(li).append($(item_wraper)).appendTo(ul);
    }
    $("#searchbar").autocomplete({
        response: function (event, ui) {
            window.response(event, ui);
        },
        source: function (request, response) {           
            // auto complete what the user is typing.
            var req;
            window.search($("#search-form"), response);            

            if ($("#search-form").find("input[type='text']").val().split(" ").length >= 2)
            {
                var searched_vid_req = $.ajax({
                    url: "/Video/GetVideos?" + $("#search-form").serialize() + "&ispartial=true",
                });
                searched_vid_req.done(function (html) {
                     $("#container").html();
                     $("#container").html(html);
                     // updateURL(html);
                     $(".ui-autocomplete").css({
                        "display": "none"
                     })
                })
            };            
        },
        select: function (event, ui) {
            
        },
        open: function (event, ui) {
            var items = $(".ui-front").find(".ui-menu-item");
        },        
        _renderMenu: function (ul, items) {
            // alert("Rendering Menu");
        },
    }).autocomplete("instance")._renderItem = function (ul, item) {           
        return window.renderItems(ul, item);
    };
    // the check status of the search option form checkbox status
    $("#search-form").find("input[type='checkbox']").change(function () {
        var checkboxes = $("#search-form").find("input[type='checkbox']");
        if ($(this).prop("name") === "all") {
            for (var i = 0; i < checkboxes.length; i++) {
                if ($(checkboxes[i]).prop("name") !== "all") {
                    $(checkboxes[i]).prop("checked", true);
                    $(checkboxes[i]).attr("value", "true");
                }
            }
        } else {
            for (var i = 0; i < checkboxes.length; i++) {
                if ($(checkboxes[i]).prop("name") === "all") {
                    $(checkboxes[i]).prop("checked", false);
                    $(checkboxes[i]).attr("value", "false");
                }
            }
        }

        if ($("#searchbar").val().length >= 1) {
            if (StreamStatus.Status === StreamStatus.Running.name ||
                StreamStatus.Status === StreamStatus.Started.name ||
                StreamStatus.Status === StreamStatus.Paused.name) {
                beforeasyncCall();
            }
            var searched_vid_req = $.ajax({
                url: "/Video/GetVideos?" + $("#search-form").serialize() + "&ispartial=true",
                dataType: "html"
            });
            searched_vid_req.done(function (html) {
                $("#container").html();
                $("#container").html(html);
                updateURL(html);
                $(".ui-autocomplete").css({
                    "display": "none"
                })
            })
        }
    });
    
    // Onkey press for the search
    $("#searchbar").on("keypress", function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();

            // Make sure that the playing streamming is cancelled if it is neccessary.
            if (reqObj.data.isplaying) {
                beforeasyncCall();
            }
            var checkboxes = $("#search-form").find("input[type='checkbox']");
            for (var i = 0; i < checkboxes.length; i++) {
                if ($(checkboxes[i]).prop("checked") === true) {
                    $(checkboxes[i]).attr("value", "true");
                } else {
                    $(checkboxes[i]).attr("value", "false");
                }
            }

            var searched_vid_req = $.ajax({
                url: "/Video/GetVideos?" + $("#search-form").serialize() + "&ispartial=true",
                dataType: "html"
            });
            searched_vid_req.done(function (html) {
                $("#container").html();
                $("#container").html(html);
                // updateURL(html);
                $(".ui-autocomplete").css({
                    "display": "none"
                })
            })
        }
    });
    window.readyState = function () {
        Page.frameReady = true;
        Page.frameLoaded = true;
    }
    window.getframeState = function () {
        return Page.frameReady;
    }

    // Receive data from the signalr
    con.received(function (data) {
        var jsonData = JSON.parse(data);
        var fun = null;        
        if (myframe != null || myframe != undefined) {
            var frameConWin = myframe.contentWindow;            
            if (jsonData.iframe) {
                // console.log("jsondata.StreamID = " + jsonData.currentvideo.streamId + " currentStreamId = " + Page.streamId + ", frameConWin = " + Page.frameId);
                if (!Page.frameLoaded || !Page.frameReady) {
                    console.log("Frame Not Ready  { FrameReady = " + Page.frameReady + ", FrameLoaded = " + Page.frameLoaded + " }");
                }
                if (jsonData.currentvideo.streamId === Page.streamId && Page.frameLoaded && Page.frameReady) {                    
                    frameConWin.vidseg(jsonData);
                    if (jsonData.isInitialization) {
                        StreamStus.Status = StreamStus.Running;
                    }
                }               
            } else {
                fun = window[jsonData.function];
                fun(data);
            }
        } else {
            fun = window[jsonData.function];
            fun(data);
        }
    });

    // Hide and show the items on the  header of the website
    $("#leftarrowicon").on("click", function (e) {        
        $(".searchbar-container").css({
            "display":"none"
        });
        $("#more-option-container").css({
            "display": "block"
        });
        $("#searchicon").css({
            "display":"block"
        });
        $(this).css({
            "display":"none"
        });
        $(".upgrade-to-premium-con").css({
            "display": "block"
        });
        $(".ln-logo").css({
            "display": "block"
        })
    });
    $("#searchicon").on("click", function () {
        $(".searchbar-container").css({
            "display": "block"
        });
        $("#leftarrowicon").css({
            "display":"block"
        });
        $("#more-option-container").css({
            "display":"none"
        });
        $(".upgrade-to-premium-con").css({
            "display" : "none"
        });
        $(".ln-logo").css({
            "display": "none"
        })
        $(this).css({
            "display": "none"
        });
    });
    window.video_ended_anchor = function (href) {
        var related_vid = $.ajax({
            url: href,
        });
        related_vid.done(function (html) {
            $("#container").html();            
            $("#container").html(html);
            updateURL(html);
        })
    }
    window.sizeFrame = function () {
        // var frameCon = document.getElementById("player-con");
        // var frame = document.getElementById("player-frame");
        // var videoWidth = frameCon.getAttribute("data-video-width");
        // var videoHeight = frameCon.getAttribute("data-video-height");
        // var aspectRatio = frameCon.getAttribute("data-video-ar");

        // let conWidth = frameCon.clientWidth;

        // frame.style.width = conWidth;
        // frame.style.height = (parseInt(videoWidth) * (parseInt(aspectRatio.split(":")[1]))) / 16;
        // frameCon.style.height = (parseInt(videoWidth) * (parseInt(aspectRatio.split(":")[1]))) / 16;
    }

    // This is the configuration of the signalr connection
    // Detecting when the client is connected, reconnecting and disconnected.
    // Start the connection when this script loads.
    
    if (!Connection.isConnected) {
        con.start().done(function () {    
            Connection.isConnected = true;
            StreamStatus.Status = StreamStatus.Waiting;  
            var startStreamInverval = setInterval(function () {
                if (Page.frameReady) {
                    clearInterval(startStreamInverval);
                    // window.startStreaming();
                }
            }, 10);            
        });
    }    

    var startConnection = function (data) {
        con.start().done(function () {
            Connection.isConnected = true;
            StreamStatus.Status = StreamStatus.Waiting;
            var retryConnection = setInterval(function () {
                if (Page.frameReady) {
                    clearInterval(retryConnection);
                    con.send(JSON.stringify(data));
                }
            }, 1000);
        });
    }

    // Receive the ConnectionId after successfully connected
    window.getcid = function (data) {
        var json = JSON.parse(data);
        Page.pageId = json.cid;
        Connection.connectionId = Page.pageId;

        if (tasks.find(function (task) {
            return task.connectionId === json.cid;
        }) === undefined) {
            tasks.push({ connectionId: json.cid });
        }        
        console.log("Successfully Connected!");
    }
    con.reconnected(function () {
        Connection.isConnected = true;
        console.log("You are connected");
    })
    con.reconnecting(function () {
        console.log("Reconnection");
    })
    con.disconnected(function () {
        Connection.isConnected = false;

        console.log("Disconnecting");
        var runningTask = tasks.find(function (task) {
            return task.connectionId === Page.pageId;
        });
        if (runningTask !== null || runningTask !== undefined) {
            console.log("About to reconnect if the runningTask did not complete of canceled.");
            if (!runningTask.IsCompleted && !runningTask.IsCancellationRequested) {
                console.log("timer to try reconnecting to the server.");
                setTimeout(function () {
                    let videoId = document.getElementById("videoId");
                    let objpage = window.getFrameId();
                    let frameId = objpage.frameId;
                    let conId = objpage.connectionId;

                    var currentVideo = {
                        videoId: videoId.nodeValue,
                        frameId: frameId,
                        taskId: runningTask.taskId,
                        connectionId: conId
                    };
                    startConnection(currentVideo);
                }, 10);
            }
        }        
    })
    $(".navbar-toggle").on("click", function () {
        $(window).scrollTop(0);
        $(".async-page-loading").css({
            "display": "block"
        })
        $("body").css({
            "overflow": "hidden"
        })
        setTimeout(function () {
            $(".sliding-menu").css({
                "left": "0"
            })
        }, 10);
    })
    $(".async-page-loading").click(function () {
        var body = document.getElementsByTagName("body")[0];
        body.style.removeProperty("overflow");
        this.style.display = "none";
        $(".sliding-menu").css({
            "left" : "-100%"
        });
    })
    history.pushState({ url: document.location.href, currentPage: history.length + 1 }, document.title, document.location.href);
});
