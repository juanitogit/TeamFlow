import re

filepath = r"c:\Users\juan8\Desktop\Team-Performance-Tracker\artifacts\teamflow\src\pages\team.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace lucide imports
content = content.replace(
    'import { Copy, RefreshCw, Timer, UserPlus, Users, Github, Target, Activity, Trash2, ClipboardList, Settings, Plus, CheckCircle2, AlertCircle, Edit2, BookOpen, Lightbulb, Download, ScrollText } from "lucide-react";',
    'import { IconCopy, IconRefresh, IconTimer, IconUserPlus, IconUsers, IconBrandGithub, IconTarget, IconActivity, IconTrash, IconClipboardList, IconSettings, IconPlus, IconCircleCheck, IconAlertCircle, IconEdit, IconBook, IconBulb, IconDownload, IconScroll } from "@tabler/icons-react";'
)

# Icon mappings
mappings = {
    "<Copy ": "<IconCopy ",
    "<RefreshCw ": "<IconRefresh ",
    "<Timer ": "<IconTimer ",
    "<UserPlus ": "<IconUserPlus ",
    "<Users ": "<IconUsers ",
    "<Github ": "<IconBrandGithub ",
    "<Target ": "<IconTarget ",
    "<Activity ": "<IconActivity ",
    "<Trash2 ": "<IconTrash ",
    "<ClipboardList ": "<IconClipboardList ",
    "<Settings ": "<IconSettings ",
    "<Plus ": "<IconPlus ",
    "<CheckCircle2 ": "<IconCircleCheck ",
    "<AlertCircle ": "<IconAlertCircle ",
    "<Edit2 ": "<IconEdit ",
    "<BookOpen ": "<IconBook ",
    "<Lightbulb ": "<IconBulb ",
    "<Download ": "<IconDownload ",
    "<ScrollText ": "<IconScroll ",
}

for old, new_ in mappings.items():
    content = content.replace(old, new_)

# Update styling to match rounded-2xl
content = content.replace("rounded-[24px]", "rounded-2xl")
content = content.replace("rounded-xl", "rounded-2xl")
content = content.replace("rounded-lg", "rounded-2xl")
# The cards usually have className="... rounded-..." 
# The dialog content doesn't have it explicitly unless passed

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("team.tsx updated successfully!")
