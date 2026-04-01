#!/usr/bin/env python3
import re

p = "/root/.openclaw/cron/waterfall-pick.sh"
with open(p) as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "ISSUE_NUM=" in line and "grep" in line:
        lines[i] = "ISSUE_NUM=$(echo \"$ISSUES\" | sed 's/^#\\([0-9]*\\).*/\\1/')\n"
        print(f"Fixed line {i+1}: {lines[i].strip()}")

with open(p, "w") as f:
    f.writelines(lines)

print("Done")
