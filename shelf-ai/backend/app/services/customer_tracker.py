"""
CustomerTrackingService — all customer tracking logic extracted
verbatim from the notebook Cell 12 (fixed version). Zero logic changes.
"""
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

PERSON_ABSENT_BUFFER  = 20
PERSON_ENTRY_CONFIRM  = 3


class CustomerTracker:
    """Encapsulates customer tracking state. Logic verbatim from notebook."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.customer_state = {
            'in_frame':       False,
            'entry_frame':    None,
            'exit_frame':     None,
            'events':         [],
            'total_taken':    0,
        }
        self._person_absent_streak  = 0
        self._person_present_streak = 0
        self.baseline_before        = {}
        self.baseline_after         = {}
        self.items_taken_per_zone   = {}
        self.total_items_taken_clean = 0

    def set_baselines(self, baseline_before: dict, baseline_after: dict, zones: list):
        """Pre-compute clean before/after baselines. Verbatim from notebook."""
        self.baseline_before = baseline_before
        self.baseline_after  = baseline_after
        self.items_taken_per_zone = {}
        self.total_items_taken_clean = 0
        for z in zones:
            sid  = z['shelf_id']
            diff = max(0, baseline_before.get(sid, 0) - baseline_after.get(sid, 0))
            self.items_taken_per_zone[sid] = diff
            self.total_items_taken_clean  += diff
        logger.info(f"Baselines set. Items taken (clean diff): {self.total_items_taken_clean}")

    def update(self, persons: list, dets: list, zones: list, frame_idx: int) -> dict:
        """
        Track customer enter/exit. Item counts come from the clean
        image baselines (BASELINE_BEFORE / BASELINE_AFTER) rather than
        mid-video snapshots. Logic verbatim from notebook (Cell 12 fixed version).
        """
        person_present = len(persons) > 0

        if person_present:
            self._person_absent_streak   = 0
            self._person_present_streak += 1

            if (not self.customer_state['in_frame']
                    and self._person_present_streak >= PERSON_ENTRY_CONFIRM):
                self.customer_state['in_frame']    = True
                self.customer_state['entry_frame'] = frame_idx
                self.customer_state['exit_frame']  = None
                logger.info(f"[Frame {frame_idx}] Customer ENTERED "
                            f"(confirmed after {PERSON_ENTRY_CONFIRM} frames)")
        else:
            self._person_present_streak  = 0
            self._person_absent_streak  += 1

            if (self.customer_state['in_frame']
                    and self._person_absent_streak >= PERSON_ABSENT_BUFFER):
                self.customer_state['in_frame']   = False
                self.customer_state['exit_frame'] = frame_idx

                taken_this_visit = self.total_items_taken_clean
                self.customer_state['total_taken'] += taken_this_visit

                event = {
                    'entry_frame':    self.customer_state['entry_frame'],
                    'exit_frame':     frame_idx,
                    'counts_before':  {str(k): v for k, v in self.baseline_before.items()},
                    'counts_after':   {str(k): v for k, v in self.baseline_after.items()},
                    'taken_per_zone': {str(k): v for k, v in self.items_taken_per_zone.items()},
                    'total_taken':    taken_this_visit,
                }
                self.customer_state['events'].append(event)
                logger.info(f"[Frame {frame_idx}] Customer LEFT. Items taken: {taken_this_visit}")

        return {
            'in_frame':    self.customer_state['in_frame'],
            'total_taken': self.customer_state['total_taken'],
            'n_events':    len(self.customer_state['events']),
            'last_event':  self.customer_state['events'][-1] if self.customer_state['events'] else None,
        }

    @property
    def events(self):
        return self.customer_state['events']

    @property
    def total_taken(self):
        return self.customer_state['total_taken']
