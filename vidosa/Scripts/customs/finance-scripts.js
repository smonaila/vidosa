/// <reference path="../jquery-3.3.1.min.js" />
/// <reference path="../bootstrap.min.js" />

$(document).ready(function () {
    $("[data-toggle='popover']").popover({
        html: true,
        template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    });

    var add_cart_click = function (e) { 
        var videoId = $(e.target).attr("data-videoId");
        window.add_to_cart(videoId);

        var btn_remove = document.createElement("button");
        $(btn_remove).addClass("btn-cart");
        $(btn_remove).attr("data-videoId", videoId);
        $(btn_remove).attr("data-cart", true);
        $(btn_remove).append("Remove from cart");
        $(e.target).replaceWith($(btn_remove));

        $(btn_remove).on("click", remove_cart_click);
    }

    var remove_cart_click = function (e) {
        var _videoId = $(e.target).attr("data-videoId");
        window.remove_from_cart(_videoId);
        var btn_add = document.createElement("button");

        $(btn_add).addClass("btn-cart");
        $(btn_add).attr("data-videoId", _videoId);
        $(btn_add).attr("data-cart", true);
        $(btn_add).append("Add to cart");

        $(e.target).replaceWith($(btn_add));

        $(btn_add).on("click", add_cart_click);        
    }

    $("[data-cart='true']").on("click", function (e) {
        add_cart_click(e);        
    })

    var check_cart = function () {
        _popover_content = $(".popover-content").html();
        $(".popover-content").html("");
        $(".popover-content").html($(_popover_content));

        if ($("#checkout-link").length > 0) {
            var cart_link = $("#checkout-link").attr("href").split("?")[1];
            var variables = cart_link.split("&");

            for (var i = 0; i < variables.length; i++) {
                if (variables[i].split("=")[0] === "checkedoutvideos") {
                    var videoIds = variables[i].split("=")[1].split(";");
                    for (var j = 0; j < videoIds.length; j++) {
                        var btn_remove = document.createElement("button");
                        $(btn_remove).addClass("btn-cart");
                        $(btn_remove).attr("data-videoId", videoIds[j]);
                        $(btn_remove).attr("data-cart", true);
                        $(btn_remove).append("Remove from cart");

                        $("[data-videoId='" + videoIds[j] + "']").replaceWith($(btn_remove));

                        $(btn_remove).on("click", remove_cart_click);
                    }
                }
            }
        }
    }
    check_cart();
})