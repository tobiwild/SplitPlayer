/* globals _, $, SplitPlayerVideo */

'use strict';

// player state constants
const playerState = {
    unstarted: -1,
    ended: 0,
    playing: 1,
    pause: 2,
    buffering: 3,
    loading: 6
};

var SplitPlayer = function (settings) {

    this.duration = 0;

    this.readyCount = 0;

    // video instances container
    this.videos = [];

    // plugin instances container
    this.plugins = [];

    // global player state
    this.playerStateIs = playerState.inactive;

    // ticker for onUpdate interval
    this.ticker = null;

    // dependencie loading status
    this.dependenciesLoaded = false;

    this.settings = $.extend({
        hoster: 'youtube',
        videos: [],
        area: null,
        maxVideos: 4
    }, settings) ;

    this.loadVideoDependencies();

    return this;
};

SplitPlayer.prototype = {

    getPlayedTime () {
        return 0;
    },

    /*
     * add Plugins
     */
    addPlugin (Plugin) {
        var instance = new Plugin(this);
        this.plugins.push(instance);
        return instance;
    },

    /*
     * Load Video Dependecnies like youtubeIframeApi
     */
    loadVideoDependencies() {

        SplitPlayerVideo[this.settings.hoster].load(
            this.onVideoDependeciesReady.bind(this)
        );

    },

    /*
     * Load add Videos after Dependecnies Loaded
     */
    onVideoDependeciesReady() {

        this.dependenciesLoaded = true;

        this.render();

        /* add initial declared videos */
        for (let video of this.settings.videos) {
            this.addVideo(video);
        }

        this.playerStateIs = playerState.loading;

        console.info('api loaded');
    },

    addVideo(video) {

        // max videos check
        if (this.videos.length >= this.settings.maxVideos) {
            return console.info('video limit reached only %s allowed', this.settings.maxVideos);
        }

        this.videos.push(
            // create hoster specific video instance
            new SplitPlayerVideo[this.settings.hoster](this, {
                video: video
            })
        );

    },

    removeVideo(video) {

        _.findWhere(this.videos, video).remove();

        this.videos = _.without(
            this.videos,
            _.findWhere(this.videos, video)
        );

        this.readyCount--;
    },

    /*
     * called after all video player ready initialized
     */
    onReady() {

        this.readyCount++;

        // prevent if not all videos ready
        if (this.readyCount !== this.videos.length) {
            return console.info('videos not ready yet');
        }

        this.playerStateIs = playerState.ready;

        // hook onReady for plugins
        for (let Plugin of this.plugins) {
            if (Plugin.onReady) {
                Plugin.onReady();
            }
        }
    },

    onUpdate() {
        // hook all plugins
        for (let Plugin of this.plugins) {
            if (Plugin.onUpdate) {
                Plugin.onUpdate();
            }
        }
    },

    changeState(state) {

        console.info('state changed to %s', state);

        // prevent if not all videos ready
        if (this.readyCount !== this.videos.length) {
            return false;
        }

        if (state === playerState.buffering) {
            return this.pause();
        }

        if (state === playerState.pause) {
            return this.pause();
        }

        if (state === playerState.playing) {
            return this.play();
        }


    },

    play() {

        // prevent play if videos not ready
        if (this.readyCount !== this.videos.length) {
            return console.info('play not ready yet');
        }

        // abort if is playing allready
        if (this.playerStateIs === playerState.playing) {
            return console.info('allready playing');
        }

        // start ticker
        this.ticker = window.setInterval(this.onUpdate.bind(this), 200);

        for (let video of this.videos) {
            video.play();
        }

        // hook onPlay for plugins
        for (let Plugin of this.plugins) {
            if (Plugin.onPlay) {
                Plugin.onPlay();
            }
        }

        this.playerStateIs = playerState.playing;

        return console.info('playing');
    },

    pause() {
        // abort if not all videos ready
        if (this.readyCount !== this.videos.length) {
            return console.log('pause not ready yet');
        }

        // abort if player not playing state
        if (this.playerStateIs === playerState.pause) {
            return console.log('allready pausing');
        }

        // pause all videos
        for (let video of this.videos) {
            video.pause();
        }

        // stop ticker
        clearInterval(this.ticker);

        // hook all plugins
        for (let Plugin of this.plugins) {
            if (Plugin.onPause) {
                Plugin.onPause();
            }
        }

        this.playerStateIs = playerState.pause;

        return console.info('pause');
    },

    stop() {
        // abort if not all videos ready
        if (this.readyCount !== this.videos.length) {
            return console.log('pause not ready yet');
        }

        // abort if player not playing state
        if (this.playerStateIs === playerState.unstarted) {
            return;
        }

        // pause all videos
        for (let video of this.videos) {
            video.stop();
        }

        // stop ticker
        clearInterval(this.ticker);

        // hook all plugins
        for (let Plugin of this.plugins) {
            if (Plugin.onStop) {
                Plugin.onStop();
            }
        }

        this.playerStateIs = playerState.unstarted;

        return console.info('stopped');
    },

    timeTo(time) {

        for (let video of this.videos) {
            video.timeTo(time);
        }

    },

    render() {
        if (this.settings.area === null) {
            return console.log('no html parent defined');
        }

        $(this.settings.area).html('<div id="SplitPlayer"></div>');

    }

};

/* globals $ */

'use strict';

var SplitPlayerTimePicker = function (timeline) {

    this.timeline = timeline;

    this.settings = $.extend({
        element: null,
        currentTimeElement: null,
        durationElement: null,
        startTime: 0,
        duration: 10000,
        previewLine: $('.preview-line')
    }, settings);

    this.playedTime = this.settings.startTime;

    this.setEvents();

    $(this.settings.durationElement).html(this.formatTime(this.settings.duration));
    $(this.settings.currentTimeElement).html('0:00');

    return this;
};

SplitPlayerTimePicker.prototype = {

    setEvents() {
        var self = this;

        this.timeLine = $(this.settings.element);


        $('.rangeslider').on('mousedown', function () {
            self.player.timeTo(self.playedTime);
        }).on('mousemove', function (e) {
            var leftPos = e.pageX - $(this).offset().left;
            var percentage = leftPos * 100 / $(this).width();
            var percentageRounded = Math.round(percentage);
            var playerTime = self.formatTime(self.settings.duration / 100 * percentageRounded);

            self.settings.previewLine.width(percentage + '%').find('time').html(playerTime);
        });

        $(document).on('input', 'input[type="range"]', function() {
            var val = $(this).val();
            self.playedTime = val;
            self.settings.onChange(val);
        });
    },
    formatTime(time) {
        var minutes = Math.floor(time / 60);
        var seconds = Math.round(time - minutes * 60);

        if (seconds < 10) {
            seconds = '0' + seconds;
        }

        return minutes + ':' + seconds;
    }

};

/* globals $ */

'use strict';

var SplitPlayerTimeline = function (player) {
    this.player = player;

    this.element = null;
    this.bar = null;
    this.cycler = null;
    this.modules = [];

    this.template = '<div id="timeline"><i class="bar"></i></div>';

    return this;
};

SplitPlayerTimeline.prototype = {

    /*
     * extend Module
     */
    extend (Module) {
        var instance = new Module(this);
        this.modules.push(instance);
        return instance;
    },

    /*
     * player onReady hook
     */
    onReady() {
        this.render();
    },

    /*
     * player onStop hook
     */
    onStop() {
        this.reset();
    },

    /*
     * player onUpdate hook
     */
    onUpdate() {
        var percentage = ((this.player.getPlayedTime() * 100) / this.player.duration);
        this.bar.css({
            width: percentage + '%'
        });
    },

    reset() {
        this.bar.css({
            width: 0
        });
    },

    formatTime(time) {
        var minutes = Math.floor(time / 60);
        var seconds = Math.round(time - minutes * 60);

        if (seconds < 10) {
            seconds = '0' + seconds;
        }

        return minutes + ':' + seconds;
    },

    render() {
        var tmp = $(this.player.settings.area).append(this.template);
        this.element = tmp.find('#timeline');
        this.bar = this.element.find('i');
    }
};


/* globals playerState, YT, $ */
'use strict';

var SplitPlayerVideo = SplitPlayerVideo || {};

SplitPlayerVideo.youtube = function (player, settings) {

    this.player = player;
    this.videoPlayer = null;

    this.settings = $.extend({
        video: null,
        type: 'youtube'
    }, settings);

    this.render();
    this.create();

    return this;
};

SplitPlayerVideo.youtube.load = function (callback) {
    $.getScript('//youtube.com/iframe_api', function () {
        window.onYouTubeIframeAPIReady = callback;
    });
};

SplitPlayerVideo.youtube.prototype = {

    create() {

        var self = this;
        this.videoPlayer = new YT.Player(this.settings.video.videoId, {
            width: '100%',
            height: '100%',
            videoId: this.settings.video.videoId,
            startSeconds: this.settings.video.startSeconds,
            playerVars: {
                'controls': 1
            },
            events: {
                onReady: this.onReady.bind(this),
                onStateChange (event) {
                    self.onStateChange(event);
                }
            }
        });
    },

    onReady() {
        this.setPlayerDuration();
        this.stop();
        this.player.onReady();
    },

    onStateChange(event) {

        if (event.data === YT.PlayerState.BUFFERING) {
            return this.player.changeState(playerState.buffering);
        }

        if (event.data === YT.PlayerState.PLAYING) {
            return this.player.changeState(playerState.playing);
        }

        if (event.data === YT.PlayerState.ENDED) {
            this.timeTo(0);
            return this.player.changeState(event.data);
        }

        if (event.data === YT.PlayerState.PAUSED) {
            return this.player.changeState(playerState.pause);
        }

        console.info('event %s not fetched', event.data);
    },

    remove() {
        this.player.removeVideo(this.settings.video);
        this.videoPlayer.destroy();
    },

    timeTo(time) {
        time = (time + this.settings.video.startSeconds);
        console.log('set time to %s', time);
        this.videoPlayer.seekTo(time);
    },

    play() {
        this.videoPlayer.playVideo();
    },

    pause() {
        this.videoPlayer.pauseVideo();
    },

    stop() {
        this.timeTo(0);
        this.pause();
    },

    getDuration() {
        return this.videoPlayer.getDuration() - this.settings.video.startSeconds;
    },

    setPlayerDuration() {
        var duration = this.getDuration();

        if (this.player.duration < duration) {
            this.player.duration = duration;
            this.player.getPlayedTime = this.getPlayedTime.bind(this);
        }
    },

    getPlayedTime() {
        return this.videoPlayer.getCurrentTime() - this.settings.video.startSeconds;
    },

    render() {
        $('#SplitPlayer').append('<div id="' + this.settings.video.videoId + '"><div>');
    },

    destroy() {
        // remove youtube video iframe
        this.videoPlayer.destory();

        // remove this video
        this.player.removeVideo(this);
    }

};