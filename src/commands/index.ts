import * as quote from './general/quote.js';
import * as ping from './general/ping.js';
import * as level from './general/level.js';
import * as multiquote from './general/multiquote.js';
import * as report from './fia/report.js';
import * as unmute from './admin/unmute.js';
import * as purge from './admin/purge.js';
import * as mute from './admin/mute.js';
import * as stop from './music/stop.js';
import * as skip from './music/skip.js';
import * as play from './music/play.js';
import * as forecast from './weather/forecast.js';
import * as weather from './weather/weather.js';
import * as blackjack from './casino/blackjack.js';

export async function loadCommands() {
    return {
        quote,
        ping,
        level,
        multiquote,
        report,
        unmute,
        purge,
        mute,
        stop,
        skip,
        play,
        forecast,
        weather,
        blackjack,
    } as Record<string, any>;
}
