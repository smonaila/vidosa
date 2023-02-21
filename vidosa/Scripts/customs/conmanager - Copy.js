/// <reference path="../jquery-1.10.2.min.js" />
/// <reference path="../jquery.signalr-2.4.0.min.js" />
/// <reference path="../jquery-1.10.2.min.js" />

var con = $.connection("/player");

$(document).ready(function () {
    $("[data-toggle='popover']").popover({
        html: true,
        template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    });

    window.updateURL = function (url) {
        history.pushState({
            url: url,
            currentPage: this.history.length + 1
        }, "Title", url);
    }

    // Keep the history index
    var historyIndex = 0;

    window.attachClick_anchors = function (anchors) {
        $(anchors).click(function (event) {
            var target = $(event.target);
            var url = $(this).attr("href");

            window.updateURL(url);
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

    var streamIdentity = 0;
    
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
            isplaying: false
        },
    };

    // When 
    var stream_segments = [];
    var player_worker;
    var current_vid = null;
    var shoping_cart = [];

    // Receive messages from the worker
    player_worker.onmessage = function (event){
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

    // Cancel the current stream of segments from the server
    window.cancelplayback = function () {

    }    
    
    // Generate stream Id
    window.getStreamId = function () {
        var newStream = Math.random().toString().replace(".", "");
        if (newStream != streamIdentity) {
            streamIdentity = newStream;
            istaskCancelled = false;
            return streamIdentity;
        } else {
            getStreamId();
        }        
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
                loginSpan = document.createElement("span");
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
                logoutSpan = document.createElement("span");
                btnspanCon = document.createElement("div");
                $(btnspanCon).addClass("btn btn-sm");

                // divs for the and the columns to contain the login/logout glypicon
                divrow = document.createElement("div");
                divspancol = document.createElement("div");

                // a div to contain the login/logout text
                divlinlo = document.createElement("div");

                $(divrow).addClass("row");
                $(divspancol).addClass("col-sm-4 col-xs-2");
                $(divlinlo).addClass("col-sm-8 col-xs-2 loginout-txt");
               
                // logout span attributes
                $(logoutSpan).addClass("glyphicon glyphicon-log-in");

                // Append the span within the btn div container
                $(btnspanCon).append($(logoutSpan));
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
    }

    // waiting for cancellation
    window.waitingForCancellation = function (data) {
        jsonCon = JSON.parse(data);
    }

    // new video details
    window.new_viddetails = function (data) {
        var viddetails = JSON.parse(data);
        reqObj.data.streamId = viddetails.newviddetails.streamId;
        reqObj.data.bandwidth = viddetails.newviddetails.bandwidth;
        reqObj.data.videoId = viddetails.newviddetails.videoId;

        if (current_vid === null || current_vid === "undefined") {
            current_vid = new CurrentVid(reqObj.data.videoId, reqObj.data.streamId, 0, 1222);
        }
        current_vid.videoId = reqObj.data.videoId;
        current_vid.streamId = reqObj.data.streamId;
        current_vid.isLastSegment = false;
        current_vid._subcontents = [];
        current_vid.subcont = [];

        myframe = document.getElementById("player-frame");
        if (myframe === null || myframe === "undefined") {
            window.beforeasyncCall();
            return;
        }
        pframe = myframe.contentWindow;
        pframe.updatereq_vid({
            streamId: current_vid.streamId
        });
        //alert("New Video Task " + current_vid.streamId);
    }

    window.old_viddetails = function (data) {        
        current_vid.isLastSegment = false;
        current_vid._subcontents = [];
        current_vid.subcont = [];
    }

    // update requested object.
    window.updateRequestedObject = function (data) {
        var jsonData = JSON.parse(data);
        reqObj.functionName = jsonData.functionName;
        reqObj.data.bandwidth = jsonData.data.bandwidth;
        reqObj.data.content = jsonData.data.content;
        reqObj.data.isInitialization = jsonData.data.isInitialization;
        reqObj.data.isLastSegment = jsonData.data.isLastSegment;
        reqObj.data.end = jsonData.data.end;
        reqObj.data.start = jsonData.data.start;
        reqObj.data.isplaying = jsonData.data.isplaying;
        reqObj.data.segIndex = jsonData.data.segIndex;
        reqObj.data.senderId = jsonData.data.senderId;
        reqObj.data.streamId = jsonData.data.streamId;
        reqObj.data.videoId = jsonData.data.videoId;
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
        //var jsonStatus = JSON.parse(data);
        //console.log("my data + " + data);
        //console.log("Task Started streamId = " + jsonStatus.streamId + " videoId = " + jsonStatus.videoId +
        //    " TaskCount = " + jsonStatus.sendertasks);
    }

    window.taskCancelRequest = function () {
        console.log("Task cancel Requested");
    }

    // Before playing the next video
    window.beforeasyncCall = function (e) { 
        //$(this).prop("href", "https://localhost:44333/blog/getpost?purl=what-is-a-variable&ispartial=false");

        if (reqObj.data.isplaying) {
            reqObj.data.isplaying = false;
            var cancelplayback = {
                functionName: "CancelPlayBack",
                data: {
                    streamId: current_vid.streamId,
                    iscancel: true
                }
            }
            
            // alert("About to cancel isplaying = " + reqObj.data.isplaying + "current_vid.streamId = " + current_vid.streamId + "cancelplayback = " + cancelplayback.data.iscancel + " " + cancelplayback.data.streamId);
            con.start().done(function () {
                con.send(JSON.stringify(cancelplayback));
            });
        }
    }    

    // Login Success
    window.loginsuccess = function (e) {
        //IsUserAuthenticated();
        //$(".loginerror").css({
        //    "display": "block"
        //})        
    }

    // Logout Success
    window.logoutsuccess = function (e) {
        IsUserAuthenticated();
    }

    // Login Failed
    window.loginfailed = function () {
        alert("Login Failed");
    }

    // make a request to the server
    window.request = function (data) {
        // Start the signalr connection
        con.start().done(function () {
            
        });
    }

    window.resizeFrame = function (iframe) {
        var videlement = $(iframe.contentWindow.document.body).find("video");
        var controlHeight = $(iframe.contentWindow.document.body).find(".controls-container");
        var progressHeight = $(iframe.contentWindow.document.body).find(".custom-progress");

        iframe.style.height = ($(videlement).innerHeight()) + "px";
        var navbar_height = $(".nav-custom-bar").innerHeight();
        var footer = document.getElementsByTagName("footer")[0];
        var container = document.getElementById("container");
        if ($(document).innerWidth() < 500) {            
            container.style.position = "relative";
            container.style.top = (navbar_height + $(iframe).innerHeight()) + "px";    
            $(footer).css({ "position": "relative", "top": navbar_height + $(iframe).innerHeight() + "px" });
        } else {
            container.style.removeProperty("position");
            container.style.removeProperty("top");
            footer.style.removeProperty("position");
            footer.style.removeProperty("top");
        }          
    }

    window.domContentLoaded = function () {
        var iframe = document.getElementById("player-frame");
        resizeFrame(iframe);

        //var iframes = document.querySelectorAll("iframe");
        //for (var i = 0; i < iframes.length; i++) {
        //    resizeFrame(iframes[i]);
        //}
    }

    $("#searchbar").autocomplete({
        response: function (event, ui) {
            $.each(ui.content, function (index, item) {
                item.value = item.Title;
                item.label = item
            });
        },
        source: function (request, response) {           
            // auto complete what the user is typing.
            var req;
            if (($("#searchbar").val().split(" ")).length >= 2) {
                var checkboxes = $("#search-form").find("input[type='checkbox']");
                for (var i = 0; i < checkboxes.length; i++) {
                    if ($(checkboxes[i]).prop("checked") === true) {
                        $(checkboxes[i]).attr("value", "true");
                    } else {
                        $(checkboxes[i]).attr("value", "false");
                    }
                };
                req = $.ajax({
                    url: "/Video/Search?" + $("#search-form").serialize() + "&ispartial=true",
                });

                req.done(function (xhr) {
                    response(xhr);

                    // Search for video and return an html page with those videos
                    if (($("#searchbar").val().split(" ")).length > 3) {
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
                req.fail(function (xhr) {

                });
            }           
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

    // Get all the ajax anchor tags for modifying their href if the page is to be opened in a new tab or window
   
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

    // Receive data from the signalr
    con.received(function (data) {
        var jsonData = JSON.parse(data);
        var fun = null;

        //console.log("Receiving data = " + data);

        if (jsonData.isframe) {            
            if (jsonData.currentvideo.streamId === current_vid.streamId) {
                if (current_vid === "undefined") {
                    current_vid = new CurrentVid(jsonData.currentvideo.videoId, jsonData.currentvideo.streamId, jsonData.currentvideo.start, jsonData.currentvideo.end);
                    current_vid.isLastSegment = jsonData.currentvideo.isLastSegment;
                    current_vid.subcont = [];
                }                
                if (jsonData.currentvideo.IsLastSegment && jsonData.isLastsubsegment) {
                    current_vid.isLastSegment = jsonData.currentvideo.IsLastSegment;
                    current_vid.segIndex = jsonData.currentvideo.segIndex;
                    current_vid.mergeSegments();
                    current_vid.subcont = [];               
                }
                if (jsonData.currentvideo.isInitialization) {
                    current_vid.initialization(jsonData.currentvideo.content);                    
                } else {
                    current_vid.segIndex = jsonData.currentvideo.segIndex;
                    current_vid.rec_sub_seg(jsonData.currentvideo.content);
                }                
                if (jsonData.isLastsubsegment && !jsonData.currentvideo.IsLastSegment) {
                    current_vid.segIndex = jsonData.currentvideo.segIndex;
                    current_vid.mergeSegments();
                    current_vid.subcont = [];
                }                
            } else {
                alert("data streamId = " + jsonData.currentvideo.streamId + " and " + current_vid.streamId);
            }
        } else {            
            fun = window[jsonData.function];
            fun(data);
        }
    });   

    // Hide and show the items on the  header of the website
    $("#leftarrowicon").on("click", function (e) {
        //var searchiconspan = document.createElement("span");
        //$(searchiconspan).addClass("glyphicon glyphicon-search");
        //$(searchiconspan).on("click", add_arrowicon);

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
    con.reconnecting(function () {
        console.log("Reconnection");
    })

    con.disconnected(function () {
        console.log("Disconnecting");
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

    history.pushState({url: document.location.href, currentPage: history.length + 1}, document.title, document.location.href);
});
