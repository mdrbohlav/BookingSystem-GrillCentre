var $window = $(window),
    $body = $('body'),
    $mainNav = $('.nav__main'),
    $mainNavTrigger = $('.nav__trigger'),
    firstLoad = false;

function pad(n) {
    return n < 10 ? '0' + n : n;
}

function urlParam(name) {
    var results = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results === null) {
        return null;
    } else {
        return results[1] || 0;
    }
}

function createCookie(name, value, expires) {
    var cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + "; path=/";
    if (typeof(expires) !== 'undefined') {
        cookie += '; expires=' + new Date(expires).toUTCString();
    }
    document.cookie = cookie;
}

function readCookie(name) {
    var nameEQ = encodeURIComponent(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}

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
        $notificationClose = $('<div class="notification__close icon icon__cross" title="close notification"></div>');

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

function showModal() {
    var $modal = $('.modal'),
        $modalContent = $modal.find('.modal__content');

    if (!$modal.is(':visible')) {

        updateAfterHide = function() {
            setBodyOverflowHidden();
        };

        $modal.velocity('fadeIn', {
            complete: function() {
                updateAfterHide();
            }
        });
        $modalContent.velocity({
            opacity: '1'
        });
    }
}

function hideModal() {
    var $modal = $('.modal'),
        $modalContent = $modal.find('.modal__content');

    if ($modal.is(':visible')) {

        updateAfterHide = function() {
            removeBodyOverflowHidden();
            $modalContent.removeAttr('style');
        };

        $modal.velocity('fadeOut', {
            complete: function() {
                updateAfterHide();
            }
        });
    }
}

function showMainMenu($trigger) {
    $trigger.addClass('is-active');
    $mainNav.velocity('fadeIn', {
        complete: function() {
            if ($window.width() < 1024) {
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
                    if ($window.width() < 1024) {
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
            if ($window.width() < 1024) {
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

    $window.on('resize orientationchange', function() {
        if ($window.width() >= 1024) {
            $mainNav.removeAttr('style');
        }
        if (!$mainNavTrigger.hasClass('is-active') &&  !$('header').hasClass('nav--up')) {
            return;
        }
        if ($window.width() < 1024 && $('header').hasClass('nav--up')) {
            $('header').removeClass('header--up');
        } else if ($window.width() >= 1024 && $mainNav.hasClass('is-active')) {
            $mainNav.removeAttr('style');
            $trigger.removeClass('is-active');
            removeBodyOverflowHidden();
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
    // Header and footer display/hide on scroll
    //=================================================================
    var didScroll = false;
    var lastScrollTop = 0;
    var delta = 5;
    var navbarHeight = $('header').outerHeight();

    $window.on('load', function(event) {
        lastScrollTop = $window.scrollTop();
        $window.on('scroll', function(event) {
            didScroll = true;
        });
    });

    setInterval(function() {
        if (!didScroll) {
            return;
        }
        hasScrolled();
        didScroll = false;
    }, 250);

    function hasScrolled() {
        var st = $window.scrollTop();

        if (Math.abs(lastScrollTop - st) <= delta)  {
            return;
        }

        if (st > lastScrollTop && st > navbarHeight) {
            if ($window.width() >= 1024) {
                $('header').removeClass('header--down').addClass('header--up');
            }
            $('footer').removeClass('footer--up').addClass('footer--down');
        } else {
            if (st + $window.height() < $(document).height()) {
                if ($window.width() >= 1024) {
                    $('header').removeClass('header--up').addClass('header--down');
                }
                $('footer').removeClass('footer--down').addClass('footer--up');
            }
        }

        lastScrollTop = st;
    }

    //=================================================================
    // Change locales
    //=================================================================
    $('select[name="locales"]').on('change', function() {
        var $this = $(this),
            locale = $this.val();
        window.location = '/update-locale/' + locale + '/' + encodeURIComponent(window.location.pathname + window.location.search);
    });

    //=================================================================
    // Modal close
    //=================================================================
    $('.modal').on('click', function(event) {
        var $this = $(this),
            triggerClose = $('.modal, .modal__close, .modal__content').toArray();
        if (triggerClose.indexOf(event.target) === -1) {
            return;
        }
        hideModal();
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
    // Textarea counter
    //=================================================================
    $('.textarea__counter').each(function() {
        var $this = $(this),
            $textarea = $this.prev();

        $textarea.on('keyup', function(event) {
            var $this = $(event.currentTarget),
                $counter = $this.next().find('span'),
                limit = parseInt($this.attr('maxlength')),
                exists = $this.val().length;

            if (exists > limit) {
                $this.val($this.val().substring(0, 140));
                exists = 140;
            }

            $counter.text(exists);
        });
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
        hideModal();
    });

    //=================================================================
    // Scroll to id functionality
    //=================================================================
    $("a").click(function(e) {
        var target = $(this).attr('href');
        if (target[0] === "#") {
            e.preventDefault();
            if (target.length === 1 && typeof($(this).attr('data-scroll-up')) !== 'undefined') {
                $body
                    .velocity("scroll", {
                        duration: 1000,
                        easing: "swing"
                    });
            } else {
                $(target)
                    .velocity("scroll", {
                        duration: 1000,
                        easing: "swing"
                    });
            }
        }
    });

    //=================================================================
    // Fastclick
    //=================================================================
    FastClick.attach(document.body);

});
