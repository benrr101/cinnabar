/**
 * Playback ViewModel
 * @descrip Used to handle the currently playing playlist/queue and all things
 *          involved with playback
 * @author  Benjamin Russell (benrr101+dolomite@outlook.com)
 */

function PlaybackViewModel() {
    var self = this;

    // NON-OBSERVABLE //////////////////////////////////////////////////////
    self.volume = 1;            // The volume to play
    self.audioObject = null;    // The currently playing audio object

    self.nowPlayingList = [];       // The tracks to pull now playing tracks from
    self.nowPlayingListSorted = []; // The sorted list of tracks to pull now playing tracks from
    self.nowPlayingIndex;           // The index of the playing track in the now playing list

    // OBSERVABLE //////////////////////////////////////////////////////////
    self.playing = ko.observable(false);                // Whether or not there are tracks playing
    self.track = ko.observable();                        // The playing track (the blank obj is to keep null errors at bay)
    self.art = ko.observable(null);                     // The Href for the currently playing album art
    self.progress = ko.observable(0);                   // The played percentage of the track
    self.progressTime = ko.observable(0);               // The time played
    self.queue = ko.observableArray();                  // The queue of tracks to be played immediately after the current track
    self.shuffleEnabled = ko.observable(false);
    self.repeatEnabled = ko.observable(false);

    // ACTIONS /////////////////////////////////////////////////////////////
    // NON-AJAX ////////////////////////////////////////////////////////////
    self.previousTrack = function() {
        // Are we past 2% of the track?
        if(self.audioObject.currentTime / self.audioObject.duration * 100 >= 2 ) {
            // Reset the current time to 0
            self.audioObject.currentTime = 0;
        } else {
            // Pause the track to avoid multiple clicks
            self.audioObject.pause();

            // Are we at the beginning of the now playing list
            self.nowPlayingIndex--;
            if(self.nowPlayingIndex < 0) {
                // At the beginning of the now playing list. Do we loop around?
                if(self.repeatEnabled()) {
                    // Loop back to the end of the list
                    self.nowPlayingIndex = self.nowPlayingList.length - 1;

                } else {
                    // Nope we're done.
                    self.audioObject.pause();
                    self.playing(false);
                    self.track(null);
                    return;
                }
            }

            // Load the previous track
            var track = self.nowPlayingList[self.nowPlayingIndex];
            if(!track.Loaded) {
                track.fetch(self.playTrack, self.generalError)
            } else {
                self.playTrack(track);
            }
        }
    }

    self.togglePlayback = function() {
        if(self.playing() === false) {
            self.startPlayback();
        } else {
            if(self.audioObject.paused) {
                self.audioObject.play();
                self.playing("playing");
            } else {
                self.audioObject.pause();
                self.playing("paused");
            }
        }
    }

    self.nextTrack = function() {
        // Pause the current track to prevent clicking multiple times
        self.audioObject.pause();

        // If there's a track in the queue that needs to be played, play it nao!
        if(self.queue().length > 0) {
            var nextTrack = self.queue.shift();
            if(!nextTrack.Loaded) {
                nextTrack.fetch(self.playTrack, vm.viewModel.generalError)
            } else {
                self.playTrack(nextTrack);
            }
            return;
        }

        // If we're on random shuffle, just pick another track and keep going
        // @TODO: Remove references to vm.viewmodel
        if(self.shuffleEnabled() && vm.viewModel.settings().shuffleMode == 'random') {
            self.nowPlayingIndex = Math.floor(Math.random() * (self.nowPlayingList.length-1));
        } else {
            // Are we at the end of the now playing
            self.nowPlayingIndex++;
            if(self.nowPlayingIndex >= self.nowPlayingList.length) {
                // At the end of the list, do we repeat?
                if(self.repeatEnabled()) {
                    // Loop back to the beginning
                    self.nowPlayingIndex = 0;
                } else {
                    // Nope. We're done.
                    self.audioObject.pause();
                    self.playing(false);
                    self.track(null);
                    return;
                }
            }
        }

        // Load the next track
        var track = self.nowPlayingList[self.nowPlayingIndex];
        if(!track.Loaded) {
            track.fetch(self.playTrack, vm.viewModel.generalError)
        } else {
            self.playTrack(track);
        }
    }

    self.scrubberClick = function() {}

    self.toggleShuffle = function() {}
    self.toggleRepeat = function() {}

    self.beginPlayback = function(tracks, track) {
        // Build the now playing list from the tracks
        self.nowPlayingList = [];
        for(var i = 0; i < tracks.length; ++i) {
            self.nowPlayingList.push(tracks[i]);
            self.nowPlayingListSorted.push(tracks[i]);
        }

        // Do we need to shuffle the playlist?
        // @TODO: Remove references to vm.viewmodel
        if(self.shuffleEnabled() && vm.viewModel.settings.shuffleMode == 'order') {
            // Shuffle an re-add the original track to the top of the list
            self.nowPlayingList = self.nowPlayingList.shuffle();
            self.nowPlayingList = self.nowPlayingList.move(self.nowPlayingList.indexOf(track), 0)
            self.nowPlayingIndex = 0;
        } else {
            self.nowPlayingIndex = track !== null ? self.nowPlayingList.indexOf(track) : 0;
        }

        track = self.nowPlayingList[self.nowPlayingIndex];
        // @TODO: Remove reference to vm.viewmodel
        if(!track.Loaded) {
            track.fetch(self.playTrack, vm.viewModel.generalError);
        } else {
            self.playTrack(track);
        }
    }

    self.playTrack = function(track) {
        // Which audio quality should be played? Count down from the top to get the highest quality that doesn't exceed the preferences
        var trackQuality;
        // @TODO: Remove references to vm.viewmodel
        for(var q = vm.viewModel.settings().quality; q >= 0; --q) {
            if(typeof track.Qualities[q] !== "undefined") {
                trackQuality = track.Qualities[q];
                break;
            }
        }

        // Create an audio thing if needed
        if(self.audioObject !== null) {
            self.audioObject.src = serverAddress + trackQuality.Href;
        } else {
            self.audioObject = new Audio(serverAddress + trackQuality.Href);
            self.audioObject.volume = self.volume;
            self.audioObject.ontimeupdate = self.onTimeUpdate;
            self.audioObject.onended = self.nextTrack;
        }

        // Start that shit up!
        $("#playedHandle").removeClass("end");
        self.playing("playing");
        self.art(serverAddress + track.ArtHref);
        self.track(track);
        self.progressTime(calculateTrackTime(0));
        self.progress(0);
        self.audioObject.play();
    }

    // EVENT HANDLERS //////////////////////////////////////////////////////
    self.onTimeUpdate = function(e) {
        // Update the numeric time
        var time = e.target.currentTime;
        self.progressTime(calculateTrackTime(time));

        // Update the scrubber percentage
        var percent = time / e.target.duration * 100;
        self.progress(percent);
        if(percent >= 90) { // If we're almost at the end, change the scrubber handle to prevent it from jumping to the next line
            $("#playedHandle").addClass("end");
        }
    }
}