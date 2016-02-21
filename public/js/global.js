$(document).ready(function() {

    $('.expandable__trigger').on('click', function() {
        var $this = $(this),
            $container = $this.closest('.expandable__container'),
            $content = $container.find('.expandable__content');

        $this.velocity('slideUp');
        $content.velocity('slideDown');
    });

    FastClick.attach(document.body);

});
