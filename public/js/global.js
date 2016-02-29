var $window = $(window),
    $body = $('body'),
    $mainNav = $('.nav__main'),
    $mainNavTrigger = $('.nav__trigger'),
    firstLoad = false;

function Timer(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
        clearTimeout(timerId);
        remaining -= new Date() - start;
    };

    this.resume = function() {
        start = new Date();
        clearTimeout(timerId);
        timerId = setTimeout(callback, remaining);
    };

    this.clear = function() {
        clearTimeout(timerId);
    };

    this.resume();
}

function removeNotification($notification) {
    $notification.velocity('fadeOut', {
        complete: function() {
            $notification.replaceWith('');
        }
    });
}

function addNotification(type, text, attr) {
    var $notificationWrapper = $();

    if ($('.notification__wrapper').length > 0) {
        $notificationWrapper = $($('.notification__wrapper')[0]);
    } else {
        $notificationWrapper = $('<div class="notification__wrapper"></div>');
        $('body').append($notificationWrapper);
    }

    var $notification = $('<div class="notification notification__' + type + '" data-name="' + attr + '"></div>'),
        $notificationText = $('<p class="notification__text lambda">' + text + '</p>'),
        $notificationClose = $('<div class="notification__close icon icon-cross" title="close notification"></div>');

    $notification.append($notificationText).append($notificationClose);
    $notificationWrapper.append($notification);

    $notification.velocity('fadeIn', {
        display: 'table'
    });

    var notificationTimer = new Timer(function() {
        removeNotification($notification);
    }, 6000);

    $notification.on('mouseenter', function() {
        notificationTimer.pause();
    });

    $notification.on('mouseleave', function() {
        notificationTimer.resume();
    });

    $notificationClose.click(function() {
        notificationTimer.clear();
        removeNotification($notification);
    });
}

function setBodyOverflowHidden() {
    var overflowHiddenCnt = typeof($body.attr('data-overflow-hidden')) !== 'undefined' ? parseInt($body.attr('data-overflow-hidden')) + 1 : 1;
    $body.attr('data-overflow-hidden', overflowHiddenCnt);
    if (overflowHiddenCnt === 1) {
        $body.addClass('overflow--hidden');
    }
}

function removeBodyOverflowHidden() {
    var overflowHiddenCnt = parseInt($body.attr('data-overflow-hidden')) - 1;
    $body.attr('data-overflow-hidden', overflowHiddenCnt);
    if (overflowHiddenCnt === 0) {
        $body.removeClass('overflow--hidden');
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getSpinner(white) {
    var color = white ? ' spinner__white' : '';
    return $('<div class="spinner' + color + '"><div class="spinner__child spinner__child__1"></div><div class="spinner__child spinner__child__2"></div><div class="spinner__child spinner__child__3"></div><div class="spinner__child spinner__child__4"></div><div class="spinner__child spinner__child__5"></div><div class="spinner__child spinner__child__6"></div><div class="spinner__child spinner__child__7"></div><div class="spinner__child spinner__child__8"></div><div class="spinner__child spinner__child__9"></div><div class="spinner__child spinner__child__10"></div><div class="spinner__child spinner__child__11"></div><div class="spinner__child spinner__child__12"></div></div>');
}

function getBtnSpinner() {
    return $('<div class="btn__spinner"></div>').append(getSpinner(true));
}

function showMainMenu($trigger) {
    $trigger.addClass('is-active');
    var display = $window.width() >= 768 ? 'block' : 'table';
    $mainNav.velocity('fadeIn', {
        display: display,
        complete: function() {
            if ($window.width() < 768) {
                setBodyOverflowHidden();
            }
        }
    });
    var delay = 100;
    $mainNav.find('li').each(function(i, element) {
        var $element = $(element);
        setTimeout(function() {
            $element.velocity({
                before: function() {
                    if ($window.width() < 768) {
                        $.Velocity.hook($element, "translateX", "-100%");
                    } else {
                        $.Velocity.hook($element, "translateY", "-100%");
                    }
                },
                translateX: 0,
                translateY: 0,
                opacity: 1
            });
        }, delay *  i);
    });
}

function hideMainMenu($trigger) {
    $trigger.removeClass('is-active');
    $mainNav.velocity('fadeOut', {
        complete: function() {
            if ($window.width() < 768) {
                removeBodyOverflowHidden();
            }
            $mainNav.find('li').removeAttr('style');
        }
    });
}

function makeRequest(url, method, data, cbSuccess, cbError) {
    $.ajax({
        url: url,
        method: method,
        data: data,
        complete: function() {

        },
        success: function(res) {
            if (typeof(cbSuccess) !== 'undefined') {
                cbSuccess(res);
            }
        },
        error: function(res) {
            if (typeof(cbError) !== 'undefined') {
                cbError(res);
            }
        }
    });
}

function animateScale($element) {
    $element.velocity({
        scale: "0"
    }, {
        duration: 100,
        complete: function() {
            $element.toggleClass('active');
        }
    }).velocity({
        scale: "1.2"
    }, {
        duration: 150
    }).velocity({
        scale: "1"
    }, {
        duration: 50
    });
}

$(document).ready(function() {

    $window.on('load', function() {
        $('.hero').each(function(i, element) {
            $(element).removeAttr('style');
            $(element).css('height', $(element).outerHeight());
        });
    });

    $window.on('resize orientationchange', function() {
        if (!$mainNavTrigger.hasClass('is-active')) {
            return;
        }
        if ($window.width() < 768 &&  $mainNav.css('display') !== 'table') {
            $mainNav.css('display', 'table');
        } else if ($window.width() >= 768 &&  $mainNav.css('display') !== 'block') {
            $mainNav.css('display', 'block');
        }
    });

    //=================================================================
    // Main navigation trigger
    //=================================================================
    $mainNavTrigger.on('click', function() {
        var $this = $(this);

        if ($this.hasClass('is-active')) {
            hideMainMenu($this);
        } else {
            showMainMenu($this);
        }
    });

    //=================================================================
    // Expandable container functionality
    //=================================================================
    $('.expandable__trigger').on('click', function() {
        var $this = $(this),
            $container = $this.closest('.expandable__container'),
            $content = $container.find('.expandable__content');

        $this.velocity('slideUp');
        $content.velocity('slideDown');
    });

    //=================================================================
    // Checkbox functionality
    //=================================================================
    $('input[type="checkbox"]').on('change', function() {
        var $this = $(this),
            $checkbox = $this.parent();
        animateScale($checkbox);
    });

    //=================================================================
    // Radio functionality
    //=================================================================
    $('input[type="radio"]').on('change', function() {
        var $this = $(this),
            $radio = $this.parent(),
            group = $this.attr('name'),
            $prev = $('input[name="' + group + '"][type="radio"]:not(:checked)');
        if ($prev.length) {
            $prev.parent().removeClass('active');
        }
        animateScale($radio);
    });

    //=================================================================
    // Esc key listener - hide menu
    //=================================================================
    $(document).on('keyup', function(event) {
        if (event.keyCode !== 27) {
            return;
        }
        if ($mainNavTrigger.hasClass('is-active')) {
            hideMainMenu($mainNavTrigger);
        }
    });

    //=================================================================
    // Fastclick
    //=================================================================
    FastClick.attach(document.body);

});
