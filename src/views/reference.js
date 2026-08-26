/* The Reference tab — static training doctrine. No state, no interaction.
   It is here because the rules matter more than the exercise selection. */

export const viewReference = () => `
<section class="ref" style="margin-top:22px"><h3>Standing Orders</h3>
<p class="lede">Six rules. They matter more than the exercise selection &mdash; most of what was
wrong before was execution, not choice.</p><hr class="ref-hr">
<ul class="rules">
<li><span class="k">Warm-ups</span><span>Are not sets. Ramp separately and don't log them. Every
"2 sets" in your old program was really one working set plus a ramp.</span></li>
<li><span class="k">Effort</span><span>Both work sets at the <b>same load</b>, 0&ndash;1 reps in
reserve. Exception: RDL and any deadlift sit at 2 in reserve, always.</span></li>
<li><span class="k">Progress</span><span>Double progression. Hit the top of the rep range on
<b>both</b> sets &rarr; add 2.5 kg upper body, 5 kg lower body next session. Otherwise repeat the
load.</span></li>
<li><span class="k">Intensity</span><span>One technique per session, on the last set of a machine or
isolation lift only. Never on a barbell lift.</span></li>
<li><span class="k">Testing</span><span>Bench 100 kg every 6&ndash;8 weeks, not weekly. Maxing twice
a week is how you stall and how elbows go.</span></li>
<li><span class="k">Deload</span><span>Every eighth week: same lifts, one set each, 3 reps in
reserve. Or take it automatically when a shoot week does it for you.</span></li>
</ul></section>

<section class="ref sect"><h3>Weekly Sets, Before &amp; After</h3>
<p class="lede">Working sets per week, warm-ups excluded, counting each day twice. Per-exercise
volume didn't change &mdash; still two sets, still intensity over volume. The totals moved because
the work is pointed at the right muscles now.</p><hr class="ref-hr">
<div class="scrollx"><table class="vol"><thead><tr><th>Muscle</th><th style="text-align:right">Was</th>
<th style="text-align:right">Now</th><th>What changed</th></tr></thead><tbody>
<tr class="gain"><td>Chest</td><td class="was">8</td><td class="n">12</td><td>Added a fly on each push day</td></tr>
<tr><td>Back</td><td class="was">24</td><td class="n">14</td><td>Four lat exercises cut to two, rows added</td></tr>
<tr class="gain"><td>Quads</td><td class="was">8</td><td class="n">10</td><td>Pendulum squat now leads a session</td></tr>
<tr class="gain"><td>Hamstrings</td><td class="was">6</td><td class="n">8</td><td>RDL plus a curl on both leg days</td></tr>
<tr class="gain"><td>Side delts</td><td class="was">0</td><td class="n">6</td><td>Nothing hit them before</td></tr>
<tr class="gain"><td>Rear delts</td><td class="was">0</td><td class="n">6</td><td>Nothing hit them before</td></tr>
<tr class="gain"><td>Calves</td><td class="was">4</td><td class="n">6</td><td>One more set each day</td></tr>
<tr><td>Biceps</td><td class="was">10</td><td class="n">4</td><td>Cut hard &mdash; the pulls already do the work</td></tr>
<tr><td>Triceps</td><td class="was">6</td><td class="n">4</td><td>Cut, and moved behind the pressing</td></tr>
<tr><td>Traps</td><td class="was">4</td><td class="n">2</td><td>Halved, and on the right day</td></tr>
<tr><td>Abs</td><td class="was">4</td><td class="n">4</td><td>Unchanged</td></tr>
</tbody></table></div></section>

<section class="ref sect"><h3>Second Unit &mdash; October to February</h3>
<p class="lede">When call times land and the six-day week stops being possible, drop to this rather
than dropping off. Any three days that fit the schedule, ideally 48 hours apart. Thirty minutes
each, no cardio bolted on. The goal is holding your loads, not adding to them.</p><hr class="ref-hr">
<div class="fb">
<div class="fb-card"><h4>Legs</h4><ol><li>Pendulum Squat <span>2 &times; 8&ndash;12</span></li>
<li>Romanian Deadlift <span>2 &times; 8&ndash;10</span></li><li>Leg Extension <span>2 &times; 12&ndash;15</span></li>
<li>Seated Leg Curl <span>2 &times; 10&ndash;15</span></li><li>Standing Calf Raise <span>2 &times; 12&ndash;15</span></li></ol></div>
<div class="fb-card"><h4>Push</h4><ol><li>Bench Press <span>2 &times; 6&ndash;10</span></li>
<li>Incline DB Press <span>2 &times; 8&ndash;12</span></li><li>Lateral Raise <span>2 &times; 12&ndash;20</span></li>
<li>Cable Pushdown <span>2 &times; 10&ndash;15</span></li></ol></div>
<div class="fb-card"><h4>Pull</h4><ol><li>Plate Loaded Row <span>2 &times; 6&ndash;10</span></li>
<li>Cable Lat Pulldown <span>2 &times; 8&ndash;12</span></li><li>Reverse Pec Deck <span>2 &times; 15&ndash;20</span></li>
<li>Cable Biceps Curl <span>2 &times; 10&ndash;12</span></li></ol></div>
</div>
<div class="note"><span class="h">How saving works</span>Every change is written to this browser's
own database within a second, with no network involved &mdash; the gym's dead spot cannot cost you a
session. Because it is stored on the device, each device keeps its own log; use Export and Import on
the Program tab to move history between them.</div>
</section>`;
