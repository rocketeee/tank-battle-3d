/**
 * Importing this module registers the entire skill + upgrade catalog via side effects.
 * New element packs only need a new file here — keeps multi-agent additions conflict-free.
 */
import './base';
import './passives';
import './fire';
import './ice';
import './lightning';
import './physical';
import './summon';
import './fusion';
