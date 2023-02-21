// $(".vid-ended-related").css({
//    "display": "inline-block"
// })

// get this window object width
var rltdvidended = document.getElementById("rltd-vid-ended");
var objmainwrapper = null;

if (parseInt(rltdvidended.clientWidth) < 500) {
    rltdvidended.innerHTML = "";

    var vid_ended_controls_main_wrapper = document.createElement("div");
    var vid_ended_controls_btn_repeat_wrapper = document.createElement("div");
    var repeat_anchor = document.createElement("a");
    var btn_repeat_span = document.createElement("span");

    var vid_ended_btn_repeat_forward_wrapper = document.createElement("div");
    var btn_step_forward = document.createElement("a");
    var btn_play_next = document.createElement("span");
    var btn_repeat_center = null;

    vid_ended_btn_repeat_forward_wrapper.classList = "col-xs-12 video-ended-btn-step-forward-wrapper";
    btn_play_next.classList = "glyphicon glyphicon-step-forward";
    btn_step_forward.classList = "btn btn-primary btn-step-forward";
    btn_step_forward.append("Play Next ");
    btn_step_forward.append(btn_play_next);

    vid_ended_btn_repeat_forward_wrapper.append(btn_step_forward);

    vid_ended_controls_main_wrapper.classList = "video-ended-controls-main-wrapper";
    vid_ended_controls_main_wrapper.setAttribute("id", "videndedcontrolswrapper");
    vid_ended_controls_btn_repeat_wrapper.classList = "col-xs-12 video-ended-btn-repeat-wrapper";
    repeat_anchor.setAttribute("href", "#");
    repeat_anchor.setAttribute("id", "repeatanchor");
    btn_repeat_span.classList = "glyphicon glyphicon-repeat btn-repeat-center";

    repeat_anchor.append(btn_repeat_span);
    vid_ended_controls_btn_repeat_wrapper.append(repeat_anchor);
    vid_ended_controls_main_wrapper.append(vid_ended_controls_btn_repeat_wrapper);
    vid_ended_controls_main_wrapper.append(vid_ended_btn_repeat_forward_wrapper);

    rltdvidended.append(vid_ended_controls_main_wrapper);
    objmainwrapper = document.getElementById("videndedcontrolswrapper");
    btn_repeat_center = document.getElementsByClassName("btn-repeat-center")[0];

    // Get a reference to the parser object.
    var parser = new DOMParser();

    // This is the document that contains the related videos.
    var rltd_document = parser.parseFromString(html, "text/html");
    var item_anchors = rltd_document.getElementsByTagName("a");
    var vid_ended_carousel_div = document.createElement("div");
    var video_ended_related_div = document.createElement("div");
    var vid_ended_main_wrapper = document.createElement("div");
    var left_control = document.createElement("a");
    var right_control = document.createElement("a");
    var controlspan_left = document.createElement("span");
    var controlspan_right = document.createElement("span");


    controlspan_left.classList = "glyphicon glyphicon-chevron-left";
    left_control.classList = "left carousel-control";
    left_control.setAttribute("href", "#video-ended-related");
    left_control.setAttribute("data-slide", "prev");
    left_control.append(controlspan_left);

    controlspan_right.classList = "glyphicon glyphicon-chevron-right";
    right_control.classList = "right carousel-control";
    right_control.setAttribute("href", "#video-ended-related");
    right_control.setAttribute("data-slide", "next");
    right_control.append(controlspan_right);

    vid_ended_carousel_div.classList = "carousel-inner vid-ended-carousel col-lg-12 col-md-12 col-sm-12 col-xs-12";
    video_ended_related_div.classList = "carousel slide";
    video_ended_related_div.setAttribute("id", "video-ended-related");
    vid_ended_carousel_div.setAttribute("data-ride", "carousel");

    vid_ended_main_wrapper.classList = "vid-ended-related col-lg-12 col-md-12 col-sm-12 col-xs-12";

    video_ended_related_div.append(vid_ended_carousel_div);
    vid_ended_main_wrapper.append(video_ended_related_div);
    rltdvidended.append(vid_ended_main_wrapper);

    // alert("Number of Anchors = " + item_anchors.length);
    for (var anchorIndex = 0; anchorIndex < item_anchors.length; anchorIndex++) {
        var current_anchor = item_anchors[anchorIndex];

        // console.log("Anchor " + current_anchor.innerHTML);
        var mobile_anchor = document.createElement("a");
        var mobile_item_main_wrapper = document.createElement("div");
        var mobile_item_wrapper = document.createElement("div");

        let active = anchorIndex <= 0 ? "active" : "";
        mobile_item_main_wrapper.classList = "item " + active + " col-xs-12 item-main-wrapper";
        mobile_item_wrapper.classList = "col-xs-12 item-wrapper";
        mobile_anchor.classList = "col-lg-1 col-md-4 col-sm-4 col-xs-12 rltd-vid-anchor";

        mobile_anchor.setAttribute("data-href", item_anchors[anchorIndex].getAttribute("data-href"));

        var data_type_div = document.createElement("div");
        data_type_div.setAttribute("data-href", item_anchors[anchorIndex].getAttribute("data-href"));
        data_type_div.setAttribute("data-type", "anchor");
        data_type_div.classList = "col-xs-12";

        var vid_ended_thumb_con = document.createElement("div");
        vid_ended_thumb_con.classList = "col-lg-12 col-md-12 col-sm-12 col-xs-12 vid-ended-thumb-con";

        var duration_span = document.createElement("span");
        duration_span.classList = "duration";

        var thumb_img = document.createElement("img");

        var anchorChildren = current_anchor.children;
        for (var elemIndex = 0; elemIndex < anchorChildren.length; elemIndex++) {
            if (anchorChildren[elemIndex].nodeName.toLowerCase() === "div" &&
                anchorChildren[elemIndex].classList.contains("vid-ended-thumb-main-wrapper")) {
                var imgThumb = anchorChildren[elemIndex].getElementsByClassName("vid-ended-thumb-con")[0].getElementsByTagName("img")[0];

                thumb_img.setAttribute("src", imgThumb.getAttribute("src"));
                thumb_img.setAttribute("title", imgThumb.getAttribute("title"));
                thumb_img.classList = "thum-img";

                var item_span = anchorChildren[elemIndex].getElementsByClassName("vid-ended-thumb-con")[0].getElementsByTagName("span")[0];
                duration_span.innerHTML = item_span.innerHTML;
            }
        }
        vid_ended_thumb_con.append(duration_span);
        vid_ended_thumb_con.append(thumb_img);
        data_type_div.append(vid_ended_thumb_con);
        mobile_anchor.append(data_type_div);
        mobile_item_wrapper.append(mobile_anchor);
        mobile_item_main_wrapper.append(mobile_item_wrapper);

        vid_ended_carousel_div.append(mobile_item_main_wrapper);
    }
    vid_ended_carousel_div.append(left_control);
    vid_ended_carousel_div.append(right_control);
} else {
    $(".rltd-vid-ended").html();
    $(".rltd-vid-ended").html(html);
}
btn_repeat.style.display = "block";
btn_play.style.display = "none";
btn_pause.style.display = "none";
objmainwrapper.style.display = "block";
btn_step_forward.addEventListener("click", function () {
    var active_items = document.getElementsByClassName("item-main-wrapper");
    console.log("Active Items Length = " + active_items.length);
    var active_item = null;
    for (var itemIndex = 0; itemIndex < active_items.length; itemIndex++) {
        if (active_items[itemIndex].classList.contains("active")) {
            console.log("contains active = " + active_items[itemIndex].classList);
            active_item = active_items[itemIndex];
            break;
        }
    }
    console.log("contains active = " + active_item.classList);
    if (active_item !== null) {
        var active_anchor = null;
        var active_children = active_item.children;
        var videoId = "";
        console.log("Active Items Children Length = " + active_children.length);
        for (var activeIndex = 0; activeIndex < active_children.length; activeIndex++) {
            if (active_children[activeIndex].classList.contains("item-wrapper")) {
                var anchors = active_children[activeIndex].children;
                console.log("Active Anchors Children Length = " + anchors.length);
                for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
                    console.log("Active Anchor classList = " + anchors[anchorIndex].classList);
                    if (anchors[anchorIndex].classList.contains("rltd-vid-anchor")) {
                        console.log("Active Executing = " + anchors[anchorIndex].classList);
                        active_anchor = anchors[anchorIndex];
                        var data_href = active_anchor.getAttribute("data-href");
                        console.log("data_href = " + data_href);
                        var variables_string = data_href.split("?")[1];
                        console.log("variables_string = " + variables_string);
                        var variables = variables_string.split("&");
                        console.log("variables = " + variables + " Length = " + variables.length);
                        for (var variableIndex = 0; variableIndex < variables.length; variableIndex++) {
                            if (variables[variableIndex].split("=")[0] === "v") {
                                console.log("v = " + variables[variableIndex].split("=")[1]);
                                videoId = variables[variableIndex].split("=")[1];
                                parentWindow.getPlayPage(videoId);
                                console.log("Active Item ID = " + videoId);
                            }
                        }
                        break;
                    }
                }
            }
        }
    }
});

btn_repeat_center.addEventListener("click", function () {
    repeatVideo();
});