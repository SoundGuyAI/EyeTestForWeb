import maleClip0 from './audio/welcome'
import maleClip1 from './audio/open'
import maleClip2 from './audio/close'
import maleClip3 from './audio/inspection'
import maleClip4 from './audio/paperwork'
import maleClip5 from './audio/return'
import maleClip6 from './audio/open-nudge-1'
import maleClip7 from './audio/open-nudge-2'
import maleClip8 from './audio/closed-nudge-1'
import maleClip9 from './audio/closed-nudge-2'
import femaleClip0 from './audio/female/welcome'
import femaleClip1 from './audio/female/open'
import femaleClip2 from './audio/female/close'
import femaleClip3 from './audio/female/inspection'
import femaleClip4 from './audio/female/paperwork'
import femaleClip5 from './audio/female/return'
import femaleClip6 from './audio/female/open-nudge-1'
import femaleClip7 from './audio/female/open-nudge-2'
import femaleClip8 from './audio/female/closed-nudge-1'
import femaleClip9 from './audio/female/closed-nudge-2'

export type NarrationVoice = 'female' | 'male'

export const defaultNarrationVoice: NarrationVoice = 'female'

export const narrationVoices: Record<NarrationVoice, Record<string, string>> = {
  female: {
    'welcome': femaleClip0,
    'open': femaleClip1,
    'close': femaleClip2,
    'inspection': femaleClip3,
    'paperwork': femaleClip4,
    'return': femaleClip5,
    'open-nudge-1': femaleClip6,
    'open-nudge-2': femaleClip7,
    'closed-nudge-1': femaleClip8,
    'closed-nudge-2': femaleClip9,
  },
  male: {
    'welcome': maleClip0,
    'open': maleClip1,
    'close': maleClip2,
    'inspection': maleClip3,
    'paperwork': maleClip4,
    'return': maleClip5,
    'open-nudge-1': maleClip6,
    'open-nudge-2': maleClip7,
    'closed-nudge-1': maleClip8,
    'closed-nudge-2': maleClip9,
  },
  }
