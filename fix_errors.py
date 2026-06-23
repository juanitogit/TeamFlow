import os

base_dir = r"c:\Users\juan8\Desktop\Team-Performance-Tracker\artifacts\teamflow\src\pages"

files_to_fix = ["dashboard.tsx", "meetings.tsx", "sprints.tsx", "team.tsx"]

replacements = {
    # dashboard.tsx
    "<BarChart3 ": "<IconChartBar ",
    "<IconTeam ": "<IconUsers ",
    "<Clock ": "<IconClock ",
    # meetings.tsx
    "<IconMeetings ": "<IconVideo ",
    # sprints.tsx
    "IconTimer": "IconHourglass",
    "<FolderKanban ": "<IconFolder ",
    # team.tsx
    "IconScroll": "IconFileText",
}

for filename in files_to_fix:
    filepath = os.path.join(base_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    for old, new_ in replacements.items():
        content = content.replace(old, new_)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Fixed errors!")
