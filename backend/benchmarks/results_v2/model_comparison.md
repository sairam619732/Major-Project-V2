# DQN model comparison (cost model v2, calibrated)

2000 tasks, seeds [101, 202, 303, 404, 505] (not used in training). Same tasks for every policy.

| Policy | Mean reward (±95% CI) | Oracle agreement | Deadline met | Median latency | LOCAL / EDGE / CLOUD |
| --- | --- | --- | --- | --- | --- |
| old_dqn | -0.7141 ± 0.0088 | 47.4% | 15.8% | 2783.2 ms | 52.0% / 32.2% / 15.8% |
| new_dqn | -0.6659 ± 0.0087 | 79.4% | 21.6% | 2178.4 ms | 73.5% / 12.1% / 14.4% |
| oracle | -0.659 ± 0.0087 | - | 22.1% | 2135.5 ms | 71.7% / 11.8% / 16.4% |
| local_only | -0.672 ± 0.0087 | - | 21.1% | 2239.6 ms | 100.0% / 0.0% / 0.0% |
| edge_only | -0.766 ± 0.0083 | - | 12.4% | 4208.6 ms | 0.0% / 100.0% / 0.0% |
| cloud_only | -0.7604 ± 0.0078 | - | 12.7% | 3294.3 ms | 0.0% / 0.0% / 100.0% |

Paired differences in mean reward (same tasks; positive = first is better):

- new minus old: +0.0481 ± 0.0041 (significant)
- new minus local only: +0.0061 ± 0.0015 (significant)
- oracle minus new: +0.0069 ± 0.0009 (significant)

| Scenario | Oracle | Old DQN | New DQN | Est. latency L/E/C (ms) |
| --- | --- | --- | --- | --- |
| 1 photo, idle laptop | LOCAL | LOCAL | LOCAL | 321 / 401 / 300 |
| 1 photo, busy laptop (10% CPU free) | CLOUD | LOCAL | LOCAL | 640 / 401 / 300 |
| 10-photo batch, idle laptop | LOCAL | LOCAL | LOCAL | 2464 / 3158 / 2230 |
| 10-photo batch, busy laptop | CLOUD | LOCAL | CLOUD | 4926 / 3158 / 2230 |
| 50-photo batch, idle laptop | LOCAL | LOCAL | LOCAL | 11988 / 15414 / 10807 |
| 50-photo batch, busy laptop | CLOUD | CLOUD | CLOUD | 23976 / 15414 / 10807 |

Decision rule: switch only if new mean reward is higher with non-overlapping 95% CIs AND oracle agreement is higher.
New model better: **True**.
