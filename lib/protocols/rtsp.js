// const Stream = require('node-rtsp-stream');
// const EventEmitter = require('events');
//
// class RtspClient extends EventEmitter {
//     constructor(url, options = {}) {
//         super();
//         this.url = url;
//         this.options = {
//             ffmpegOptions: { // Options for the ffmpeg command
//                 '-stats': '', // Display statistics about the streaming process
//                 '-r': 30, // Framerate
//             },
//             ...options
//         };
//         this.stream = null;
//     }
//
//     startStream() {
//         if (this.stream) {
//             console.log('Stream is already running.');
//             return;
//         }
//
//         this.stream = new Stream({
//             name: 'rtsp-stream',
//             streamUrl: this.url,
//             wsPort: this.options.wsPort || 9999,
//             ffmpegOptions: this.options.ffmpegOptions,
//         });
//
//         this.stream.on('start', () => {
//             console.log('RTSP stream started.');
//             this.emit('start');
//         });
//
//         this.stream.on('stop', () => {
//             console.log('RTSP stream stopped.');
//             this.emit('stop');
//         });
//
//         this.stream.on('error', (err) => {
//             console.error('RTSP stream error:', err.message);
//             this.emit('error', err);
//         });
//     }
//
//     stopStream() {
//         if (this.stream) {
//             this.stream.stop();
//             this.stream = null;
//             console.log('RTSP stream stopped.');
//         } else {
//             console.log('No stream to stop.');
//         }
//     }
//
//     restartStream() {
//         console.log('Restarting RTSP stream...');
//         this.stopStream();
//         this.startStream();
//     }
//
//     setFfmpegOptions(newOptions) {
//         this.options.ffmpegOptions = {...this.options.ffmpegOptions, ...newOptions};
//         if (this.stream) {
//             this.restartStream();
//         }
//         console.log('FFmpeg options updated.');
//     }
//
//     setStreamUrl(newUrl) {
//         this.url = newUrl;
//         if (this.stream) {
//             this.restartStream();
//         }
//         console.log('Stream URL updated.');
//     }
// }
//
// module.exports = RtspClient;
