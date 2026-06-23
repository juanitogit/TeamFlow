import re
import os

base_dir = r"c:\Users\juan8\Desktop\Team-Performance-Tracker\artifacts\teamflow\src\pages"
files_to_fix = ["dashboard.tsx", "tasks.tsx", "sprints.tsx", "meetings.tsx", "team.tsx"]

pattern = re.compile(r'<div className="p-2 bg-primary/10 rounded-2xl">\s*<([a-zA-Z0-9]+)\s+className="h-6 w-6([^"]*)"\s*/>\s*</div>', re.MULTILINE)

for filename in files_to_fix:
    filepath = os.path.join(base_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace the badge div with just the icon, making it slightly larger (h-8 w-8)
    content = pattern.sub(r'<\1 className="h-8 w-8\2" />', content)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Badges removed from titles!")
