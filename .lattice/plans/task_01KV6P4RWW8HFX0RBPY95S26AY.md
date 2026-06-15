# AGNTM-7: C1 degradation parity + e2e validation [GATE]

Validation gate, no feature code (G5, AC-1/3/6). (a) CLEANVERSE_* unset: build + full hire->build->pay->rate loop runs, no badges, no errors. (b) env set: live verify returns unverified+magickLink; badges+modal+hire line render. (c) tsc clean; npm run build ok. Record evidence via lattice attach --role validation. Depends on CLN-5 and CLN-6.
