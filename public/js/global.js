var $window = $(window),
    $body = $('body'),
    $mainNav = $('.nav__main'),
    $mainNavTrigger = $('.nav__trigger'),
    firstLoad = false;

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
}

function hideMainMenu($trigger) {
    $trigger.removeClass('is-active');
    $mainNav.velocity('fadeOut', {
        complete: function() {
            if ($window.width() < 768) {
                removeBodyOverflowHidden();
            }
        }
    });
}

$(document).ready(function() {

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
